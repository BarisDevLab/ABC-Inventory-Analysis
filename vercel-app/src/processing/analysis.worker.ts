/// <reference lib="webworker" />
import { userErrorMessage } from '../core/user-error';
import { runAnalysisRequest } from './operations';
import type { AnalysisRequest, AnalysisResponse } from './operations';

self.onmessage = async (event: MessageEvent<AnalysisRequest>) => {
  try {
    const result = await runAnalysisRequest(event.data);
    self.postMessage({ ok: true, result } satisfies AnalysisResponse, result instanceof ArrayBuffer ? [result] : []);
  } catch (error) {
    self.postMessage({
      ok: false,
      message: userErrorMessage(error, 'Veriler işlenemedi.'),
    } satisfies AnalysisResponse);
  }
};
