import { useState } from 'react';
import type { Analysis, AnalysisRow } from '../core/abc';
import { money, number, percent } from '../ui/format';
export function ProductTable({
  rows,
  caption = 'Ürün bazlı ABC sonuçları',
}: {
  rows: readonly AnalysisRow[];
  caption?: string;
}) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {[
              'Ürün',
              'Yıllık Tüketim',
              'Birim Fiyat (TL)',
              'Yıllık Değer (TL)',
              'Değer Payı (%)',
              'Kümülatif Pay (%)',
              'ABC Grubu',
            ].map((heading) => (
              <th scope="col" key={heading}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.product}>
              <th scope="row" className="product-name">
                {row.product}
              </th>
              <td>{number(row.quantity, Number.isInteger(row.quantity) ? 0 : 2)}</td>
              <td>{money(row.price)}</td>
              <td>{money(row.value)}</td>
              <td>{percent(row.share)}</td>
              <td>{percent(row.cumulative)}</td>
              <td>
                <span className={`group-badge group-${row.group}`}>{row.group}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function GroupTable({ analysis }: { analysis: Analysis }) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="ABC grup özeti">
      <table>
        <thead>
          <tr>
            {['Grup', 'Ürün', 'Yıllık değer (TL)', 'Pay (%)'].map((title) => (
              <th key={title} scope="col">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {analysis.summary.map((group) => (
            <tr key={group.group}>
              <th scope="row">
                <span className={`group-badge group-${group.group}`}>{group.group}</span>
              </th>
              <td>{group.count}</td>
              <td>{money(group.value)}</td>
              <td>{percent(group.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ResultsTables({ analysis }: { analysis: Analysis }) {
  const [tab, setTab] = useState('products'),
    [page, setPage] = useState(0);
  const pages = Math.ceil(analysis.rows.length / 50),
    visiblePage = Math.min(page, pages - 1);
  return (
    <section className="panel" aria-labelledby="results-heading">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">04 / DETAYLI SONUÇLAR</span>
          <h2 id="results-heading">Analizin tüm ayrıntıları</h2>
        </div>
        <span className="subtle-label">Tam veri kümesi</span>
      </div>
      <div className="tabs" aria-label="Sonuç görünümü">
        <button
          className={tab === 'products' ? 'active' : ''}
          aria-pressed={tab === 'products'}
          onClick={() => setTab('products')}
        >
          Ürün bazlı sonuçlar
        </button>
        <button
          className={tab === 'groups' ? 'active' : ''}
          aria-pressed={tab === 'groups'}
          onClick={() => setTab('groups')}
        >
          Grup özeti
        </button>
      </div>
      {tab === 'products' ? (
        <>
          <ProductTable rows={analysis.rows.slice(visiblePage * 50, (visiblePage + 1) * 50)} />
          {pages > 1 && (
            <div className="pagination">
              <span>
                {visiblePage * 50 + 1}–{Math.min((visiblePage + 1) * 50, analysis.rows.length)} /{' '}
                {analysis.rows.length} ürün
              </span>
              <button disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}>
                Önceki
              </button>
              <button disabled={visiblePage === pages - 1} onClick={() => setPage(visiblePage + 1)}>
                Sonraki
              </button>
            </div>
          )}
        </>
      ) : (
        <GroupTable analysis={analysis} />
      )}
      <p className="caption">
        Tablolar ve Excel raporu Pareto filtrelerinden etkilenmez.
        {pages > 1 ? ' Büyük tablolar 50 ürünlük sayfalarda gösterilir.' : ''}
      </p>
    </section>
  );
}
