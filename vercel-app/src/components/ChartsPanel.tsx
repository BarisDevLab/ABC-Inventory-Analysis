import { memo, useMemo, useRef, useState } from 'react';
import type { PlotlyHTMLElement } from 'plotly.js';
import type { Analysis, Group } from '../core/abc';
import { GROUPS } from '../core/abc';
import { visibleRows, paretoModel, distributionModel } from '../charts/models';
import { Plot, downloadPng } from '../charts/Plot';
import { GroupTable } from './ResultsTables';
export const ChartsPanel = memo(function ChartsPanel({ analysis }: { analysis: Analysis }) {
  const [groups, setGroups] = useState<Group[]>([...GROUPS]);
  const [range, setRange] = useState({
    length: analysis.rows.length,
    first: 1,
    last: analysis.rows.length,
  });
  const [compact, setCompact] = useState(
      () =>
        typeof window.matchMedia === 'function' && window.matchMedia('(max-width:640px)').matches,
    ),
    [mode, setMode] = useState<'zoom' | 'pan'>('zoom'),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const pareto = useRef<PlotlyHTMLElement | null>(null),
    donut = useRef<PlotlyHTMLElement | null>(null);
  const length = analysis.rows.length;
  // A new inventory size gets its full range in the same render, not a second
  // effect-driven Plotly redraw with the previous inventory's range first.
  const current = range.length === length ? range : { length, first: 1, last: length };
  const rangeFirst = Math.min(current.first, length),
    rangeLast = Math.max(rangeFirst, Math.min(current.last, length));
  const rows = useMemo(
    () => visibleRows(analysis, groups, rangeFirst, rangeLast),
    [analysis, groups, rangeFirst, rangeLast],
  );
  const prepared = useMemo(
    () => paretoModel(rows, analysis.targets, compact, 'zoom', 0),
    [rows, analysis.targets, compact],
  );
  const model = useMemo(
    () => ({
      data: prepared.data,
      layout: { ...prepared.layout, dragmode: mode, uirevision: String(revision) },
    }),
    [prepared, mode, revision],
  );
  const distribution = useMemo(() => distributionModel(analysis), [analysis]);
  async function save(node: PlotlyHTMLElement | null, name: string) {
    setError('');
    setSaving(true);
    try {
      await downloadPng(node, name);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'PNG indirilemedi.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <section className="panel chart-container" aria-labelledby="pareto-heading">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">02 / PARETO ANALİZİ</span>
            <h2 id="pareto-heading">Değerin yoğunlaştığı ürünler</h2>
          </div>
          <span className="subtle-label">Ekonomik öncelik sınırları</span>
        </div>
        <div className="chart-controls">
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="control-heading">Gösterilecek ABC grupları</legend>
            <div className="group-filters">
              {GROUPS.map((group) => (
                <label key={group}>
                  <input
                    type="checkbox"
                    checked={groups.includes(group)}
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
            <span className="control-heading">Ürün sıralama aralığı · {length} ürün</span>
            <div className="range-controls">
              <label>
                İlk ürün
                <input
                  type="number"
                  min={1}
                  max={length}
                  value={rangeFirst}
                  onChange={(event) => {
                    const next = Math.max(1, Math.min(length, Number(event.target.value) || 1));
                    setRange({ length, first: next, last: Math.max(next, rangeLast) });
                  }}
                />
              </label>
              <span>—</span>
              <label>
                Son ürün
                <input
                  type="number"
                  min={rangeFirst}
                  max={length}
                  value={rangeLast}
                  onChange={(event) =>
                    setRange({
                      length,
                      first: rangeFirst,
                      last: Math.max(
                        rangeFirst,
                        Math.min(length, Number(event.target.value) || rangeFirst),
                      ),
                    })
                  }
                />
              </label>
            </div>
          </div>
        </div>
        <div className="chart-toolbar">
          <button
            className={mode === 'zoom' ? 'active' : ''}
            aria-pressed={mode === 'zoom'}
            onClick={() => setMode('zoom')}
          >
            Yakınlaştır
          </button>
          <button
            className={mode === 'pan' ? 'active' : ''}
            aria-pressed={mode === 'pan'}
            onClick={() => setMode('pan')}
          >
            Kaydır
          </button>
          <button onClick={() => setRevision(revision + 1)}>Görünümü sıfırla</button>
          <button
            disabled={saving || !rows.length}
            onClick={() => save(pareto.current, 'abc_pareto_analizi')}
          >
            PNG indir
          </button>
          <label>
            <input
              type="checkbox"
              checked={compact}
              onChange={(event) => setCompact(event.target.checked)}
            />
            Kompakt grafik
          </label>
        </div>
        {rows.length ? (
          <Plot
            data={model.data}
            layout={model.layout}
            label="Ürün değerleri ve kümülatif pay Pareto grafiği"
            onReady={(node) => {
              pareto.current = node;
            }}
          />
        ) : (
          <div className="plot-placeholder" role="status">
            Bu seçimde gösterilecek ürün yok. Filtreleri değiştirin.
          </div>
        )}
        <div className="chart-note">
          {rows.length} / {length} ürün gösteriliyor. Kümülatif yüzdeler ve ABC sınıfları filtreyle
          yeniden hesaplanmaz; tam veri kümesindeki paylar korunur.
        </div>
        <details className="format-help">
          <summary>Grafik inceleme araçları nasıl kullanılır?</summary>
          <p>
            Yakınlaştır: alan seçin veya fare tekerleğini kullanın. Kaydır: sürükleyin. Görünümü
            sıfırla: başlangıç eksenlerini geri getirir, filtreleri değiştirmez. Çift tıklama da
            eksenleri sıfırlar. Bilgi kutuları ürün, grup, miktar, fiyat, değer ve payları gösterir.
            PNG indir grafiğin mevcut görünümünü kaydeder.
          </p>
        </details>
        {error && <p role="alert">{error}</p>}
      </section>
      <section className="panel chart-container" aria-labelledby="distribution-heading">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">03 / GRUP DAĞILIMI</span>
            <h2 id="distribution-heading">Parasal değer ve ürün dağılımı</h2>
          </div>
          <span className="subtle-label">Gerçekleşen paylar</span>
        </div>
        <div className="distribution-grid">
          <div>
            <Plot
              data={distribution.data}
              layout={distribution.layout}
              label="ABC parasal değer dağılımı"
              onReady={(node) => {
                donut.current = node;
              }}
            />
            <button
              className="text-button"
              disabled={saving}
              onClick={() => save(donut.current, 'abc_deger_dagilimi')}
            >
              Dağılım grafiğini PNG indir
            </button>
          </div>
          <div>
            <h3>ABC grup karşılaştırması</h3>
            <p className="caption">Parasal değer payını ve ürün sayısını birlikte değerlendirin.</p>
            <GroupTable analysis={analysis} />
            <p className="caption">
              A %{analysis.targets.a} / B %{analysis.targets.b} / C %{analysis.targets.c} hedefleri
              ürünler bölünmeden uygulanır; gerçekleşen paylar farklı olabilir.
            </p>
          </div>
        </div>
      </section>
    </>
  );
});
