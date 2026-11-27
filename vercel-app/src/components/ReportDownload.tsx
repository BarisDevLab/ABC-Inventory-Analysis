import { useEffect, useRef, useState } from 'react';
import type { Analysis } from '../core/abc';
import { downloadExcel } from '../export/download';

export function ReportDownload({ analysis }: { analysis: Analysis }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function download(kind: 'report' | 'template') {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setFailed(false);
    setMessage('Excel dosyası arka planda hazırlanıyor…');
    try {
      await downloadExcel(kind === 'report' ? { kind, analysis } : { kind }, controller.signal);
      if (!controller.signal.aborted) setMessage('Excel dosyası tarayıcı indirmesine iletildi.');
    } catch (error) {
      if (!controller.signal.aborted) {
        setFailed(true);
        setMessage(error instanceof Error ? error.message : 'Excel dosyası hazırlanamadı.');
      }
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section aria-labelledby="report-heading" aria-busy={busy}>
      <h2 id="report-heading">Excel dosyaları</h2>
      <p>
        Rapor tüm analiz ürünlerini ve uygulanan hedefleri içerir. Veriler sunucuya gönderilmez.
      </p>
      <div className="download-actions">
        <button disabled={busy} onClick={() => download('report')}>
          Excel analiz raporunu indir
        </button>
        <button disabled={busy} onClick={() => download('template')}>
          Boş Excel şablonu indir
        </button>
      </div>
      {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
    </section>
  );
}
