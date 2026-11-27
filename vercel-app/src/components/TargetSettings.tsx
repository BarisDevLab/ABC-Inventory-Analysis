import { useLocale } from '../ui/locale';
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
  const { t, percent } = useLocale();
  const [draft, setDraft] = useState<Targets>(targets),
    [invalidTotal, setInvalidTotal] = useState<number | null>(null);
  const sum = draft.a + draft.b + draft.c;
  return (
    <section className="target-settings" aria-labelledby="targets-heading">
      <h2 id="targets-heading">{t('Hedef değer payları', 'Value targets')}</h2>
      <p className="muted">
        {t('Ürün sayısını değil, parasal değeri ifade eder.', 'Targets use annual value.')}
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (sum !== 100) {
            setInvalidTotal(sum);
            return;
          }
          setInvalidTotal(null);
          await onApply({ ...draft });
        }}
      >
        {(['a', 'b', 'c'] as const).map((group) => (
          <div className="target-field" key={group}>
            <label htmlFor={`target-${group}`}>
              <span className={`group-badge group-${group.toUpperCase()}`}>
                {group.toUpperCase()}
              </span>{' '}
              {t('grubu hedefi', 'group target')}{' '}
              <output htmlFor={`target-${group}`}>{percent(draft[group], 0)}</output>
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
          <span>{t('Hedefler toplamı', 'Target total')}</span>
          <strong>{percent(sum, 0)} / 100</strong>
        </div>
        <button className="button primary" disabled={busy} type="submit">
          {t('Hedefleri uygula', 'Apply targets')}
        </button>
        {invalidTotal !== null && (
          <p role="alert">
            {t(
              `Hedeflerin toplamı %100 olmalı. Şu an ${percent(invalidTotal, 0)}. Önceki geçerli hedefler korunuyor.`,
              `Targets must add up to 100%. Current total: ${percent(invalidTotal, 0)}. Previous targets are still applied.`,
            )}
          </p>
        )}
      </form>
      <div className="applied-targets">
        <span className="small-heading">{t('GEÇERLİ SINIRLAR', 'CURRENT THRESHOLDS')}</span>
        <p>
          A/B <strong>{percent(targets.a, 0)}</strong> · B/C{' '}
          <strong>{percent(targets.a + targets.b, 0)}</strong>
        </p>
        <small>
          A {percent(targets.a, 0)} / B {percent(targets.b, 0)} / C {percent(targets.c, 0)}
          <br />
          {t(
            'Sınırı aşan ürün başladığı grupta kalır.',
            'A product that crosses a threshold stays in its starting group.',
          )}
        </small>
      </div>
    </section>
  );
}
