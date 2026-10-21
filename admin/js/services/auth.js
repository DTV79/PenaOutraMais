import { SUPABASE_CONFIG } from '../../../js/config/supabase-config.js';

const STORAGE_KEY = 'pena_outra_mais_admin_session';

function saveSession(session) {
  const expiresAt = session.expires_at
    ? Number(session.expires_at) * 1000
    : Date.now() + Number(session.expires_in || 3600) * 1000;

  const stored = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: expiresAt,
    user: session.user
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    clearSession();
    return null;
  }
}

async function authRequest(path, body, accessToken) {
  const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_CONFIG.publishableKey,
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = response.status === 204 ? null : await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || data?.error_description || 'No se pudo completar el acceso');
  }

  return data;
}

export async function signInWithPassword(email, password) {
  const session = await authRequest('token?grant_type=password', { email, password });
  return saveSession(session);
}

async function refreshSession(session) {
  const refreshed = await authRequest(
    'token?grant_type=refresh_token',
    { refresh_token: session.refresh_token }
  );
  return saveSession(refreshed);
}

export async function getValidSession() {
  const session = getStoredSession();
  if (!session?.access_token || !session?.refresh_token) return null;

  if (session.expires_at - Date.now() > 60_000) {
    return session;
  }

  try {
    return await refreshSession(session);
  } catch {
    clearSession();
    return null;
  }
}

async function fetchOwnAdmin(session) {
  const response = await fetch(
    `${SUPABASE_CONFIG.url}/rest/v1/administradores?select=user_id,nombre,activo&activo=eq.true&limit=1`,
    {
      headers: {
        apikey: SUPABASE_CONFIG.publishableKey,
        Authorization: `Bearer ${session.access_token}`
      }
    }
  );

  if (!response.ok) return null;
  const rows = await response.json();
  return rows?.[0] ?? null;
}

export async function verifyAdmin(session) {
  return fetchOwnAdmin(session);
}

export async function requireAdmin() {
  const session = await getValidSession();

  if (!session) {
    window.location.replace('./acceso.html');
    return null;
  }

  const admin = await verifyAdmin(session);

  if (!admin) {
    clearSession();
    window.location.replace('./acceso.html?error=no-admin');
    return null;
  }

  return { session, admin };
}

export async function signOut() {
  const session = getStoredSession();

  if (session?.access_token) {
    try {
      await authRequest('logout', null, session.access_token);
    } catch {
      // El cierre local se realiza igualmente.
    }
  }

  clearSession();
  window.location.replace('./acceso.html');
}


export async function bootstrapFirstAdmin(session) {
  const response = await fetch(
    `${SUPABASE_CONFIG.url}/rest/v1/administradores`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_CONFIG.publishableKey,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        user_id: session.user.id,
        nombre: 'Administrador',
        activo: true
      })
    }
  );

  if (!response.ok) {
    return null;
  }

  const rows = await response.json().catch(() => []);
  return rows?.[0] ?? null;
}
