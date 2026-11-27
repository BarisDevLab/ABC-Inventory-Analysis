import { useId, useMemo, useState } from 'react';
import { buildAbcXyz } from './calculate';
import type { AbcItem, AbcXyzClass, XyzItem } from './calculate';
import { Method } from '../shared/ui';

export function AbcXyzPanel({ abc, xyz }: { abc: readonly AbcItem[]; xyz: readonly XyzItem[] }) {
  const detailId = useId();
  const [active, setActive] = useState<AbcXyzClass>('AX');
  const matrix = useMemo(() => buildAbcXyz(abc, xyz), [abc, xyz]);
  const selected = matrix.cells.find((cell) => cell.category === active)!;

  return (
    <>
      <h2>ABC-XYZ matrisi</h2>
      <p>Yıllık tüketim değerini talep değişkenliğiyle birlikte inceleyin.</p>
      {!abc.length && (
        <p className="notice">
          ABC sınıfları için <a href="#analiz">Analiz Paneli’nde</a> kendi stok dosyanızı yükleyin.
        </p>
      )}
      {!xyz.length && (
        <p className="notice">
          XYZ analizi bölümünde dönemsel talep verilerinizi girip hesaplayın.
        </p>
      )}
      <table className="inventory-matrix">
        <caption>Bir hücre seçerek ürünleri ve politika seçeneklerini görüntüleyin.</caption>
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
                      <small>{cell.products.length} ürün</small>
                    </button>
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="inventory-cell-detail" id={detailId} aria-live="polite">
        <h3>
          {selected.category} · {selected.products.length} ürün
        </h3>
        <p>
          {selected.rationale} {selected.option}
        </p>
        {selected.products.length > 0 ? (
          <ul className="inventory-products">
            {selected.products.map((product) => (
              <li key={product}>{product}</li>
            ))}
          </ul>
        ) : (
          <p>Bu hücreye eşleşen ürün yok.</p>
        )}
      </div>
      {(
        [
          ['XYZ talep verisi eksik', matrix.missingXyz],
          ['Tüm dönemlerde talep sıfır olduğu için XYZ sınıfı oluşmadı', matrix.unclassifiedXyz],
          ['ABC kaydı eksik', matrix.missingAbc],
        ] as const
      ).map(
        ([label, products]) =>
          products.length > 0 && (
            <details key={label}>
              <summary>
                {label} · {products.length} ürün
              </summary>
              <ul className="inventory-products">
                {products.map((product) => (
                  <li key={product}>{product}</li>
                ))}
              </ul>
            </details>
          ),
      )}
      <Method>
        <p>
          Kategori = ABC sınıfı + XYZ sınıfı. ABC yıllık parasal tüketimi, XYZ birimsiz CV
          eşiklerini kullanır. Hücreler eşleşen ürün adediyle gösterilir.
        </p>
        <p>
          Ürün adları ABC’nin normalleştirme kuralıyla eşleştirilir. Sınıfı eksik ürünler hücre
          sayısına eklenmez. Aynı ürün tanımının ve karşılaştırılabilir inceleme aralıklarının
          kullanıldığını doğrulayın.
        </p>
      </Method>
    </>
  );
}
