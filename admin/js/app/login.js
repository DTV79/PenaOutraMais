import { signInWithPassword, verifyAdmin, bootstrapFirstAdmin, clearSession, getValidSession } from '../services/auth.js';

const form = document.querySelector('#loginForm');
const errorBox = document.querySelector('#loginError');
const submitButton = document.querySelector('#loginSubmit');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add('visible');
}

async function redirectIfAlreadyAdmin() {
  const session = await getValidSession();
  if (!session) return;

  const admin = await verifyAdmin(session);
  if (admin) {
    window.location.replace('./index.html');
  }
}

if (new URLSearchParams(window.location.search).get('error') === 'no-admin') {
  showError('Este usuario no tiene permisos de administración.');
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.classList.remove('visible');
  submitButton.disabled = true;
  submitButton.textContent = 'Entrando…';

  try {
    const data = new FormData(form);
    const session = await signInWithPassword(
      String(data.get('email') || '').trim(),
      String(data.get('password') || '')
    );

    let admin = await verifyAdmin(session);

    if (!admin) {
      admin = await bootstrapFirstAdmin(session);
    }

    if (!admin) {
      clearSession();
      throw new Error('El acceso es correcto, pero este usuario no está autorizado como administrador.');
    }

    window.location.replace('./index.html');
  } catch (error) {
    showError(error.message || 'No se pudo iniciar sesión.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Entrar';
  }
});

redirectIfAlreadyAdmin();
