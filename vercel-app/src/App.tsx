import { useEffect, useRef, useState } from 'react';
import { calculateAbc, DEFAULT_TARGETS, sampleData, validateTargets } from './core/abc';
import type { Analysis, InputTable, Targets } from './core/abc';
import { FILE_LIMITS } from './io/read-file';
import { processAnalysis } from './processing/client';
import { UploadWorkspace } from './components/UploadWorkspace';
import { TargetSettings } from './components/TargetSettings';
import { KpiOverview } from './components/KpiOverview';
import { ResultsTables } from './components/ResultsTables';
import { AnalysisInsights } from './components/AnalysisInsights';
import { GuidePage } from './components/GuidePage';
import { ReportDownload } from './components/ReportDownload';
import { ChartsPanel } from './components/ChartsPanel';
import { InventoryWorkspace } from './inventory/InventoryWorkspace';

const pageLabels = {
  analysis: 'Analiz Paneli',
  guide: 'ABC Rehberi',
  inventory: 'Stok karar desteği',
} as const;

function pageFromHash(hash: string): keyof typeof pageLabels {
  if (hash === '#rehber') return 'guide';
  if (hash === '#stok-karar-destegi') return 'inventory';
  return 'analysis';
}

export default function App() {
  const [page, setPage] = useState(() => pageFromHash(window.location.hash));
  const [mobileOpen, setMobileOpen] = useState(false),
    [targets, setTargets] = useState<Targets>({ ...DEFAULT_TARGETS });
  const [analysis, setAnalysis] = useState<Analysis | null>(null),
    [source, setSource] = useState<InputTable | null>(null);
  const [hasUserFile, setHasUserFile] = useState(false);
  const [name, setName] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const operation = useRef<AbortController | null>(null),
    main = useRef<HTMLElement>(null);
  useEffect(() => {
    const change = () => {
      if (window.location.hash !== '#main-content') setPage(pageFromHash(window.location.hash));
      setMobileOpen(false);
    };
    window.addEventListener('hashchange', change);
    return () => {
      window.removeEventListener('hashchange', change);
      operation.current?.abort();
    };
  }, []);
  useEffect(() => {
    main.current?.focus();
    const title =
      page === 'analysis'
        ? 'ABC Stok Analizi'
        : page === 'guide'
          ? 'ABC Analizi Rehberi'
          : pageLabels.inventory;
    document.title = `${title} | BarisDevLab`;
  }, [page]);
  useEffect(() => {
    if (mobileOpen) document.querySelector<HTMLAnchorElement>('#sidebar nav a')?.focus();
  }, [mobileOpen]);
  function clear() {
    operation.current?.abort();
    operation.current = null;
    setBusy(false);
    setAnalysis(null);
    setHasUserFile(false);
    setSource(null);
    setName('');
    setError('');
    setNotice('Analiz temizlendi. Yeni bir dosya yükleyebilirsiniz.');
  }
  function demo() {
    operation.current?.abort();
    operation.current = null;
    setBusy(false);
    const data = sampleData();
    setSource(data);
    setAnalysis(calculateAbc(data, targets));
    setHasUserFile(false);
    setName('Örnek stok verisi');
    setError('');
    setNotice('Örnek veri yüklendi. 5 ürün analiz edildi.');
  }
  async function loadFile(file: File) {
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (!/\.(csv|xlsx)$/i.test(file.name))
        throw new Error('Yalnızca Excel ve CSV dosyaları desteklenir.');
      if (file.size > FILE_LIMITS.bytes)
        throw new Error('Dosya boyutu 20 MB sınırını aşıyor. Daha küçük bir dosya seçin.');
      const bytes = await file.arrayBuffer();
      if (controller.signal.aborted) return;
      const result = await processAnalysis(
        { kind: 'file', bytes, name: file.name, targets },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setSource(result.source);
        setAnalysis(result.analysis);
        setName(file.name);
        setHasUserFile(true);
        setNotice(`${file.name} yüklendi. ${result.analysis.rows.length} ürün analiz edildi.`);
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : 'Dosya okunamadı.');
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setBusy(false);
      }
    }
  }
  async function apply(next: Targets) {
    if (operation.current) return;
    try {
      validateTargets(next);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Geçersiz hedefler.');
      return;
    }
    if (!source) {
      setTargets(next);
      setNotice('Hedefler güncellendi.');
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await processAnalysis(
        { kind: 'calculate', source, targets: next },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setTargets(next);
        setAnalysis(result.analysis);
        setNotice('Hedefler güncellendi. Tüm analiz yeniden hesaplandı.');
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : 'Hedefler uygulanamadı. Önceki geçerli hedefler korunuyor.',
        );
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <div
      className="app-shell"
      onKeyDown={(event) => {
        if (!mobileOpen) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          setMobileOpen(false);
          document.querySelector<HTMLButtonElement>('.menu-toggle')?.focus();
        }
        if (event.key === 'Tab') {
          const controls = Array.from(
            document.querySelectorAll<HTMLElement>(
              '.menu-toggle,#sidebar a,#sidebar button:not(:disabled),#sidebar input:not(:disabled)',
            ),
          ).filter((element) => element.getBoundingClientRect().width > 0);
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <a className="skip-link" href="#main-content">
        İçeriğe geç
      </a>
      <header className="mobile-header">
        <a className="brand" href="#analiz">
          <span className="brand-mark">▥</span>
          <span>
            ABC <b>Stok Analizi</b>
          </span>
        </a>
        <button
          className="menu-toggle"
          aria-expanded={mobileOpen}
          aria-controls="sidebar"
          aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </header>
      {mobileOpen && (
        <button
          className="nav-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        id="sidebar"
        className={`sidebar ${mobileOpen ? 'is-open' : ''}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setMobileOpen(false);
        }}
      >
        <a href="#analiz" className="brand desktop-brand">
          <span className="brand-mark">▥</span>
          <span>
            ABC Stok Analizi<small>ENVANTER / KARAR DESTEK</small>
          </span>
        </a>
        <span className="nav-heading">ÇALIŞMA ALANI</span>
        <nav aria-label="Ana gezinme">
          <a
            href="#analiz"
            aria-current={page === 'analysis' ? 'page' : undefined}
            onClick={() => {
              setPage('analysis');
              setMobileOpen(false);
            }}
          >
            <span aria-hidden="true">▦</span>Analiz Paneli
          </a>
          <a
            href="#stok-karar-destegi"
            aria-current={page === 'inventory' ? 'page' : undefined}
            onClick={() => {
              setPage('inventory');
              setMobileOpen(false);
            }}
          >
            <span aria-hidden="true">▩</span>Stok karar desteği
          </a>
          <a
            href="#rehber"
            aria-current={page === 'guide' ? 'page' : undefined}
            onClick={() => {
              setPage('guide');
              setMobileOpen(false);
            }}
          >
            <span aria-hidden="true">▤</span>ABC Rehberi
          </a>
        </nav>
        <TargetSettings targets={targets} busy={busy} onApply={apply} />
        <div className="sidebar-status">
          <span className="nav-heading">VERİ DURUMU</span>
          <p>
            <span className={`status-dot ${!name ? 'inactive' : ''}`} />
            {name ? 'Dosya yüklü' : 'Dosya bekleniyor'}
          </p>
          {name ? (
            <small className="file-name">{name}</small>
          ) : (
            <small>Excel veya CSV ile başlayın.</small>
          )}
          <p className="caption">
            Sayfalar arasında veriniz korunur. Yenileme sonrası veriler temizlenir.
          </p>
        </div>
        <footer className="sidebar-footer">
          <span>BARISDEVLAB</span>
          <small>Envanter analitiği · v0.5</small>
        </footer>
      </aside>
      <main id="main-content" ref={main} tabIndex={-1} className="main-content">
        <div className="topbar">
          <span>
            Çalışma alanı <span className="breadcrumb-separator">/</span>{' '}
            <strong>{pageLabels[page]}</strong>
          </span>
          <span className="privacy-pill">◈ Veriler cihazınızda kalır</span>
        </div>
        <div hidden={page !== 'analysis'}>
          <header className="page-hero">
            <span className="eyebrow">
              <span className="live-dot" /> STOK YÖNETİMİNDE EKONOMİK ÖNCELİK
            </span>
            <h1>
              Verilerinizi anlayın.
              <br />
              <span>Önceliklerinizi belirleyin.</span>
            </h1>
            <p>
              Stoklarınızı yıllık parasal tüketim değerine göre A, B ve C gruplarına ayırın.
              Ekonomik etkiyi görün, kontrol kaynaklarınızı doğru planlayın.
            </p>
            <div className="hero-tags">
              <span>ABC sınıflandırması</span>
              <span>Etkileşimli grafikler</span>
              <span>Excel raporlama</span>
            </div>
          </header>
          <UploadWorkspace
            busy={busy}
            name={name}
            onFile={loadFile}
            onDemo={demo}
            onClear={clear}
          />
          {busy && (
            <div className="notice" role="status">
              Veriler arka planda işleniyor…{' '}
              <button className="text-button" onClick={clear}>
                İşlemi iptal et
              </button>
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
              {analysis && <span> Önceki geçerli analiz korunuyor.</span>}
            </div>
          )}
          {notice && (
            <div className="notice success" role="status">
              {notice}
            </div>
          )}
          {analysis ? (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">01 / ENVANTERİNİZE GENEL BAKIŞ</span>
                  <h2>Ekonomik etkinin özeti</h2>
                </div>
                <span className="subtle-label">{analysis.rows.length} ürün · Tam analiz</span>
              </div>
              <KpiOverview analysis={analysis} />
              <ChartsPanel analysis={analysis} />
              <AnalysisInsights analysis={analysis} />
              <ResultsTables analysis={analysis} />
              <ReportDownload analysis={analysis} />
            </>
          ) : (
            <section className="empty-state">
              <div className="empty-symbol" aria-hidden="true">
                ▥
              </div>
              <h2>İlk analizinize hazır mısınız?</h2>
              <p>
                Dosyanızı yükleyin veya örnek veriyle başlayın. Sonuçlarınız, grafikleriniz ve Excel
                raporunuz burada görünecek.
              </p>
              <div>
                <span>01 · Dosyanızı yükleyin</span>
                <span>02 · Hedefleri belirleyin</span>
                <span>03 · Öncelikleri keşfedin</span>
              </div>
            </section>
          )}
        </div>
        <div hidden={page !== 'inventory'}>
          <InventoryWorkspace
            abcRows={page === 'inventory' && hasUserFile ? analysis?.rows : undefined}
          />
        </div>
        {page === 'guide' && (
          <GuidePage
            onReturn={() => {
              window.location.hash = 'analiz';
              setPage('analysis');
            }}
          />
        )}
        <footer className="main-footer">
          <span>ABC STOK ANALİZ SİSTEMİ</span>
          <span>BarisDevLab · Tarayıcıda hesaplanır</span>
        </footer>
      </main>
    </div>
  );
}
