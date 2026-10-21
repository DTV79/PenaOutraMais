import { openModal, closeModal } from '../../ui/modal.js';

function escapeAttr(value = '') {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function numberFields(values = []) {
  return Array.from({ length: 6 }, (_, index) => `
    <div class="admin-form-field number-field">
      <label for="comb-number-${index + 1}">Nº ${index + 1} *</label>
      <input
        id="comb-number-${index + 1}"
        name="numero_${index + 1}"
        type="number"
        min="1"
        max="49"
        step="1"
        inputmode="numeric"
        value="${escapeAttr(values[index] ?? '')}"
        required
      />
    </div>
  `).join('');
}

function readNumbers(form) {
  const data = new FormData(form);
  const numbers = Array.from({ length: 6 }, (_, index) =>
    Number(data.get(`numero_${index + 1}`))
  );

  if (numbers.some((number) => !Number.isInteger(number) || number < 1 || number > 49)) {
    throw new Error('Los seis números deben ser enteros entre 1 y 49.');
  }

  if (new Set(numbers).size !== 6) {
    throw new Error('No puede haber números repetidos en la misma combinación.');
  }

  return numbers.sort((a, b) => a - b);
}

export function openCombinationForm({
  season,
  combinations,
  combination = null,
  onSave
}) {
  const editing = Boolean(combination);
  const nextOrder = combinations.length
    ? Math.max(...combinations.map((row) => Number(row.numero_orden))) + 1
    : 1;

  const modal = openModal({
    title: editing ? 'Editar combinación' : 'Nueva combinación',
    subtitle: `NÚMEROS · ${season.anio}`,
    content: `
      <form id="combinationForm" class="admin-form">
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label for="comb-order">Orden *</label>
            <input id="comb-order" name="numero_orden" type="number" min="1" max="49"
              value="${escapeAttr(combination?.numero_orden ?? nextOrder)}" required />
          </div>

          <div class="admin-form-field">
            <label for="comb-name">Nombre</label>
            <input id="comb-name" name="nombre" type="text"
              value="${escapeAttr(combination?.nombre || '')}"
              placeholder="Ej. Combinación I" />
          </div>

          <div class="admin-form-wide">
            <p class="admin-form-subtitle">Números de la combinación</p>
            <div class="number-input-grid">
              ${numberFields(combination?.numeros || [])}
            </div>
          </div>

          <div class="admin-form-field admin-form-wide">
            <label class="admin-check-row">
              <input name="activa" type="checkbox" ${combination?.activa === false ? '' : 'checked'} />
              <span>
                <strong>Combinación activa</strong>
                <small>Las combinaciones inactivas no se muestran en la web pública.</small>
              </span>
            </label>
          </div>
        </div>

        <p class="admin-form-help">
          Al guardar, los seis números se ordenan de menor a mayor. El orden de la combinación debe ser único dentro de la temporada.
        </p>

        <div id="combinationFormError" class="admin-error"></div>
      </form>
    `,
    actions: `
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="combinationForm" id="combinationSave">
        ${editing ? 'Guardar cambios' : 'Crear combinación'}
      </button>
    `
  });

  const form = modal.querySelector('#combinationForm');
  const saveButton = modal.querySelector('#combinationSave');
  const errorBox = modal.querySelector('#combinationFormError');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.remove('visible');
    saveButton.disabled = true;
    saveButton.textContent = 'Guardando…';

    try {
      const data = new FormData(form);
      const order = Number(data.get('numero_orden'));

      if (!Number.isInteger(order) || order < 1 || order > 99) {
        throw new Error('El orden debe ser un número entre 1 y 49.');
      }

      const duplicateOrder = combinations.some(
        (row) =>
          Number(row.numero_orden) === order &&
          String(row.id) !== String(combination?.id || '')
      );

      if (duplicateOrder) {
        throw new Error('Ya existe otra combinación con ese número de orden.');
      }

      const payload = {
        temporada_id: season.id,
        numero_orden: order,
        nombre: String(data.get('nombre') || '').trim() || `Combinación ${order}`,
        numeros: readNumbers(form),
        activa: data.get('activa') === 'on'
      };

      await onSave(payload);
      closeModal();
    } catch (error) {
      errorBox.textContent = error?.message || 'No se pudo guardar la combinación.';
      errorBox.classList.add('visible');
      saveButton.disabled = false;
      saveButton.textContent = editing ? 'Guardar cambios' : 'Crear combinación';
    }
  });
}
