import { useLocale } from '../ui/locale';
import type { Language, Theme } from '../ui/locale';

export const workspacePages = {
  overview: ['#genel-bakis', 'Genel bakış', 'Overview'],
  analysis: ['#analiz', 'ABC analizi', 'ABC analysis'],
  xyz: ['#stok-karar-destegi', 'XYZ ve ABC-XYZ', 'XYZ and ABC-XYZ'],
  period: ['#donemsel-karsilastirma', 'Dönemsel karşılaştırma', 'Period comparison'],
  scenario: ['#senaryo', 'Senaryo analizi', 'Scenario analysis'],
  optimization: ['#stok-optimizasyonu', 'Stok optimizasyonu', 'Inventory optimization'],
  movement: ['#fsn-ved', 'FSN ve VED', 'FSN and VED'],
  simulation: ['#maliyet-simulasyonu', 'Maliyet simülasyonu', 'Cost simulation'],
  history: ['#analiz-gecmisi', 'Analiz geçmişi', 'Analysis history'],
  guide: ['#rehber', 'Kullanım ve yöntem rehberi', 'User and methodology guide'],
} as const;

export type Page = keyof typeof workspacePages;
const pages = Object.keys(workspacePages) as Page[];

export function pageFromHash(hash: string): Page {
  return pages.find((page) => workspacePages[page][0] === hash) ?? 'overview';
}

export function WorkspaceNav({
  page,
  onNavigate,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  const { t } = useLocale();
  return (
    <nav aria-label={t('Ana gezinme', 'Primary navigation')}>
      {pages.map((item) => {
        const [hash, tr, en] = workspacePages[item];
        return (
          <a
            key={item}
            href={hash}
            aria-current={page === item ? 'page' : undefined}
            onClick={() => onNavigate(item)}
          >
            {t(tr, en)}
          </a>
        );
      })}
    </nav>
  );
}

export function DashboardPreferences({
  theme,
  onTheme,
  onLanguage,
}: {
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onLanguage: (language: Language) => void;
}) {
  const { language, t } = useLocale();
  return (
    <div className="preferences">
      <select
        aria-label={t('Arayüz dili', 'Interface language')}
        value={language}
        onChange={(event) => onLanguage(event.target.value === 'en' ? 'en' : 'tr')}
      >
        <option value="tr" lang="tr">
          Türkçe
        </option>
        <option value="en" lang="en">
          English
        </option>
      </select>
      <button
        className="theme-toggle"
        type="button"
        aria-pressed={theme === 'dark'}
        onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☾' : '☼'}</span>
        <span>{t('Koyu tema', 'Dark theme')}</span>
      </button>
    </div>
  );
}
