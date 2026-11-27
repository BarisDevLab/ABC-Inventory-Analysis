import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';
import { calculateAbc, DEFAULT_TARGETS, FIELDS, SKU_FIELD } from '../src/core/abc';
import type { Cell, InputTable } from '../src/core/abc';
import { compareAnalyses } from '../src/core/comparison';
import { createExcelReport } from '../src/export/excel-report';
import { decodePackage, encodePackage } from '../src/io/analysis-package';
import { DEFAULT_IMPORT, prepareImport } from '../src/io/inventory-import';
import { FILE_LIMITS } from '../src/io/read-file';
import { runAnalysisRequest } from '../src/processing/operations';
import reference from './fixtures/file-golden.json';

const csv = (text: string) => new TextEncoder().encode(text).buffer;
const fixture = (filename: string) =>
  Uint8Array.from(readFileSync(new URL(`./fixtures/files/${filename}`, import.meta.url))).buffer;

describe('Dosya seçimi ve eşleştirme', () => {
  for (const sample of reference.cases.filter(sample => sample.expected)) {
    it(`${sample.filename} tarayıcıda eski şablon gibi doğrudan açılır`, async () => {
      const { result } = await prepareImport(fixture(sample.filename), sample.filename, DEFAULT_IMPORT, DEFAULT_TARGETS, 'open');
      expect(result?.analysis.rows.map(row => row.product)).toEqual(sample.expected?.products);
      expect(result?.analysis.rows.map(row => row.value)).toEqual(sample.expected?.values);
      expect(result?.analysis.rows.map(row => row.group)).toEqual(sample.expected?.groups);
    });
  }

  it('CSV bilgi satırından sonra gelen uluslararası başlığı önizler ve sütunları eşler', async () => {
    const bytes = csv('2026 Envanter raporu\nUNIT PRICE;SKU;PRODUCT;QUANTITY\n1,234.50;001;Vida;2\n1.234,50;NA;Vida;3');
    const opened = await prepareImport(bytes, 'veri.csv', DEFAULT_IMPORT, DEFAULT_TARGETS, 'open');
    expect(opened.result).toBeUndefined();
    expect(opened.preview.rows[1].cells).toEqual(['UNIT PRICE', 'SKU', 'PRODUCT', 'QUANTITY']);
    const config = { ...DEFAULT_IMPORT, header: 2 };
    const { preview } = await prepareImport(bytes, 'veri.csv', config, DEFAULT_TARGETS, 'preview');
    expect(preview.suggested).toEqual([2, 3, 0, 1]);
    const { result } = await prepareImport(bytes, 'veri.csv', { ...config, mapping: preview.suggested }, DEFAULT_TARGETS, 'apply');
    expect(result?.analysis.total).toBe(6172.5);
    expect(result?.analysis.rows.map(row => row.sku)).toEqual(['NA', '001']);
  });

  it('boş ilk Excel sayfasından ikinciye geçer, fiziksel başlığı ve biçimlendirilmiş SKU’yu korur', async () => {
    const book = new ExcelJS.Workbook();
    book.addWorksheet('Boş');
    const sheet = book.addWorksheet('Dönem 2');
    sheet.getCell('A2').value = 'Dönem 2 verileri';
    sheet.getRow(4).values = ['Kod', 'Ad', 'Adet', 'Birim'];
    sheet.getRow(5).values = [42, 'Ürün', 2, { formula: '8/2', result: 4 }];
    sheet.getCell('A5').numFmt = '00000';
    const bytes = Uint8Array.from(new Uint8Array(await book.xlsx.writeBuffer())).buffer;
    const opened = await prepareImport(bytes, 'dönem.xlsx', DEFAULT_IMPORT, DEFAULT_TARGETS, 'open');
    expect(opened.preview.sheets).toEqual(['Boş', 'Dönem 2']);
    expect(opened.preview.rowCount).toBe(0);
    const config = { ...DEFAULT_IMPORT, sheet: 1, header: 4 };
    const { preview } = await prepareImport(bytes, 'dönem.xlsx', config, DEFAULT_TARGETS, 'preview');
    expect(preview.rows).toContainEqual({ number: 5, cells: ['00042', 'Ürün', 2, 4] });
    const { result } = await prepareImport(bytes, 'dönem.xlsx', { ...config, mapping: [1, 2, 3, 0] }, DEFAULT_TARGETS, 'apply');
    expect(result?.analysis.rows[0]).toMatchObject({ sku: '00042', value: 8 });
  });

  it('eski ondalık yorumunu uyarır ve seçilen biçime göre sonucu yeniden hesaplar', async () => {
    const bytes = csv(FIELDS.join(';') + '\nVida;1,234;1.234\nMotor;1;2');
    const name = 'sayı.csv';
    const { result } = await prepareImport(bytes, name, DEFAULT_IMPORT, DEFAULT_TARGETS, 'open');
    expect(result?.analysis.rows.find(row => row.product === 'Vida')?.value).toBe(1.234 ** 2);
    expect(result?.warnings).toEqual({
      count: 2,
      examples: [
        { row: 2, field: FIELDS[1], text: '1,234' },
        { row: 2, field: FIELDS[2], text: '1.234' },
      ],
    });
    for (const numbers of ['tr', 'international'] as const) {
      const { result } = await prepareImport(bytes, name, { ...DEFAULT_IMPORT, numbers, mapping: [0, 1, 2, -1] }, DEFAULT_TARGETS, 'apply');
      expect(result?.analysis.total).toBeCloseTo(1524.756);
      expect(result?.analysis.rows[0].quantity).toBe(numbers === 'tr' ? 1.234 : 1234);
      expect(result?.warnings.count).toBe(0);
    }
  });

  it('açık sayı biçimi Unicode rakamları, boşluklu binlik grupları ve üslü gösterimi okur', async () => {
    const bytes = csv('Ad;Adet;Birim\nÜrün;１ ２３４;2,5e-1');
    const config = { ...DEFAULT_IMPORT, numbers: 'tr' as const, mapping: [0, 1, 2, -1] as [number, number, number, number] };
    const { result } = await prepareImport(bytes, 'sayı.csv', config, DEFAULT_TARGETS, 'apply');
    expect(result?.analysis.total).toBe(308.5);
  });

  it('yanlış gruplamayı, yinelenen eşleştirmeyi ve yinelenen SKU’yu reddeder', async () => {
    const bytes = csv('Item;Quantity;Unit Price;SKU\nA;12.34,5;3;01\nB;2;5;01');
    const config = { ...DEFAULT_IMPORT, mapping: [0, 1, 2, 3] as [number, number, number, number] };
    const strict = await prepareImport(bytes, 'test.csv', { ...config, numbers: 'tr' }, DEFAULT_TARGETS, 'apply');
    expect(strict.message).toContain('2. satır');
    const repeated = await prepareImport(bytes, 'test.csv', { ...config, mapping: [0, 1, 1, 3] }, DEFAULT_TARGETS, 'apply');
    expect(repeated.message).toContain('ayrı sütunlar');
    const invalidIds = await prepareImport(csv('Ad;Sayı;Fiyat;Ref\nA;1;3;01\nB;2;5;01'), 'test.csv', config, DEFAULT_TARGETS, 'apply');
    expect(invalidIds.message).toContain('Tekrarlanan ürün kodları');
  });

  it('özel içe aktarmada ZIP sınırını ve CSV hücre sınırını korur', async () => {
    const bytes = fixture('xlsx-demo.xlsx');
    const view = new DataView(bytes);
    for (let i = 0; i < view.byteLength - 46; i++) {
      if (view.getUint32(i, true) !== 0x02014b50) continue;
      view.setUint32(i + 24, FILE_LIMITS.inflatedBytes + 1, true);
      break;
    }
    await expect(prepareImport(bytes, 'oversize.xlsx', DEFAULT_IMPORT, DEFAULT_TARGETS, 'open')).rejects.toThrow('açılmış boyutu');
    const row = 'Vida;1;' + '1;'.repeat(997) + '1\n';
    await expect(prepareImport(csv('Ad;Miktar;Fiyat\n' + row.repeat(1001)), 'test.csv', DEFAULT_IMPORT, DEFAULT_TARGETS, 'open')).rejects.toThrow('çok fazla');
  });
});

function skuTable(rows: Cell[][]): InputTable {
  return { columns: [...FIELDS, SKU_FIELD], hasSku: true, rows };
}

describe('Karşılaştırma ve yerel analiz paketi', () => {
  it('geçişleri SKU ile sayar, giriş ve çıkışları matrise katmaz, parasal farkları hesaplar', async () => {
    const previous = skuTable([['Vida', 80, 1, '01'], ['Motor', 15, 1, '02'], ['Çıkan', 5, 1, '03'], ['Sıfır', 0, 1, '00']]);
    const current = calculateAbc(skuTable([['Yeni motor adı', 80, 1, '02'], ['Vida', 15, 1, '01'], ['Giren', 5, 1, '04'], ['Sıfır', 0, 1, '00']]));
    const comparison = compareAnalyses(calculateAbc(previous), current);
    expect(comparison).toMatchObject({
      identity: 'sku', added: 1, removed: 1, moved: 2, previousTotal: 100, currentTotal: 100, difference: 0, percent: 0,
      matrix: { A: { A: 0, B: 1, C: 0 }, B: { A: 1, B: 0, C: 0 }, C: { A: 0, B: 0, C: 1 } },
    });
    expect(comparison.changes.find(row => row.current?.sku === '02')).toMatchObject({ previous: { product: 'Motor' }, difference: 65, percent: 65 / 15 * 100 });
    expect(comparison.changes.find(row => row.previous?.sku === '03')).toMatchObject({ difference: -5, percent: -100 });
    expect(comparison.changes.find(row => row.current?.sku === '04')).toMatchObject({ difference: 5, percent: null });
    expect(comparison.changes.find(row => row.current?.sku === '00')?.percent).toBeNull();
    await expect(runAnalysisRequest({ kind: 'period', previous, current })).resolves.toEqual(comparison);
  });

  it('SKU iki tarafta yoksa Türkçe ürün adını kullanır ve belirsiz eşleştirmeyi durdurur', () => {
    const previous = calculateAbc({ columns: [...FIELDS], rows: [['İĞNE', 1, 40]] });
    const current = calculateAbc(skuTable([['iğne', 1, 50, '01']]));
    expect(compareAnalyses(previous, current)).toMatchObject({ identity: 'product', added: 0, removed: 0, difference: 10, percent: 25 });
    const ambiguous = calculateAbc(skuTable([['İĞNE', 1, 40, '01'], ['iğne', 1, 20, '02']]));
    expect(() => compareAnalyses(previous, ambiguous)).toThrow('her iki dönemde de');
  });

  it('eşik senaryosunu tam sınırlarla hesaplar ve mevcut analizi değiştirmez', async () => {
    const source = { columns: [...FIELDS], rows: [['A', 60, 1], ['B', 20, 1], ['C', 15, 1], ['D', 5, 1]] };
    const current = calculateAbc(source);
    const result = await runAnalysisRequest({ kind: 'scenario', source, current, targets: { a: 60, b: 20, c: 20 } });
    expect(result).toMatchObject({
      moved: 2, matrix: { A: { A: 1, B: 1, C: 0 }, B: { A: 0, B: 0, C: 1 }, C: { A: 0, B: 0, C: 1 } },
      classes: [{ group: 'A', current: { count: 1, value: 60 } }, { group: 'B', current: { count: 1, value: 20 } }, { group: 'C', current: { count: 2, value: 20 } }],
    });
    expect(current.rows.map(row => row.group)).toEqual(['A', 'A', 'B', 'C']);
  });

  it('JSON paketi hedefleri, eşit ürün sırasını ve SKU’yu saklar; sonuçları yeniden hesaplar', () => {
    const forbidden = vi.fn();
    vi.stubGlobal('fetch', forbidden);
    try {
      const original = calculateAbc(skuTable([['Ürün', 3, 3, '0002'], ['Ürün', 3, 3, '0001']]), { a: 50, b: 25, c: 25 });
      const snapshot = decodePackage(encodePackage('İlk dönem', original));
      expect(snapshot.name).toBe('İlk dönem');
      expect(snapshot.analysis).toEqual(original);
      expect(snapshot.source.rows.map(row => row[3])).toEqual(['0002', '0001']);
      expect(forbidden).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('geçersiz, sürümü bilinmeyen, sınır dışı veya sahte paketleri doğrular', () => {
    const valid = { kind: 'abc-inventory-analysis', version: 1, name: 'Veri', hasSku: false, targets: DEFAULT_TARGETS, rows: [['A', 2, 10]] };
    const decode = (update: object) => decodePackage(csv(JSON.stringify({ ...valid, ...update })));
    expect(() => decodePackage(csv('{'))).toThrow('Geçersiz');
    expect(() => decodePackage(new ArrayBuffer(FILE_LIMITS.bytes + 1))).toThrow('20 MiB');
    expect(() => decode({ version: 99 })).toThrow('sürümü desteklenmiyor');
    expect(() => decode({ targets: { a: 20, b: 20, c: 20 } })).toThrow('%100');
    expect(() => decode({ rows: [['A', '1', 2]] })).toThrow('Geçersiz');
    expect(() => decode({ rows: Array.from({ length: FILE_LIMITS.rows + 1 }, () => ['A', 1, 2]) })).toThrow('Geçersiz');
    expect(decode({ total: 999, analysis: { total: 999 } }).analysis.total).toBe(20);
  });

  it('SKU’ları Excel’de metin olarak dışa aktarır ve formüle çevrilmesini engeller', async () => {
    const analysis = calculateAbc(skuTable([['Aynı ad', 2, 10, '00042'], ['Aynı ad', 1, 4, '=1+1']]));
    const book = new ExcelJS.Workbook();
    const bytes = await createExcelReport(analysis);
    await book.xlsx.load(bytes.slice().buffer);
    const sheet = book.getWorksheet('ABC Analizi')!;
    expect(sheet.getCell('H1').value).toBe('SKU');
    expect(sheet.getCell('H2').value).toBe('00042');
    expect(sheet.getCell('H3').value).toBe('=1+1');
  });
});
