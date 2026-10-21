export function renderMembers() {
  const container = document.querySelector('#members');
  if (!container) return;

  container.innerHTML = `
    <article class="section-card compact">
      <p class="muted no-margin">
        El detalle individual de cuotas y pagos es privado y se consulta desde la zona de administración.
      </p>
    </article>
  `;
}

export function initQuotaFilters() {
  // El detalle individual ya no se expone en la web pública.
}
