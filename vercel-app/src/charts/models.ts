import type { Data, Layout } from 'plotly.js';
import type { Analysis, AnalysisRow, Group } from '../core/abc';
import { COLORS, detail, escapeHtml, number, percent } from '../ui/format';
import type { Language, Theme } from '../ui/locale';

export function visibleRows(analysis: Analysis, groups: readonly Group[], first: number, last: number): AnalysisRow[] {
  return analysis.rows.slice(first - 1, last).filter(row => groups.includes(row.group));
}

const dark = { surface: '#171f2e', text: '#dce5f3', grid: '#344155', hover: '#232f44' };
const light = { surface: '#ffffff', text: '#293957', grid: '#e2e9f4', hover: '#f1f5fc' };

function chartStyle(language: Language, theme: Theme) {
  const palette = theme === 'dark' ? dark : light;
  const t = (tr: string, en: string) => language === 'en' ? en : tr;
  const fmt = (value: number) => detail(value, language);
  const layout: Partial<Layout> = {
    paper_bgcolor: palette.surface, plot_bgcolor: palette.surface,
    font: { family: 'system-ui, sans-serif', color: palette.text, size: 12 },
    separators: language === 'en' ? '.,' : ',.',
    hoverlabel: { bgcolor: palette.hover, bordercolor: COLORS.A, font: { color: palette.text, size: 13 }, namelength: -1 },
  };
  return { palette, layout, t, fmt };
}

export function paretoModel(
  rows: readonly AnalysisRow[], targets: Analysis['targets'], compact: boolean,
  mode: 'zoom' | 'pan', revision: number, language: Language = 'tr', theme: Theme = 'light',
): { data: Data[]; layout: Partial<Layout> } {
  const { palette, layout, t, fmt } = chartStyle(language, theme);
  const x = rows.map((_, index) => index);
  const maximum = rows[0]?.value ?? 0;
  const custom = rows.map(row => [
    escapeHtml(row.product), row.group, fmt(row.value), fmt(row.share), fmt(row.cumulative), fmt(row.quantity), fmt(row.price),
  ]);
  const hover = [
    '<b>%{customdata[0]}</b>', t('ABC grubu', 'ABC group') + ': %{customdata[1]}',
    t('Yıllık tüketim miktarı', 'Annual usage') + ': %{customdata[5]}',
    t('Birim fiyat', 'Unit price') + ': %{customdata[6]} TL',
    t('Yıllık değer', 'Annual value') + ': %{customdata[2]} TL',
    t('Değer payı', 'Value share') + ': %{customdata[3]}%',
    t('Kümülatif pay', 'Cumulative share') + ': %{customdata[4]}%<extra></extra>',
  ].join('<br>');
  const upper = maximum === 0 ? 1 : Number.isFinite(maximum * 1.15) ? maximum * 1.15 : maximum;
  const ticks = Array.from({ length: 6 }, (_, index) => maximum === 0 ? index / 5 : maximum / 5 * index);
  const scale = compact && maximum >= 1000 ? 1000 : 1;
  const interval = Math.max(1, Math.ceil(rows.length / (compact ? 4 : 8)));
  const shown = x.filter(index => index % interval === 0);
  const lineColor = theme === 'dark' ? '#ff96aa' : '#b74862';
  const percentageTicks = [0, 20, 40, 60, 80, 100];
  return {
    data: [
      { type: 'bar', x, y: rows.map(row => row.value), name: t('Yıllık değer', 'Annual value'), width: .66,
        marker: { color: rows.map(row => COLORS[row.group]) }, customdata: custom, hovertemplate: hover },
      { type: 'scatter', x, y: rows.map(row => row.cumulative), yaxis: 'y2', name: t('Kümülatif pay', 'Cumulative share'),
        mode: rows.length <= 35 ? 'lines+markers' : 'lines', line: { color: lineColor, width: 3 },
        marker: { size: 5 }, customdata: custom, hovertemplate: hover },
      ...[
        { threshold: targets.a, label: 'A/B', color: COLORS.B },
        { threshold: targets.a + targets.b, label: 'B/C', color: COLORS.C },
      ].map(({ threshold, label, color }) => ({
        type: 'scatter' as const, x: [-.5, rows.length - .5], y: [threshold, threshold],
        yaxis: 'y2', mode: 'lines' as const, line: { color, width: 1.3, dash: 'dash' as const },
        name: `${label} · ${percent(threshold, language, Number.isInteger(threshold) ? 0 : 2)}`, hoverinfo: 'skip' as const,
      })),
    ],
    layout: { ...layout, height: compact ? 440 : 475, dragmode: mode, hovermode: 'closest',
      uirevision: String(revision), margin: { l: compact ? 45 : 82, r: compact ? 39 : 60, t: 45, b: compact ? 110 : 85 },
      legend: { orientation: 'h', x: 0, y: compact ? -.28 : 1.12, font: { size: 10 } },
      xaxis: { range: [-.6, rows.length - .4], tickmode: 'array', tickvals: shown,
        ticktext: shown.map(index => {
          const name = Array.from(rows[index].product);
          const limit = compact ? 10 : 17;
          return escapeHtml(name.length > limit ? name.slice(0, limit).join('') + '…' : name.join(''));
        }), tickangle: compact ? -35 : -25, showgrid: false, automargin: true,
        title: compact ? undefined : { text: t('Ürünler · Azalan yıllık değer', 'Products · Descending annual value') } },
      yaxis: { range: [0, upper], tickmode: 'array', tickvals: ticks,
        ticktext: ticks.map(value => fmt(value / scale)), gridcolor: palette.grid, zerolinecolor: palette.grid,
        title: { text: scale === 1000 ? t('Bin TL', 'Thousands of TL') : compact ? 'TL' : t('Yıllık değer (TL)', 'Annual value (TL)') },
        automargin: true },
      yaxis2: { overlaying: 'y', side: 'right', range: [0, 100], tickmode: 'array', tickvals: percentageTicks,
        ticktext: percentageTicks.map(value => percent(value, language, 0)), showgrid: false,
        title: compact ? undefined : { text: t('Kümülatif pay (%)', 'Cumulative share (%)') }, automargin: true },
    },
  };
}

export function distributionModel(analysis: Analysis, language: Language = 'tr', theme: Theme = 'light'): { data: Data[]; layout: Partial<Layout> } {
  const { palette, layout, t, fmt } = chartStyle(language, theme);
  return {
    data: [{ type: 'pie', labels: analysis.summary.map(group => group.group),
      values: analysis.summary.map(group => group.value), hole: .76, sort: false, direction: 'clockwise', rotation: 90,
      marker: { colors: analysis.summary.map(group => COLORS[group.group]), line: { color: palette.surface, width: 3 } },
      textinfo: 'none',
      customdata: analysis.summary.map(group => [fmt(group.value), number(group.count, 0, language), fmt(group.share)]),
      hovertemplate: t('Grup', 'Group') + ' %{label}<br>' + t('Yıllık değer', 'Annual value') + ': %{customdata[0]} TL<br>' +
        t('Ürün sayısı', 'Products') + ': %{customdata[1]}<br>' + t('Değer payı', 'Value share') + ': %{customdata[2]}%<extra></extra>',
    }],
    layout: { ...layout, height: 290, showlegend: false, margin: { l: 8, r: 8, t: 12, b: 12 },
      annotations: [{ text: `<b>${number(analysis.rows.length, 0, language)}</b><br><span style="font-size:12px">${t('toplam ürün', 'total products')}</span>`,
        x: .5, y: .5, showarrow: false, font: { size: 29, color: palette.text } }],
    },
  };
}

export const PARETO_WINDOW_SIZE = 500;
