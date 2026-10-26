/** Date-only values use local noon, never UTC, to avoid shifting a selected day. */
export function parsePickerDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return null;
  const [year, month, day = 1] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date : null;
}

export function pickerDateValue(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Monday-first month cells, with blank leading/trailing cells for complete weeks. */
export function pickerMonthCells(year: number, month: number): (number | null)[] {
  const offset = (new Date(year, month, 1, 12).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0, 12).getDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day > 0 && day <= count ? day : null;
  });
}
