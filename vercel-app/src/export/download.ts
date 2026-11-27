import { excelWorkerUrl } from '../worker-urls';
import { EXCEL_MIME, REPORT_FILENAME, TEMPLATE_FILENAME } from './excel-format';
import type { ReportRequest, ReportResponse } from './report-worker';

export function saveExcelFile(buffer: ArrayBuffer, filename: string): void {
  const url = URL.createObjectURL(new Blob([buffer], { type: EXCEL_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  try { document.body.appendChild(link); link.click(); }
  finally {
    link.remove();
    // Give the browser time to begin the local download before releasing its URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function downloadExcel(request: ReportRequest, signal?: AbortSignal): Promise<void> {
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Tarayıcınız arka planda Excel hazırlamayı desteklemiyor. Güncel bir tarayıcı kullanın.'));
  if (signal?.aborted) return Promise.reject(new Error('Excel hazırlama iptal edildi.'));
  return new Promise((resolve, reject) => {
    let worker: Worker;
    const finish = () => { clearTimeout(timer); worker.terminate(); signal?.removeEventListener('abort', abort); };
    const abort = () => { finish(); reject(new Error('Excel hazırlama iptal edildi.')); };
    try { worker = new Worker(excelWorkerUrl, { type: 'module' }); }
    catch { reject(new Error('Excel hazırlama başlatılamadı. Lütfen yeniden deneyin.')); return; }
    const timer = setTimeout(() => { finish(); reject(new Error('Excel hazırlama zaman aşımına uğradı. Daha küçük bir analiz deneyin.')); }, 120_000);
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = (event: MessageEvent<ReportResponse>) => {
      finish();
      if (!event.data.ok) { reject(new Error(event.data.message)); return; }
      try { saveExcelFile(event.data.buffer, request.kind === 'template' ? TEMPLATE_FILENAME : REPORT_FILENAME); resolve(); }
      catch { reject(new Error('Excel dosyası indirilemedi. Tarayıcı indirme izinlerini kontrol edin.')); }
    };
    worker.onerror = () => { finish(); reject(new Error('Excel dosyası hazırlanamadı. Lütfen yeniden deneyin.')); };
    worker.onmessageerror = () => { finish(); reject(new Error('Excel sonucu okunamadı. Lütfen yeniden deneyin.')); };
    try { worker.postMessage(request); }
    catch { finish(); reject(new Error('Analiz arka plan işlemine aktarılamadı.')); }
  });
}
