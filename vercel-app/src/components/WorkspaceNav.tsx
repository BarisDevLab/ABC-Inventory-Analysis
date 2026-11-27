import { useState } from 'react';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';
import { useLocale } from '../ui/locale';
import type { Language, Theme } from '../ui/locale';

export const workspacePages = {
  overview: ['#genel-bakis', 'Genel bakış', 'Overview'],
  analysis: ['#analiz', 'ABC analizi', 'ABC analysis'],
  xyz: ['#stok-karar-destegi', 'XYZ ve ABC-XYZ', 'XYZ and ABC-XYZ'],
  period: ['#donemsel-karsilastirma', 'Dönemsel karşılaştırma', 'Period comparison'],
  scenario: ['#senaryo', 'Senaryo analizi', 'Scenario analysis'],
  optimization: ['#stok-optimizasyonu', 'Sipariş ve emniyet stoku', 'Ordering and safety stock'],
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

const icons: Record<Page, IconName> = {
  overview: 'overview',
  analysis: 'bars',
  xyz: 'wave',
  movement: 'box',
  period: 'compare',
  scenario: 'branch',
  optimization: 'sliders',
  simulation: 'calculator',
  history: 'history',
  guide: 'book',
};

const groups = [
  {
    id: 'classes',
    tr: 'Stok sınıflandırma',
    en: 'Stock classification',
    icon: 'layers',
    pages: ['analysis', 'xyz', 'movement'],
  },
  {
    id: 'comparisons',
    tr: 'Karşılaştırmalı analiz',
    en: 'Comparative analysis',
    icon: 'compare',
    pages: ['period', 'scenario'],
  },
  {
    id: 'optimizations',
    tr: 'Stok optimizasyonu',
    en: 'Stock optimization',
    icon: 'sliders',
    pages: ['optimization', 'simulation'],
  },
] satisfies { id: string; tr: string; en: string; icon: IconName; pages: Page[] }[];

export function WorkspaceNav({
  page,
  collapsed,
  onNavigate,
}: {
  page: Page;
  collapsed: boolean;
  onNavigate: (page: Page) => void;
}) {
  const { t } = useLocale();
  const [disclosures, setDisclosures] = useState<Record<string, { open: boolean; page: Page }>>({});

  function renderLink(item: Page) {
    const [hash, tr, en] = workspacePages[item];
    const title = t(tr, en);
    return (
      <a
        key={item}
        href={hash}
        title={title}
        aria-label={title}
        aria-current={page === item ? 'page' : undefined}
        onClick={() => onNavigate(item)}
      >
        <Icon name={icons[item]} />
        <span className="nav-label">{title}</span>
      </a>
    );
  }

  return (
    <nav aria-label={t('Ana gezinme', 'Primary navigation')}>
      {renderLink('overview')}
      <div className="nav-groups">
        {groups.map((group) => {
          const active = group.pages.some((item) => item === page);
          const previous = disclosures[group.id];
          const expanded =
            previous?.page === page ? previous.open : active || (previous?.open ?? true);
          return (
            <div className="nav-group" key={group.id}>
              <button
                type="button"
                className="nav-group-toggle"
                aria-expanded={expanded}
                aria-controls={`nav-${group.id}`}
                onClick={() =>
                  setDisclosures({ ...disclosures, [group.id]: { open: !expanded, page } })
                }
              >
                <Icon name={group.icon} />
                <span>{t(group.tr, group.en)}</span>
                <Icon name="chevron" />
              </button>
              <div className="nav-children" id={`nav-${group.id}`} hidden={!expanded && !collapsed}>
                {group.pages.map(renderLink)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="nav-utilities">
        {renderLink('history')}
        {renderLink('guide')}
      </div>
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
        onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        <span>
          {theme === 'dark' ? t('Açık tema', 'Light theme') : t('Koyu tema', 'Dark theme')}
        </span>
      </button>
    </div>
  );
}
