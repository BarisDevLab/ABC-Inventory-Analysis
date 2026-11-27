import { Icon } from '../ui/Icon';
import { displayError, useLocale } from '../ui/locale';
import { useEffect, useRef, useState } from 'react';
import type { Analysis } from '../core/abc';
import { downloadExcel } from '../export/download';

export function ReportDownload({ analysis }: { analysis: Analysis }) {
  const { t, language } = useLocale();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<'working' | 'done' | ''>('');
  const [error, setError] = useState('');
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function download(kind: 'report' | 'template') {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setMessage('working');
    try {
      await downloadExcel(kind === 'report' ? { kind, analysis } : { kind }, controller.signal);
      if (!controller.signal.aborted) setMessage('done');
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage('');
        setError(error instanceof Error ? error.message : 'Excel dosyası hazırlanamadı.');
      }
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="panel export-panel" aria-labelledby="report-heading" aria-busy={busy}>
      <h2 className="sr-only" id="report-heading">
        {t('Excel dosyaları', 'Excel exports')}
      </h2>
      <div className="download-actions">
        <button className="button primary" disabled={busy} onClick={() => download('report')}>
          <Icon name="download" />
          {t('Excel analiz raporunu indir', 'Download Excel report')}
        </button>
        <button className="button secondary" disabled={busy} onClick={() => download('template')}>
          {t('Boş Excel şablonu indir', 'Download blank Excel template')}
        </button>
      </div>
      {message && (
        <p role="status">
          {message === 'working'
            ? t('Excel dosyası arka planda hazırlanıyor…', 'Preparing the workbook…')
            : t(
                'Excel dosyası tarayıcı indirmesine iletildi.',
                'Your browser has started the download.',
              )}
        </p>
      )}
      {error && (
        <p role="alert">{displayError(error, language, 'Could not download the workbook.')}</p>
      )}
    </section>
  );
}
