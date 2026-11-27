// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { Data, Layout, PlotlyHTMLElement } from 'plotly.js';
import { Plot } from '../src/charts/Plot';
import { loadPlotly } from '../src/charts/plotly';
vi.mock('../src/charts/plotly', () => ({ loadPlotly: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it('Plotly mutasyonları başlangıç modelini bozmaz; mod değişimi veriyi yeniden çizmez ve sıfırlama ilk ekseni kullanır', async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const ranges: number[][] = [];
  const react = vi.fn(async (node: HTMLElement, data: Data[], layout: Partial<Layout>) => {
    ranges.push([...(layout.xaxis!.range as number[])]);
    (layout.xaxis!.range as number[])[0] = 10;
    (data[0] as { y: number[] }).y[0] = 999;
    return node as PlotlyHTMLElement;
  });
  const relayout = vi.fn(async (node: HTMLElement) => node as PlotlyHTMLElement);
  vi.mocked(loadPlotly).mockResolvedValue({
    react,
    relayout,
    purge: vi.fn(),
    Plots: { resize: vi.fn() },
  } as unknown as typeof import('plotly.js'));
  const data: Data[] = [{ type: 'bar', x: [0, 1], y: [2, 1] }];
  const layout: Partial<Layout> = {
    xaxis: { range: [-0.6, 1.6] },
    dragmode: 'zoom',
    uirevision: '0',
  };
  const { rerender } = render(<Plot data={data} layout={layout} label="Kontrol grafiği" />);
  await waitFor(() => expect(react).toHaveBeenCalledOnce());
  expect(layout.xaxis!.range).toEqual([-0.6, 1.6]);
  expect((data[0] as { y: number[] }).y[0]).toBe(2);
  rerender(<Plot data={data} layout={{ ...layout, dragmode: 'pan' }} label="Kontrol grafiği" />);
  await waitFor(() => expect(relayout).toHaveBeenCalledOnce());
  expect(react).toHaveBeenCalledOnce();
  rerender(
    <Plot
      data={data}
      layout={{ ...layout, dragmode: 'pan', uirevision: '1' }}
      label="Kontrol grafiği"
    />,
  );
  await waitFor(() => expect(react).toHaveBeenCalledTimes(2));
  expect(ranges).toEqual([
    [-0.6, 1.6],
    [-0.6, 1.6],
  ]);
});
