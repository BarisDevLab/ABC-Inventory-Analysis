import { useLocale } from '../ui/locale';
import type { Language, Theme } from '../ui/locale';

export type Page = 'analysis' | 'guide';

export function WorkspaceNav({
  page,
  onNavigate,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  const { t } = useLocale();
  const pages = [
    { page: 'analysis', hash: '#analiz', icon: '▦', label: t('Analiz Paneli', 'Dashboard') },
    { page: 'guide', hash: '#rehber', icon: '▤', label: t('ABC Rehberi', 'ABC guide') },
  ] as const;
  return (
    <nav aria-label={t('Ana gezinme', 'Primary navigation')}>
      {pages.map((item) => (
        <a
          key={item.page}
          href={item.hash}
          aria-current={page === item.page ? 'page' : undefined}
          onClick={() => onNavigate(item.page)}
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </a>
      ))}
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
