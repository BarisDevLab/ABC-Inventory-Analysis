import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import reference from './fixtures/file-reference.json';
import { calculateAbc, FIELDS } from '../src/core/abc';
import { analyzeInventoryFile, FILE_LIMITS, readInventoryFile } from '../src/io/read-file';

// Vite's exact ExcelJS alias selects the rebuilt UUID-patched browser bundle
// in both these tests and the page/workers. Never fall back to the old vendor dist.

const bytes = (filename: string) => new Uint8Array(readFileSync(new URL(`./fixtures/files/${filename}`, import.meta.url)));
const csv = (text: string) => new TextEncoder().encode(text);
const header = FIELDS.join(';') + '\n';

describe('Python ile CSV/Excel dosya karşılaştırması', () => {
  it('referans sonuçlar mevcut Python çekirdeğinden üretilmiştir', () => {
    const core = readFileSync(new URL('../../abc_core.py', import.meta.url));
    expect(createHash('sha256').update(core).digest('hex')).toBe(reference.metadata.core_sha256);
  });
  for (const test of reference.cases) it(test.name, async () => {
    const read = () => readInventoryFile(bytes(test.filename), test.filename);
    if (test.intentional_difference === 'duplicate-header') {
      expect(test.expected).toBeDefined(); // Python silently renames a duplicate header.
      await expect(read()).rejects.toThrow('Tekrarlanan sütun başlıkları var.');
    } else if (test.intentional_difference === 'long-row') {
      expect(test.expected).toBeDefined(); // Python silently makes the first field an index.
      await expect(read()).rejects.toThrow('CSV dosyası okunamadı.');
    } else if (test.intentional_difference === 'nul') {
      expect(test.expected).toBeDefined();
      await expect(read()).rejects.toThrow('NUL');
    } else if (test.intentional_difference === 'product-code-inference') {
      const table = await read();
      const analysis = calculateAbc(table);
      expect(test.expected?.products).toEqual(['2', '1']);
      expect(analysis.rows.map(row => row.product)).toEqual(['002', '001']);
      expect(analysis.total).toBe(test.expected?.total);
    } else if (test.error) {
      await expect(read().then(calculateAbc)).rejects.toThrow(test.error);
    } else {
      const result = calculateAbc(await read());
      expect(result.total).toBeCloseTo(test.expected!.total, 9);
      expect(result.rows.map(row => row.product)).toEqual(test.expected!.products);
      expect(result.rows.map(row => row.group)).toEqual(test.expected!.groups);
      expect(result.rows.map(row => row.value)).toEqual(test.expected!.values);
    }
  });
});

describe('Tarayıcı dosya giriş sözleşmesi ve gizlilik', () => {
  it('File nesnesiyle hedefleri kullanır, dış bağlantı yapmaz', async () => {
    const forbidden = vi.fn(() => { throw new Error('Dış bağlantı yasak'); });
    vi.stubGlobal('fetch', forbidden);
    vi.stubGlobal('XMLHttpRequest', forbidden);
    vi.stubGlobal('WebSocket', forbidden);
    try {
      for (const filename of ['csv-cp1254-semicolon.csv', 'xlsx-demo.xlsx', 'xlsx-hyperlink.xlsx']) {
        const file = new File([bytes(filename)], filename);
        const result = await analyzeInventoryFile(file, { a: 0, b: 100, c: 0 });
        expect(result.total).toBe(304000);
        expect(result.rows.every(row => row.group === 'B')).toBe(true);
      }
      expect(forbidden).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
  it('okuyucu ürün giriş sırasını korur; sadece çekirdek sıralar', async () => {
    const table = await readInventoryFile(csv(header+'Vida;1;1\nMotor;2;3\n'), 'test.CSV');
    expect(table.rows.map(row => row[0])).toEqual(['Vida', 'Motor']);
    expect(calculateAbc(table).rows.map(row => row.product)).toEqual(['Motor', 'Vida']);
  });
  it('fazla sütunlar ve boş yardımcı hücreler hesaplamayı etkilemez', async () => {
    const table = await readInventoryFile(bytes('csv-extra-column.csv'), 'file.csv');
    expect(table.columns.length).toBe(4);
    expect(calculateAbc(table).total).toBe(8);
  });
  it('büyük dosyayı okumadan reddeder', async () => {
    const arrayBuffer = vi.fn();
    await expect(analyzeInventoryFile({name:'large.xlsx',size:FILE_LIMITS.bytes+1,arrayBuffer})).rejects.toThrow('20 MB');
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
  it('sıfır baytlı xlsx dosyası Türkçe boş dosya mesajı verir', async () => {
    await expect(readInventoryFile(new ArrayBuffer(0), 'empty.xlsx')).rejects.toThrow('Dosya boş.');
  });
  it('başka tamponun alt görünümünü doğru okur ve girdiyi değiştirmez', async () => {
    const raw = csv(header+'Vida;1;2\n');
    const combined = new Uint8Array(raw.length + 4); combined.set(raw, 2);
    const before = combined.slice();
    expect(calculateAbc(await readInventoryFile(combined.subarray(2,-2),'slice.csv')).total).toBe(2);
    expect(combined).toEqual(before);
  });
  it('xlsx alt görünümünü doğru okur', async () => {
    const raw = bytes('xlsx-demo.xlsx'), wrapped = new Uint8Array(raw.length + 8);
    wrapped.set(raw, 4);
    expect(calculateAbc(await readInventoryFile(wrapped.subarray(4,-4),'slice.xlsx')).total).toBe(304000);
  });
  it('ZIP şifreli giriş bayrağını güvenli biçimde reddeder', async () => {
    const raw = bytes('xlsx-demo.xlsx');
    const view = new DataView(raw.buffer);
    for (let i = 0; i < raw.length - 46; i++) if (view.getUint32(i,true) === 0x02014b50) {
      view.setUint16(i + 8, view.getUint16(i + 8,true) | 1,true); break;
    }
    await expect(readInventoryFile(raw,'encrypted.xlsx')).rejects.toThrow('parola koruması olmayan');
  });
  it('bildirilen açılmış ZIP boyutunu yüklemeden sınırlar', async () => {
    const raw = bytes('xlsx-demo.xlsx'), view = new DataView(raw.buffer);
    for (let i = 0; i < raw.length - 46; i++) if (view.getUint32(i,true) === 0x02014b50) {
      view.setUint32(i + 24, FILE_LIMITS.inflatedBytes + 1, true); break;
    }
    await expect(readInventoryFile(raw,'bomb.xlsx')).rejects.toThrow('açılmış boyutu çok büyük');
  });
  it('satır sınırını Türkçe mesajla bildirir', async () => {
    await expect(readInventoryFile(csv(header+'a;1;1\n'.repeat(FILE_LIMITS.rows+1)),'rows.csv')).rejects.toThrow('çok fazla satır');
  });
  it('ZIP merkez dizinindeki sahte küçük açılmış boyutu reddeder', async () => {
    const raw=bytes('xlsx-demo.xlsx'),view=new DataView(raw.buffer);
    for(let i=0;i<raw.length-46;i++)if(view.getUint32(i,true)===0x02014b50){view.setUint32(i+24,1,true);break;}
    await expect(readInventoryFile(raw,'forged.xlsx')).rejects.toThrow('Excel dosyası okunamadı');
  });
  it('ZIP yerel başlığı ile merkez dizinindeki sıkıştırma çelişkisini reddeder',async()=>{
    const raw=bytes('xlsx-demo.xlsx'),view=new DataView(raw.buffer);
    view.setUint16(8,99,true);
    await expect(readInventoryFile(raw,'bad-local.xlsx')).rejects.toThrow('Excel dosyası okunamadı');
  });
});
