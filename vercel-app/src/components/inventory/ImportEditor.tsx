import { useLocale } from '../../ui/locale';
import { useId, useState } from 'react';
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
  const { t } = useLocale();
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
        {t('Dosya önizlemesi ve sütun eşleştirme', 'File preview and column mapping')}
      </button>
      <div id={id} hidden={!expanded}>
        <p className="caption">
          {file.name} · {preview.rowCount}{' '}
          {preview.sheets[0] === 'CSV' && /\.csv$/i.test(file.name)
            ? t('kayıt', 'records')
            : t('satır', 'rows')}
        </p>
        <div className="inventory-controls">
          {/\.xlsx$/i.test(file.name) ? (
            <label>
              {t('Çalışma sayfası', 'Worksheet')}
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
              {t('CSV ayracı', 'CSV delimiter')}
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
                <option value="">{t('Otomatik', 'Automatic')}</option>
                <option value=",">{t('Virgül', 'Comma')}</option>
                <option value=";">{t('Noktalı virgül', 'Semicolon')}</option>
                <option value={'\t'}>{t('Sekme', 'Tab')}</option>
              </select>
            </label>
          )}
          <label>
            {t('Başlık satırı', 'Header row')}
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
            {t('Başlık satırını uygula', 'Apply header row')}
          </button>
        </div>
        {width > 0 && (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={t('Ham veri önizlemesi', 'Raw data preview')}
          >
            <table>
              <caption className="sr-only">{t('Ham veri önizlemesi', 'Raw data preview')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('Satır', 'Row')}</th>
                  {Array.from({ length: width }, (_, index) => (
                    <th scope="col" key={index}>
                      {t(`Sütun ${index + 1}`, `Column ${index + 1}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.number}>
                    <th scope="row">
                      {row.number}
                      {row.number === configuration.header && t(' · Başlık', ' · Header')}
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
            {t(
              `Önizleme ilk ${width} sütunu gösterir. Eşleştirmede tüm sütunlar seçilebilir.`,
              `The preview shows the first ${width} columns. All columns are available for mapping.`,
            )}
          </p>
        )}
        {preview.rowCount === 0 && (
          <p>{t('Önizleme için satır bulunamadı.', 'No rows to preview.')}</p>
        )}
        <div className="inventory-controls">
          {[
            t('Ürün sütunu', 'Product column'),
            t('Yıllık Tüketim sütunu', 'Annual usage column'),
            t('Birim Fiyat (TL) sütunu', 'Unit price (TL) column'),
            t('Ürün kodu (isteğe bağlı) sütunu', 'SKU column (optional)'),
          ].map((field, index) => (
            <label key={field}>
              {field}
              <select
                disabled={disabled || pendingHeader}
                value={mapping[index]}
                onChange={(event) => {
                  const next: ColumnMapping = [...mapping];
                  next[index] = Number(event.target.value);
                  setMapping(next);
                }}
              >
                <option value={-1}>
                  {index === 3 ? t('Kullanma', 'Skip') : t('Seçin', 'Select')}
                </option>
                {preview.columns.map((label, column) => (
                  <option key={column} value={column}>
                    {column + 1} · {label || t('(Boş başlık)', '(Blank header)')}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            {t('Sayı biçimi', 'Number format')}
            <select
              value={numbers}
              disabled={disabled}
              onChange={(event) => setNumbers(event.target.value as NumberFormat)}
            >
              <option value="auto">{t('Otomatik', 'Automatic')}</option>
              <option value="tr">{t('Türkçe (1.234,56)', 'Turkish (1.234,56)')}</option>
              <option value="international">
                {t('Uluslararası (1,234.56)', 'International (1,234.56)')}
              </option>
            </select>
          </label>
          <button
            type="button"
            className="button primary"
            disabled={disabled || pendingHeader || !ready}
            onClick={() => importer.apply({ ...configuration, mapping, numbers })}
          >
            {t('Eşleştirmeyi analiz et', 'Analyse mapped data')}
          </button>
        </div>
        {applied && applied.count > 0 && (
          <div className="inventory-warning" role="status">
            <p>
              {t(
                `${applied.count} belirsiz sayı ondalık olarak okundu. Binlik ayıracı kullandıysanız sayı biçimini seçip yeniden analiz edin.`,
                `Ambiguous numbers read as decimals: ${applied.count}. If you used a thousands separator, choose the number format and recalculate.`,
              )}
            </p>
            <ul>
              {applied.examples.map(({ row, field, text }) => (
                <li key={`${row}-${field}`}>
                  {t(`${row}. satır`, `Row ${row}`)}, {field} · {text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
