import { useEffect, useRef, useState } from 'react';
import { calculateAbc, DEFAULT_TARGETS, sampleData, validateTargets } from './core/abc';
import type { Analysis, InputTable, Targets } from './core/abc';
import { FILE_LIMITS } from './io/limits';
import { processAnalysis } from './processing/client';
import { UploadWorkspace } from './components/UploadWorkspace';
import { TargetSettings } from './components/TargetSettings';
import { KpiOverview } from './components/KpiOverview';
import { ResultsTables } from './components/ResultsTables';
import { AnalysisInsights } from './components/AnalysisInsights';
import { GuidePage } from './components/GuidePage';
import { ReportDownload } from './components/ReportDownload';
import { ChartsPanel } from './components/ChartsPanel';
import { DashboardPreferences, WorkspaceNav } from './components/WorkspaceNav';
import type { Page } from './components/WorkspaceNav';
import { displayError, LanguageContext, preference, savePreference, useLocale } from './ui/locale';
import type { Language, Theme } from './ui/locale';

export default function App() {
  const [language, setLanguage] = useState(() =>
    preference<Language>('language', ['tr', 'en'], 'tr'),
  );
  const [theme, setTheme] = useState(() =>
    preference<Theme>(
      'theme',
      ['light', 'dark'],
      window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    ),
  );
  useEffect(() => {
    document.documentElement.lang = language;
    savePreference('language', language);
  }, [language]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    savePreference('theme', theme);
  }, [theme]);
  return (
    <LanguageContext.Provider value={language}>
      <Dashboard theme={theme} onTheme={setTheme} onLanguage={setLanguage} />
    </LanguageContext.Provider>
  );
}

function Dashboard({
  theme,
  onTheme,
  onLanguage,
}: {
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onLanguage: (language: Language) => void;
}) {
  const { language, t, number } = useLocale();
  const [page, setPage] = useState<Page>(() =>
    window.location.hash === '#rehber' ? 'guide' : 'analysis',
  );
  const [mobileOpen, setMobileOpen] = useState(false),
    [targets, setTargets] = useState<Targets>({ ...DEFAULT_TARGETS });
  const [analysis, setAnalysis] = useState<Analysis | null>(null),
    [source, setSource] = useState<InputTable | null>(null);
  const [name, setName] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState<'cleared' | 'loaded' | 'targets' | 'recalculated' | ''>('');
  const [isDemo, setIsDemo] = useState(false);
  const operation = useRef<AbortController | null>(null),
    main = useRef<HTMLElement>(null);
  useEffect(() => {
    const change = () => {
      if (window.location.hash === '#rehber') setPage('guide');
      else if (window.location.hash === '#analiz' || !window.location.hash) setPage('analysis');
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
  }, [page]);
  useEffect(() => {
    document.title =
      language === 'tr'
        ? page === 'guide'
          ? 'ABC Analizi Rehberi | BarisDevLab'
          : 'ABC Stok Analizi | BarisDevLab'
        : page === 'guide'
          ? 'ABC Analysis Guide | BarisDevLab'
          : 'ABC Inventory Analysis | BarisDevLab';
  }, [language, page]);
  useEffect(() => {
    if (mobileOpen) document.querySelector<HTMLAnchorElement>('#sidebar nav a')?.focus();
  }, [mobileOpen]);
  function clear() {
    operation.current?.abort();
    operation.current = null;
    setBusy(false);
    setAnalysis(null);
    setSource(null);
    setName('');
    setIsDemo(false);
    setError('');
    setNotice('cleared');
  }
  function demo() {
    operation.current?.abort();
    operation.current = null;
    setBusy(false);
    const data = sampleData();
    setSource(data);
    setAnalysis(calculateAbc(data, targets));
    setName('Örnek stok verisi');
    setError('');
    setIsDemo(true);
    setNotice('loaded');
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
        setIsDemo(false);
        setNotice('loaded');
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
      setNotice('targets');
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
        setNotice('recalculated');
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
  const menu = useRef<HTMLButtonElement>(null);
  const rail = useRef<HTMLElement>(null);
  const fileName = isDemo ? t('Örnek stok verisi', 'Sample inventory') : name;
  const title =
    page === 'analysis' ? t('Analiz Paneli', 'Dashboard') : t('ABC Rehberi', 'ABC guide');
  const count = number(analysis?.rows.length ?? 0, 0);
  const notices = {
    cleared: t(
      'Analiz temizlendi. Yeni bir dosya yükleyebilirsiniz.',
      'Analysis cleared. You can upload a new file.',
    ),
    loaded: t(
      `${fileName} yüklendi. ${count} ürün analiz edildi.`,
      `${fileName} loaded. Products analysed: ${count}.`,
    ),
    targets: t('Hedefler güncellendi.', 'Targets updated.'),
    recalculated: t(
      'Hedefler güncellendi. Tüm analiz yeniden hesaplandı.',
      'Targets updated. The full analysis was recalculated.',
    ),
  };
  const brand = (
    <>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        <strong>ABC</strong>
        <small>{t('Stok analizi', 'Inventory analysis')}</small>
      </span>
    </>
  );

  function dismissMenu() {
    setMobileOpen(false);
    menu.current?.focus();
  }

  return (
    <div
      className="app-shell"
      onKeyDown={(event) => {
        if (!mobileOpen) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          dismissMenu();
        }
        if (event.key === 'Tab') {
          const controls = [
            menu.current,
            ...Array.from(
              rail.current?.querySelectorAll<HTMLElement>(
                'a, button:not(:disabled), input:not(:disabled)',
              ) ?? [],
            ),
          ].filter((element) => element && element.getBoundingClientRect().width > 0);
          const first = controls[0],
            last = controls.at(-1);
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
        {t('İçeriğe geç', 'Skip to content')}
      </a>
      <header className="mobile-header">
        <a className="brand" href="#analiz">
          {brand}
        </a>
        <button
          ref={menu}
          className="menu-toggle"
          aria-expanded={mobileOpen}
          aria-controls="sidebar"
          aria-label={mobileOpen ? t('Menüyü kapat', 'Close menu') : t('Menüyü aç', 'Open menu')}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? '×' : '☰'}
        </button>
      </header>
      {mobileOpen && <div className="nav-backdrop" aria-hidden="true" onClick={dismissMenu} />}
      <aside ref={rail} id="sidebar" className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <a href="#analiz" className="brand desktop-brand" onClick={() => setPage('analysis')}>
          {brand}
        </a>
        <span className="nav-heading">{t('Çalışma alanı', 'Workspace')}</span>
        <WorkspaceNav
          page={page}
          onNavigate={(next) => {
            if (next === page && mobileOpen) menu.current?.focus();
            setPage(next);
            setMobileOpen(false);
          }}
        />
        <TargetSettings targets={targets} busy={busy} onApply={apply} />
        <div className="sidebar-status">
          <span className="nav-heading">{t('Veri durumu', 'Data status')}</span>
          <p>
            <span aria-hidden="true" className={`status-dot ${!name ? 'inactive' : ''}`} />
            {name ? t('Veri hazır', 'Data ready') : t('Dosya bekleniyor', 'Waiting for a file')}
          </p>
          {fileName && <small className="file-name">{fileName}</small>}
        </div>
        <footer className="sidebar-footer">BarisDevLab</footer>
      </aside>
      <main id="main-content" ref={main} tabIndex={-1} className="main-content" inert={mobileOpen}>
        <div className="topbar">
          <div className="breadcrumb">
            {t('Çalışma alanı', 'Workspace')} <span aria-hidden="true">/</span>{' '}
            <strong>{title}</strong>
          </div>
          <DashboardPreferences theme={theme} onTheme={onTheme} onLanguage={onLanguage} />
        </div>
        <div hidden={page !== 'analysis'}>
          <header className="page-hero dashboard-hero">
            <div>
              <h1>{t('Stok öncelikleri', 'Inventory priorities')}</h1>
              <p>
                {t(
                  'Yıllık tüketim değerine göre stoklarınızı sınıflandırın ve kontrol önceliklerini belirleyin.',
                  'Classify your inventory by annual usage value and identify which products need the most oversight.',
                )}
              </p>
            </div>
            <span className="privacy-pill">
              <span aria-hidden="true">◈</span>{' '}
              {t('Veriler cihazınızda kalır', 'Data stays on your device')}
            </span>
          </header>
          {analysis && (
            <section className="overview" aria-labelledby="overview-heading">
              <div className="section-heading">
                <h2 id="overview-heading">{t('Envanter özeti', 'Inventory overview')}</h2>
                <span className="subtle-label">
                  {t(`${count} ürün · Tam analiz`, `${count} products · Full analysis`)}
                </span>
              </div>
              <KpiOverview analysis={analysis} />
            </section>
          )}
          <UploadWorkspace
            busy={busy}
            name={fileName}
            onFile={loadFile}
            onDemo={demo}
            onClear={clear}
          />
          {busy && (
            <div className="notice" role="status">
              {t('Veriler arka planda işleniyor…', 'Processing your inventory…')}{' '}
              <button className="text-button" onClick={clear}>
                {t('İşlemi iptal et', 'Cancel operation')}
              </button>
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {displayError(
                error,
                language,
                'Could not analyse the inventory. Check the file or targets and try again.',
              )}
              {analysis && (
                <span>
                  {t(
                    ' Önceki geçerli analiz korunuyor.',
                    ' The previous analysis is still available.',
                  )}
                </span>
              )}
            </div>
          )}
          {notice && (
            <div className="notice success" role="status">
              {notices[notice]}
            </div>
          )}
          {analysis ? (
            <>
              <ChartsPanel analysis={analysis} theme={theme} />
              <AnalysisInsights analysis={analysis} />
              <ResultsTables analysis={analysis} />
              <ReportDownload analysis={analysis} />
            </>
          ) : (
            <section className="empty-state">
              <div className="empty-symbol" aria-hidden="true">
                ▥
              </div>
              <div>
                <h2>{t('İlk analizinize hazır mısınız?', 'Ready for your first analysis?')}</h2>
                <p>
                  {t(
                    'Dosyanızı yükleyin veya örnek veriyle başlayın. Sonuçlarınız, grafikleriniz ve Excel raporunuz burada görünecek.',
                    'Upload a file or try the sample. Your results, charts, and Excel report will appear here.',
                  )}
                </p>
              </div>
            </section>
          )}
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
          <span>BarisDevLab</span>
          <span>{t('Tarayıcıda hesaplanır', 'Calculated in your browser')}</span>
        </footer>
      </main>
    </div>
  );
}
