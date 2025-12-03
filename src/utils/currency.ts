// Formatear moneda en guaraníes con separador de miles paraguayo (punto)
export function formatGuaranies(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
