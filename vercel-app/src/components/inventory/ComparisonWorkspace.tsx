import { useEffect, useMemo, useRef, useState } from 'react';
import { GROUPS } from '../../core/abc';
import type { Analysis, InputTable } from '../../core/abc';
import type { Comparison, ProductChange } from '../../core/comparison';
import { processAnalysis } from '../../processing/client';
import type { AnalysisResults } from '../../processing/operations';
import { money, number, percent } from '../../ui/format';
import { ImportEditor } from './ImportEditor';
import { useInventoryImport } from './useInventoryImport';

const PAGE_SIZE = 25;
const FILTERS = {
  all: 'Tüm ürünler',
  moved: 'Sınıf değiştirenler',
  added: 'Eklenenler',
  removed: 'Çıkarılanlar',
} as const;

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
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="ABC sınıf geçiş matrisi">
      <table>
        <caption>ABC sınıf geçiş matrisi</caption>
        <thead>
          <tr>
            <th scope="col">{scenario ? 'Mevcut → Senaryo' : 'Önceki → Güncel'}</th>
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
        Önceki toplam <strong>{money(comparison.previousTotal)}</strong> · Güncel toplam{' '}
        <strong>{money(comparison.currentTotal)}</strong> · Fark{' '}
        <strong>{money(comparison.difference)}</strong> (
        {comparison.percent === null ? '—' : percent(comparison.percent)})
      </p>
      <p>
        {comparison.moved} sınıf değiştiren · {comparison.added} eklenen · {comparison.removed}{' '}
        çıkarılan
      </p>
      <TransitionMatrix matrix={comparison.matrix} />
      <p className="caption">
        Eşleştirme{' '}
        {comparison.identity === 'sku'
          ? 'büyük/küçük harfe duyarlı ürün koduyla'
          : 'normalleştirilmiş ürün adıyla'}{' '}
        yapıldı. Matris iki dönemde de bulunan ürünleri sayar.
      </p>
      <div className="inventory-controls">
        <label>
          Ürün değişimi filtresi
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
          aria-label="Ürün ve parasal değer değişimleri"
        >
          <table>
            <caption className="sr-only">Ürün ve parasal değer değişimleri</caption>
            <thead>
              <tr>
                {[
                  'Ürün',
                  'Önceki sınıf',
                  'Güncel sınıf',
                  'Önceki değer',
                  'Güncel değer',
                  'Parasal fark',
                  'Değişim',
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
                          <small className="caption"> (önceki adı {row.previous.product})</small>
                        )}
                    </th>
                    <td>{row.previous?.group ?? 'Yeni ürün'}</td>
                    <td>{row.current?.group ?? 'Çıkarıldı'}</td>
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
        <p role="status">Bu filtreye uyan ürün yok.</p>
      )}
      {rows.length > PAGE_SIZE && (
        <div className="pagination">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min(rows.length, (page + 1) * PAGE_SIZE)} / {rows.length}{' '}
            ürün
          </span>
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            Önceki
          </button>
          <button
            disabled={(page + 1) * PAGE_SIZE >= rows.length}
            onClick={() => setPage(page + 1)}
          >
            Sonraki
          </button>
        </div>
      )}
      <p className="caption">Önceki değer sıfırsa veya ürün yeniyse yüzde değişimi gösterilmez.</p>
    </>
  );
}

export function ComparisonWorkspace({
  analysis,
  source,
  name,
}: {
  analysis: Analysis;
  source: InputTable;
  name: string;
}) {
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
        setError(error instanceof Error ? error.message : 'Karşılaştırma yapılamadı.');
    } finally {
      if (active.current === controller && !controller.signal.aborted) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <section className="panel inventory-module" aria-labelledby="comparison-heading">
      <h2 id="comparison-heading">Karşılaştırmalı analiz</h2>
      <details>
        <summary>İki dönem arasında karşılaştır</summary>
        <p className="caption">
          Güncel dönem: {name}. Her iki dönemde güncel ABC hedefleri kullanılır.
        </p>
        <div className="inventory-controls">
          <label>
            Önceki dönem Excel veya CSV dosyası
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
            Dönemleri karşılaştır
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
              Önceki dönemi kaldır
            </button>
          )}
        </div>
        <ImportEditor importer={importer} disabled={busy || importer.busy} />
        {importer.busy && <p role="status">Önceki dönem dosyası arka planda işleniyor…</p>}
        {importer.error && <p role="alert">{importer.error}</p>}
        {baseline && (
          <p>
            Önceki dönem: <strong>{baseline.name}</strong>
          </p>
        )}
        {visiblePeriod && (
          <ComparisonDetails key={String(baseline?.name)} comparison={visiblePeriod} />
        )}
      </details>
      <details>
        <summary>ABC eşik senaryolarını karşılaştır</summary>
        <p className="caption">
          Mevcut hedefler A %{number(analysis.targets.a)}, B %{number(analysis.targets.b)}, C %
          {number(analysis.targets.c)}.
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
          <p>Senaryo C hedefi: {validTargets ? percent(c) : '—'}</p>
          <button
            className="button primary"
            type="submit"
            disabled={!validTargets || busy || importer.busy}
          >
            Eşikleri karşılaştır
          </button>
        </form>
        {!validTargets && <p className="caption">A ve B toplamı %100’ü aşmamalıdır.</p>}
        {visibleScenario && (
          <>
            <p>{visibleScenario.moved} ürünün sınıfı değişiyor.</p>
            <TransitionMatrix matrix={visibleScenario.matrix} scenario />
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="ABC senaryo grup özeti"
            >
              <table>
                <caption>ABC senaryo grup özeti</caption>
                <thead>
                  <tr>
                    {[
                      'Sınıf',
                      'Mevcut ürün',
                      'Senaryo ürün',
                      'Mevcut değer',
                      'Senaryo değer',
                      'Değer farkı',
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
      {busy && <p role="status">Karşılaştırma arka planda hesaplanıyor…</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
