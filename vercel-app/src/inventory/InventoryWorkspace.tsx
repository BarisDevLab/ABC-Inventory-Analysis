import { useId, useState } from 'react';
import { AbcXyzPanel } from './abc-xyz/Panel';
import type { AbcItem } from './abc-xyz/calculate';
import { EoqPanel } from './eoq/Panel';
import { FsnPanel } from './fsn/Panel';
import { RopPanel } from './rop/Panel';
import { SafetyStockPanel } from './safety-stock/Panel';
import { SimulationPanel } from './simulation/Panel';
import { VedPanel } from './ved/Panel';
import { XyzPanel } from './xyz/Panel';
import type { XyzRow } from './xyz/calculate';
import './workspace.css';

const modules = [
  ['xyz', 'XYZ'],
  ['abc-xyz', 'ABC-XYZ'],
  ['eoq', 'EOQ'],
  ['rop', 'ROP'],
  ['safety-stock', 'Emniyet stoku'],
  ['fsn', 'FSN'],
  ['ved', 'VED'],
  ['simulation', 'Maliyet simülasyonu'],
] as const;

const EMPTY_ABC: readonly AbcItem[] = [];
const EMPTY_XYZ: readonly XyzRow[] = [];

export interface InventoryWorkspaceProps {
  /** Current ABC classifications from a user-provided source. */
  readonly abcRows?: readonly AbcItem[];
}

export function InventoryWorkspace({ abcRows = EMPTY_ABC }: InventoryWorkspaceProps) {
  const [active, setActive] = useState<(typeof modules)[number][0]>('xyz');
  const [xyz, setXyz] = useState<XyzRow[] | null>(null);
  const id = useId();
  const panels = {
    xyz: <XyzPanel onResult={setXyz} />,
    'abc-xyz': active === 'abc-xyz' && <AbcXyzPanel abc={abcRows} xyz={xyz ?? EMPTY_XYZ} />,
    eoq: <EoqPanel />,
    rop: <RopPanel />,
    'safety-stock': <SafetyStockPanel />,
    fsn: <FsnPanel />,
    ved: <VedPanel />,
    simulation: <SimulationPanel />,
  };

  return (
    <div className="inventory-workspace">
      <header className="inventory-intro">
        <h1>Stok karar desteği</h1>
        <p>
          Modülü seçin ve kendi verilerinizi girin. Sonuçlar, stok politikalarını değerlendirmenize
          yardımcı olur.
        </p>
      </header>
      <nav className="inventory-navigation" aria-label="Stok karar destek modülleri">
        {modules.map(([key, title]) => (
          <button
            key={key}
            type="button"
            className="button secondary"
            aria-pressed={key === active}
            aria-controls={`${id}-${key}`}
            onClick={() => setActive(key)}
          >
            {title}
          </button>
        ))}
      </nav>
      {modules.map(([key, title]) => (
        <section
          key={key}
          id={`${id}-${key}`}
          aria-label={title}
          className="panel inventory-panel"
          hidden={key !== active}
        >
          {panels[key]}
        </section>
      ))}
    </div>
  );
}
