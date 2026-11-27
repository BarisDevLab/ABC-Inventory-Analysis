import { useId, useState } from 'react';
import { FIELDS } from '../../core/abc';
import type { ColumnMapping, ImportConfiguration, NumberFormat } from '../../io/inventory-import';
import type { CsvSeparator } from '../../io/read-file';
import type { useInventoryImport } from './useInventoryImport';
import './inventory.css';

type ImportState = ReturnType<typeof useInventoryImport>;
type Draft = NonNullable<ImportState['draft']>;

export function ImportEditor({ importer, disabled }: { importer: ImportState; disabled: boolean }) {
  const { draft } = importer;
  if (!draft) return null;
  return (
    <MappingForm
      key={JSON.stringify(draft.configuration)}
      importer={importer}
      draft={draft}
      disabled={disabled}
    />
  );
}

function MappingForm({
  importer,
  draft,
  disabled,
}: {
  importer: ImportState;
  draft: Draft;
  disabled: boolean;
}) {
  const id = useId();
  const { preview, configuration, file, applied } = draft;
  const [expanded, setExpanded] = useState(draft.expanded);
  const [header, setHeader] = useState(String(configuration.header));
  const [numbers, setNumbers] = useState<NumberFormat>(configuration.numbers);
  const [mapping, setMapping] = useState(configuration.mapping ?? preview.suggested);
  const pendingHeader = Number(header) !== configuration.header;
  const canPreview =
    Number.isInteger(Number(header)) && Number(header) >= 1 && Number(header) <= preview.rowCount;
  const selected = mapping.filter((column) => column >= 0);
  const ready =
    mapping.slice(0, 3).every((column) => column >= 0) &&
    new Set(selected).size === selected.length;
  const width = Math.max(0, ...preview.rows.map((row) => row.cells.length));

  function previewSelection(next: Partial<ImportConfiguration>) {
    importer.preview({ ...configuration, numbers, ...next, mapping: undefined });
  }

  return (
    <div className="inventory-module inventory-editor">
      <button
        type="button"
        className="button secondary"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        Dosya önizlemesi ve sütun eşleştirme
      </button>
      <div id={id} hidden={!expanded}>
        <p className="caption">
          {file.name} · {preview.rowCount}{' '}
          {preview.sheets[0] === 'CSV' && /\.csv$/i.test(file.name) ? 'kayıt' : 'satır'}
        </p>
        <div className="inventory-controls">
          {/\.xlsx$/i.test(file.name) ? (
            <label>
              Çalışma sayfası
              <select
                value={configuration.sheet}
                disabled={disabled}
                onChange={(event) =>
                  previewSelection({ sheet: Number(event.target.value), header: 1 })
                }
              >
                {preview.sheets.map((sheet, index) => (
                  <option key={index} value={index}>
                    {sheet}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              CSV ayracı
              <select
                value={configuration.separator ?? ''}
                disabled={disabled}
                onChange={(event) =>
                  previewSelection({
                    separator: (event.target.value || undefined) as CsvSeparator | undefined,
                    header: 1,
                  })
                }
              >
                <option value="">Otomatik</option>
                <option value=",">Virgül</option>
                <option value=";">Noktalı virgül</option>
                <option value={'\t'}>Sekme</option>
              </select>
            </label>
          )}
          <label>
            Başlık satırı
            <input
              type="number"
              min="1"
              max={Math.max(1, preview.rowCount)}
              value={header}
              disabled={disabled}
              onChange={(event) => setHeader(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={disabled || !canPreview || !pendingHeader}
            onClick={() => previewSelection({ header: Number(header) })}
          >
            Başlık satırını uygula
          </button>
        </div>
        {width > 0 && (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Ham veri önizlemesi">
            <table>
              <caption className="sr-only">Ham veri önizlemesi</caption>
              <thead>
                <tr>
                  <th scope="col">Satır</th>
                  {Array.from({ length: width }, (_, index) => (
                    <th scope="col" key={index}>
                      Sütun {index + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.number}>
                    <th scope="row">
                      {row.number}
                      {row.number === configuration.header && ' · Başlık'}
                    </th>
                    {Array.from({ length: width }, (_, index) => (
                      <td key={index}>{String(row.cells[index] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {preview.columns.length > width && (
          <p className="caption">
            Önizleme ilk {width} sütunu gösterir. Eşleştirmede tüm sütunlar seçilebilir.
          </p>
        )}
        {preview.rowCount === 0 && <p>Önizleme için satır bulunamadı.</p>}
        <div className="inventory-controls">
          {[...FIELDS, 'Ürün kodu (isteğe bağlı)'].map((field, index) => (
            <label key={field}>
              {field} sütunu
              <select
                disabled={disabled || pendingHeader}
                value={mapping[index]}
                onChange={(event) => {
                  const next: ColumnMapping = [...mapping];
                  next[index] = Number(event.target.value);
                  setMapping(next);
                }}
              >
                <option value={-1}>{index === 3 ? 'Kullanma' : 'Seçin'}</option>
                {preview.columns.map((label, column) => (
                  <option key={column} value={column}>
                    {column + 1} · {label || '(Boş başlık)'}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            Sayı biçimi
            <select
              value={numbers}
              disabled={disabled}
              onChange={(event) => setNumbers(event.target.value as NumberFormat)}
            >
              <option value="auto">Otomatik</option>
              <option value="tr">Türkçe (1.234,56)</option>
              <option value="international">Uluslararası (1,234.56)</option>
            </select>
          </label>
          <button
            type="button"
            className="button primary"
            disabled={disabled || pendingHeader || !ready}
            onClick={() => importer.apply({ ...configuration, mapping, numbers })}
          >
            Eşleştirmeyi analiz et
          </button>
        </div>
        {applied && applied.count > 0 && (
          <div className="inventory-warning" role="status">
            <p>
              {applied.count} belirsiz sayı ondalık olarak okundu. Binlik ayıracı kullandıysanız
              sayı biçimini seçip yeniden analiz edin.
            </p>
            <ul>
              {applied.examples.map(({ row, field, text }) => (
                <li key={`${row}-${field}`}>
                  {row}. satır, {field} · {text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
