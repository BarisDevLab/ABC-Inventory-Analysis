import { useEffect, useRef, useState } from 'react';
import { downloadExcel } from '../export/download';
export function TemplateDownload() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function download() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    try {
      await downloadExcel({ kind: 'template' }, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : 'Şablon indirilemedi.');
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div>
      <button className="button secondary" disabled={busy} onClick={download}>
        {busy ? 'Şablon hazırlanıyor…' : 'Boş Excel şablonu indir'}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
