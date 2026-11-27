import type { Analysis } from '../core/abc';
import { useLocale } from '../ui/locale';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

export function KpiOverview({
  analysis,
  featured = false,
}: {
  analysis: Analysis;
  featured?: boolean;
}) {
  const { t, money, number, percent } = useLocale();
  const cards = [
    {
      key: 'total',
      label: t('Yıllık tüketim değeri', 'Annual usage value'),
      value: money(analysis.total),
      note: t('Tüm ürünler', 'All products'),
      icon: featured ? 'inventory-value' : 'coins',
    },
    {
      key: 'products',
      label: t('Analiz edilen ürün', 'Products analysed'),
      value: number(analysis.rows.length, 0),
      note: t('Benzersiz stok kalemi', 'Unique stock items'),
      icon: featured ? 'inventory-count' : 'box',
    },
    {
      key: 'a_share',
      label: t('A grubu değer payı', 'Group A value share'),
      value: percent(analysis.insights.a_share),
      note: t(
        `Hedef ${percent(analysis.targets.a, 0)}`,
        `Target ${percent(analysis.targets.a, 0)}`,
      ),
      icon: featured ? 'inventory-share' : 'pie',
    },
  ] satisfies { key: string; label: string; value: string; note: string; icon: IconName }[];
  return (
    <div className={`kpi-grid ${featured ? 'kpi-feature-grid' : ''}`}>
      {cards.map(({ key, label, value, note, icon }) => (
        <article key={key} className={`kpi kpi-${key}`} data-kpi={key} data-value={value}>
          <span className="kpi-icon">
            <Icon name={icon} />
          </span>
          <div className="kpi-label">{label}</div>
          <strong className="kpi-value">{value}</strong>
          <span className="kpi-note">{note}</span>
          {featured && key === 'total' && (
            <div className="kpi-composition">
              <div className="kpi-composition-label">
                <span>{t('Değer yoğunlaşması', 'Value concentration')}</span>
                <span>
                  {t(
                    `İlk ${analysis.insights.top_count} ürün`,
                    `Top ${analysis.insights.top_count} products`,
                  )}{' '}
                  · {percent(analysis.insights.top_share)}
                </span>
              </div>
              <div className="kpi-composition-track" aria-hidden="true">
                {analysis.rows.slice(0, analysis.insights.top_count).map((row) => (
                  <span
                    key={row.sku ?? row.product}
                    className={`tone-${row.group}`}
                    style={{ width: `${row.share}%` }}
                  />
                ))}
              </div>
            </div>
          )}
          {featured && key === 'products' && (
            <div className="kpi-group-counts">
              {analysis.summary.map(({ group, count }) => (
                <span key={group} className={`tone-${group}`}>
                  <span>{group}</span> <strong>{number(count, 0)}</strong>
                </span>
              ))}
            </div>
          )}
          {featured && key === 'a_share' && (
            <div className="kpi-target-track" aria-hidden="true">
              <span style={{ width: `${analysis.insights.a_share}%` }} />
              <i style={{ left: `${analysis.targets.a}%` }} />
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export function GroupBreakdown({ analysis, compact }: { analysis: Analysis; compact: boolean }) {
  const { t, money, number, percent } = useLocale();
  const [groupA, groupB] = analysis.summary;
  const aShare = groupA.share;
  const abShare = Math.min(100, aShare + groupB.share);
  return (
    <section
      className={`group-breakdown ${compact ? 'group-breakdown-inline' : 'panel'}`}
      aria-labelledby="group-breakdown-title"
    >
      <header className="panel-heading">
        <div>
          <h2 id="group-breakdown-title">{t('ABC değer dağılımı', 'ABC value distribution')}</h2>
          {!compact && <p>{t('Gerçekleşen yıllık tüketim değeri', 'Actual annual usage value')}</p>}
        </div>
        {!compact && (
          <span className="section-icon">
            <Icon name="bars" />
          </span>
        )}
      </header>
      {!compact && (
        <div className="breakdown-chart">
          <div
            className="breakdown-ring"
            aria-hidden="true"
            style={{
              backgroundImage: `conic-gradient(var(--class-a) 0 ${aShare}%, var(--class-b) ${aShare}% ${abShare}%, var(--class-c) ${abShare}% 100%)`,
            }}
          >
            <div>
              <strong>{percent(aShare)}</strong>
              <span>{t('A grubu', 'Group A')}</span>
            </div>
          </div>
          <div className="distribution-scales">
            {(
              [
                [t('Değer payı', 'Value share'), 'share'],
                [t('Ürün dağılımı', 'Product distribution'), 'count'],
              ] as const
            ).map(([label, key]) => (
              <div key={key} className="distribution-scale">
                <span>{label}</span>
                <div className="value-spectrum" aria-hidden="true">
                  {analysis.summary
                    .filter((row) => row[key] > 0)
                    .map((row) => (
                      <span
                        key={row.group}
                        className={`tone-${row.group}`}
                        style={{ flexGrow: row[key] }}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <ul className="group-breakdown-items">
        {analysis.summary.map(({ group, count, share, value }) => (
          <li
            key={group}
            className={`tone-${group}`}
            data-kpi={group}
            data-value={number(count, 0)}
          >
            <span className={`group-badge group-${group}`}>{group}</span>
            <div className="group-breakdown-quantity">
              <span>{t(`${group} grubu`, `Group ${group}`)}</span>
              <small>{t(`${number(count, 0)} ürün`, `${number(count, 0)} products`)}</small>
            </div>
            {!compact && <strong>{money(value)}</strong>}
            <span className="group-share">{percent(share)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LeadingProducts({ analysis }: { analysis: Analysis }) {
  const { t, money, percent, number } = useLocale();
  return (
    <section className="panel overview-products" aria-labelledby="overview-products-title">
      <header className="panel-heading">
        <div>
          <h2 id="overview-products-title">
            {t('En yüksek değerli ürünler', 'Highest-value products')}
          </h2>
          <p>{t('Yıllık tüketim değerine göre', 'Ranked by annual usage value')}</p>
        </div>
        <a className="text-button overview-table-link" href="#analiz">
          {t('Tam analizi aç', 'Open full analysis')} <Icon name="arrow" />
        </a>
      </header>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-labelledby="overview-products-title"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">{t('Ürün', 'Product')}</th>
              <th scope="col">{t('ABC grubu', 'ABC group')}</th>
              <th scope="col">{t('Yıllık değer', 'Annual value')}</th>
              <th scope="col">{t('Toplam değer payı', 'Share of total value')}</th>
            </tr>
          </thead>
          <tbody>
            {analysis.rows.slice(0, 5).map((row, index) => (
              <tr key={row.sku ?? row.product}>
                <th scope="row">
                  <span className="product-rank">{number(index + 1, 0)}</span>
                  {row.product}
                </th>
                <td>
                  <span className={`group-badge group-${row.group}`}>{row.group}</span>
                </td>
                <td>{money(row.value)}</td>
                <td>
                  <div className="overview-product-share">
                    <span className={`product-share-track tone-${row.group}`} aria-hidden="true">
                      <i style={{ width: `${row.share}%` }} />
                    </span>
                    <span>{percent(row.share)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
