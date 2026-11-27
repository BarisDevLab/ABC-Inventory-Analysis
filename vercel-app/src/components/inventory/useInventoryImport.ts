import { useEffect, useRef, useState } from 'react';
import type { Targets } from '../../core/abc';
import { DEFAULT_IMPORT } from '../../io/inventory-import';
import type { ImportConfiguration, ImportedAnalysis, ImportPreview } from '../../io/inventory-import';
import { FILE_LIMITS } from '../../io/read-file';
import { processAnalysis } from '../../processing/client';

interface Draft {
  file: File;
  configuration: ImportConfiguration;
  preview: ImportPreview;
  expanded: boolean;
  applied?: ImportedAnalysis['warnings'];
}

export function useInventoryImport(targets: Targets, onImport: (name: string, result: ImportedAnalysis) => void) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  function reset() {
    active.current?.abort();
    active.current = null;
    setBusy(false);
    setDraft(null);
    setError('');
  }

  async function run(file: File, configuration: ImportConfiguration, intent: 'open' | 'preview' | 'apply') {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    if (intent === 'open') setDraft(null);
    setBusy(true);
    setError('');
    try {
      if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error('Yalnızca Excel ve CSV dosyaları desteklenir.');
      if (file.size > FILE_LIMITS.bytes) throw new Error('Dosya boyutu 20 MB sınırını aşıyor. Daha küçük bir dosya seçin.');
      const bytes = await file.arrayBuffer();
      if (controller.signal.aborted) return;
      const result = await processAnalysis({ kind: 'file', bytes, name: file.name, targets, configuration, intent }, controller.signal);
      if (controller.signal.aborted) return;
      setDraft({
        file,
        configuration: { ...configuration, mapping: configuration.mapping ?? result.preview.suggested },
        preview: result.preview,
        expanded: intent !== 'open' || !result.result || result.result.warnings.count > 0 || result.preview.sheets.length > 1,
        applied: result.result?.warnings,
      });
      if (result.message) setError(result.message);
      if (result.result) onImport(file.name, result.result);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Dosya okunamadı.');
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  return {
    draft, busy, error, reset,
    open: (file: File) => run(file, DEFAULT_IMPORT, 'open'),
    preview: (configuration: ImportConfiguration) => draft && run(draft.file, configuration, 'preview'),
    apply: (configuration: ImportConfiguration) => draft && run(draft.file, configuration, 'apply'),
  };
}
