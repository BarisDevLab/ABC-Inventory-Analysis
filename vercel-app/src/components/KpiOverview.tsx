import type { Analysis } from '../core/abc';
import { useLocale } from '../ui/locale';

export function KpiOverview({ analysis }: { analysis: Analysis }) {
  const { t, money, number, percent } = useLocale();
  const cards = [
    {
      key: 'total',
      label: t('Yıllık tüketim değeri', 'Annual usage value'),
      value: money(analysis.total),
      note: t('Tüm ürünler', 'All products'),
      icon: '₺',
    },
    {
      key: 'products',
      label: t('Analiz edilen ürün', 'Products analysed'),
      value: number(analysis.rows.length, 0),
      note: t('Benzersiz stok kalemi', 'Unique stock items'),
      icon: '▦',
    },
    {
      key: 'a_share',
      label: t('A grubu değer payı', 'Group A value share'),
      value: percent(analysis.insights.a_share),
      note: t(
        `Hedef ${percent(analysis.targets.a, 0)}`,
        `Target ${percent(analysis.targets.a, 0)}`,
      ),
      icon: '◷',
    },
    ...analysis.summary.map((group) => ({
      key: group.group,
      label: t(`${group.group} grubu ürünleri`, `Group ${group.group} products`),
      value: number(group.count, 0),
      note: t(`${percent(group.share)} değer payı`, `${percent(group.share)} of total value`),
      icon: group.group,
      share: group.share,
    })),
  ];
  return (
    <div className="kpi-grid">
      {cards.map((card) => (
        <article
          key={card.key}
          className={`kpi kpi-${card.key}`}
          data-kpi={card.key}
          data-value={card.value}
        >
          <div className="kpi-label">
            {card.label}
            <span className="kpi-icon" aria-hidden="true">
              {card.icon}
            </span>
          </div>
          <strong className="kpi-value">{card.value}</strong>
          <span className="kpi-note">{card.note}</span>
          {'share' in card && (
            <div className="kpi-rail" aria-hidden="true">
              <span style={{ width: `${card.share}%` }} />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
