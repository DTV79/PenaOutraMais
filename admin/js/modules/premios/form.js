import { openModal, closeModal } from '../../ui/modal.js';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function esc(value='') {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('"','&quot;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0,10);
}

function normalizeAmount(type, raw) {
  const value = Number(String(raw).replace(',','.'));
  if (!Number.isFinite(value) || value === 0) throw new Error('Introduce un importe distinto de 0.');

  if (['gasto','reparto'].includes(type)) return -Math.abs(value);
  if (['arrastre','premio','premio_extra'].includes(type)) return Math.abs(value);
  return value;
}

export function openBoteForm({ season, movements, movement=null, onSave }) {
  const editing = Boolean(movement);
  const activeCarry = movements.find((row) => row.tipo === 'arrastre' && !row.anulado_at && String(row.id) !== String(movement?.id || ''));

  const modal = openModal({
    title: editing ? 'Editar movimiento' : 'Nuevo movimiento',
    subtitle: `BOTE · ${season.anio}`,
    content: `
      <form id="boteForm" class="admin-form">
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label for="bote-tipo">Tipo *</label>
            <select id="bote-tipo" name="tipo" required>
              ${[
                ['premio','Premio'],
                ['premio_extra','Premio extra'],
                ['gasto','Gasto'],
                ['reparto','Reparto'],
                ['ajuste','Ajuste'],
                ['arrastre','Arrastre inicial']
              ].map(([value,label]) => `
                <option value="${value}" ${movement?.tipo === value ? 'selected' : ''}>${label}</option>
              `).join('')}
            </select>
          </div>

          <div class="admin-form-field">
            <label for="bote-importe">Importe (€) *</label>
            <input id="bote-importe" name="importe" type="number" step="0.01"
              value="${esc(movement ? Math.abs(Number(movement.importe)) : '')}" required />
          </div>

          <div class="admin-form-field">
            <label for="bote-fecha">Fecha</label>
            <input id="bote-fecha" name="fecha" type="date"
              value="${esc(movement?.fecha || todayIso())}" />
          </div>

          <div class="admin-form-field">
            <label for="bote-mes">Mes</label>
            <select id="bote-mes" name="mes">
              <option value="">Sin mes</option>
              ${MONTHS.map((month,index) => `
                <option value="${index+1}" ${Number(movement?.mes) === index+1 ? 'selected' : ''}>${month}</option>
              `).join('')}
            </select>
          </div>

          <div class="admin-form-field admin-form-wide">
            <label for="bote-concepto">Concepto *</label>
            <input id="bote-concepto" name="concepto" type="text"
              value="${esc(movement?.concepto || '')}" required />
          </div>

          <div class="admin-form-field admin-form-wide">
            <label for="bote-observaciones">Observaciones</label>
            <textarea id="bote-observaciones" name="observaciones" rows="3">${esc(movement?.observaciones || '')}</textarea>
          </div>
        </div>

        <p class="admin-form-help">
          Premios y arrastre se guardan en positivo. Gastos y repartos se guardan automáticamente en negativo.
        </p>
        <div id="boteFormError" class="admin-error"></div>
      </form>
    `,
    actions: `
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="boteForm" id="boteSave">
        ${editing ? 'Guardar cambios' : 'Registrar'}
      </button>
    `
  });

  const form = modal.querySelector('#boteForm');
  const typeSelect = modal.querySelector('#bote-tipo');
  const dateInput = modal.querySelector('#bote-fecha');
  const monthSelect = modal.querySelector('#bote-mes');
  const saveButton = modal.querySelector('#boteSave');
  const errorBox = modal.querySelector('#boteFormError');

  dateInput.addEventListener('change', () => {
    if (dateInput.value) monthSelect.value = String(Number(dateInput.value.slice(5,7)));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.remove('visible');
    saveButton.disabled = true;
    saveButton.textContent = 'Guardando…';

    try {
      const data = new FormData(form);
      const type = String(data.get('tipo') || '');
      if (type === 'arrastre' && activeCarry) {
        throw new Error('Ya existe un arrastre inicial activo para esta temporada.');
      }

      const date = String(data.get('fecha') || '') || null;
      const month = date ? Number(date.slice(5,7)) : Number(data.get('mes') || 0) || null;

      const payload = {
        temporada_id: season.id,
        anio: Number(season.anio),
        fecha: date,
        mes: month,
        tipo: type,
        concepto: String(data.get('concepto') || '').trim(),
        importe: normalizeAmount(type, data.get('importe')),
        observaciones: String(data.get('observaciones') || '').trim() || null
      };

      if (!payload.concepto) throw new Error('Escribe un concepto.');

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
