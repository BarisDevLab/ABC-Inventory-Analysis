// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import App from '../src/App';
import { calculateAbc, sampleData } from '../src/core/abc';
import { encodePackage } from '../src/io/analysis-package';
import { runAnalysisRequest } from '../src/processing/operations';
import type { AnalysisResults } from '../src/processing/operations';
import { processAnalysis } from '../src/processing/client';
import { downloadExcel } from '../src/export/download';
import { Plot, downloadPng } from '../src/charts/Plot';
import { ChartsPanel } from '../src/components/ChartsPanel';
import { ResultsTables } from '../src/components/ResultsTables';
import type { AnalysisRequest } from '../src/processing/client';

vi.mock('../src/charts/Plot', () => ({
  Plot: vi.fn(({ label }: { label: string }) => <div role="img" aria-label={label} />),
  downloadPng: vi.fn(async () => {}),
}));
vi.mock('../src/export/download', () => ({ downloadExcel: vi.fn(async () => {}) }));
vi.mock('../src/processing/client', () => ({ processAnalysis: vi.fn() }));
beforeEach(() => {
  window.history.replaceState(null, '', '/');
  vi.mocked(processAnalysis).mockImplementation(async (request: AnalysisRequest) => {
    if (request.kind === 'file' && request.name === 'xlsx-corrupt.xlsx')
      throw new Error('Excel dosyası okunamadı.');
    if (request.kind === 'file' && request.name === 'xlsx-demo.xlsx') {
      // Excel parsing itself is covered in the Node and real-browser suites.
      return runAnalysisRequest({
        ...request,
        name: 'demo.csv',
        bytes: new TextEncoder().encode(
          'Ürün;Yıllık Tüketim;Birim Fiyat (TL)\n' +
            sampleData()
              .rows.map((row) => row.join(';'))
              .join('\n'),
        ).buffer,
      });
    }
    return runAnalysisRequest(request);
  });
});
afterEach(async () => {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 0));
  vi.clearAllMocks();
});
function demo() {
  fireEvent.click(screen.getByRole('button', { name: 'Örnek veriyle dene' }));
}
function file(filename: string) {
  const raw = readFileSync(resolve(process.cwd(), 'tests/fixtures/files', filename));
  const file = new File([raw], filename);
  Object.defineProperty(file, 'arrayBuffer', { value: async () => new Uint8Array(raw).buffer });
  return file;
}
function upload(filename: string) {
  fireEvent.change(screen.getByLabelText('Excel veya CSV dosyası seç'), {
    target: { files: [file(filename)] },
  });
}

describe('Gerçek React ekran entegrasyonu', () => {
  it('veri boyutu değişince eski aralıkla ara grafik çizmez', () => {
    const first = calculateAbc(sampleData()),
      source = sampleData();
    source.rows = Array.from({ length: 500 }, (_, i) => [`Yeni ürün ${i}`, 500 - i, 1]);
    const { rerender } = render(<ChartsPanel analysis={first} />);
    fireEvent.change(screen.getByLabelText('Son ürün'), { target: { value: 2 } });
    vi.mocked(Plot).mockClear();
    rerender(<ChartsPanel analysis={calculateAbc(source)} />);
    const draws = vi.mocked(Plot).mock.calls.filter((call) => call[0].label.includes('Pareto'));
    expect(draws.length).toBe(1);
    expect((draws[0][0].data[0] as { y: unknown[] }).y.length).toBe(500);
    expect((screen.getByLabelText('Son ürün') as HTMLInputElement).value).toBe('500');
  });
  it('ilk açılışta veri veya otomatik demo yoktur', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'İlk analizinize hazır mısınız?' })).toBeTruthy();
    expect(document.querySelectorAll('[data-kpi]').length).toBe(0);
    expect(processAnalysis).not.toHaveBeenCalled();
  });
  it('demo gerçek KPI ve grafiklerle gösterilir', () => {
    render(<App />);
    demo();
    expect(document.querySelector('[data-kpi=total]')?.getAttribute('data-value')).toBe(
      '304.000,00 TL',
    );
    expect(document.querySelector('[data-kpi=a_share]')?.getAttribute('data-value')).toBe('%88,82');
    expect(document.querySelectorAll('[data-kpi]').length).toBe(6);
    expect(screen.getAllByRole('img').length).toBe(2);
  });
  it.each(['csv-cp1254-semicolon.csv', 'csv-utf-8-sig-comma.csv', 'xlsx-demo.xlsx'])(
    '%s yükleme ve worker dönüşü arayüze bağlanır',
    async (filename) => {
      render(<App />);
      upload(filename);
      await waitFor(() =>
        expect(document.querySelector('[data-kpi=total]')?.getAttribute('data-value')).toBe(
          '304.000,00 TL',
        ),
      );
      expect(screen.getAllByText(filename).length).toBeGreaterThan(0);
    },
  );
  it('bozuk dosya hatası önceki geçerli analizi silmez', async () => {
    render(<App />);
    demo();
    upload('xlsx-corrupt.xlsx');
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('Excel dosyası okunamadı');
    expect(document.querySelector('[data-kpi=total]')?.getAttribute('data-value')).toBe(
      '304.000,00 TL',
    );
  });
  it('sürükle-bırak gerçek dosya yükler', async () => {
    render(<App />);
    fireEvent.drop(screen.getByText('Excel veya CSV dosyanızı bırakın').closest('.drop-zone')!, {
      dataTransfer: { files: [file('csv-utf-8-comma.csv')] },
    });
    await waitFor(() => expect(document.querySelectorAll('[data-kpi]').length).toBe(6));
  });
  it('geçersiz hedef toplamı hesaplama başlatmaz', () => {
    render(<App />);
    demo();
    fireEvent.change(screen.getByRole('slider', { name: /A grubu hedefi/ }), {
      target: { value: 90 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hedefleri uygula' }));
    expect(screen.getByRole('alert').textContent).toContain('Önceki geçerli hedefler korunuyor');
    expect(processAnalysis).not.toHaveBeenCalled();
    expect(document.querySelector('[data-kpi=a_share]')?.textContent).toContain('Hedef %80');
  });
  it('geçerli hedefler yeniden hesaplanır; rehberden dönünce korunur', async () => {
    render(<App />);
    demo();
    fireEvent.change(screen.getByRole('slider', { name: /A grubu hedefi/ }), {
      target: { value: 0 },
    });
    fireEvent.change(screen.getByRole('slider', { name: /B grubu hedefi/ }), {
      target: { value: 0 },
    });
    fireEvent.change(screen.getByRole('slider', { name: /C grubu hedefi/ }), {
      target: { value: 100 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hedefleri uygula' }));
    await waitFor(() =>
      expect(document.querySelector('[data-kpi=a_share]')?.getAttribute('data-value')).toBe(
        '%0,00',
      ),
    );
    fireEvent.click(screen.getByRole('link', { name: 'ABC Rehberi' }));
    expect(screen.getAllByRole('tab').length).toBe(4);
    fireEvent.click(screen.getByRole('tab', { name: 'Çözümlü Örnekler' }));
    expect(screen.getByText('Örnek 2 · Hedefler değişirse ne olur?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '← Analiz paneline dön' }));
    expect(document.querySelector('[data-kpi=total]')?.getAttribute('data-value')).toBe(
      '304.000,00 TL',
    );
    expect(document.querySelector('[data-kpi=C]')?.getAttribute('data-value')).toBe('5');
  });
  it('Pareto filtreleri KPI, dağılım ve Excel girdisini değiştirmez', async () => {
    render(<App />);
    demo();
    const pareto = screen
      .getByRole('heading', { name: 'Değerin yoğunlaştığı ürünler' })
      .closest('section')!;
    for (const checkbox of within(pareto).getAllByRole('checkbox').slice(0, 3))
      fireEvent.click(checkbox);
    expect(within(pareto).getByRole('status').textContent).toContain('gösterilecek ürün yok');
    expect(document.querySelector('[data-kpi=total]')?.getAttribute('data-value')).toBe(
      '304.000,00 TL',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Excel analiz raporunu indir' }));
    await waitFor(() => expect(downloadExcel).toHaveBeenCalled());
    const request = vi.mocked(downloadExcel).mock.calls[0][0];
    expect(request.kind).toBe('report');
    if (request.kind === 'report') expect(request.analysis.rows.length).toBe(5);
  });
  it('PNG düğmesi yerel grafik indirme işlevini çağırır', async () => {
    render(<App />);
    demo();
    fireEvent.click(screen.getByRole('button', { name: 'PNG indir' }));
    await waitFor(() => expect(downloadPng).toHaveBeenCalledWith(null, 'abc_pareto_analizi'));
  });
  it('boş şablon veri yüklemeden indirilebilir', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Boş Excel şablonu indir' }));
    await waitFor(() => expect(downloadExcel).toHaveBeenCalled());
    expect(vi.mocked(downloadExcel).mock.calls[0][0]).toEqual({ kind: 'template' });
  });
  it('temizleme başlangıç ekranına döndürür', () => {
    render(<App />);
    demo();
    fireEvent.click(screen.getByRole('button', { name: 'Analizi temizle' }));
    expect(document.querySelectorAll('[data-kpi]').length).toBe(0);
    expect(screen.getByText('İlk analizinize hazır mısınız?')).toBeTruthy();
  });
  it('mobil menü açık/kapalı durumunu ve sayfa değişimini yönetir', () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: 'Menüyü aç' });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('link', { name: 'ABC Rehberi' }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('tab', { name: 'Genel Bakış' })).toBeTruthy();
  });
  it('rehber sekmeleri ok tuşlarıyla kullanılabilir', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'ABC Rehberi' }));
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Genel Bakış' }), { key: 'ArrowRight' });
    expect(
      screen.getByRole('tab', { name: 'Hesaplama Adımları' }).getAttribute('aria-selected'),
    ).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Hesaplama Adımları' }), { key: 'End' });
    expect(screen.getByRole('heading', { name: 'ABC Analizinin Sınırlamaları' })).toBeTruthy();
  });
  it('yeni dosya analiz beklerken temizlenirse geç sonucu uygulamaz', async () => {
    let resolve!: (value: AnalysisResults['file']) => void;
    vi.mocked(processAnalysis).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    render(<App />);
    upload('csv-utf-8-comma.csv');
    await waitFor(() => expect(processAnalysis).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'İşlemi iptal et' }));
    await act(async () => {
      const request = vi.mocked(processAnalysis).mock.calls[0][0];
      if (request.kind === 'file') resolve(await runAnalysisRequest(request));
    });
    await waitFor(() => expect(document.querySelectorAll('[data-kpi]').length).toBe(0));
  });
  it('JSON paketi hedefleri ve kontrolleri geri yükler, bozuk paket geçerli analizi korur', async () => {
    render(<App />);
    const input = screen.getByLabelText('JSON analiz paketi seç');
    fireEvent.click(screen.getByText('Analiz paketini içe veya dışa aktar'));
    const load = (bytes: ArrayBuffer) => {
      const file = new File([bytes], 'analiz.json');
      Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes });
      fireEvent.change(input, { target: { files: [file] } });
    };
    load(encodePackage('Kaydedilen analiz', calculateAbc(sampleData(), { a: 0, b: 0, c: 100 })));
    await screen.findByText(/Kaydedilen analiz geri yüklendi/);
    expect((screen.getByRole('slider', { name: /A grubu hedefi/ }) as HTMLInputElement).value).toBe(
      '0',
    );
    expect(document.querySelector('[data-kpi=C]')?.getAttribute('data-value')).toBe('5');
    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false));
    load(new TextEncoder().encode('bozuk').buffer);
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('Geçersiz ABC analiz paketi');
    expect(document.querySelector('[data-kpi=C]')?.getAttribute('data-value')).toBe('5');
  });
  it('büyük tablolar 50 ürünlük sayfalarla tüm satırlara erişim sağlar', () => {
    const source = sampleData();
    source.rows = Array.from({ length: 120 }, (_, i) => [`Ürün ${i}`, 120 - i, 1]);
    const analysis = calculateAbc(source);
    render(<ResultsTables analysis={analysis} />);
    expect(screen.getAllByRole('row').length).toBe(51);
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki' }));
    expect(screen.getByText('51–100 / 120 ürün')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki' }));
    expect(screen.getAllByRole('row').length).toBe(21);
  });
});
