const MAIN_VIEWS = ['inicio','numeros','premios','cuotas','mas'];

export function navigate(target) {
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === target);
  });

  const activeNav = MAIN_VIEWS.includes(target)
    ? target
    : (target === 'historico' || target === 'normas' ? 'mas' : 'inicio');

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.go === activeNav);
  });

  window.history.replaceState(null, '', '#' + target);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function initNavigation() {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-go]');
    if (trigger) {
      navigate(trigger.dataset.go);
    }
  });

  const initialView = window.location.hash.replace('#', '');
  if (initialView && document.getElementById(initialView)) {
    navigate(initialView);
  }
}
