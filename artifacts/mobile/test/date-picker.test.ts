import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePickerDate, pickerDateValue, pickerMonthCells } from '../utils/datePicker.ts';

test('accepts real calendar dates and rejects impossible dates', () => {
  assert.equal(parsePickerDate('2024-02-29')?.getDate(), 29);
  assert.equal(parsePickerDate('2025-02-29'), null);
  assert.equal(parsePickerDate('2025-04-31'), null);
  assert.equal(parsePickerDate('2025-13-01'), null);
  assert.equal(parsePickerDate('2025-1-01'), null);
  assert.equal(parsePickerDate(''), null);
});

test('keeps day and month values in local calendar format', () => {
  assert.equal(pickerDateValue(2026, 9, 26), '2026-10-26');
  assert.equal(pickerDateValue(2026, 9, 26).slice(0, 7), '2026-10');
  assert.equal(parsePickerDate('2026-10')?.getMonth(), 9);
});

test('month grid starts on Monday and includes leap days', () => {
  const cells = pickerMonthCells(2024, 1);
  assert.equal(cells.length % 7, 0);
  assert.equal(cells[3], 1);
  assert.equal(cells.filter((cell) => cell !== null).length, 29);
});
