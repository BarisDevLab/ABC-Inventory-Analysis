import { afterEach, describe, expect, it, vi } from 'vitest';

const ownerMessage = { origin: '', source: null, isTrusted: true, ports: [] };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('Dedicated Worker ileti doğrulaması', () => {
  it.each(['analysis', 'excel'] as const)('%s Worker yalnızca sahip kanalını ve geçerli istekleri kabul eder', async kind => {
    const worker = { onmessage: vi.fn(async () => {}) as (event: unknown) => Promise<void>, postMessage: vi.fn() };
    vi.stubGlobal('self', worker);

    const data = kind === 'analysis' ? { kind: 'decode', bytes: new ArrayBuffer(0) } : { kind: 'template' };
    if (kind === 'analysis') await import('../src/processing/analysis.worker');
    else {
      const reports = await import('../src/export/report-worker');
      vi.spyOn(reports, 'handleReportRequest').mockResolvedValue({ ok: true, buffer: new ArrayBuffer(4) });
      await import('../src/export/excel.worker');
    }

    for (const metadata of [
      { origin: 'https://other.example' },
      { source: {} },
      { isTrusted: false },
      { ports: [{}] },
    ]) {
      await worker.onmessage({ ...ownerMessage, ...metadata, data });
    }
    expect(worker.postMessage).not.toHaveBeenCalled();

    await worker.onmessage({ ...ownerMessage, data: { kind: 'unexpected' } });
    expect(worker.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ ok: false }));
    worker.postMessage.mockClear();

    if (kind === 'analysis') {
      await worker.onmessage({ ...ownerMessage, data: {
        kind: 'calculate', source: { columns: [], rows: [[]] }, targets: { a: 80, b: 15, c: 5 },
      } });
      expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        ok: false, message: expect.stringContaining('Eksik sütunlar'),
      }));
    } else {
      await worker.onmessage({ ...ownerMessage, data });
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true, buffer: expect.any(ArrayBuffer) }),
        [expect.any(ArrayBuffer)],
      );
    }
  });
});
