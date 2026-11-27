import { useEffect, useRef, useState } from 'react';
import type { Data, Layout, PlotlyHTMLElement } from 'plotly.js';
import { loadPlotly } from './plotly';
export function Plot({
  data,
  layout,
  label,
  onReady,
}: {
  data: Data[];
  layout: Partial<Layout>;
  label: string;
  onReady?: (node: PlotlyHTMLElement | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    renderId = useRef(0);
  const [error, setError] = useState('');
  const ready = useRef(onReady);
  ready.current = onReady;
  const queue = useRef<Promise<void>>(Promise.resolve()),
    plotted = useRef(false);
  const previous = useRef<{ data: Data[]; layout: Partial<Layout> } | null>(null);
  useEffect(() => {
    const node = ref.current!,
      id = ++renderId.current;
    let disposed = false;
    const task = queue.current.then(async () => {
      if (disposed) return;
      const Plotly = await loadPlotly();
      if (disposed) return;
      const prior = previous.current;
      const onlyMode =
        prior?.data === data &&
        Object.keys(layout).every(
          (key) =>
            key === 'dragmode' || prior.layout[key as keyof Layout] === layout[key as keyof Layout],
        );
      const plot = onlyMode
        ? await Plotly.relayout(node, { dragmode: layout.dragmode })
        : // Plotly mutates its arguments on zoom/pan. Keep the memoized source
          // model pristine so reset always restores the original axes.
          await Plotly.react(node, structuredClone(data), structuredClone(layout), {
            displayModeBar: false,
            displaylogo: false,
            responsive: true,
            scrollZoom: true,
            doubleClick: 'reset',
            locale: 'tr',
            showTips: false,
          });
      previous.current = { data, layout };
      plotted.current = true;
      if (!disposed && renderId.current === id) {
        ready.current?.(plot);
        setError('');
      }
    });
    queue.current = task.catch(() => {
      if (!disposed) setError('Grafik yüklenemedi. Sayfayı yeniden açmayı deneyin.');
    });
    return () => {
      disposed = true;
    };
  }, [data, layout]);
  useEffect(() => {
    const node = ref.current!;
    let width = node.clientWidth,
      height = node.clientHeight;
    const observer = new ResizeObserver(() => {
      const nextWidth = node.clientWidth,
        nextHeight = node.clientHeight;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      if (plotted.current && width)
        loadPlotly()
          .then((Plotly) => {
            if (node.isConnected && node.clientWidth) Plotly.Plots.resize(node);
          })
          .catch(() => {});
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      ready.current?.(null);
      void loadPlotly()
        .then((Plotly) => Plotly.purge(node))
        .catch(() => {});
    };
  }, []);
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <div
        ref={ref}
        className={`plot-host ${label.includes('dağılımı') ? 'donut-host' : ''}`}
        role="img"
        aria-label={label}
      />
    </>
  );
}
export async function downloadPng(node: PlotlyHTMLElement | null, filename: string) {
  if (!node) throw new Error('Grafik henüz hazır değil. Lütfen bekleyin.');
  const Plotly = await loadPlotly();
  const data = await Plotly.toImage(node, { format: 'png', width: 1440, height: 800, scale: 2 });
  const link = document.createElement('a');
  link.href = data;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
  }
}
