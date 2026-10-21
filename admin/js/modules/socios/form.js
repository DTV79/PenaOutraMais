import { openModal, closeModal } from '../../ui/modal.js';

function formatDni(value = '') {
  const compact = String(value || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');

  if (/^\d{8}[A-Z]$/.test(compact)) {
    return `${compact.slice(0,2)}.${compact.slice(2,5)}.${compact.slice(5,8)}-${compact.slice(8)}`;
  }

  return String(value || '').trim().toUpperCase();
}

function escapeAttr(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function field(name, label, value = '', type = 'text', required = false, autocomplete = 'off') {
  return `
    <div class="admin-form-field">
      <label for="member-${name}">${label}${required ? ' *' : ''}</label>
      <input
        id="member-${name}"
        name="${name}"
        type="${type}"
        value="${escapeAttr(value || '')}"
        autocomplete="${autocomplete}"
        ${required ? 'required' : ''}
      />
    </div>
  `;
}

export function normalizeMemberPayload(form) {
  const data = new FormData(form);
  const clean = (name) => String(data.get(name) || '').trim();

  return {
    nombre: clean('nombre') || null,
    apellidos: clean('apellidos') || null,
    dni: formatDni(clean('dni')) || null,
    alias: clean('alias'),
    telefono: clean('telefono') || null,
    email: clean('email') || null,
    fecha_alta: clean('fecha_alta') || null,
    fecha_baja: clean('fecha_baja') || null
  };
}

export function openMemberForm({ member = null, onSave }) {
  const editing = Boolean(member);

  const modal = openModal({
    title: editing ? 'Editar socio' : 'Nuevo socio',
    subtitle: 'SOCIOS',
    content: `
      <form id="memberForm" class="admin-form">
        <div class="admin-form-grid">
          ${field('nombre', 'Nombre', member?.nombre, 'text', false, 'given-name')}
          ${field('apellidos', 'Apellidos', member?.apellidos, 'text', false, 'family-name')}
          ${field('alias', 'Alias', member?.alias, 'text', true)}
          ${field('dni', 'DNI / NIE', formatDni(member?.dni), 'text', false)}
          ${field('telefono', 'Teléfono', member?.telefono, 'tel', false, 'tel')}
          ${field('email', 'Correo electrónico', member?.email, 'email', false, 'email')}
          ${field('fecha_alta', 'Fecha de alta', member?.fecha_alta, 'date', false)}
          ${field('fecha_baja', 'Fecha de baja', member?.fecha_baja, 'date')}
        </div>
        <p class="admin-form-help">Solo el alias es obligatorio. Los datos personales pueden completarse más adelante y solo son accesibles desde administración.</p>
        <div id="memberFormError" class="admin-error"></div>
      </form>
    `,
    actions: `
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="memberForm" id="memberSave">
        ${editing ? 'Guardar cambios' : 'Crear socio'}
      </button>
    `
  });

  const form = modal.querySelector('#memberForm');
  const saveButton = modal.querySelector('#memberSave');
  const errorBox = modal.querySelector('#memberFormError');
  const dniInput = modal.querySelector('#member-dni');

  dniInput?.addEventListener('blur', () => {
    dniInput.value = formatDni(dniInput.value);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.remove('visible');
    saveButton.disabled = true;
    saveButton.textContent = 'Guardando…';

    try {
      const payload = normalizeMemberPayload(form);
      await onSave(payload);
      closeModal();
    } catch (error) {
      errorBox.textContent = error?.message || 'No se pudo guardar el socio.';
      errorBox.classList.add('visible');
      saveButton.disabled = false;
      saveButton.textContent = editing ? 'Guardar cambios' : 'Crear socio';
    }
  });
}
