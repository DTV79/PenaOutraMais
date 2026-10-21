import { SUPABASE_CONFIG } from '../../../js/config/supabase-config.js';
import { getValidSession } from './auth.js';

async function request(path, options = {}, retry = true) {
  const session = await getValidSession();
  if (!session) throw new Error('Sesión no disponible');

  const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${path}`, {
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
    throw new Error(data?.message || data?.hint || `Error ${response.status}`);
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
