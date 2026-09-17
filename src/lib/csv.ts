/**
 * One CSV cell, quoted and escaped.
 *
 * A cell beginning with `=`, `+`, `-` or `@` is prefixed with an apostrophe so
 * a spreadsheet opens it as text rather than evaluating it as a formula —
 * subscriber emails are user-supplied and an export lands straight in Excel.
 */
export function csvCell(value: string | number | Date | null | undefined): string {
  let text =
    value === null || value === undefined
      ? ''
      : value instanceof Date
        ? value.toISOString()
        : String(value);

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(cells: Array<string | number | Date | null | undefined>): string {
  return cells.map(csvCell).join(',');
}
