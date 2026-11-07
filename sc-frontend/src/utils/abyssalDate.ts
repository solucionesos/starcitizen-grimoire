/**
 * Codex Oblivionis Parte II §2.1:
 * Toda referencia temporal debe situarse en el siglo XXX (+930 años respecto al calendario del siglo XXI).
 * Ejemplo: 2026 -> Ciclo 2956. Prohibido mostrar años del siglo XXI.
 */

const MONTHS_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export function toAbyssalYear(year: number): number {
  return year < 2500 ? year + 930 : year;
}

export function formatAbyssalDate(
  dateInput: string | Date | null | undefined,
  options: { includeTime?: boolean; prefixCycle?: boolean } = {}
): string {
  if (!dateInput) return 'Ciclo Indeterminado';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) {
    // Si es un texto libre, reemplazar cualquier ocurrencia de 2024..2030 por su equivalente +930
    return String(dateInput).replace(/\b(202\d)\b/g, (_, y) => String(Number(y) + 930));
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS_ES[d.getMonth()];
  const abyssalYear = toAbyssalYear(d.getFullYear());
  const cycleText = options.prefixCycle ? `Ciclo ${abyssalYear}` : `${abyssalYear}`;

  if (options.includeTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${cycleText} · ${hours}:${mins} UTC`;
  }

  return `${day} ${month} ${cycleText}`;
}
