import { SUPABASE_CONFIG } from '../../../js/config/supabase-config.js';
import { getValidSession } from './auth.js';

function friendlyMessage(error, status = null) {
  const raw = String(
    typeof error === 'string'
      ? error
      : error?.message || error?.error || error?.hint || ''
  ).trim();

  const lower = raw.toLowerCase();

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('load failed') ||
    lower.includes('connection')
  ) {
    return 'No se pudo conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.';
  }

  if (
    lower.includes('jwt') ||
    lower.includes('session') ||
    lower.includes('token') ||
    status === 401
  ) {
    return 'La sesión ha caducado. Vuelve a iniciar sesión.';
  }

  if (
    lower.includes('duplicate key') ||
    lower.includes('unique constraint') ||
    lower.includes('already exists')
  ) {
    return 'Ya existe un registro con esos datos.';
  }

  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('not authorized') ||
    status === 403
  ) {
    return 'No tienes permisos para realizar esta operación.';
  }

  if (status === 429) {
    return 'Se han realizado demasiadas solicitudes. Inténtalo de nuevo dentro de un momento.';
  }

  if (status && status >= 500) {
    return 'El servidor no pudo completar la operación. Inténtalo de nuevo.';
  }

  if (!raw || /^error\s+\d+$/i.test(raw)) {
    return 'No se pudo completar la operación. Inténtalo de nuevo.';
  }

  return raw;
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    throw new Error(friendlyMessage(error));
  }
}

async function request(path, options = {}, retry = true) {
  const session = await getValidSession();
  if (!session) throw new Error('La sesión ha caducado. Vuelve a iniciar sesión.');

  const response = await safeFetch(`${SUPABASE_CONFIG.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });

  if (response.status === 401 && retry) {
    return request(path, options, false);
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      friendlyMessage(data?.message || data?.hint || data?.error, response.status)
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

export function adminSelect(path) {
  return request(path, { method: 'GET', prefer: 'return=minimal' });
}

export function adminInsert(table, payload) {
  return request(table, { method: 'POST', body: JSON.stringify(payload) });
}

export function adminUpdate(path, payload) {
  return request(path, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function adminDelete(path) {
  return request(path, { method: 'DELETE' });
}

export function adminRpc(functionName, payload = {}) {
  return request(
    `rpc/${encodeURIComponent(functionName)}`,
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

export async function adminFunction(functionName, payload = {}) {
  const session = await getValidSession();
  if (!session) throw new Error('La sesión ha caducado. Vuelve a iniciar sesión.');

  const response = await safeFetch(
    `${SUPABASE_CONFIG.url}/functions/v1/${encodeURIComponent(functionName)}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_CONFIG.publishableKey,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      friendlyMessage(data?.error || data?.message, response.status)
    );
  }

  return data;
}


export async function adminFunctionForm(functionName, formData) {
  const session = await getValidSession();
  if (!session) throw new Error('La sesión ha caducado. Vuelve a iniciar sesión.');

  const response = await safeFetch(
    `${SUPABASE_CONFIG.url}/functions/v1/${encodeURIComponent(functionName)}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_CONFIG.publishableKey,
        Authorization: `Bearer ${session.access_token}`
      },
      body: formData
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      friendlyMessage(data?.error || data?.message, response.status)
    );
  }

  return data;
}
