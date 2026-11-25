/// <reference lib="webworker" />
import { handleReportRequest } from './report-worker';
import type { ReportRequest } from './report-worker';

self.onmessage = async (event: MessageEvent<ReportRequest>) => {
  const result = await handleReportRequest(event.data);
  if (result.ok) self.postMessage(result, [result.buffer]);
  else self.postMessage(result);
};
