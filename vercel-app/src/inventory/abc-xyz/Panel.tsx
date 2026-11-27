import { useLocale } from '../../ui/locale';
import { useId, useMemo, useState } from 'react';
import { buildAbcXyz } from './calculate';
import type { AbcItem, AbcXyzClass, XyzItem } from './calculate';
import { Method } from '../shared/ui';

const PAGE_SIZE = 50;

function ProductList({ products }: { products: readonly string[] }) {
  const { t } = useLocale();
  const [offset, setOffset] = useState(0);
  const lastOffset = Math.floor((products.length - 1) / PAGE_SIZE) * PAGE_SIZE;
  const start = Math.min(offset, lastOffset);
  return (
    <>
      <ul className="inventory-products">
        {products.slice(start, start + PAGE_SIZE).map((product) => (
          <li key={product}>{product}</li>
        ))}
      </ul>
      {products.length > PAGE_SIZE && (
        <div className="pagination">
          <span aria-live="polite">
            {start + 1}–{Math.min(start + PAGE_SIZE, products.length)} / {products.length}
          </span>
          <button type="button" disabled={start === 0} onClick={() => setOffset(start - PAGE_SIZE)}>
            {t('Önceki', 'Previous')}
          </button>
          <button
            type="button"
            disabled={start >= lastOffset}
            onClick={() => setOffset(start + PAGE_SIZE)}
          >
            {t('Sonraki', 'Next')}
          </button>
        </div>
      )}
    </>
  );
}

export function AbcXyzPanel({ abc, xyz }: { abc: readonly AbcItem[]; xyz: readonly XyzItem[] }) {
  const { t, language } = useLocale();
  const detailId = useId();
  const [active, setActive] = useState<AbcXyzClass>('AX');
  const matrix = useMemo(() => buildAbcXyz(abc, xyz, language), [abc, xyz, language]);
  const selected = matrix.cells.find((cell) => cell.category === active)!;

  return (
    <>
      <h2>{t('ABC-XYZ matrisi', 'ABC-XYZ matrix')}</h2>
      <p>
        {t(
          'Yıllık tüketim değerini talep değişkenliğiyle birlikte inceleyin.',
          'Evaluate annual usage value alongside demand variability.',
        )}
      </p>
      {!abc.length && (
        <p className="notice">
          {t(
            'ABC sınıfları için kendi stok dosyanızı yükleyin.',
            'Upload your inventory file to calculate ABC classes.',
          )}{' '}
          <a href="#analiz">{t('ABC analizi', 'ABC analysis')}</a>
        </p>
      )}
      {!xyz.length && (
        <p className="notice">
          {t(
            'XYZ analizi bölümünde dönemsel talep verilerinizi girip hesaplayın.',
            'Enter and calculate periodic demand in the XYZ analysis tab.',
          )}
        </p>
      )}
      <table className="inventory-matrix">
        <caption>
          {t(
            'Bir hücre seçerek ürünleri ve politika seçeneklerini görüntüleyin.',
            'Select a cell to view products and policy options.',
          )}
        </caption>
        <thead>
          <tr>
            <th scope="col">ABC / XYZ</th>
            <th scope="col">X</th>
            <th scope="col">Y</th>
            <th scope="col">Z</th>
          </tr>
        </thead>
        <tbody>
          {(['A', 'B', 'C'] as const).map((group) => (
            <tr key={group}>
              <th scope="row">{group}</th>
              {matrix.cells
                .filter((cell) => cell.category.startsWith(group))
                .map((cell) => (
                  <td key={cell.category}>
                    <button
                      type="button"
                      onClick={() => setActive(cell.category)}
                      aria-pressed={active === cell.category}
                      aria-controls={detailId}
                      className="button secondary"
                    >
                      <strong>{cell.category}</strong>
                      <small>
                        {cell.products.length} {t('ürün', 'products')}
                      </small>
                    </button>
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="inventory-cell-detail" id={detailId} aria-live="polite">
        <h3>
          {selected.category} · {selected.products.length} {t('ürün', 'products')}
        </h3>
        <p>
          {selected.rationale} {selected.option}
        </p>
        {selected.products.length > 0 ? (
          <ProductList key={selected.category} products={selected.products} />
        ) : (
          <p>{t('Bu hücreye eşleşen ürün yok.', 'No products match this cell.')}</p>
        )}
      </div>
      {(
        [
          [t('XYZ talep verisi eksik', 'Missing XYZ demand data'), matrix.missingXyz],
          [
            t(
              'Tüm dönemlerde talep sıfır olduğu için XYZ sınıfı oluşmadı',
              'Zero demand in every period leaves the XYZ class undefined',
            ),
            matrix.unclassifiedXyz,
          ],
          [t('ABC kaydı eksik', 'Missing ABC record'), matrix.missingAbc],
        ] as const
      ).map(
        ([label, products]) =>
          products.length > 0 && (
            <details key={label}>
              <summary>
                {label} · {products.length} {t('ürün', 'products')}
              </summary>
              <ProductList products={products} />
            </details>
          ),
      )}
      <Method>
        <p>
          {t(
            'Kategori = ABC sınıfı + XYZ sınıfı. ABC yıllık parasal tüketimi, XYZ birimsiz CV eşiklerini kullanır. Hücreler eşleşen ürün adediyle gösterilir.',
            'Category = ABC class + XYZ class. ABC uses annual usage value and XYZ uses unitless CV thresholds. Each cell shows the matched product count.',
          )}
        </p>
        <p>
          {t(
            'Ürün kodu varsa büyük/küçük harfe duyarlı kod, yoksa normalleştirilmiş ürün adı kullanılır. Sınıfı eksik ürünler hücre sayısına girmez.',
            'Matching uses case-sensitive SKUs when available and normalized product names otherwise. Products with a missing class are excluded from the matrix.',
          )}
        </p>
      </Method>
    </>
  );
}
