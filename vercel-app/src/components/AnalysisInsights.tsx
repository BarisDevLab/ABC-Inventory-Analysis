import { Icon } from '../ui/Icon';
import type { Analysis } from '../core/abc';
import { useLocale } from '../ui/locale';
import type { Translate } from '../ui/locale';

export function groupPolicies(t: Translate) {
  return [
    {
      group: 'A',
      title: t('Yüksek öncelik', 'High priority'),
      description: t(
        'Ayrıntılı tedarik planlama ve sık stok kontrolü.',
        'Plan replenishment closely and check stock frequently.',
      ),
    },
    {
      group: 'B',
      title: t('Dengeli kontrol', 'Balanced control'),
      description: t(
        'Düzenli gözden geçirme, periyodik sayım ve dengeli sipariş politikaları.',
        'Review regularly, schedule cycle counts and balance replenishment.',
      ),
    },
    {
      group: 'C',
      title: t('Yalın takip', 'Simple monitoring'),
      description: t(
        'Daha basit, düşük maliyetli stok izleme.',
        'Use simpler, lower-cost stock monitoring.',
      ),
    },
  ] as const;
}

export function AnalysisInsights({
  analysis,
  compact = false,
}: {
  analysis: Analysis;
  compact?: boolean;
}) {
  const { t, money, percent, number, language } = useLocale();
  const { top_product, top_value, top_count, top_share, a_share, counts } = analysis.insights;
  return (
    <section
      className={`panel insights ${compact ? 'insights-compact' : ''}`}
      aria-labelledby="insights-heading"
    >
      <div className="panel-heading">
        <h2 id="insights-heading">{t('Stok kontrolü öncelikleri', 'Stock control priorities')}</h2>
        <span className="section-icon">
          <Icon name="signal" />
        </span>
      </div>
      <div className="insight-grid">
        <div>
          <span>{t('En yüksek yıllık tüketim değeri', 'Highest annual usage value')}</span>
          <h3>{top_product}</h3>
          <strong>{money(top_value)}</strong>
        </div>
        <div>
          <span>
            {t(
              `İlk ${top_count} ürünün toplam değer payı`,
              `Value share of the top ${top_count} products`,
            )}
          </span>
          <strong className="concentration">{percent(top_share)}</strong>
          <p>
            {t('A grubu gerçekleşen payı', 'Actual share of group A')}: {percent(a_share)}
          </p>
        </div>
      </div>
      <p>
        {language === 'tr'
          ? analysis.commentary[2]
          : counts.A
            ? `Prioritise the ${number(counts.A, 0)} group A products for frequent checks and detailed replenishment planning. They represent ${percent(a_share)} of annual value.`
            : 'These targets leave group A empty. Consider the B/C distribution and operational criticality when setting control priorities.'}
      </p>
      {!compact && (
        <div className="policy-grid">
          {groupPolicies(t).map(({ group, title, description }) => (
            <article key={group} className="policy">
              <span className={`group-badge group-${group}`}>{group}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
                <small>
                  {t(`${number(counts[group], 0)} ürün`, `${number(counts[group], 0)} products`)}
                </small>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="caption">
        {t(
          'Düşük ekonomik değere sahip kritik parçalar ayrıca değerlendirilmelidir.',
          'Review operationally critical parts separately, even when their annual value is low.',
        )}
      </p>
    </section>
  );
}
