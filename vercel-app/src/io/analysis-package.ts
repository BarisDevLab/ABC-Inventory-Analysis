import { analysisSource, calculateAbc, FIELDS, SKU_FIELD, validateTargets } from '../core/abc';
import type { Analysis, InputTable, Targets } from '../core/abc';
import { FILE_LIMITS } from './read-file';

export const PACKAGE_VERSION = 1;
const PACKAGE_KIND = 'abc-inventory-analysis';
const PACKAGE_ERROR = 'Geçersiz ABC analiz paketi.';
export interface AnalysisSnapshot {
  name: string;
  source: InputTable;
  analysis: Analysis;
}

function checkedName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 1024) throw new Error(PACKAGE_ERROR);
  return value;
}

export function encodePackage(name: string, analysis: Analysis): ArrayBuffer {
  const { rows, hasSku } = analysisSource(analysis.rows);
  const data = new TextEncoder().encode(JSON.stringify({
    kind: PACKAGE_KIND, version: PACKAGE_VERSION, name: checkedName(name),
    targets: analysis.targets, hasSku: hasSku === true, rows,
  }));
  if (data.byteLength > FILE_LIMITS.bytes) throw new Error('Analiz paketi 20 MiB sınırını aşıyor.');
  return data.buffer;
}

export function decodePackage(bytes: ArrayBuffer): AnalysisSnapshot {
  if (bytes.byteLength > FILE_LIMITS.bytes) throw new Error('Analiz paketi 20 MiB sınırını aşıyor.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error(PACKAGE_ERROR);
  }
  if (!parsed || typeof parsed !== 'object') throw new Error(PACKAGE_ERROR);
  const { kind, version, name, targets, hasSku, rows } = parsed as Record<string, unknown>;
  if (kind !== PACKAGE_KIND) throw new Error(PACKAGE_ERROR);
  if (version !== PACKAGE_VERSION) throw new Error('Bu analiz paketi sürümü desteklenmiyor.');
  if (typeof hasSku !== 'boolean' || !targets || typeof targets !== 'object'
      || !Array.isArray(rows) || rows.length === 0 || rows.length > FILE_LIMITS.rows) {
    throw new Error(PACKAGE_ERROR);
  }
  const cleanTargets = validateTargets(targets as Targets);
  const source: InputTable = {
    columns: hasSku ? [...FIELDS, SKU_FIELD] : [...FIELDS],
    ...(hasSku ? { hasSku: true } : {}),
    rows: rows.map((row: unknown) => {
      if (!Array.isArray(row) || row.length !== (hasSku ? 4 : 3)
          || typeof row[0] !== 'string' || !Number.isFinite(row[1]) || !Number.isFinite(row[2])
          || (hasSku && typeof row[3] !== 'string')) throw new Error(PACKAGE_ERROR);
      return row;
    }),
  };
  return { name: checkedName(name), source, analysis: calculateAbc(source, cleanTargets) };
}
