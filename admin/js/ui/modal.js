export function closeModal() {
  document.querySelector('.admin-modal-backdrop')?.remove();
  document.body.classList.remove('modal-open');
}

export function openModal({ title, subtitle = '', content = '', actions = '' }) {
  closeModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'admin-modal-backdrop';
  backdrop.innerHTML = `
    <section class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">
      <header class="admin-modal-header">
        <div>
          ${subtitle ? `<p class="eyebrow">${subtitle}</p>` : ''}
          <h2 id="adminModalTitle">${title}</h2>
        </div>
        <button class="admin-modal-close" type="button" data-modal-close aria-label="Cerrar">×</button>
      </header>
      <div class="admin-modal-body">${content}</div>
      ${actions ? `<footer class="admin-modal-actions">${actions}</footer>` : ''}
    </section>
  `;

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop || event.target.closest('[data-modal-close]')) {
      closeModal();
    }
  });

  document.body.appendChild(backdrop);
  document.body.classList.add('modal-open');
  return backdrop;
}

export function confirmModal({
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  extraContent = ''
}) {
  return new Promise((resolve) => {
    const modal = openModal({
      title,
      content: `
        <p class="admin-confirm-text">${message}</p>
        ${extraContent}
      `,
      actions: `
        <button class="admin-action secondary" type="button" data-modal-cancel>${cancelText}</button>
        <button class="admin-action ${danger ? 'danger' : ''}" type="button" data-modal-confirm>${confirmText}</button>
      `
    });

    modal.querySelector('[data-modal-cancel]')?.addEventListener('click', () => {
      closeModal();
      resolve(false);
    });

    modal.querySelector('[data-modal-confirm]')?.addEventListener('click', () => {
      closeModal();
      resolve(true);
    });
  });
}
