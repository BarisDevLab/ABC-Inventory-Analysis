import type { Data, Layout, LayoutAxis } from 'plotly.js';
import type { Analysis, AnalysisRow, Group } from '../core/abc';
import { COLORS, detail, escapeHtml, number, percent } from '../ui/format';
import type { Language, Theme } from '../ui/locale';

export function visibleRows(analysis: Analysis, groups: readonly Group[], first: number, last: number): AnalysisRow[] {
  return analysis.rows.slice(first - 1, last).filter(row => groups.includes(row.group));
}

const dark = {
  surface: '#0D121B', text: '#f4f7fc', muted: '#bfcbdd',
  grid: '#283344', axis: '#687991', hover: '#111b2a', hoverEdge: '#679fff',
  highlight: '#ff3478', edges: { A: '#6da3ff', B: '#ffd26a', C: '#79f0ff' },
};
const light = {
  surface: '#ffffff', text: '#181b23', muted: '#50555f',
  grid: '#e1e2e6', axis: '#898f9a', hover: '#ffffff', hoverEdge: '#5474ae',
  highlight: '#c01955', edges: { A: '#1b57be', B: '#946300', C: '#007a8c' },
};

export function chartStyle(language: Language, theme: Theme) {
  const palette = theme === 'dark' ? dark : light;
  const t = (tr: string, en: string) => language === 'en' ? en : tr;
  const fmt = (value: number) => detail(value, language);
  const axis: Partial<LayoutAxis> = {
    automargin: true, showline: true, linecolor: palette.axis, tickcolor: palette.axis,
    ticks: 'outside', ticklen: 4, tickfont: { color: palette.muted, size: 12 },
    gridcolor: palette.grid, zerolinecolor: palette.axis,
  };
  const layout: Partial<Layout> = {
    paper_bgcolor: palette.surface, plot_bgcolor: palette.surface,
    font: { family: 'Geist, system-ui, sans-serif', color: palette.text, size: 12 },
    separators: language === 'en' ? '.,' : ',.',
    hoverlabel: {
      align: 'left', bgcolor: palette.hover, bordercolor: palette.hoverEdge,
      font: { color: palette.text, size: 13, family: 'Geist, system-ui, sans-serif' },
      namelength: -1,
    },
  };
  return { palette, layout, axis, t, fmt };
}

export function paretoModel(
  rows: readonly AnalysisRow[], targets: Analysis['targets'], compact: boolean,
  mode: 'zoom' | 'pan', revision: number, language: Language = 'tr', theme: Theme = 'light',
): { data: Data[]; layout: Partial<Layout> } {
  const { palette, layout, axis, t, fmt } = chartStyle(language, theme);
  const darkTheme = theme === 'dark';
  const canvas = darkTheme ? '#090c12' : '#ffffff';
  const grid = darkTheme ? '#202733' : '#e9edf2';
  const highlight = darkTheme ? '#ff478a' : '#c91859';
  const paretoLayout: Partial<Layout> & { barcornerradius: number } = {
    ...layout, paper_bgcolor: canvas, plot_bgcolor: canvas, barcornerradius: 5,
    hoverlabel: {
      ...layout.hoverlabel, bgcolor: darkTheme ? '#171e29' : '#ffffff',
      bordercolor: darkTheme ? '#46556b' : '#bdc8d6',
    },
  };
  const paretoAxis = { ...axis, showline: false, ticks: '' as const };
  const x = rows.map((_, index) => index);
  const maximum = rows[0]?.value ?? 0;
  const custom = rows.map(row => [
    escapeHtml(row.product), row.group, fmt(row.value), fmt(row.share), fmt(row.cumulative), fmt(row.quantity), fmt(row.price),
  ]);
  const hover = [
    '<b>%{customdata[0]}</b> · ' + t('Grup', 'Group') + ' %{customdata[1]}',
    t('Yıllık tüketim miktarı', 'Annual usage') + ': %{customdata[5]}',
    t('Birim fiyat', 'Unit price') + ': %{customdata[6]} TL',
    t('Yıllık değer', 'Annual value') + ': <b>%{customdata[2]} TL</b>',
    t('Değer payı', 'Value share') + ': %{customdata[3]}%',
    t('Kümülatif pay', 'Cumulative share') + ': %{customdata[4]}%<extra></extra>',
  ].join('<br>');
  const upper = maximum === 0 ? 1 : Number.isFinite(maximum * 1.15) ? maximum * 1.15 : maximum;
  // Multiplying by the fraction avoids premature underflow for subnormal values.
  const ticks = [...new Set(Array.from({ length: 6 }, (_, index) => (maximum || 1) * (index / 5)))];
  const scale = compact && maximum >= 1000 ? 1000 : 1;
  const interval = Math.max(1, Math.ceil(rows.length / (compact ? 4 : 8)));
  const shown = x.filter(index => index % interval === 0);
  const lineColor = highlight;
  const percentageTicks = [0, 20, 40, 60, 80, 100];
  return {
    data: [
      { type: 'bar', x, y: rows.map(row => row.value), name: t('Yıllık değer', 'Annual value'), width: .62,
        marker: {
          color: rows.map(row => COLORS[row.group]),
          line: { color: rows.map(row => palette.edges[row.group]), width: !darkTheme && rows.length <= 80 ? .7 : 0 },
        }, customdata: custom, hovertemplate: hover },
      { type: 'scatter', x, y: rows.map(row => row.cumulative), yaxis: 'y2', name: t('Kümülatif pay', 'Cumulative share'),
        mode: rows.length <= 35 ? 'lines+markers' : 'lines', line: { color: lineColor, width: 2.6 },
        marker: { size: 7, color: canvas, line: { color: lineColor, width: 2 } }, customdata: custom, hovertemplate: hover },
      ...[
        { threshold: targets.a, label: 'A/B', color: palette.edges.B },
        { threshold: targets.a + targets.b, label: 'B/C', color: palette.edges.C },
      ].map(({ threshold, label, color }) => ({
        type: 'scatter' as const, x: [-.5, rows.length - .5], y: [threshold, threshold],
        yaxis: 'y2', mode: 'lines' as const, line: { color, width: 1, dash: 'dot' as const },
        name: `${label} · ${percent(threshold, language, Number.isInteger(threshold) ? 0 : 2)}`, hoverinfo: 'skip' as const,
      })),
    ],
    layout: { ...paretoLayout, height: compact ? 440 : 460, dragmode: mode, hovermode: 'closest',
      uirevision: String(revision), margin: { l: compact ? 45 : 82, r: compact ? 39 : 69, t: 58, b: compact ? 110 : 82 },
      legend: { orientation: 'h', x: 0, y: compact ? -.28 : 1.04, yanchor: 'bottom', font: { size: compact ? 10 : 12 } },
      xaxis: { ...paretoAxis, range: [-.6, rows.length - .4], tickmode: 'array', tickvals: shown,
        ticktext: shown.map(index => {
          const name = Array.from(rows[index].product);
          const limit = compact ? 10 : 17;
          return escapeHtml(name.length > limit ? name.slice(0, limit).join('') + '…' : name.join(''));
        }), tickangle: compact ? -35 : -25, showgrid: false, automargin: true,
        title: compact ? undefined : { text: t('Ürünler · Azalan yıllık değer', 'Products · Descending annual value') } },
      yaxis: { ...paretoAxis, range: [0, upper], tickmode: 'array', tickvals: ticks,
        ticktext: ticks.map(value => fmt(value / scale)), gridcolor: grid, zerolinecolor: grid,
        title: { text: scale === 1000 ? t('Bin TL', 'Thousands of TL') : compact ? 'TL' : t('Yıllık değer (TL)', 'Annual value (TL)') },
        automargin: true },
      yaxis2: { ...paretoAxis, overlaying: 'y', side: 'right', range: [0, 100], tickmode: 'array', tickvals: percentageTicks,
        ticktext: percentageTicks.map(value => percent(value, language, 0)), showgrid: false,
        title: compact ? undefined : { text: t('Kümülatif pay (%)', 'Cumulative share (%)') }, automargin: true },
    },
  };
}

export function distributionModel(analysis: Analysis, language: Language = 'tr', theme: Theme = 'light'): { data: Data[]; layout: Partial<Layout> } {
  const { palette, layout, t, fmt } = chartStyle(language, theme);
  return {
    data: [{ type: 'pie', labels: analysis.summary.map(group => group.group),
      values: analysis.summary.map(group => group.value), hole: .70, sort: false, direction: 'clockwise', rotation: 90,
      marker: { colors: analysis.summary.map(group => COLORS[group.group]), line: { color: palette.surface, width: 2 } },
      textinfo: 'none',
      customdata: analysis.summary.map(group => [fmt(group.value), number(group.count, 0, language), fmt(group.share)]),
      hovertemplate: '<b>' + t('Grup', 'Group') + ' %{label}</b><br>' + t('Yıllık değer', 'Annual value') + ': %{customdata[0]} TL<br>' +
        t('Ürün sayısı', 'Products') + ': %{customdata[1]}<br>' + t('Değer payı', 'Value share') + ': %{customdata[2]}%<extra></extra>',
    }],
    layout: { ...layout, height: 290, showlegend: false, margin: { l: 8, r: 8, t: 12, b: 12 },
      annotations: [{ text: `<b>${number(analysis.rows.length, 0, language)}</b><br><span style="font-size:12px">${t('toplam ürün', 'total products')}</span>`,
        x: .5, y: .5, showarrow: false, font: { size: 29, color: palette.text } }],
    },
  };
}

export const PARETO_WINDOW_SIZE = 500;
