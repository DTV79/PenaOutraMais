export function money(value) {
  return new Intl.NumberFormat('es-ES', {
    useGrouping: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0)) + ' €';
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-ES', {
    useGrouping: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
