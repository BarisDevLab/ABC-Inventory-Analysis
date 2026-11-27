import type { Analysis } from '../core/abc';
import { money, percent } from '../ui/format';
import { policies } from './GuidePage';
export function AnalysisInsights({ analysis }: { analysis: Analysis }) {
  return (
    <>
      <section className="insights panel" aria-labelledby="insights-heading">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">VERİDEN KARAR DESTEĞİ</span>
            <h2 id="insights-heading">Verinin anlattıkları</h2>
          </div>
          <span className="subtle-label">Tam veri kümesi</span>
        </div>
        <div className="insight-grid">
          <div>
            <span>En yüksek yıllık tüketim değeri</span>
            <h3>{analysis.insights.top_product}</h3>
            <strong>{money(analysis.insights.top_value)}</strong>
          </div>
          <div>
            <span>İlk {analysis.insights.top_count} ürünün toplam değer payı</span>
            <strong className="concentration">{percent(analysis.insights.top_share)}</strong>
            <p>A grubu gerçekleşen payı: {percent(analysis.insights.a_share)}</p>
          </div>
        </div>
        <p>{analysis.commentary[2]}</p>
      </section>
      <div className="policy-grid">
        {policies.map((policy) => (
          <article key={policy.group} className="policy">
            <span className={`group-badge group-${policy.group}`}>{policy.group}</span>
            <div>
              <h3>{policy.title}</h3>
              <p>{policy.description}</p>
              <small>
                Bu analizde {analysis.insights.counts[policy.group as 'A' | 'B' | 'C']} ürün
              </small>
            </div>
          </article>
        ))}
      </div>
      <p className="warning-note">
        Düşük ekonomik değere sahip kritik parçalar ayrıca değerlendirilmelidir.
      </p>
    </>
  );
}
