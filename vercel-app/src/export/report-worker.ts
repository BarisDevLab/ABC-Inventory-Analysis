import { userErrorMessage } from '../core/user-error';
import { createExcelReport, createExcelTemplate } from './excel-report';
import type { Analysis } from '../core/abc';

export type ReportRequest = { kind: 'report'; analysis: Analysis } | { kind: 'template' };
export type ReportResponse = { ok: true; buffer: ArrayBuffer } | { ok: false; message: string };

/** Shared by the real worker and unit tests; no filesystem/network access. */
export async function handleReportRequest(request: ReportRequest): Promise<ReportResponse> {
  try {
    const bytes = request.kind === 'template' ? await createExcelTemplate() : await createExcelReport(request.analysis);
    return { ok: true, buffer: bytes.slice().buffer };
  } catch (error) {
    return { ok: false, message: userErrorMessage(error, 'Excel dosyası hazırlanamadı. Lütfen yeniden deneyin.') };
  }
}
