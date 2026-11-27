import { useDeferredValue, useMemo, useState } from 'react';
import { GROUPS, normalizeProduct } from '../core/abc';
import type { Analysis, AnalysisRow, Group } from '../core/abc';
import { useLocale } from '../ui/locale';
const PAGE_SIZE = 50;

export function ProductTable({
  rows,
  caption,
}: {
  rows: readonly AnalysisRow[];
  caption?: string;
}) {
  const { t, money, number, percent } = useLocale();
  const label = caption ?? t('Ürün bazlı ABC sonuçları', 'ABC results by product');
  const withSku = rows.some((row) => row.sku !== undefined);
  const headings = [
    t('Ürün', 'Product'),
    ...(withSku ? [t('Ürün kodu', 'SKU')] : []),
    t('Yıllık Tüketim', 'Annual usage'),
    t('Birim Fiyat (TL)', 'Unit price (TL)'),
    t('Yıllık Değer (TL)', 'Annual value (TL)'),
    t('Değer Payı (%)', 'Value share (%)'),
    t('Kümülatif Pay (%)', 'Cumulative share (%)'),
    t('ABC Grubu', 'ABC group'),
  ];
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={label}>
      <table className="product-table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th scope="col" key={heading}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sku ?? row.product}>
              <th scope="row" className="product-name">
                {row.product}
              </th>
              {withSku && <td>{row.sku ?? '—'}</td>}
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
  const { t, money, number, percent } = useLocale();
  const caption = t('ABC grup özeti', 'ABC group summary');
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {[
              t('Grup', 'Group'),
              t('Ürün', 'Products'),
              t('Yıllık değer (TL)', 'Annual value (TL)'),
              t('Pay (%)', 'Share (%)'),
            ].map((title) => (
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
              <td>{number(group.count, 0)}</td>
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
  const { t, number } = useLocale();
  const [tab, setTab] = useState('products');
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group | ''>('');
  const deferredQuery = useDeferredValue(query);
  const rows = useMemo(() => {
    const needle = normalizeProduct(deferredQuery.trim());
    if (!needle && !group) return analysis.rows;
    return analysis.rows.filter(
      (row) =>
        (!group || row.group === group) &&
        (!needle ||
          normalizeProduct(row.product).includes(needle) ||
          normalizeProduct(row.sku ?? '').includes(needle)),
    );
  }, [analysis.rows, group, deferredQuery]);
  const pages = Math.ceil(rows.length / PAGE_SIZE);
  const visiblePage = Math.max(0, Math.min(page, pages - 1));
  const from = visiblePage * PAGE_SIZE;
  const to = Math.min(from + PAGE_SIZE, rows.length);
  const count = number(rows.length, 0);
  const range = `${number(from + 1, 0)}–${number(to, 0)} / ${count}`;
  return (
    <section className="panel results-panel" aria-labelledby="results-heading">
      <div className="panel-heading">
        <h2 id="results-heading">{t('Stok dökümü', 'Inventory breakdown')}</h2>
        <div className="tabs" role="group" aria-label={t('Sonuç görünümü', 'Results view')}>
          <button aria-pressed={tab === 'products'} onClick={() => setTab('products')}>
            {t('Ürün bazlı sonuçlar', 'By product')}
          </button>
          <button aria-pressed={tab === 'groups'} onClick={() => setTab('groups')}>
            {t('Grup özeti', 'Group summary')}
          </button>
        </div>
      </div>
      {tab === 'products' ? (
        <>
          <div className="table-controls">
            <label>
              {t('Ürün ara', 'Find products')}
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
              />
            </label>
            <label>
              {t('ABC grubu', 'ABC group')}
              <select
                value={group}
                onChange={(event) => {
                  setGroup(event.target.value as Group | '');
                  setPage(0);
                }}
              >
                <option value="">{t('Tüm gruplar', 'All groups')}</option>
                {GROUPS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          {rows.length > 0 ? (
            <ProductTable rows={rows.slice(from, to)} />
          ) : (
            <p role="status">
              {t('Aramanızla eşleşen ürün yok.', 'No products match your search.')}
            </p>
          )}
          {rows.length > 0 && (
            <div className="pagination">
              <span aria-live="polite">{t(`${range} ürün`, `${range} products`)}</span>
              {pages > 1 && (
                <>
                  <button disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}>
                    {t('Önceki', 'Previous')}
                  </button>
                  <button
                    disabled={visiblePage === pages - 1}
                    onClick={() => setPage(visiblePage + 1)}
                  >
                    {t('Sonraki', 'Next')}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <GroupTable analysis={analysis} />
      )}
      <p className="caption">
        {t(
          'Pareto filtreleri ve tablo araması Excel raporunu değiştirmez.',
          'Chart filters and table search leave the Excel report unchanged.',
        )}
      </p>
    </section>
  );
}
