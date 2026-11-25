import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { v3,v5,v6 } from 'uuid';
import ExcelJS from 'exceljs';
import { number } from '../src/ui/format';
describe('Güvenli bağımlılık ve tarayıcı paketi sözleşmesi',()=>{
  it('test ve uygulama yeniden üretilmiş güvenli ExcelJS paketini kullanır',()=>{
    const root=process.cwd();const manifest=JSON.parse(readFileSync(resolve(root,'src/generated/provenance.json'),'utf8'));
    expect(manifest.uuid).toBe('11.1.1');expect(manifest.exceljs).toBe('4.4.0');expect(manifest.usesPrebuiltExcelJs).toBe(false);expect(manifest.ellipticCryptoExcluded).toBe(true);
    const artifact=readFileSync(resolve(root,'src/generated/exceljs-browser.cjs'));
    expect(createHash('sha256').update(artifact).digest('hex')).toBe(manifest.artifactSha256);
    expect(manifest.uuidModules).toContain('dist/cjs-browser/v35.js');
  });
  it('UUID v3 ve v5 küçük dış tampona sessiz yazmaz',()=>{
    const namespace='6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    for(const fn of [v3,v5])expect(()=>fn('abc',namespace,new Uint8Array(8),4)).toThrow(RangeError);
  });
  it('UUID v6 küçük dış tampona sessiz yazmaz',()=>{
    expect(()=>v6({},new Uint8Array(8),4)).toThrow(RangeError);
  });
  it('dar crypto uyarlayıcısı ExcelJS sayfa korumasını bozmaz',async()=>{
    const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Kontrol');sheet.addRow(['Sentetik']);
    await sheet.protect('yalnizca-test',{spinCount:10});
    const data=await book.xlsx.writeBuffer(),reopened=new ExcelJS.Workbook();await reopened.xlsx.load(data);
    expect(reopened.getWorksheet('Kontrol')!.getCell('A1').value).toBe('Sentetik');
    // ExcelJS's declaration omits the stored protection metadata present at runtime.
    const protectedSheet=reopened.getWorksheet('Kontrol') as unknown as {sheetProtection:Record<string,unknown>};
    expect(protectedSheet.sheetProtection).toMatchObject({algorithmName:'SHA-512',spinCount:10});
  });
  it('önbellekli Türkçe sayı biçimleri aynı sonucu verir',()=>{
    expect(number(1234.56)).toBe('1.234,56');expect(number(1234.56,1)).toBe('1.234,6');expect(number(1234.56)).toBe('1.234,56');expect(number(-0)).toBe('0,00');
  });
});
