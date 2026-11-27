/// <reference lib="webworker" />
import { handleReportRequest } from './report-worker';
import type { ReportResponse } from './report-worker';
import { isReportRequest } from '../processing/message-validation';

self.onmessage = async (event: MessageEvent<unknown>) => {
  // Dedicated Worker messages use the owner channel, with no window origin or source.
  if (event.origin !== '' || event.source !== null || !event.isTrusted || event.ports.length !== 0) return;
  if (!isReportRequest(event.data)) {
    self.postMessage({ ok: false, message: 'Excel dosyası hazırlanamadı. Lütfen yeniden deneyin.' } satisfies ReportResponse);
    return;
  }
  const result = await handleReportRequest(event.data);
  if (result.ok) self.postMessage(result, [result.buffer]);
  else self.postMessage(result);
};
