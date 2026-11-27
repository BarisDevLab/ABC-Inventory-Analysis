import { calculateAbc } from '../core/abc';
import type { Analysis, InputTable, Targets } from '../core/abc';
import { compareAnalyses, summarizeScenario } from '../core/comparison';
import type { Comparison } from '../core/comparison';
import { decodePackage, encodePackage } from '../io/analysis-package';
import type { AnalysisSnapshot } from '../io/analysis-package';
import { prepareImport } from '../io/inventory-import';
import type { ImportConfiguration, ImportResult } from '../io/inventory-import';

export type AnalysisRequest =
  | { kind: 'file'; bytes: ArrayBuffer; name: string; targets: Targets; configuration: ImportConfiguration; intent: 'open' | 'preview' | 'apply' }
  | { kind: 'calculate'; source: InputTable; targets: Targets }
  | { kind: 'period'; previous: InputTable; current: Analysis }
  | { kind: 'scenario'; source: InputTable; current: Analysis; targets: Targets }
  | { kind: 'decode'; bytes: ArrayBuffer }
  | { kind: 'encode'; name: string; analysis: Analysis };

export interface AnalysisResults {
  file: ImportResult;
  calculate: { source: InputTable; analysis: Analysis };
  period: Comparison;
  scenario: ReturnType<typeof summarizeScenario>;
  decode: AnalysisSnapshot;
  encode: ArrayBuffer;
}

export type AnalysisResponse =
  | { ok: true; result: AnalysisResults[keyof AnalysisResults] }
  | { ok: false; message: string };

export function runAnalysisRequest<R extends AnalysisRequest>(request: R): Promise<AnalysisResults[R['kind']]>;
export async function runAnalysisRequest(request: AnalysisRequest): Promise<AnalysisResults[keyof AnalysisResults]> {
  switch (request.kind) {
    case 'file':
      return prepareImport(request.bytes, request.name, request.configuration, request.targets, request.intent);
    case 'calculate':
      return { source: request.source, analysis: calculateAbc(request.source, request.targets) };
    case 'period':
      return compareAnalyses(calculateAbc(request.previous, request.current.targets), request.current);
    case 'scenario':
      return summarizeScenario(request.current, calculateAbc(request.source, request.targets));
    case 'decode':
      return decodePackage(request.bytes);
    case 'encode':
      return encodePackage(request.name, request.analysis);
  }
}
