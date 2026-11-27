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
import { useLocale } from '../ui/locale';
import { workspacePages } from '../components/WorkspaceNav';

const modules = {
  xyz: ['xyz', 'XYZ', 'XYZ'],
  'abc-xyz': ['xyz', 'ABC-XYZ', 'ABC-XYZ'],
  eoq: ['optimization', 'EOQ', 'EOQ'],
  rop: ['optimization', 'ROP', 'ROP'],
  'safety-stock': ['optimization', 'Emniyet stoku', 'Safety stock'],
  fsn: ['movement', 'FSN', 'FSN'],
  ved: ['movement', 'VED', 'VED'],
  simulation: ['simulation', 'Maliyet simülasyonu', 'Cost simulation'],
} as const;
type Module = keyof typeof modules;
type InventoryPage = (typeof modules)[Module][0];
const keys = Object.keys(modules) as Module[];

const EMPTY_ABC: readonly AbcItem[] = [];
const EMPTY_XYZ: readonly XyzRow[] = [];

export interface InventoryWorkspaceProps {
  page: InventoryPage | null;
  /** Current ABC classifications from a user-provided source. */
  readonly abcRows?: readonly AbcItem[];
}

export function InventoryWorkspace({ page, abcRows = EMPTY_ABC }: InventoryWorkspaceProps) {
  const { t } = useLocale();
  const [selection, setSelection] = useState<Partial<Record<InventoryPage, Module>>>({});
  const visible = keys.filter((key) => modules[key][0] === page);
  const active = page ? (selection[page] ?? visible[0]) : undefined;
  const withSku = Boolean(abcRows[0]?.sku);
  const [xyz, setXyz] = useState<{ rows: XyzRow[]; withSku: boolean } | null>(null);
  const id = useId();
  const panels = {
    xyz: (
      <XyzPanel
        key={String(withSku)}
        onResult={(rows) => setXyz(rows ? { rows, withSku } : null)}
        withSku={withSku}
      />
    ),
    'abc-xyz': active === 'abc-xyz' && (
      <AbcXyzPanel abc={abcRows} xyz={xyz?.withSku === withSku ? xyz.rows : EMPTY_XYZ} />
    ),
    eoq: <EoqPanel />,
    rop: <RopPanel />,
    'safety-stock': <SafetyStockPanel />,
    fsn: <FsnPanel />,
    ved: <VedPanel />,
    simulation: <SimulationPanel />,
  };

  return (
    <div className="inventory-workspace">
      {page && (
        <header className="page-hero">
          <h1>{t(workspacePages[page][1], workspacePages[page][2])}</h1>
        </header>
      )}
      {page && visible.length > 1 && (
        <nav
          className="inventory-navigation"
          aria-label={t('Stok karar destek modülleri', 'Inventory decision modules')}
        >
          {visible.map((key) => (
            <button
              key={key}
              type="button"
              className="button secondary"
              aria-pressed={key === active}
              aria-controls={`${id}-${key}`}
              onClick={() => setSelection({ ...selection, [page]: key })}
            >
              {t(modules[key][1], modules[key][2])}
            </button>
          ))}
        </nav>
      )}
      {keys.map((key) => (
        <section
          key={key}
          id={`${id}-${key}`}
          aria-label={t(modules[key][1], modules[key][2])}
          className="panel inventory-panel"
          hidden={key !== active}
        >
          {panels[key]}
        </section>
      ))}
    </div>
  );
}
