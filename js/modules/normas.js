import { fallbackRules } from '../data/fallback.js';

export function renderRules() {
  const container = document.querySelector('#rules');
  if (!container) return;

  container.innerHTML = fallbackRules.map(([title, text], index) => `
    <article class="rule-card">
      <span class="rule-number">${index + 1}</span>
      <div>
        <strong>${title}</strong>
        <p>${text}</p>
      </div>
    </article>
  `).join('');
}
