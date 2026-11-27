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
  const [entries, setEntries] = useState<HistoryKey[] | null>(null);
  const [working, setWorking] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState('');
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
            ? 'Tarayıcı bu işlemi tamamlayamadı. Yerel depolama veya dosya izinlerini kontrol edin.'
            : error instanceof Error
              ? error.message
              : 'İşlem tamamlanamadı.',
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
        setNotice('Analiz paketi indirildi.');
        return;
      }
      await addHistory(name, bytes);
      setEntries(await listHistory());
      setNotice('Geçerli analiz bu tarayıcıya kaydedildi.');
    });
  }

  return (
    <section className="panel inventory-module" aria-labelledby="library-heading">
      <h2 id="library-heading">Analiz paketleri ve yerel geçmiş</h2>
      <details>
        <summary>Analiz paketini içe veya dışa aktar</summary>
        <p className="caption">
          JSON paketi geçerli analizin ürün verilerini ve ABC hedeflerini içerir. En fazla 20 MiB.
        </p>
        <div className="inventory-controls">
          <label>
            JSON analiz paketi seç
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
                      throw new Error('Analiz paketi 20 MiB sınırını aşıyor.');
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
            JSON analiz paketini indir
          </button>
        </div>
      </details>
      <details
        onToggle={(event) => {
          if (event.currentTarget.open) run(async () => setEntries(await listHistory()));
        }}
      >
        <summary>Yerel analiz geçmişi</summary>
        <p className="caption">
          Yalnızca “Analizi geçmişe kaydet” düğmesiyle bu tarayıcıya veri yazılır. Geçmiş en fazla{' '}
          {HISTORY_MAX} analiz tutar.
        </p>
        <div className="inventory-controls">
          <button
            className="button secondary"
            type="button"
            disabled={!analysis || busy || working}
            onClick={() => exportOrSave(true)}
          >
            Analizi geçmişe kaydet
          </button>
          <button
            className="button secondary"
            type="button"
            disabled={busy || working || !entries?.length}
            onClick={() => setConfirm(true)}
          >
            Tüm geçmişi sil
          </button>
        </div>
        {confirm && (
          <div className="inventory-warning">
            <p>Bu tarayıcıdaki tüm kayıtlı analizler silinecek.</p>
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
                    setNotice('Tüm yerel analiz geçmişi silindi.');
                  })
                }
              >
                Silme işlemini onayla
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={working}
                onClick={() => setConfirm(false)}
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
        {entries?.length === 0 && <p>Henüz kayıtlı analiz yok.</p>}
        {entries && entries.length > 0 && (
          <ul className="inventory-history">
            {entries.map((key) => (
              <li key={key[1]}>
                <div>
                  <strong>{key[2]}</strong>
                  <small className="caption">
                    <time dateTime={key[0]}>{new Date(key[0]).toLocaleString('tr-TR')}</time>
                  </small>
                </div>
                <button
                  className="text-button"
                  type="button"
                  disabled={busy || working}
                  aria-label={`Kaydı aç: ${key[2]}`}
                  onClick={() => run(() => onRestore(() => readHistory(key)))}
                >
                  Aç
                </button>
                <button
                  className="text-button"
                  type="button"
                  disabled={busy || working}
                  aria-label={`Kaydı sil: ${key[2]}`}
                  onClick={() =>
                    run(async () => {
                      await deleteHistory(key);
                      setEntries(await listHistory());
                      setNotice('Analiz geçmişten silindi.');
                    })
                  }
                >
                  Sil
                </button>
              </li>
            ))}
          </ul>
        )}
      </details>
      {working && <p role="status">Analiz paketi veya geçmiş işleniyor…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
