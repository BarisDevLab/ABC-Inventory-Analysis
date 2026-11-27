import { displayError, useLocale } from '../../ui/locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GROUPS } from '../../core/abc';
import type { Analysis, InputTable } from '../../core/abc';
import type { Comparison, ProductChange } from '../../core/comparison';
import { processAnalysis } from '../../processing/client';
import type { AnalysisResults } from '../../processing/operations';
import { ImportEditor } from './ImportEditor';
import { useInventoryImport } from './useInventoryImport';

const PAGE_SIZE = 25;
function changeType({ previous, current }: ProductChange) {
  if (!previous) return 'added';
  if (!current) return 'removed';
  return previous.group !== current.group ? 'moved' : 'same';
}

function TransitionMatrix({
  matrix,
  scenario = false,
}: {
  matrix: Comparison['matrix'];
  scenario?: boolean;
}) {
  const { t, number } = useLocale();
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={t('ABC sınıf geçiş matrisi', 'ABC transition matrix')}
    >
      <table>
        <caption>{t('ABC sınıf geçiş matrisi', 'ABC transition matrix')}</caption>
        <thead>
          <tr>
            <th scope="col">
              {scenario
                ? t('Mevcut → Senaryo', 'Current → Scenario')
                : t('Önceki → Güncel', 'Previous → Current')}
            </th>
            {GROUPS.map((group) => (
              <th scope="col" key={group}>
                {group}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((from) => (
            <tr key={from}>
              <th scope="row">{from}</th>
              {GROUPS.map((to) => (
                <td key={to}>{number(matrix[from][to], 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonDetails({ comparison }: { comparison: Comparison }) {
  const { t, money, number, percent } = useLocale();
  const FILTERS = {
    all: t('Tüm ürünler', 'All products'),
    moved: t('Sınıf değiştirenler', 'Class changes'),
    added: t('Eklenenler', 'Added'),
    removed: t('Çıkarılanlar', 'Removed'),
  } as const;

  const [filter, setFilter] = useState<keyof typeof FILTERS>('all');
  const [page, setPage] = useState(0);
  const rows = useMemo(
    () =>
      filter === 'all'
        ? comparison.changes
        : comparison.changes.filter((row) => changeType(row) === filter),
    [comparison, filter],
  );
  return (
    <>
      <p>
        {t('Önceki toplam', 'Previous total')} <strong>{money(comparison.previousTotal)}</strong> ·{' '}
        {t('Güncel toplam', 'Current total')} <strong>{money(comparison.currentTotal)}</strong> ·{' '}
        {t('Fark', 'Difference')} <strong>{money(comparison.difference)}</strong> (
        {comparison.percent === null ? '—' : percent(comparison.percent)})
      </p>
      <p>
        {t(
          `${number(comparison.moved, 0)} sınıf değiştiren · ${number(comparison.added, 0)} eklenen · ${number(comparison.removed, 0)} çıkarılan`,
          `${number(comparison.moved, 0)} changed class · ${number(comparison.added, 0)} added · ${number(comparison.removed, 0)} removed`,
        )}
      </p>
      <TransitionMatrix matrix={comparison.matrix} />
      <p className="caption">
        {comparison.identity === 'sku'
          ? t(
              'Eşleştirme büyük/küçük harfe duyarlı ürün koduyla yapıldı.',
              'Matching used case-sensitive SKUs.',
            )
          : t(
              'Eşleştirme normalleştirilmiş ürün adıyla yapıldı.',
              'Matching used normalized product names.',
            )}{' '}
        {t(
          'Matris iki dönemde de bulunan ürünleri sayar.',
          'The matrix counts products present in both periods.',
        )}
      </p>
      <div className="inventory-controls">
        <label>
          {t('Ürün değişimi filtresi', 'Filter product changes')}
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as keyof typeof FILTERS);
              setPage(0);
            }}
          >
            {Object.entries(FILTERS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {rows.length > 0 ? (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label={t('Ürün ve parasal değer değişimleri', 'Product and value changes')}
        >
          <table>
            <caption className="sr-only">
              {t('Ürün ve parasal değer değişimleri', 'Product and value changes')}
            </caption>
            <thead>
              <tr>
                {[
                  t('Ürün', 'Product'),
                  t('Önceki sınıf', 'Previous class'),
                  t('Güncel sınıf', 'Current class'),
                  t('Önceki değer', 'Previous value'),
                  t('Güncel değer', 'Current value'),
                  'Parasal fark',
                  t('Değişim', 'Change'),
                ].map((title) => (
                  <th scope="col" key={title}>
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((row) => {
                const product = row.current ?? row.previous!;
                return (
                  <tr key={comparison.identity === 'sku' ? product.sku : product.product}>
                    <th scope="row">
                      {product.product}
                      {product.sku && <small className="caption"> · {product.sku}</small>}
                      {row.previous &&
                        row.current &&
                        row.previous.product !== row.current.product && (
                          <small className="caption">
                            {' '}
                            {t(
                              ` (önceki adı ${row.previous.product})`,
                              ` (formerly ${row.previous.product})`,
                            )}
                          </small>
                        )}
                    </th>
                    <td>{row.previous?.group ?? t('Yeni ürün', 'New product')}</td>
                    <td>{row.current?.group ?? t('Çıkarıldı', 'Removed')}</td>
                    <td>{row.previous ? money(row.previous.value) : '—'}</td>
                    <td>{row.current ? money(row.current.value) : '—'}</td>
                    <td>{money(row.difference)}</td>
                    <td>{row.percent === null ? '—' : percent(row.percent)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p role="status">{t('Bu filtreye uyan ürün yok.', 'No products match this filter.')}</p>
      )}
      {rows.length > PAGE_SIZE && (
        <div className="pagination">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min(rows.length, (page + 1) * PAGE_SIZE)} / {rows.length}{' '}
            {t('ürün', 'products')}
          </span>
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            {t('Önceki', 'Previous')}
          </button>
          <button
            disabled={(page + 1) * PAGE_SIZE >= rows.length}
            onClick={() => setPage(page + 1)}
          >
            {t('Sonraki', 'Next')}
          </button>
        </div>
      )}
      <p className="caption">
        {t(
          'Önceki değer sıfırsa veya ürün yeniyse yüzde değişimi gösterilmez.',
          'Percentage change is undefined for new products or a zero previous value.',
        )}
      </p>
    </>
  );
}

export function ComparisonWorkspace({
  mode,
  analysis,
  source,
  name,
}: {
  mode: 'period' | 'scenario';
  analysis: Analysis;
  source: InputTable;
  name: string;
}) {
  const { t, language, number, money, percent } = useLocale();
  const [baseline, setBaseline] = useState<{ name: string; source: InputTable } | null>(null);
  const importer = useInventoryImport(analysis.targets, (name, result) =>
    setBaseline({ name, source: result.source }),
  );
  const [period, setPeriod] = useState<{
    analysis: Analysis;
    baseline: InputTable;
    result: Comparison;
  } | null>(null);
  const [scenario, setScenario] = useState<{
    analysis: Analysis;
    result: AnalysisResults['scenario'];
  } | null>(null);
  const [a, setA] = useState('70');
  const [b, setB] = useState('20');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const visiblePeriod =
    period?.analysis === analysis && period.baseline === baseline?.source ? period.result : null;
  const visibleScenario = scenario?.analysis === analysis ? scenario.result : null;
  const c = 100 - (Number(a) + Number(b));
  const validTargets =
    [a, b].every(
      (value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0,
    ) && c >= 0;

  async function compare(kind: 'period' | 'scenario') {
    if (active.current || (kind === 'period' && !baseline)) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError('');
    try {
      if (kind === 'period' && baseline) {
        const result = await processAnalysis(
          { kind, previous: baseline.source, current: analysis },
          controller.signal,
        );
        if (!controller.signal.aborted) setPeriod({ analysis, baseline: baseline.source, result });
      } else {
        const result = await processAnalysis(
          {
            kind: 'scenario',
            source,
            current: analysis,
            targets: { a: Number(a), b: Number(b), c },
          },
          controller.signal,
        );
        if (!controller.signal.aborted) setScenario({ analysis, result });
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : t('Karşılaştırma yapılamadı.', 'Comparison could not be completed.'),
        );
    } finally {
      if (active.current === controller && !controller.signal.aborted) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <section className="panel inventory-module" aria-labelledby="comparison-heading">
      <h1 id="comparison-heading">
        {mode === 'period' ? t('Dönemsel karşılaştırma', 'Period comparison') : 'Senaryo analizi'}
      </h1>
      <details open hidden={mode !== 'period'}>
        <summary>{t('İki dönem arasında karşılaştır', 'Compare two periods')}</summary>
        <p className="caption">
          {t(
            `Güncel dönem: ${name}. Her iki dönemde güncel ABC hedefleri kullanılır.`,
            `Current period: ${name}. Both periods use the current ABC targets.`,
          )}
        </p>
        <div className="inventory-controls">
          <label>
            {t('Önceki dönem Excel veya CSV dosyası', 'Previous period Excel or CSV file')}
            <input
              type="file"
              accept=".csv,.xlsx"
              disabled={busy || importer.busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importer.open(file);
                event.target.value = '';
              }}
            />
          </label>
          <button
            className="button primary"
            type="button"
            disabled={!baseline || busy || importer.busy}
            onClick={() => compare('period')}
          >
            {t('Dönemleri karşılaştır', 'Compare periods')}
          </button>
          {baseline && (
            <button
              className="button secondary"
              type="button"
              disabled={busy || importer.busy}
              onClick={() => {
                importer.reset();
                setBaseline(null);
                setPeriod(null);
                setError('');
              }}
            >
              {t('Önceki dönemi kaldır', 'Remove previous period')}
            </button>
          )}
        </div>
        <ImportEditor importer={importer} disabled={busy || importer.busy} />
        {importer.busy && (
          <p role="status">
            {t(
              'Önceki dönem dosyası arka planda işleniyor…',
              'Processing the previous period file…',
            )}
          </p>
        )}
        {importer.error && (
          <p role="alert">
            {displayError(
              importer.error,
              language,
              'Check the previous period file and column mapping.',
            )}
          </p>
        )}
        {baseline && (
          <p>
            {t('Önceki dönem:', 'Previous period:')} <strong>{baseline.name}</strong>
          </p>
        )}
        {visiblePeriod && (
          <ComparisonDetails key={String(baseline?.name)} comparison={visiblePeriod} />
        )}
      </details>
      <details open hidden={mode !== 'scenario'}>
        <summary>
          {t('ABC eşik senaryolarını karşılaştır', 'Compare ABC threshold scenarios')}
        </summary>
        <p className="caption">
          {t('Mevcut hedefler', 'Current targets')} A {percent(analysis.targets.a)}, B{' '}
          {percent(analysis.targets.b)}, C {percent(analysis.targets.c)}.
        </p>
        <form
          className="inventory-controls"
          onSubmit={(event) => {
            event.preventDefault();
            if (validTargets) compare('scenario');
          }}
        >
          <label>
            Senaryo A hedefi (%)
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              required
              value={a}
              onChange={(event) => {
                setA(event.target.value);
                setScenario(null);
              }}
              disabled={busy}
            />
          </label>
          <label>
            Senaryo B hedefi (%)
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              required
              value={b}
              onChange={(event) => {
                setB(event.target.value);
                setScenario(null);
              }}
              disabled={busy}
            />
          </label>
          <p>
            {t('Senaryo C hedefi:', 'Scenario target C:')} {validTargets ? percent(c) : '—'}
          </p>
          <button
            className="button primary"
            type="submit"
            disabled={!validTargets || busy || importer.busy}
          >
            {t('Eşikleri karşılaştır', 'Compare thresholds')}
          </button>
        </form>
        {!validTargets && (
          <p className="caption">
            {t('A ve B toplamı %100’ü aşmamalıdır.', 'A and B must add up to at most 100%.')}
          </p>
        )}
        {visibleScenario && (
          <>
            <p>
              {t(
                `${number(visibleScenario.moved, 0)} ürünün sınıfı değişiyor.`,
                `Products changing class: ${number(visibleScenario.moved, 0)}.`,
              )}
            </p>
            <TransitionMatrix matrix={visibleScenario.matrix} scenario />
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label={t('ABC senaryo grup özeti', 'ABC scenario group summary')}
            >
              <table>
                <caption>{t('ABC senaryo grup özeti', 'ABC scenario group summary')}</caption>
                <thead>
                  <tr>
                    {[
                      t('Sınıf', 'Class'),
                      t('Mevcut ürün', 'Current products'),
                      t('Senaryo ürün', 'Scenario products'),
                      t('Mevcut değer', 'Current value'),
                      t('Senaryo değer', 'Scenario value'),
                      t('Değer farkı', 'Value difference'),
                      'Mevcut pay',
                      'Senaryo pay',
                    ].map((title) => (
                      <th scope="col" key={title}>
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleScenario.classes.map(({ group, previous, current }) => (
                    <tr key={group}>
                      <th scope="row">{group}</th>
                      <td>{previous.count}</td>
                      <td>{current.count}</td>
                      <td>{money(previous.value)}</td>
                      <td>{money(current.value)}</td>
                      <td>{money(current.value - previous.value)}</td>
                      <td>{percent(previous.share)}</td>
                      <td>{percent(current.share)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </details>
      {busy && (
        <p role="status">
          {t('Karşılaştırma arka planda hesaplanıyor…', 'Calculating comparison…')}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {displayError(
            error,
            language,
            'Check that both periods use compatible product identifiers and valid values.',
          )}
        </p>
      )}
    </section>
  );
}
