import { calculateAbc, FIELDS, GROUPS, pythonSum, validateTargets } from '../core/abc';
import type { Analysis, Group } from '../core/abc';
import type { Workbook, Worksheet } from 'exceljs';

export const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const REPORT_FILENAME = 'abc_stok_analiz_raporu.xlsx';
export const TEMPLATE_FILENAME = 'stok_sablonu.xlsx';
export const REPORT_HEADERS = [...FIELDS, 'Yıllık Değer (TL)', 'Değer Payı (%)', 'Kümülatif Pay (%)', 'ABC Grubu'];
const WIDTHS: Record<string, number> = {
  'Ürün': 30, 'Yıllık Tüketim': 20, 'Birim Fiyat (TL)': 22, 'Yıllık Değer (TL)': 24,
  'Toplam Değer (TL)': 24, 'Değer Payı (%)': 20, 'Kümülatif Pay (%)': 22, 'ABC Grubu': 17,
};
const GROUP_FILL: Record<Group, string> = { A: '00DCE2FF', B: '00FFF0D6', C: '00D7F8EE' };
const EMPTY_ERROR = 'Excel raporu oluşturmak için ürün içeren geçerli bir analiz gereklidir.';
const CONSISTENCY_ERROR = 'Rapor için filtrelenmemiş, değiştirilmemiş tam analiz gereklidir. Analizi yeniden oluşturun.';

function fullAnalysis(input: Analysis): Analysis {
  if (!input || !Array.isArray(input.rows) || !input.rows.length) throw new Error(EMPTY_ERROR);
  try { validateTargets(input.targets); }
  catch { throw new Error('Excel raporu için hedef payların toplamı %100 olmalıdır.'); }
  // The caller must pass the original analysis, never a chart's filtered rows.
  if (!input.insights || input.rows.length !== GROUPS.reduce((count, group) => count + input.insights.counts[group], 0)) {
    throw new Error(CONSISTENCY_ERROR);
  }
  if (input.rows.length > 100_000) throw new Error('Excel raporu en fazla 100.000 ürün içerebilir.');
  const analysis = calculateAbc({ columns: [...FIELDS], rows: input.rows.map(row => [row.product, row.quantity, row.price]) }, input.targets);
  if (analysis.total !== input.total || analysis.rows.some((row, index) => {
    const original = input.rows[index];
    return row.product !== original.product || row.group !== original.group || row.value !== original.value
      || row.share !== original.share || row.cumulative !== original.cumulative;
  })) throw new Error(CONSISTENCY_ERROR);
  return analysis;
}

function styleSheet(sheet: Worksheet, headings: readonly string[]): void {
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2', showGridLines: false }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: headings.length } };
  sheet.getRow(1).height = 30;
  headings.forEach((heading, index) => {
    const column = sheet.getColumn(index + 1);
    column.width = WIDTHS[heading] ?? 26;
    const header = sheet.getCell(1, index + 1);
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00243959' } };
    header.font = { name: 'Calibri', bold: true, color: { argb: '00FFFFFF' } };
    header.alignment = { horizontal: 'center', vertical: 'middle' };
    column.eachCell({ includeEmpty: false }, (cell, row) => {
      if (row === 1) return;
      if (row % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00F1F5FB' } };
      if (['Birim Fiyat (TL)', 'Yıllık Değer (TL)', 'Toplam Değer (TL)'].includes(heading)) cell.numFmt = '#,##0.00 "TL"';
      else if (['Değer Payı (%)', 'Kümülatif Pay (%)'].includes(heading)) cell.numFmt = '0.00"%"';
      else if (heading === 'Yıllık Tüketim') cell.numFmt = '#,##0.##';
      else if (heading === 'ABC Grubu' && GROUPS.includes(cell.value as Group)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GROUP_FILL[cell.value as Group] } };
        cell.font = { bold: true, color: { argb: '0017243A' } };
      }
    });
  });
}

function addSheet(book: Workbook, name: string, headings: readonly string[], rows: (string | number)[][]): void {
  const sheet = book.addWorksheet(name);
  sheet.addRow([...headings]);
  for (const row of rows) {
    // ExcelJS only writes a formula for an explicit {formula: ...} object.
    // Strings, including =/+/-/@ prefixes, remain strings without added apostrophes.
    sheet.addRow(row);
  }
  styleSheet(sheet, headings);
}

async function workbook(): Promise<Workbook> {
  const { default: ExcelJS } = await import('exceljs');
  return new ExcelJS.Workbook();
}

export async function createExcelReport(input: Analysis): Promise<Uint8Array> {
  const analysis = fullAnalysis(input);
  const book = await workbook();
  addSheet(book, 'ABC Analizi', REPORT_HEADERS, analysis.rows.map(row => [
    row.product, row.quantity, row.price, row.value, row.share, row.cumulative, row.group,
  ]));
  // Match create_excel's denominator: sum of grouped values, not the original Series.sum.
  const total = pythonSum(analysis.summary.map(group => group.value));
  addSheet(book, 'Grup Özeti', ['ABC Grubu', 'Ürün Sayısı', 'Toplam Değer (TL)', 'Değer Payı (%)'],
    analysis.summary.map(group => [group.group, group.count, group.value, group.value / total * 100]));
  const { a, b, c } = analysis.targets;
  addSheet(book, 'Analiz Ayarları', ['Ayar', 'Değer'], [
    ['A hedef payı', `%${a}`], ['B hedef payı', `%${b}`], ['C hedef payı', `%${c}`],
    ['Sınıflandırma kuralı', 'Sınırı aşan ürün başladığı grupta kalır.'],
  ]);
  return new Uint8Array(await book.xlsx.writeBuffer());
}

export async function createExcelTemplate(): Promise<Uint8Array> {
  const book = await workbook();
  addSheet(book, 'Stok Şablonu', FIELDS, []);
  return new Uint8Array(await book.xlsx.writeBuffer());
}
