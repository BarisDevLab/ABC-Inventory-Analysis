import { displayError, useLocale } from '../../ui/locale';
import { useEffect, useRef, useState } from 'react';
import type { Analysis } from '../../core/abc';
import {
  addHistory,
  deleteHistory,
  HISTORY_MAX,
  listHistory,
  readHistory,
} from '../../io/local-history';
import type { HistoryKey } from '../../io/local-history';
import { FILE_LIMITS } from '../../io/read-file';
import { processAnalysis } from '../../processing/client';
import './inventory.css';

function saveFile(bytes: ArrayBuffer) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'abc-analiz-paketi.json';
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function AnalysisLibrary({
  analysis,
  name,
  busy,
  onRestore,
}: {
  analysis: Analysis | null;
  name: string;
  busy: boolean;
  onRestore: (load: () => Promise<ArrayBuffer>) => Promise<void>;
}) {
  const { t, language } = useLocale();
  const [entries, setEntries] = useState<HistoryKey[] | null>(null);
  const [working, setWorking] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState<'exported' | 'saved' | 'deleted' | 'cleared' | ''>('');
  const notices = {
    exported: t('Analiz paketi indirildi.', 'The analysis package was downloaded.'),
    saved: t(
      'Geçerli analiz bu tarayıcıya kaydedildi.',
      'The current analysis was saved to this browser.',
    ),
    deleted: t('Analiz geçmişten silindi.', 'The analysis was deleted from history.'),
    cleared: t('Tüm yerel analiz geçmişi silindi.', 'All local analysis history was deleted.'),
  };
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setWorking(true);
    setNotice('');
    setError('');
    try {
      await action(controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(
          error instanceof DOMException
            ? t(
                'Tarayıcı bu işlemi tamamlayamadı. Yerel depolama veya dosya izinlerini kontrol edin.',
                'The browser could not complete this operation. Check local storage or file permissions.',
              )
            : error instanceof Error
              ? error.message
              : t('İşlem tamamlanamadı.', 'The operation could not be completed.'),
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setWorking(false);
      }
    }
  }

  function exportOrSave(save: boolean) {
    if (!analysis) return;
    return run(async (signal) => {
      const bytes = await processAnalysis({ kind: 'encode', name, analysis }, signal);
      if (signal.aborted) return;
      if (!save) {
        saveFile(bytes);
        setNotice('exported');
        return;
      }
      await addHistory(name, bytes);
      setEntries(await listHistory());
      setNotice('saved');
    });
  }

  return (
    <section className="panel inventory-module" aria-labelledby="library-heading">
      <h1 id="library-heading">
        {t('Analiz paketleri ve yerel geçmiş', 'Analysis packages and local history')}
      </h1>
      <details>
        <summary>
          {t('Analiz paketini içe veya dışa aktar', 'Import or export an analysis package')}
        </summary>
        <p className="caption">
          {t(
            'JSON paketi geçerli analizin ürün verilerini ve ABC hedeflerini içerir. En fazla 20 MiB.',
            'The JSON package contains product data and ABC targets for the current analysis. Maximum size: 20 MiB.',
          )}
        </p>
        <div className="inventory-controls">
          <label>
            {t('JSON analiz paketi seç', 'Choose a JSON analysis package')}
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy || working}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                run(() =>
                  onRestore(async () => {
                    if (file.size > FILE_LIMITS.bytes)
                      throw new Error(
                        t(
                          'Analiz paketi 20 MiB sınırını aşıyor.',
                          'The analysis package exceeds 20 MiB.',
                        ),
                      );
                    return file.arrayBuffer();
                  }),
                );
              }}
            />
          </label>
          <button
            className="button secondary"
            type="button"
            disabled={!analysis || busy || working}
            onClick={() => exportOrSave(false)}
          >
            {t('JSON analiz paketini indir', 'Download JSON analysis package')}
          </button>
        </div>
      </details>
      <details
        onToggle={(event) => {
          if (event.currentTarget.open) run(async () => setEntries(await listHistory()));
        }}
      >
        <summary>{t('Yerel analiz geçmişi', 'Local analysis history')}</summary>
        <p className="caption">
          {t(
            `Yalnızca “Analizi geçmişe kaydet” düğmesiyle bu tarayıcıya veri yazılır. Geçmiş en fazla ${HISTORY_MAX} analiz tutar.`,
            `Use “Save analysis to history” to store data in this browser. History holds up to ${HISTORY_MAX} analyses.`,
          )}
        </p>
        <div className="inventory-controls">
          <button
            className="button secondary"
            type="button"
            disabled={!analysis || busy || working}
            onClick={() => exportOrSave(true)}
          >
            {t('Analizi geçmişe kaydet', 'Save analysis to history')}
          </button>
          <button
            className="button secondary"
            type="button"
            disabled={busy || working || !entries?.length}
            onClick={() => setConfirm(true)}
          >
            {t('Tüm geçmişi sil', 'Delete all history')}
          </button>
        </div>
        {confirm && (
          <div className="inventory-warning">
            <p>
              {t(
                'Bu tarayıcıdaki tüm kayıtlı analizler silinecek.',
                'This will delete all analyses saved in this browser.',
              )}
            </p>
            <div className="inventory-controls">
              <button
                className="button primary"
                type="button"
                disabled={busy || working}
                onClick={() =>
                  run(async () => {
                    await deleteHistory();
                    setEntries(await listHistory());
                    setConfirm(false);
                    setNotice('cleared');
                  })
                }
              >
                {t('Silme işlemini onayla', 'Confirm deletion')}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={working}
                onClick={() => setConfirm(false)}
              >
                {t('Vazgeç', 'Cancel')}
              </button>
            </div>
          </div>
        )}
        {entries?.length === 0 && <p>{t('Henüz kayıtlı analiz yok.', 'No analyses saved yet.')}</p>}
        {entries && entries.length > 0 && (
          <ul className="inventory-history">
            {entries.map((key) => (
              <li key={key[1]}>
                <div>
                  <strong>{key[2]}</strong>
                  <small className="caption">
                    <time dateTime={key[0]}>{new Date(key[0]).toLocaleString(language)}</time>
                  </small>
                </div>
                <button
                  className="text-button"
                  type="button"
                  disabled={busy || working}
                  aria-label={t(`Kaydı aç: ${key[2]}`, `Open entry: ${key[2]}`)}
                  onClick={() => run(() => onRestore(() => readHistory(key)))}
                >
                  {t('Aç', 'Open')}
                </button>
                <button
                  className="text-button"
                  type="button"
                  disabled={busy || working}
                  aria-label={t(`Kaydı sil: ${key[2]}`, `Delete entry: ${key[2]}`)}
                  onClick={() =>
                    run(async () => {
                      await deleteHistory(key);
                      setEntries(await listHistory());
                      setNotice('deleted');
                    })
                  }
                >
                  {t('Sil', 'Delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </details>
      {working && (
        <p role="status">
          {t('Analiz paketi veya geçmiş işleniyor…', 'Working with analysis packages or history…')}
        </p>
      )}
      {notice && <p role="status">{notices[notice]}</p>}
      {error && (
        <p className="notice error" role="alert">
          {displayError(
            error,
            language,
            'Check the package format and size or the browser storage permissions.',
          )}
        </p>
      )}
    </section>
  );
}
