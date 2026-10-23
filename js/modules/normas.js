import { fallbackRules } from '../data/fallback.js';
import { SUPABASE_CONFIG } from '../config/supabase-config.js';

const STATUTES_PATH = 'documentos-publicos/estatutos/estatutos-vigentes.pdf';

async function showStatutesPdf() {
  const card = document.querySelector('#statutesPdfCard');
  const link = document.querySelector('#statutesPdfLink');
  if (!card || !link) return;

  const url = `${SUPABASE_CONFIG.url}/storage/v1/object/public/${STATUTES_PATH}`;

  try {
    const response = await fetch(`${url}?check=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store'
    });

    if (!response.ok) return;

    link.href = url;
    card.hidden = false;
  } catch {
    // Si todavía no hay PDF publicado, el bloque permanece oculto.
  }
}

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

  showStatutesPdf();
}
