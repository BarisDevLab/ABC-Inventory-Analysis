import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';
import reference from './fixtures/report-reference.json';
import { calculateAbc, sampleData } from '../src/core/abc';
import type { Analysis, InputTable } from '../src/core/abc';
import { createExcelReport, createExcelTemplate, EXCEL_MIME, REPORT_FILENAME, TEMPLATE_FILENAME } from '../src/export/excel-report';
import { handleReportRequest } from '../src/export/report-worker';
import { downloadExcel, saveExcelFile } from '../src/export/download';
import type { ReportResponse } from '../src/export/report-worker';

// The shared Vite alias exercises the same UUID-patched ExcelJS bundle as the app.

function close(actual: unknown, expected: unknown) {
  if (typeof expected === 'number') {
    expect(typeof actual).toBe('number');
    expect(Math.abs((actual as number)-expected)).toBeLessThanOrEqual(Math.max(Number.MIN_VALUE,Math.abs(expected)*1e-13));
  } else expect(actual).toEqual(expected);
}

describe('Python Excel raporu/şablon eşdeğerliği', () => {
  it('Python referansının kaynak özeti güncel', () => {
    expect(createHash('sha256').update(readFileSync(new URL('../../abc_core.py',import.meta.url))).digest('hex')).toBe(reference.metadata.core_sha256);
  });
  for (const test of reference.cases) it(test.name, async () => {
    const buffer = test.template ? await createExcelTemplate()
      : await createExcelReport(calculateAbc(test.source as InputTable,test.targets));
    // Synthetic outputs, independently reopened by scripts/report_reference.py --verify.
    const output = new URL('../.tmp/report-validation/',import.meta.url);
    mkdirSync(output,{recursive:true});
    writeFileSync(new URL(`${test.name}.xlsx`,output),buffer);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(buffer.slice().buffer);
    expect(book.worksheets.map(sheet => sheet.name)).toEqual(test.sheets.map(sheet => sheet.name));
    test.sheets.forEach((expected,index) => {
      const sheet=book.worksheets[index];
      expect(sheet.rowCount).toBe(expected.rows);
      expect(sheet.columnCount).toBe(expected.columns);
      expect(sheet.autoFilter).toBe(expected.filter);
      const view=sheet.views[0];
      expect(view.state).toBe('frozen');
      if (view.state === 'frozen') expect(view.ySplit).toBe(1);
      expect(sheet.views[0].showGridLines).toBe(false);
      expect(sheet.getRow(1).height).toBe(expected.header_height);
      expected.widths.forEach((width,index) => expect(sheet.getColumn(index+1).width).toBe(width));
      for (const cell of expected.cells) {
        const actual=sheet.getCell(cell.coordinate);
        close(actual.value,cell.value);
        expect(actual.type).toBe(cell.type === 's' ? ExcelJS.ValueType.String : ExcelJS.ValueType.Number);
        expect(actual.numFmt || 'General').toBe(cell.format);
        if (cell.fill.pattern) {
          expect(actual.fill).toMatchObject({type:'pattern',pattern:cell.fill.pattern});
          expect((actual.fill as ExcelJS.FillPattern).fgColor?.argb).toBe(cell.fill.color?.value);
        }
        const font=actual.font ?? {name:'Calibri',size:11,bold:false}; // XML style 0: default font.
        expect(font.name ?? null).toBe(cell.font.name);
        expect(font.size ?? null).toBe(cell.font.size);
        expect(font.bold ?? false).toBe(cell.font.bold);
        expect(actual.alignment?.horizontal ?? null).toBe(cell.alignment.horizontal);
        const vertical=actual.alignment?.vertical === 'middle' ? 'center' : actual.alignment?.vertical ?? null;
        expect(vertical).toBe(cell.alignment.vertical);
        for (const side of ['left','right','top','bottom'] as const) expect(actual.border?.[side]?.style ?? null).toBe(cell.border[side]);
      }
    });
  });
});

describe('Tam analiz ve formül güvenliği', () => {
  it('boş analiz anlaşılır hata verir', async () => {
    const empty={...calculateAbc(sampleData()),rows:[]};
    await expect(createExcelReport(empty)).rejects.toThrow('ürün içeren geçerli bir analiz');
  });
  it('grafik için filtrelenmiş ürün dizisini rapor kabul etmez', async () => {
    const full=calculateAbc(sampleData());
    await expect(createExcelReport({...full,rows:full.rows.slice(0,2)})).rejects.toThrow('filtrelenmemiş');
    const book=new ExcelJS.Workbook();
    await book.xlsx.load((await createExcelReport(full)).slice().buffer);
    expect(book.worksheets[0].rowCount).toBe(6);
  });
  it('değiştirilmiş sonuçları sessizce raporlamaz', async () => {
    for (const field of ['total','value','share','cumulative','group'] as const) {
      const analysis=structuredClone(calculateAbc(sampleData()));
      if (field==='total') analysis.total++;
      else if (field==='group') analysis.rows[0].group='C';
      else analysis.rows[0][field]++;
      await expect(createExcelReport(analysis)).rejects.toThrow('tam analiz');
    }
  });
  it('geçersiz rapor hedeflerini reddeder', async () => {
    const analysis=calculateAbc(sampleData());
    await expect(createExcelReport({...analysis,targets:{a:80,b:15,c:10}})).rejects.toThrow('hedef payların toplamı');
  });
  it('ürün isimlerine kesme işareti eklemez veya formül oluşturmaz', async () => {
    const names=['=1+1','+SUM(A1:A2)','-1+2','@SUM(A1:A2)'];
    const analysis=calculateAbc({columns:sampleData().columns,rows:names.map(name=>[name,1,1])});
    const before=structuredClone(analysis);
    const book=new ExcelJS.Workbook(); await book.xlsx.load((await createExcelReport(analysis)).slice().buffer);
    names.forEach((name,index)=>{
      const cell=book.worksheets[0].getCell(index+2,1);
      expect(cell.value).toBe(name); expect(cell.type).toBe(ExcelJS.ValueType.String);
    });
    expect(analysis).toEqual(before);
  });
  it('rapor ve şablon üretimi dış bağlantı yapmaz', async () => {
    const forbidden=vi.fn(()=>{throw new Error('Dış bağlantı yasak');});
    vi.stubGlobal('fetch',forbidden); vi.stubGlobal('XMLHttpRequest',forbidden); vi.stubGlobal('WebSocket',forbidden);
    try { await createExcelReport(calculateAbc(sampleData())); await createExcelTemplate(); expect(forbidden).not.toHaveBeenCalled(); }
    finally { vi.unstubAllGlobals(); }
  });
  it('worker işleyicisi rapor ve hata sonucunu tipli mesajla döndürür', async () => {
    expect((await handleReportRequest({kind:'template'})).ok).toBe(true);
    const success=await handleReportRequest({kind:'report',analysis:calculateAbc(sampleData())});
    expect(success.ok).toBe(true);
    if (success.ok) expect(success.buffer.byteLength).toBeGreaterThan(1000);
    const result=await handleReportRequest({kind:'report',analysis:{rows:[]} as unknown as Analysis});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('geçerli bir analiz');
  });
});

describe('Tarayıcı indirme ve worker yaşam döngüsü',()=>{
  function environment() {
    const terminate=vi.fn(),postMessage=vi.fn(),click=vi.fn(),remove=vi.fn(),appendChild=vi.fn();
    const anchor={href:'',download:'',click,remove};
    const create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:local-test');
    const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    vi.stubGlobal('document',{createElement:vi.fn(()=>anchor),body:{appendChild}});
    let worker: { onmessage?: (event:{data:ReportResponse})=>void; onerror?:()=>void; onmessageerror?:()=>void; terminate:typeof terminate;postMessage:typeof postMessage };
    vi.stubGlobal('Worker',class { constructor(){worker=this;} terminate=terminate;postMessage=postMessage; });
    return {terminate,postMessage,click,remove,appendChild,anchor,create,revoke,worker:()=>worker!};
  }
  it('Blob MIME, yerel bağlantı ve URL temizliği doğrudur',()=>{
    vi.useFakeTimers(); const env=environment();
    try {
      saveExcelFile(new ArrayBuffer(8),REPORT_FILENAME);
      expect(env.create.mock.calls[0][0]).toBeInstanceOf(Blob);
      expect((env.create.mock.calls[0][0] as Blob).type).toBe(EXCEL_MIME);
      expect(env.anchor.download).toBe(REPORT_FILENAME); expect(env.click).toHaveBeenCalledOnce(); expect(env.remove).toHaveBeenCalledOnce();
      vi.advanceTimersByTime(1000); expect(env.revoke).toHaveBeenCalledWith('blob:local-test');
    } finally {vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();}
  });
  it('worker sonucu indirir, işlem bitince worker sonlanır',async()=>{
    vi.useFakeTimers();const env=environment();
    try {
      const result=downloadExcel({kind:'template'});
      env.worker().onmessage?.({data:{ok:true,buffer:new ArrayBuffer(8)}});
      await result;expect(env.anchor.download).toBe(TEMPLATE_FILENAME);expect(env.terminate).toHaveBeenCalledOnce();
      vi.runAllTimers();
    } finally {vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();}
  });
  it('worker hatasında indirme başlatmaz',async()=>{
    const env=environment();
    try {
      const result=downloadExcel({kind:'template'});
      env.worker().onmessage?.({data:{ok:false,message:'Dosya hazırlanamadı'}});
      await expect(result).rejects.toThrow('Dosya hazırlanamadı');expect(env.click).not.toHaveBeenCalled();expect(env.terminate).toHaveBeenCalledOnce();
    } finally {vi.restoreAllMocks();vi.unstubAllGlobals();}
  });
  it('iptal workerı sonlandırır',async()=>{
    const env=environment(),controller=new AbortController();
    try {
      const result=downloadExcel({kind:'template'},controller.signal);controller.abort();
      await expect(result).rejects.toThrow('iptal');expect(env.terminate).toHaveBeenCalledOnce();
    } finally {vi.restoreAllMocks();vi.unstubAllGlobals();}
  });
  it('zaman aşımında workerı sonlandırır ve indirme başlatmaz',async()=>{
    vi.useFakeTimers();const env=environment();
    try {
      const result=downloadExcel({kind:'template'});
      const rejection=expect(result).rejects.toThrow('zaman aşımı');
      await vi.advanceTimersByTimeAsync(120_000);await rejection;
      expect(env.terminate).toHaveBeenCalledOnce();expect(env.click).not.toHaveBeenCalled();
    } finally {vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();}
  });
  it('worker çalışma hatasını Türkçe mesajla gösterir',async()=>{
    const env=environment();
    try {
      const result=downloadExcel({kind:'template'});env.worker().onerror?.();
      await expect(result).rejects.toThrow('Excel dosyası hazırlanamadı');expect(env.terminate).toHaveBeenCalledOnce();
    } finally {vi.restoreAllMocks();vi.unstubAllGlobals();}
  });
  it('Worker desteği yoksa ana iş parçacığında sessizce çalışmaya geçmez',async()=>{
    vi.stubGlobal('Worker',undefined);
    try {await expect(downloadExcel({kind:'template'})).rejects.toThrow('arka planda Excel');}
    finally {vi.unstubAllGlobals();}
  });
});
