import { openModal, closeModal } from '../../ui/modal.js';

function escapeAttr(value = '') {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function normalizeAmount(type, value) {
  const amount = Number(String(value).replace(',', '.'));

  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error('Introduce un importe distinto de 0.');
  }

  if (type === 'devolucion') return -Math.abs(amount);
  if (type === 'pago' || type === 'saldo_a_favor') return Math.abs(amount);
  return amount;
}

export function openQuotaForm({
  members,
  season,
  movement = null,
  onSave
}) {
  const editing = Boolean(movement);
  const defaultType = movement?.tipo || 'pago';
  const defaultApplyYear = movement?.aplicar_anio || (Number(season.anio) + 1);

  const modal = openModal({
    title: editing ? 'Editar movimiento' : 'Registrar movimiento',
    subtitle: `CUOTAS ${season.anio}`,
    content: `
      <form id="quotaForm" class="admin-form">
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label for="quota-socio">Socio *</label>
            <select id="quota-socio" name="socio_id" required>
              <option value="">Seleccionar…</option>
              ${members.map((member) => `
                <option value="${member.id}" ${movement?.socio_id === member.id ? 'selected' : ''}>
                  ${escapeAttr(member.alias)}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="admin-form-field">
            <label for="quota-fecha">Fecha *</label>
            <input id="quota-fecha" name="fecha" type="date"
              value="${escapeAttr(movement?.fecha || todayIso())}" required />
          </div>

          <div class="admin-form-field">
            <label for="quota-tipo">Tipo *</label>
            <select id="quota-tipo" name="tipo" required>
              <option value="pago" ${defaultType === 'pago' ? 'selected' : ''}>Pago</option>
              <option value="ajuste" ${defaultType === 'ajuste' ? 'selected' : ''}>Ajuste</option>
              <option value="devolucion" ${defaultType === 'devolucion' ? 'selected' : ''}>Devolución</option>
              <option value="saldo_a_favor" ${defaultType === 'saldo_a_favor' ? 'selected' : ''}>Saldo a favor</option>
            </select>
          </div>

          <div class="admin-form-field">
            <label for="quota-importe">Importe (€) *</label>
            <input id="quota-importe" name="importe" type="number" step="0.01"
              value="${escapeAttr(movement ? Math.abs(Number(movement.importe)) : Number(season.cuota_anual))}" required />
          </div>

          <div class="admin-form-field">
            <label for="quota-metodo">Método</label>
            <select id="quota-metodo" name="metodo">
              <option value="">Sin indicar</option>
              ${['Cuenta','Bizum','Efectivo','Otro'].map((method) => `
                <option value="${method}" ${movement?.metodo === method ? 'selected' : ''}>${method}</option>
              `).join('')}
            </select>
          </div>

          <div class="admin-form-field" id="quotaApplyYearField">
            <label for="quota-aplicar-anio">Aplicar al año</label>
            <input id="quota-aplicar-anio" name="aplicar_anio" type="number" min="2012" max="2100"
              value="${escapeAttr(defaultApplyYear)}" />
          </div>

          <div class="admin-form-field admin-form-wide">
            <label for="quota-observaciones">Observaciones</label>
            <textarea id="quota-observaciones" name="observaciones" rows="3">${escapeAttr(movement?.observaciones || '')}</textarea>
          </div>
        </div>

        <p class="admin-form-help">
          Pago y saldo a favor se guardan en positivo. Las devoluciones se registran automáticamente en negativo.
        </p>

        <div id="quotaFormError" class="admin-error"></div>
      </form>
    `,
    actions: `
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="quotaForm" id="quotaSave">
        ${editing ? 'Guardar cambios' : 'Registrar'}
      </button>
    `
  });

  const form = modal.querySelector('#quotaForm');
  const typeSelect = modal.querySelector('#quota-tipo');
  const applyYearField = modal.querySelector('#quotaApplyYearField');
  const saveButton = modal.querySelector('#quotaSave');
  const errorBox = modal.querySelector('#quotaFormError');

  function syncApplyYear() {
    applyYearField.hidden = typeSelect.value !== 'saldo_a_favor';
  }

  typeSelect.addEventListener('change', syncApplyYear);
  syncApplyYear();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.remove('visible');
    saveButton.disabled = true;
    saveButton.textContent = 'Guardando…';

    try {
      const data = new FormData(form);
      const type = String(data.get('tipo') || '');

      const payload = {
        socio_id: String(data.get('socio_id') || ''),
        temporada_id: season.id,
        fecha: String(data.get('fecha') || ''),
        tipo: type,
        importe: normalizeAmount(type, data.get('importe')),
        metodo: String(data.get('metodo') || '').trim() || null,
        observaciones: String(data.get('observaciones') || '').trim() || null,
        aplicar_anio: type === 'saldo_a_favor'
          ? Number(data.get('aplicar_anio') || 0)
          : null
      };

      if (!payload.socio_id || !payload.fecha) {
        throw new Error('Completa socio y fecha.');
      }

      if (
        payload.tipo === 'saldo_a_favor' &&
        (!Number.isInteger(payload.aplicar_anio) || payload.aplicar_anio < season.anio)
      ) {
        throw new Error('Indica un año válido para aplicar el saldo.');
      }

      await onSave(payload);
      closeModal();
    } catch (error) {
      errorBox.textContent = error?.message || 'No se pudo guardar el movimiento.';
      errorBox.classList.add('visible');
      saveButton.disabled = false;
      saveButton.textContent = editing ? 'Guardar cambios' : 'Registrar';
    }
  });
}
