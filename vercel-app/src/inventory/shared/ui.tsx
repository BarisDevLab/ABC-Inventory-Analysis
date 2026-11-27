import { Icon } from '../../ui/Icon';
import { displayError, useLocale } from '../../ui/locale';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
export function Field({
  name,
  label,
  hint,
  multiline,
  optional,
}: {
  name: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  optional?: boolean;
}) {
  const { t } = useLocale();
  const id = useId();
  return (
    <label className={multiline ? 'inventory-field wide' : 'inventory-field'} htmlFor={id}>
      <span id={`${id}-label`}>
        {label}
        {optional && t(' (isteğe bağlı)', ' (optional)')}
      </span>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={4}
          maxLength={250_000}
          aria-labelledby={`${id}-label`}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
      ) : (
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          maxLength={100}
          aria-labelledby={`${id}-label`}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
      )}
    </label>
  );
}

export function ModuleForm<T>({
  children,
  compute,
  onResult,
  onReset,
  renderResult,
}: {
  children: ReactNode;
  compute: (data: FormData) => T;
  onResult?: (result: T | null) => void;
  onReset?: () => void;
  renderResult: (result: T) => ReactNode;
}) {
  const { t, language } = useLocale();
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState('');
  function clearResult() {
    if (result !== null) onResult?.(null);
    setResult(null);
    setError('');
  }
  return (
    <>
      <form
        autoComplete="off"
        className="inventory-form"
        onChange={clearResult}
        onReset={() => {
          clearResult();
          onReset?.();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const next = compute(new FormData(event.currentTarget));
            setResult(next);
            setError('');
            onResult?.(next);
          } catch (failure) {
            setResult(null);
            onResult?.(null);
            setError(
              failure instanceof Error
                ? failure.message
                : t('Hesaplama tamamlanamadı.', 'The calculation could not be completed.'),
            );
          }
        }}
      >
        {children}
        <div className="inventory-actions">
          <button type="submit" className="button primary">
            <Icon name="calculator" /> {t('Hesapla', 'Calculate')}
          </button>
          <button type="reset" className="button secondary">
            {t('Temizle', 'Clear')}
          </button>
        </div>
      </form>
      {error && (
        <p className="notice error" role="alert">
          {displayError(
            error,
            language,
            'Check the required fields, value ranges, and units, then calculate again.',
          )}
        </p>
      )}
      {result !== null && (
        <div className="inventory-results">
          <p className="inventory-result-status" role="status">
            {t('Hesaplama tamamlandı.', 'Calculation completed.')}
          </p>
          {renderResult(result)}
        </div>
      )}
    </>
  );
}

export function ResultsTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
}) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, ...values], index) => (
            <tr key={index}>
              <th scope="row">{name}</th>
              {values.map((value, column) => (
                <td key={column}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Metrics({ values }: { values: readonly (readonly [string, string])[] }) {
  return (
    <dl className="inventory-metrics">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BarChart({
  title,
  values,
  format,
}: {
  title: string;
  values: readonly (readonly [string, number])[];
  format?: (value: number) => string;
}) {
  const { detail } = useLocale();
  const id = useId();
  const formatValue = format ?? detail;
  const max = values.reduce((largest, [, value]) => Math.max(largest, value), 0);
  return (
    <figure className="inventory-bars" aria-labelledby={id}>
      <figcaption id={id}>
        <Icon name="bars" /> {title}
      </figcaption>
      <ul>
        {values.map(([label, value]) => (
          <li key={label}>
            <span className="inventory-bar-label">{label}</span>
            <span
              className="inventory-bar"
              aria-hidden="true"
              data-tooltip={`${label} · ${formatValue(value)}`}
            >
              <span style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
            </span>
            <strong>{formatValue(value)}</strong>
          </li>
        ))}
      </ul>
      {max > 0 && (
        <div className="inventory-bar-scale" aria-hidden="true">
          <span>{formatValue(0)}</span>
          <span>{formatValue(max)}</span>
        </div>
      )}
    </figure>
  );
}

export function ClassChart<T extends string>({
  title,
  groups,
  rows,
}: {
  title: string;
  groups: readonly T[];
  rows: readonly { group: T }[];
}) {
  const counts = new Map<T, number>();
  for (const row of rows) counts.set(row.group, (counts.get(row.group) ?? 0) + 1);
  return (
    <BarChart
      title={title}
      values={groups.map((group) => [group, counts.get(group) ?? 0])}
      format={String}
    />
  );
}

export function Method({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  return (
    <details className="inventory-method" open>
      <summary>
        <Icon name="book" />{' '}
        {t('Yöntem, varsayımlar ve birimler', 'Method, assumptions, and units')}
      </summary>
      {children}
    </details>
  );
}
