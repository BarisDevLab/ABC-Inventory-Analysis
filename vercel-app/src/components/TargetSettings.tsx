import { useState } from 'react';
import type { Targets } from '../core/abc';
export function TargetSettings({
  targets,
  busy,
  onApply,
}: {
  targets: Targets;
  busy: boolean;
  onApply: (targets: Targets) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Targets>(targets),
    [message, setMessage] = useState('');
  const sum = draft.a + draft.b + draft.c;
  return (
    <section className="target-settings" aria-labelledby="targets-heading">
      <h2 id="targets-heading">Hedef değer payları</h2>
      <p className="muted">Ürün sayısını değil, parasal değeri ifade eder.</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (sum !== 100) {
            setMessage(
              `Hedeflerin toplamı %100 olmalı. Şu an %${sum}. Önceki geçerli hedefler korunuyor.`,
            );
            return;
          }
          setMessage('');
          await onApply({ ...draft });
        }}
      >
        {(['a', 'b', 'c'] as const).map((group) => (
          <div className="target-field" key={group}>
            <label htmlFor={`target-${group}`}>
              <span className={`group-badge group-${group.toUpperCase()}`}>
                {group.toUpperCase()}
              </span>{' '}
              grubu hedefi <output htmlFor={`target-${group}`}>%{draft[group]}</output>
            </label>
            <input
              id={`target-${group}`}
              type="range"
              min="0"
              max="100"
              step="1"
              value={draft[group]}
              disabled={busy}
              onChange={(event) => setDraft({ ...draft, [group]: Number(event.target.value) })}
            />
          </div>
        ))}
        <div className={`target-total ${sum !== 100 ? 'invalid' : ''}`}>
          <span>Hedefler toplamı</span>
          <strong>%{sum} / 100</strong>
        </div>
        <button className="button primary" disabled={busy} type="submit">
          Hedefleri uygula
        </button>
        {message && <p role="alert">{message}</p>}
      </form>
      <div className="applied-targets">
        <span className="small-heading">GEÇERLİ SINIRLAR</span>
        <p>
          A/B <strong>%{targets.a}</strong> · B/C <strong>%{targets.a + targets.b}</strong>
        </p>
        <small>
          A %{targets.a} / B %{targets.b} / C %{targets.c}
          <br />
          Sınırı aşan ürün başladığı grupta kalır.
        </small>
      </div>
    </section>
  );
}
