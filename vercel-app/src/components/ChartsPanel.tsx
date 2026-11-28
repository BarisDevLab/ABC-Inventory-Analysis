import { memo, useMemo, useRef, useState } from 'react';
import type { PlotlyHTMLElement } from 'plotly.js';
import type { Analysis, Group } from '../core/abc';
import { GROUPS } from '../core/abc';
import { visibleRows, paretoModel, distributionModel, PARETO_WINDOW_SIZE } from '../charts/models';
import { Plot, downloadPng } from '../charts/Plot';
import { useLocale } from '../ui/locale';
import type { Theme } from '../ui/locale';
import { Icon } from '../ui/Icon';
import './pareto.css';
import { GroupTable } from './ResultsTables';

export const ChartsPanel = memo(function ChartsPanel({
  analysis,
  theme = 'light',
}: {
  analysis: Analysis;
  theme?: Theme;
}) {
  const { language, t, number, percent } = useLocale();
  const [groups, setGroups] = useState<Group[]>([...GROUPS]);
  const [range, setRange] = useState({
    length: analysis.rows.length,
    first: 1,
    last: analysis.rows.length,
  });
  const [windowIndex, setWindowIndex] = useState(0);
  const [compact, setCompact] = useState(
    () => window.matchMedia?.('(max-width:640px)').matches ?? false,
  );
  const [mode, setMode] = useState<'zoom' | 'pan'>('zoom');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const pareto = useRef<PlotlyHTMLElement | null>(null);
  const donut = useRef<PlotlyHTMLElement | null>(null);
  const length = analysis.rows.length;
  const current = range.length === length ? range : { length, first: 1, last: length };
  const pages = Math.ceil((current.last - current.first + 1) / PARETO_WINDOW_SIZE);
  const page = Math.min(range.length === length ? windowIndex : 0, pages - 1);
  const first = current.first + page * PARETO_WINDOW_SIZE;
  const last = Math.min(current.last, first + PARETO_WINDOW_SIZE - 1);
  const rows = useMemo(
    () => visibleRows(analysis, groups, first, last),
    [analysis, groups, first, last],
  );
  const prepared = useMemo(
    () => paretoModel(rows, analysis.targets, compact, 'zoom', 0, language, theme),
    [rows, analysis.targets, compact, language, theme],
  );
  const model = useMemo(
    () => ({
      data: prepared.data,
      layout: { ...prepared.layout, dragmode: mode, uirevision: `${first}:${last}:${revision}` },
    }),
    [prepared, mode, first, last, revision],
  );
  const distribution = useMemo(
    () => distributionModel(analysis, language, theme),
    [analysis, language, theme],
  );

  function changeRange(first: number, last: number) {
    setRange({ length, first, last });
    setWindowIndex(0);
  }

  async function save(node: PlotlyHTMLElement | null, name: string) {
    setError(false);
    setSaving(true);
    try {
      await downloadPng(node, name);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <section className="panel chart-container pareto-panel" aria-labelledby="pareto-heading">
        <div className="panel-heading">
          <div>
            <h2 id="pareto-heading">{t('Değerin yoğunlaştığı ürünler', 'Pareto analysis')}</h2>
            <p>
              {t(
                'Yıllık tüketim değeri ve kümülatif pay',
                'Annual usage value and cumulative share',
              )}
            </p>
          </div>
          <span className="pareto-heading-icon">
            <Icon name="signal" />
          </span>
        </div>
        <div className="chart-controls">
          <fieldset>
            <legend className="control-heading">
              {t('Gösterilecek ABC grupları', 'Show ABC groups')}
            </legend>
            <div className="group-filters">
              {GROUPS.map((group) => (
                <label key={group}>
                  <input
                    type="checkbox"
                    checked={groups.includes(group)}
                    aria-label={t(`${group} grubu`, `Group ${group}`)}
                    onChange={(event) =>
                      setGroups(
                        event.target.checked
                          ? [...groups, group]
                          : groups.filter((value) => value !== group),
                      )
                    }
                  />
                  <span className={`group-badge group-${group}`}>{group}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <span className="control-heading">
              {t('Ürün sıralama aralığı', 'Product rank range')}
            </span>
            <div className="range-controls">
              <label>
                {t('İlk ürün', 'First product')}
                <input
                  type="number"
                  min={1}
                  max={length}
                  value={current.first}
                  onChange={(event) => {
                    const next = Math.max(
                      1,
                      Math.min(length, Math.trunc(event.target.valueAsNumber || 1)),
                    );
                    changeRange(next, Math.max(next, current.last));
                  }}
                />
              </label>
              <label>
                {t('Son ürün', 'Last product')}
                <input
                  type="number"
                  min={current.first}
                  max={length}
                  value={current.last}
                  onChange={(event) =>
                    changeRange(
                      current.first,
                      Math.max(
                        current.first,
                        Math.min(length, Math.trunc(event.target.valueAsNumber || current.first)),
                      ),
                    )
                  }
                />
              </label>
            </div>
          </div>
          {pages > 1 && (
            <div className="chart-window">
              <span className="control-heading" aria-live="polite">
                {t('Çizilen sıra aralığı', 'Rendered ranks')} {number(first, 0)}–{number(last, 0)}
              </span>
              <div className="tabs">
                <button
                  disabled={page === 0}
                  onClick={() => {
                    setRange(current);
                    setWindowIndex(page - 1);
                  }}
                >
                  {t('Önceki aralık', 'Previous range')}
                </button>
                <button
                  disabled={page === pages - 1}
                  onClick={() => {
                    setRange(current);
                    setWindowIndex(page + 1);
                  }}
                >
                  {t('Sonraki aralık', 'Next range')}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="chart-toolbar">
          <button aria-pressed={mode === 'zoom'} onClick={() => setMode('zoom')}>
            <Icon name="zoom" />
            {t('Yakınlaştır', 'Zoom')}
          </button>
          <button aria-pressed={mode === 'pan'} onClick={() => setMode('pan')}>
            <Icon name="pan" />
            {t('Kaydır', 'Pan')}
          </button>
          <button onClick={() => setRevision(revision + 1)}>
            <Icon name="reset" />
            {t('Görünümü sıfırla', 'Reset view')}
          </button>
          <button
            disabled={saving || !rows.length}
            onClick={() => save(pareto.current, 'abc_pareto_analizi')}
          >
            <Icon name="download" />
            {t('PNG indir', 'Download PNG')}
          </button>
          <label>
            <input
              type="checkbox"
              checked={compact}
              onChange={(event) => setCompact(event.target.checked)}
            />
            {t('Kompakt grafik', 'Compact chart')}
          </label>
        </div>
        {rows.length ? (
          <Plot
            data={model.data}
            layout={model.layout}
            label={t(
              'Ürün değerleri ve kümülatif pay Pareto grafiği',
              'Pareto chart of product values and cumulative share',
            )}
            onReady={(node) => {
              pareto.current = node;
            }}
          />
        ) : (
          <div className="plot-placeholder" role="status">
            {t(
              'Bu seçimde gösterilecek ürün yok. Filtreleri değiştirin.',
              'No products in this selection. Change the filters or range.',
            )}
          </div>
        )}
        <p className="chart-note">
          {t(
            `${number(rows.length, 0)} / ${number(length, 0)} ürün gösteriliyor. Kümülatif paylar ve ABC sınıfları tam veri kümesinden alınır.`,
            `Showing ${number(rows.length, 0)} of ${number(length, 0)} products. Cumulative shares and groups come from the full analysis.`,
          )}
        </p>
        {pages > 1 && (
          <p className="caption">
            {t(
              'Grafik bir seferde en çok 500 sıra çizer. Diğer ürünlere aralık düğmeleriyle ulaşabilirsiniz.',
              'The chart draws up to 500 ranks at a time. Use the range controls to reach the remaining products.',
            )}
          </p>
        )}
        <details className="format-help">
          <summary>
            {t('Grafik inceleme araçları nasıl kullanılır?', 'How do I use the chart controls?')}
          </summary>
          <p>
            {t(
              'Fare tekerleği veya alan seçimiyle yakınlaştırın. Kaydır modunda sürükleyin. Çift tıklama veya Görünümü sıfırla başlangıç eksenlerini geri getirir. PNG grafiğin mevcut görünümünü kaydeder.',
              'Zoom with the scroll wheel or drag to select a region. Drag in pan mode. Double-click or use Reset view to restore the axes. PNG saves the current view.',
            )}
          </p>
        </details>
        {error && (
          <p role="alert">
            {t(
              'PNG indirilemedi. Grafik hazır olduğunda yeniden deneyin.',
              'Could not download the PNG. Try again when the chart is ready.',
            )}
          </p>
        )}
      </section>
      <section className="panel chart-container" aria-labelledby="distribution-heading">
        <div className="panel-heading">
          <h2 id="distribution-heading">
            {t('Parasal değer ve ürün dağılımı', 'Value and product distribution')}
          </h2>
        </div>
        <div className="distribution-grid">
          <div>
            <Plot
              data={distribution.data}
              layout={distribution.layout}
              kind="donut"
              label={t('ABC parasal değer dağılımı', 'ABC value distribution')}
              onReady={(node) => {
                donut.current = node;
              }}
            />
            <button
              className="text-button"
              disabled={saving}
              onClick={() => save(donut.current, 'abc_deger_dagilimi')}
            >
              {t('Dağılım grafiğini PNG indir', 'Download distribution PNG')}
            </button>
          </div>
          <div>
            <h3>{t('ABC grup karşılaştırması', 'ABC group comparison')}</h3>
            <GroupTable analysis={analysis} />
            <p className="caption">
              A {percent(analysis.targets.a, 0)} / B {percent(analysis.targets.b, 0)} / C{' '}
              {percent(analysis.targets.c, 0)} ·{' '}
              {t(
                'Gerçekleşen paylar hedeflerden farklı olabilir.',
                'Actual shares may differ from the targets.',
              )}
            </p>
          </div>
        </div>
      </section>
    </>
  );
});
