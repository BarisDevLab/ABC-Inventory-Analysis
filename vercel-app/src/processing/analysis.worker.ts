/// <reference lib="webworker" />
import { runAnalysisRequest } from './operations';
import type { AnalysisRequest, AnalysisResponse } from './operations';

self.onmessage = async (event: MessageEvent<AnalysisRequest>) => {
  try {
    const result = await runAnalysisRequest(event.data);
    self.postMessage({ ok: true, result } satisfies AnalysisResponse, result instanceof ArrayBuffer ? [result] : []);
  } catch (error) {
    self.postMessage({
      ok: false,
      message: error instanceof Error ? error.message : 'Veriler işlenemedi.',
    } satisfies AnalysisResponse);
  }
};
