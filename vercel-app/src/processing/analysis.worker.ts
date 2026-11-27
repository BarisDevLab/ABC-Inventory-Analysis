/// <reference lib="webworker" />
import { userErrorMessage } from '../core/user-error';
import { runAnalysisRequest } from './operations';
import type { AnalysisResponse } from './operations';
import { isAnalysisRequest } from './message-validation';

self.onmessage = async (event: MessageEvent<unknown>) => {
  // Dedicated Worker messages use the owner channel, with no window origin or source.
  if (event.origin !== '' || event.source !== null || !event.isTrusted || event.ports.length !== 0) return;
  if (!isAnalysisRequest(event.data)) {
    self.postMessage({ ok: false, message: 'Veriler işlenemedi.' } satisfies AnalysisResponse);
    return;
  }
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
