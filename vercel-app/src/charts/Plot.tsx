import { useEffect, useRef, useState } from 'react';
import type { Data, Layout, PlotlyHTMLElement } from 'plotly.js';
import { useLocale } from '../ui/locale';
import { loadPlotly } from './plotly';
export function Plot({
  data,
  layout,
  label,
  kind,
  onReady,
}: {
  data: Data[];
  layout: Partial<Layout>;
  label: string;
  kind?: 'donut';
  onReady?: (node: PlotlyHTMLElement | null) => void;
}) {
  const { t, language } = useLocale();
  const ref = useRef<HTMLDivElement>(null),
    renderId = useRef(0);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const renderer = useRef<Awaited<ReturnType<typeof loadPlotly>>>(null);
  useEffect(() => {
    if (visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: '160px' },
    );
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, [visible]);
  const ready = useRef(onReady);
  ready.current = onReady;
  const queue = useRef<Promise<void>>(Promise.resolve()),
    plotted = useRef(false);
  const previous = useRef<{ data: Data[]; layout: Partial<Layout>; language: string } | null>(null);
  useEffect(() => {
    if (!visible) return;
    const node = ref.current!,
      id = ++renderId.current;
    let disposed = false;
    const task = queue.current.then(async () => {
      if (disposed) return;
      const Plotly = await loadPlotly();
      if (disposed) return;
      renderer.current = Plotly;
      const prior = previous.current;
      const onlyMode =
        prior?.data === data &&
        prior.language === language &&
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
            locale: language,
            showTips: false,
          });
      previous.current = { data, layout, language };
      plotted.current = true;
      if (!disposed && renderId.current === id) {
        ready.current?.(plot);
        setError(false);
        setLoaded(true);
      }
    });
    queue.current = task.catch(() => {
      if (!disposed) setError(true);
    });
    return () => {
      disposed = true;
    };
  }, [data, layout, language, visible]);
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
      if (plotted.current && width) {
        void Promise.resolve()
          .then(() => {
            if (node.isConnected && node.clientWidth) return renderer.current?.Plots.resize(node);
          })
          .catch(() => {});
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      ready.current?.(null);
      queue.current = queue.current.then(() => {
        if (!plotted.current) return;
        renderer.current?.purge(node);
        plotted.current = false;
        previous.current = null;
      });
    };
  }, []);
  return (
    <>
      {error && (
        <p role="alert">
          {t(
            'Grafik yüklenemedi. Sayfayı yeniden açmayı deneyin.',
            'The chart could not load. Try reopening the page.',
          )}
        </p>
      )}
      <div
        ref={ref}
        className={`plot-host ${kind === 'donut' ? 'donut-host' : ''} ${loaded ? 'plot-loaded' : ''}`}
        role="img"
        aria-label={label}
        aria-busy={visible && !loaded && !error}
        style={{ minHeight: layout.height }}
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
