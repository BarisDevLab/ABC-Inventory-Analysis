import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { DEFAULT_TARGETS, validateTargets } from './core/targets';
import type { Analysis, InputTable, Targets } from './core/abc';
import { processAnalysis } from './processing/client';
import { UploadWorkspace } from './components/UploadWorkspace';
import { TargetSettings } from './components/TargetSettings';
import { GroupBreakdown, KpiOverview, LeadingProducts } from './components/KpiOverview';
import {
  DashboardPreferences,
  WorkspaceNav,
  pageFromHash,
  workspacePages,
} from './components/WorkspaceNav';
import type { Page } from './components/WorkspaceNav';
import { displayError, LanguageContext, preference, savePreference, useLocale } from './ui/locale';
import type { Language, Theme } from './ui/locale';

import { Icon } from './ui/Icon';
import { useInventoryImport } from './components/inventory/useInventoryImport';

const ResultsTables = lazy(() =>
  import('./components/ResultsTables').then((m) => ({ default: m.ResultsTables })),
);
const AnalysisInsights = lazy(() =>
  import('./components/AnalysisInsights').then((m) => ({ default: m.AnalysisInsights })),
);
const ReportDownload = lazy(() =>
  import('./components/ReportDownload').then((m) => ({ default: m.ReportDownload })),
);
const ImportEditor = lazy(() =>
  import('./components/inventory/ImportEditor').then((m) => ({ default: m.ImportEditor })),
);
const GuidePage = lazy(() =>
  import('./components/GuidePage').then((m) => ({ default: m.GuidePage })),
);
const ChartsPanel = lazy(() =>
  import('./components/ChartsPanel').then((m) => ({ default: m.ChartsPanel })),
);
const InventoryWorkspace = lazy(() =>
  import('./inventory/InventoryWorkspace').then((m) => ({ default: m.InventoryWorkspace })),
);
const ComparisonWorkspace = lazy(() =>
  import('./components/inventory/ComparisonWorkspace').then((m) => ({
    default: m.ComparisonWorkspace,
  })),
);
const AnalysisLibrary = lazy(() =>
  import('./components/inventory/AnalysisLibrary').then((m) => ({ default: m.AnalysisLibrary })),
);

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
  const [page, setPage] = useState<Page>(() => pageFromHash(window.location.hash));
  const [mobileOpen, setMobileOpen] = useState(false),
    [targets, setTargets] = useState<Targets>({ ...DEFAULT_TARGETS });
  const [analysis, setAnalysis] = useState<Analysis | null>(null),
    [source, setSource] = useState<InputTable | null>(null);
  const [name, setName] = useState(''),
    [processing, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState<
      'cleared' | 'loaded' | 'restored' | 'targets' | 'recalculated' | ''
    >('');
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const importer = useInventoryImport(targets, (filename, result) => {
    setSource(result.source);
    setAnalysis(result.analysis);
    setName(filename);
    setIsDemo(false);
    setError('');
    setNotice('loaded');
  });
  const busy = processing || importer.busy;
  const activeError = error || importer.error;
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
  }, [page]);
  useEffect(() => {
    if (mobileOpen) document.querySelector<HTMLAnchorElement>('#sidebar nav a')?.focus();
  }, [mobileOpen]);
  function cancel() {
    importer.reset();
    operation.current?.abort();
    operation.current = null;
    setBusy(false);
  }
  function clear() {
    cancel();
    setAnalysis(null);
    setSource(null);
    setName('');
    setIsDemo(false);
    setError('');
    setNotice('cleared');
  }
  async function demo() {
    cancel();
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { calculateAbc, sampleData } = await import('./core/abc');
      if (controller.signal.aborted) return;
      const data = sampleData();
      setSource(data);
      setAnalysis(calculateAbc(data, targets));
      setName('Örnek stok verisi');
      setIsDemo(true);
      setNotice('loaded');
    } catch {
      if (!controller.signal.aborted) setError('Örnek veri yüklenemedi.');
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setBusy(false);
      }
    }
  }
  function loadFile(file: File) {
    setError('');
    setNotice('');
    return importer.open(file);
  }
  async function restorePackage(load: () => Promise<ArrayBuffer>) {
    if (busy || operation.current)
      throw new Error('Önce devam eden işlemin tamamlanmasını bekleyin.');
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const bytes = await load();
      if (controller.signal.aborted) return;
      const result = await processAnalysis({ kind: 'decode', bytes }, controller.signal);
      if (controller.signal.aborted) return;
      importer.reset();
      setSource(result.source);
      setAnalysis(result.analysis);
      setTargets(result.analysis.targets);
      setName(result.name);
      setIsDemo(false);
      setNotice('restored');
    } catch (error) {
      if (!controller.signal.aborted) throw error;
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setBusy(false);
      }
    }
  }
  async function apply(next: Targets) {
    if (busy || operation.current) return;
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
  const title = t(workspacePages[page][1], workspacePages[page][2]);
  useEffect(() => {
    document.title = `${title} | Envanter Zekâsı`;
  }, [title]);
  const dashboard = page === 'overview' || page === 'analysis';
  const inventoryPage =
    page === 'xyz' || page === 'optimization' || page === 'movement' || page === 'simulation'
      ? page
      : null;
  const [inventoryVisited, setInventoryVisited] = useState(Boolean(inventoryPage));
  if (inventoryPage && !inventoryVisited) setInventoryVisited(true);
  const [comparisonVisited, setComparisonVisited] = useState(
    page === 'period' || page === 'scenario',
  );
  if ((page === 'period' || page === 'scenario') && !comparisonVisited) setComparisonVisited(true);
  const loading = <p role="status">{t('Yükleniyor…', 'Loading…')}</p>;
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
    restored: t(
      `${fileName} geri yüklendi. ${count} ürün analiz edildi.`,
      `${fileName} restored. Products analysed: ${count}.`,
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
        <strong>
          Envanter
          <br />
          Zekâsı
        </strong>
      </span>
    </>
  );

  function dismissMenu() {
    setMobileOpen(false);
    menu.current?.focus();
  }

  return (
    <div
      className={`app-shell ${railCollapsed ? 'rail-collapsed' : ''}`}
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
        <a className="brand" href="#genel-bakis">
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
        <div className="desktop-identity">
          <a
            href="#genel-bakis"
            className="brand desktop-brand"
            aria-label="Envanter Zekâsı"
            onClick={() => setPage('overview')}
          >
            {brand}
          </a>
        </div>
        <WorkspaceNav
          page={page}
          collapsed={railCollapsed && !mobileOpen}
          onNavigate={(next) => {
            if (next === page && mobileOpen) menu.current?.focus();
            setPage(next);
            setMobileOpen(false);
          }}
        />
        <div className="rail-footer">
          <Icon name="shield" />
          <span>{t('Veriler cihazınızda kalır', 'Data stays on your device')}</span>
        </div>
      </aside>
      <main id="main-content" ref={main} tabIndex={-1} className="main-content" inert={mobileOpen}>
        <div className="topbar">
          <div className="topbar-start">
            <button
              type="button"
              className="icon-button rail-toggle"
              aria-expanded={!railCollapsed}
              aria-controls="sidebar"
              aria-label={
                railCollapsed
                  ? t('Kenar menüsünü genişlet', 'Expand sidebar')
                  : t('Kenar menüsünü daralt', 'Collapse sidebar')
              }
              onClick={() => setRailCollapsed(!railCollapsed)}
            >
              <Icon name="panel" />
            </button>
            <div className="breadcrumb">
              {t('Çalışma alanı', 'Workspace')} <Icon name="chevron" />
              <strong>{title}</strong>
            </div>
          </div>
          <DashboardPreferences theme={theme} onTheme={onTheme} onLanguage={onLanguage} />
        </div>
        {busy && (
          <div className="notice" role="status">
            {t('Veriler arka planda işleniyor…', 'Processing your inventory…')}{' '}
            <button className="text-button" onClick={cancel}>
              {t('İşlemi iptal et', 'Cancel operation')}
            </button>
          </div>
        )}
        {activeError && (
          <div className="notice error" role="alert">
            {displayError(
              activeError,
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
          <div
            className={notice === 'loaded' || notice === 'restored' ? 'sr-only' : 'notice success'}
            role="status"
          >
            {notices[notice]}
          </div>
        )}
        <div hidden={!dashboard} className={page === 'overview' ? 'overview-page' : undefined}>
          <header className="page-hero dashboard-hero">
            <div>
              <h1>{title}</h1>
              <p>
                {page === 'analysis'
                  ? t(
                      'Kümülatif değer payını inceleyin ve sınıf hedeflerini ayarlayın.',
                      'Inspect cumulative value and tune classification targets.',
                    )
                  : t(
                      'Envanter değerini, ürün dağılımını ve kontrol önceliklerini izleyin.',
                      'Track inventory value, product distribution, and control priorities.',
                    )}
              </p>
            </div>
            {page === 'overview' && analysis && (
              <a className="button secondary" href="#analiz">
                {t('ABC analizini aç', 'Open ABC analysis')} <Icon name="arrow" />
              </a>
            )}
          </header>
          <UploadWorkspace
            busy={busy}
            name={fileName}
            count={count}
            onFile={loadFile}
            onDemo={demo}
            onClear={clear}
            exports={
              analysis && (
                <Suspense fallback={loading}>
                  <ReportDownload analysis={analysis} />
                </Suspense>
              )
            }
          />
          {importer.draft && (
            <Suspense fallback={loading}>
              <ImportEditor importer={importer} disabled={busy} />
            </Suspense>
          )}
          {analysis && (
            <section className="overview" aria-labelledby="overview-heading">
              <h2 id="overview-heading" className="sr-only">
                {t('Envanter özeti', 'Inventory overview')}
              </h2>
              <KpiOverview analysis={analysis} featured={page === 'overview'} />
              {page === 'overview' && (
                <>
                  <div className="overview-grid">
                    <LeadingProducts analysis={analysis} />
                    <div className="overview-support">
                      <GroupBreakdown analysis={analysis} compact={false} />
                      <Suspense fallback={loading}>
                        <AnalysisInsights analysis={analysis} compact />
                      </Suspense>
                    </div>
                  </div>
                </>
              )}
              {page === 'analysis' && <GroupBreakdown analysis={analysis} compact />}
            </section>
          )}
          <div
            hidden={page !== 'analysis'}
            className={analysis ? 'abc-chart-layout' : 'abc-chart-layout no-results'}
          >
            <div className="abc-settings">
              <TargetSettings targets={targets} busy={busy} onApply={apply} />
            </div>
            {analysis && page === 'analysis' && (
              <Suspense fallback={loading}>
                <ChartsPanel analysis={analysis} theme={theme} />
              </Suspense>
            )}
          </div>
          {analysis && page === 'analysis' && (
            <Suspense fallback={loading}>
              <AnalysisInsights analysis={analysis} />
              <ResultsTables analysis={analysis} />
            </Suspense>
          )}
        </div>
        {inventoryVisited && (
          <div hidden={!inventoryPage}>
            <Suspense fallback={loading}>
              <InventoryWorkspace
                page={inventoryPage}
                theme={theme}
                abcRows={isDemo ? undefined : analysis?.rows}
              />
            </Suspense>
          </div>
        )}
        {comparisonVisited && analysis && source && (
          <div hidden={page !== 'period' && page !== 'scenario'}>
            <Suspense fallback={loading}>
              <ComparisonWorkspace
                mode={page === 'scenario' ? 'scenario' : 'period'}
                analysis={analysis}
                source={source}
                name={fileName}
              />
            </Suspense>
          </div>
        )}
        {(page === 'period' || page === 'scenario') && !analysis && (
          <section className="panel route-empty">
            <h1>{title}</h1>
            <p>
              {t(
                'Başlamak için güncel dönem dosyasını yükleyin.',
                'Upload the current period file to begin.',
              )}
            </p>
            <a className="button primary" href="#analiz">
              {t('ABC analizine git', 'Go to ABC analysis')}
            </a>
          </section>
        )}
        {page === 'history' && (
          <Suspense fallback={loading}>
            <AnalysisLibrary
              analysis={analysis}
              name={fileName}
              busy={busy}
              onRestore={restorePackage}
            />
          </Suspense>
        )}
        {page === 'guide' && (
          <Suspense fallback={loading}>
            <GuidePage
              onReturn={() => {
                window.location.hash = 'analiz';
                setPage('analysis');
              }}
            />
          </Suspense>
        )}
        <footer className="main-footer">
          <span>BarisDevLab</span>
          <span>{t('Tarayıcıda hesaplanır', 'Calculated in your browser')}</span>
        </footer>
      </main>
    </div>
  );
}
