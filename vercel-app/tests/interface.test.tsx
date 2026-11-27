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
  window.localStorage.clear();
  window.history.replaceState(null, '', '/#analiz');
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
async function demo() {
  fireEvent.click(screen.getByRole('button', { name: 'Örnek veriyle dene' }));
  await waitFor(() => expect(document.querySelector('[data-kpi=total]')).toBeTruthy());
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
    window.history.replaceState(null, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'İlk analizinize hazır mısınız?' })).toBeTruthy();
    expect(document.querySelectorAll('[data-kpi]').length).toBe(0);
    expect(processAnalysis).not.toHaveBeenCalled();
  });
  it('demo gerçek KPI ve grafiklerle gösterilir', async () => {
    render(<App />);
    await demo();
    expect(document.querySelector('[data-kpi=total]')?.getAttribute('data-value')).toBe(
      '304.000,00 TL',
    );
    expect(document.querySelector('[data-kpi=a_share]')?.getAttribute('data-value')).toBe('%88,82');
    expect(document.querySelectorAll('[data-kpi]').length).toBe(6);
    expect(await screen.findAllByRole('img')).toHaveLength(2);
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
    await demo();
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
  it('geçersiz hedef toplamı hesaplama başlatmaz', async () => {
    render(<App />);
    await demo();
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
    await demo();
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
    fireEvent.click(screen.getByRole('link', { name: 'Kullanım ve yöntem rehberi' }));
    expect(await screen.findAllByRole('tab')).toHaveLength(5);
    fireEvent.click(screen.getByRole('tab', { name: 'Çözümlü Örnekler' }));
    expect(screen.getByText('Örnek 2 · Hedefler değişirse ne olur?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Analiz paneline dön' }));
    expect(document.querySelector('[data-kpi=total]')?.getAttribute('data-value')).toBe(
      '304.000,00 TL',
    );
    expect(document.querySelector('[data-kpi=C]')?.getAttribute('data-value')).toBe('5');
  });
  it('Pareto filtreleri KPI, dağılım ve Excel girdisini değiştirmez', async () => {
    render(<App />);
    await demo();
    const pareto = (
      await screen.findByRole('heading', { name: 'Değerin yoğunlaştığı ürünler' })
    ).closest('section')!;
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
    await demo();
    fireEvent.click(await screen.findByRole('button', { name: 'PNG indir' }));
    await waitFor(() => expect(downloadPng).toHaveBeenCalledWith(null, 'abc_pareto_analizi'));
  });
  it('boş şablon veri yüklemeden indirilebilir', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Boş Excel şablonu indir' }));
    await waitFor(() => expect(downloadExcel).toHaveBeenCalled());
    expect(vi.mocked(downloadExcel).mock.calls[0][0]).toEqual({ kind: 'template' });
  });
  it('temizleme başlangıç ekranına döndürür', async () => {
    render(<App />);
    await demo();
    fireEvent.click(screen.getByRole('button', { name: 'Analizi temizle' }));
    expect(document.querySelectorAll('[data-kpi]').length).toBe(0);
    expect(screen.getByText('İlk analizinize hazır mısınız?')).toBeTruthy();
  });
  it('mobil menü açık/kapalı durumunu ve sayfa değişimini yönetir', async () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: 'Menüyü aç' });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('link', { name: 'Kullanım ve yöntem rehberi' }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(await screen.findByRole('tab', { name: 'Genel Bakış' })).toBeTruthy();
  });
  it('rehber sekmeleri ok tuşlarıyla kullanılabilir', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Kullanım ve yöntem rehberi' }));
    fireEvent.keyDown(await screen.findByRole('tab', { name: 'Genel Bakış' }), {
      key: 'ArrowRight',
    });
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
    fireEvent.click(screen.getByRole('link', { name: 'Analiz geçmişi' }));
    fireEvent.click(await screen.findByText('Analiz paketini içe veya dışa aktar'));
    const input = screen.getByLabelText('JSON analiz paketi seç');
    const load = (bytes: ArrayBuffer) => {
      const file = new File([bytes], 'analiz.json');
      Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes });
      fireEvent.change(input, { target: { files: [file] } });
    };
    load(encodePackage('Kaydedilen analiz', calculateAbc(sampleData(), { a: 0, b: 0, c: 100 })));
    await waitFor(() =>
      expect(document.querySelector('.file-name')?.textContent).toBe('Kaydedilen analiz'),
    );
    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(false));
    load(new TextEncoder().encode('bozuk').buffer);
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('Geçersiz ABC analiz paketi');
    fireEvent.click(screen.getByRole('link', { name: 'ABC analizi' }));
    expect((screen.getByRole('slider', { name: /A grubu hedefi/ }) as HTMLInputElement).value).toBe(
      '0',
    );
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

it('switching languages and theme preserves the active inventory and localises numbers', async () => {
  render(<App />);
  await demo();
  fireEvent.click(screen.getByRole('button', { name: 'Açık tema' }));
  expect(screen.getByRole('button', { name: 'Koyu tema' }).getAttribute('aria-pressed')).toBe(
    'true',
  );
  fireEvent.change(screen.getByLabelText('Arayüz dili'), { target: { value: 'en' } });
  expect(document.documentElement.lang).toBe('en');
  expect(screen.getByRole('heading', { name: 'Inventory overview' })).toBeTruthy();
  expect(document.querySelector('[data-kpi=total]')?.getAttribute('data-value')).toBe(
    '304,000.00 TL',
  );
  expect(await screen.findByRole('button', { name: 'Download Excel report' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  const lightTheme = screen.getByRole('button', { name: 'Light theme' });
  expect(lightTheme.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(lightTheme);
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(window.localStorage.getItem('abc:theme')).toBe('dark');
  fireEvent.click(screen.getByRole('link', { name: 'User and methodology guide' }));
  expect(await screen.findByRole('tab', { name: 'Worked examples' })).toBeTruthy();
});

it('compacts a loaded source on overview and keeps targets on the ABC route', async () => {
  window.history.replaceState(null, '', '/');
  render(<App />);
  await demo();
  expect(screen.queryByRole('heading', { name: 'Excel veya CSV dosyanızı bırakın' })).toBeNull();
  const source = within(screen.getByRole('region', { name: 'Analiz kaynağı' }));
  expect(source.getByText('Örnek stok verisi')).toBeTruthy();
  expect(source.getByRole('button', { name: 'Dosyayı değiştir' })).toBeTruthy();
  expect(await source.findByRole('button', { name: 'Excel analiz raporunu indir' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'ABC değer dağılımı' })).toBeTruthy();
  expect(screen.queryByRole('slider')).toBeNull();
  const group = screen.getByRole('button', { name: 'Stok sınıflandırma' });
  fireEvent.click(group);
  expect(group.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('link', { name: 'ABC analizi' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Kenar menüsünü daralt' }));
  expect(screen.getByRole('button', { name: 'Kenar menüsünü genişlet' })).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: 'ABC analizi' }));
  expect(screen.getAllByRole('slider')).toHaveLength(3);
});

it('search respects Turkish product spelling and does not change the full analysis', async () => {
  const input = sampleData();
  input.rows[0][0] = 'VİDA Ünite';
  const analysis = calculateAbc(input);
  render(<ResultsTables analysis={analysis} />);
  fireEvent.change(screen.getByLabelText('Ürün ara'), { target: { value: 'vida ünite' } });
  await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
  expect(screen.getByRole('rowheader', { name: 'VİDA Ünite' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('ABC grubu'), { target: { value: 'C' } });
  expect(screen.getByRole('status').textContent).toContain('eşleşen ürün yok');
  expect(analysis.rows).toHaveLength(5);
});

it('charts cap the number of rendered ranks while preserving access to later products', () => {
  const source = sampleData();
  source.rows = Array.from({ length: 510 }, (_, i) => [`Ürün ${i}`, 510 - i, 1]);
  const analysis = calculateAbc(source);
  render(<ChartsPanel analysis={analysis} />);
  const bars = () =>
    vi
      .mocked(Plot)
      .mock.calls.filter(([props]) => props.label.includes('Pareto'))
      .at(-1)![0].data[0] as { y: number[] };
  expect(bars().y).toHaveLength(500);
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki aralık' }));
  expect(bars().y).toEqual(analysis.rows.slice(500).map((row) => row.value));
});

describe('Stok karar desteği arayüzü', () => {
  async function openModule(name: string) {
    const page = ['XYZ', 'ABC-XYZ'].includes(name)
      ? 'XYZ ve ABC-XYZ'
      : ['FSN', 'VED'].includes(name)
        ? 'FSN ve VED'
        : name === 'Maliyet simülasyonu'
          ? name
          : 'Sipariş ve emniyet stoku';
    const link = screen.getByRole('link', { name: page });
    if (link.getAttribute('aria-current') !== 'page') fireEvent.click(link);
    if (name !== 'Maliyet simülasyonu') {
      const navigation = await screen.findByRole('navigation', {
        name: 'Stok karar destek modülleri',
      });
      fireEvent.click(within(navigation).getByRole('button', { name }));
    }
    return within(await screen.findByRole('region', { name }));
  }

  function fillField(panel: ReturnType<typeof within>, label: string | RegExp, value: string) {
    fireEvent.change(panel.getByRole('textbox', { name: label }), { target: { value } });
  }

  function calculate(panel: ReturnType<typeof within>) {
    fireEvent.click(panel.getByRole('button', { name: 'Hesapla' }));
  }

  it('gerçek dosyadaki ABC ile XYZ sonucunu eşler ve form değişince eski eşleşmeyi kaldırır', async () => {
    render(<App />);
    upload('csv-utf-8-comma.csv');
    await waitFor(() => expect(document.querySelector('[data-kpi=total]')).toBeTruthy());
    fireEvent.click(screen.getByRole('link', { name: 'XYZ ve ABC-XYZ' }));
    const xyz = await openModule('XYZ');
    calculate(xyz);
    expect(xyz.getByRole('alert').textContent).toContain('talep verilerini');
    fillField(xyz, 'Ürün ve dönemsel talep (adet)', 'Motor;10;10\nRulman;0;0\nYeni ürün;0;25');
    fillField(xyz, 'X üst sınırı (CV oranı)', '0,25');
    fillField(xyz, 'Y üst sınırı (CV oranı)', '0,75');
    calculate(xyz);
    expect(xyz.getByRole('table').textContent).toContain('Talep yok');
    const matrix = await openModule('ABC-XYZ');
    expect(matrix.getAllByRole('button')).toHaveLength(9);
    expect(matrix.getByRole('button', { name: /AX 1 ürün/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(matrix.getByText('Motor')).toBeTruthy();
    expect(matrix.getByText(/XYZ sınıfı oluşmadı/)).toBeTruthy();
    expect(matrix.getByText('ABC kaydı eksik · 1 ürün')).toBeTruthy();
    fireEvent.click(matrix.getByRole('button', { name: /CZ 0 ürün/ }));
    expect(matrix.getByRole('heading', { name: 'CZ · 0 ürün' })).toBeTruthy();
    fillField(await openModule('XYZ'), 'X üst sınırı (CV oranı)', '0,5');
    expect((await openModule('ABC-XYZ')).getByRole('button', { name: /AX 0 ürün/ })).toBeTruthy();
  });

  it('yerleşik ABC örneği matrisi beslemez, modüller boş açılır', async () => {
    render(<App />);
    await demo();
    fireEvent.click(screen.getByRole('link', { name: 'XYZ ve ABC-XYZ' }));
    expect(await screen.findByRole('heading', { name: 'XYZ ve ABC-XYZ' })).toBeTruthy();
    const matrix = await openModule('ABC-XYZ');
    expect(matrix.getByText(/kendi stok dosyanızı yükleyin/)).toBeTruthy();
    expect(matrix.queryByText('Motor')).toBeNull();
    const eoq = await openModule('EOQ');
    expect((eoq.getByRole('textbox', { name: /Yıllık talep/ }) as HTMLInputElement).value).toBe('');
    calculate(eoq);
    expect(eoq.getByRole('alert').textContent).toContain('Yıllık talep');
  });

  it('EOQ eğrisini oluşturur ve formu temizler', async () => {
    window.history.replaceState(null, '', '/#stok-karar-destegi');
    render(<App />);
    const eoq = await openModule('EOQ');
    fillField(eoq, /Yıllık talep/, '1000');
    fillField(eoq, /Sipariş maliyeti/, '40');
    fillField(eoq, /Elde bulundurma maliyeti/, '2');
    calculate(eoq);
    expect(eoq.getByText('200,00 adet')).toBeTruthy();
    expect(eoq.getByRole('img', { name: /EOQ yıllık sipariş/ })).toBeTruthy();
    fireEvent.click(eoq.getByRole('button', { name: 'Temizle' }));
    expect(eoq.queryByRole('img')).toBeNull();
  });

  it('ROP, emniyet stoku, FSN, VED ve simülasyon, kendi girdilerinden sonuç gösterir', async () => {
    window.history.replaceState(null, '', '/#stok-karar-destegi');
    render(<App />);
    const rop = await openModule('ROP');
    fillField(rop, /Ortalama talep/, '7,5');
    fillField(rop, /tedarik süresi L/, '2,5');
    fillField(rop, /Emniyet stoku/, '3');
    calculate(rop);
    expect(rop.getByText('21,75 adet')).toBeTruthy();

    const safety = await openModule('Emniyet stoku');
    fireEvent.change(safety.getByRole('combobox', { name: 'İstatistiksel model' }), {
      target: { value: 'empirical' },
    });
    fillField(safety, /servis seviyesi/, '90');
    fillField(safety, /Tedarik süresi talep gözlemleri/, '0;10;10;30');
    calculate(safety);
    expect(safety.getByText('17,50 adet')).toBeTruthy();
    fireEvent.click(safety.getByRole('button', { name: 'Temizle' }));
    expect((safety.getByRole('combobox') as HTMLSelectElement).value).toBe('');

    const fsn = await openModule('FSN');
    fillField(fsn, /dönemsel stok çıkışı/, 'Parça;1;0');
    fillField(fsn, /Hızlı hareket eşiği/, '50');
    calculate(fsn);
    expect(within(fsn.getByRole('table')).getByText('F')).toBeTruthy();

    const ved = await openModule('VED');
    fillField(ved, /operasyon etkisi, güvenlik etkisi/, 'Parça;düşük;yüksek;Güvenlik için gerekli');
    calculate(ved);
    expect(ved.getByRole('table').textContent).toContain('V · Hayati');

    const simulation = await openModule('Maliyet simülasyonu');
    fillField(simulation, /^Dönemsel talep/, '3;4;7;2');
    fillField(simulation, /Başlangıç stoku/, '2');
    fillField(simulation, /Sabit tedarik süresi/, '1');
    fillField(simulation, /^Sipariş maliyeti/, '2');
    fillField(simulation, /^Elde bulundurma maliyeti \(/, '1');
    fillField(simulation, /Karşılanamayan talep maliyeti/, '3');
    fillField(
      simulation,
      /Karşılaştırılacak stok politikaları/,
      'Sabit parti;Q;2;5\nHedef stok;R;2;8',
    );
    fillField(simulation, /^Talep çarpanları/, '0');
    calculate(simulation);
    expect(
      simulation.getByRole('table', { name: 'Politika karşılaştırması' }).textContent,
    ).toContain('29,00');
    expect(simulation.getByRole('table', { name: /Duyarlılık/ }).textContent).toContain('25,00');
  });
});
