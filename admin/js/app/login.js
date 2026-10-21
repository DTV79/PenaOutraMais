'use strict';

(() => {
  const CONFIG = Object.freeze({
    url: 'https://djrmbdbtfsgzwwcsatll.supabase.co',
    publishableKey: 'sb_publishable_aZW9m8Xf4N-B6sC3ubATBQ_A7mUOiM0'
  });

  const STORAGE_KEY = 'pena_outra_mais_admin_session';

  function showError(message) {
    const box = document.querySelector('#loginError');
    if (!box) return;
    box.textContent = message;
    box.classList.add('visible');
  }

  function clearError() {
    document.querySelector('#loginError')?.classList.remove('visible');
  }

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

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function getStoredSession() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      clearSession();
      return null;
    }
  }

  async function authRequest(path, body) {
    const response = await fetch(`${CONFIG.url}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: CONFIG.publishableKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.msg ||
        data?.message ||
        data?.error_description ||
        'No se pudo iniciar sesión.'
      );
    }

    return data;
  }

  async function signIn(email, password) {
    const session = await authRequest(
      'token?grant_type=password',
      { email, password }
    );
    return saveSession(session);
  }

  async function verifyAdmin(session) {
    const response = await fetch(
      `${CONFIG.url}/rest/v1/administradores?select=user_id,nombre,activo&activo=eq.true&limit=1`,
      {
        headers: {
          apikey: CONFIG.publishableKey,
          Authorization: `Bearer ${session.access_token}`
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const rows = await response.json();
    return rows?.[0] || null;
  }

  async function bootstrapFirstAdmin(session) {
    const response = await fetch(
      `${CONFIG.url}/rest/v1/administradores`,
      {
        method: 'POST',
        headers: {
          apikey: CONFIG.publishableKey,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          user_id: session.user.id,
          nombre: 'Diego',
          activo: true
        })
      }
    );

    if (!response.ok) {
      return null;
    }

    const rows = await response.json().catch(() => []);
    return rows?.[0] || null;
  }

  async function redirectExistingSession() {
    const session = getStoredSession();
    if (!session?.access_token || session.expires_at <= Date.now()) return;

    const admin = await verifyAdmin(session);
    if (admin) {
      window.location.replace('./index.html');
    }
  }

  function init() {
    const form = document.querySelector('#loginForm');
    const button = document.querySelector('#loginSubmit');

    if (!form || !button) {
      return;
    }

    document.documentElement.dataset.loginReady = 'true';

    if (new URLSearchParams(window.location.search).get('error') === 'no-admin') {
      showError('Este usuario no tiene permisos de administración.');
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearError();

      button.disabled = true;
      button.textContent = 'Entrando…';

      try {
        const data = new FormData(form);
        const email = String(data.get('email') || '').trim();
        const password = String(data.get('password') || '');

        if (!email || !password) {
          throw new Error('Introduce correo y contraseña.');
        }

        const session = await signIn(email, password);

        let admin = await verifyAdmin(session);
        if (!admin) {
          admin = await bootstrapFirstAdmin(session);
        }

        if (!admin) {
          clearSession();
          throw new Error('Usuario correcto, pero todavía no tiene permiso de administrador.');
        }

        window.location.replace('./index.html');
      } catch (error) {
        showError(error?.message || 'No se pudo iniciar sesión.');
      } finally {
        button.disabled = false;
        button.textContent = 'Entrar';
      }
    });

    redirectExistingSession().catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
