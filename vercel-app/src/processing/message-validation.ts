import { FILE_LIMITS } from '../io/limits';
import type { AnalysisRequest } from './operations';
import type { ReportRequest } from '../export/report-worker';

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

function targets(value: unknown) {
  // Numeric constraints and user-facing validation remain with validateTargets.
  return record(value) && ['a', 'b', 'c'].every(key => Object.hasOwn(value, key) && typeof value[key] === 'number');
}

function inputTable(value: unknown) {
  let cells = 0;
  return record(value) && Array.isArray(value.columns) && value.columns.length <= FILE_LIMITS.columns
    && value.columns.every(column => typeof column === 'string')
    && Array.isArray(value.rows) && value.rows.length <= FILE_LIMITS.rows
    && value.rows.every(row => {
      if (!Array.isArray(row) || row.length > FILE_LIMITS.columns) return false;
      cells += row.length;
      return cells <= FILE_LIMITS.cells && row.every(cell =>
        cell === null || typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean');
    })
    && (value.hasSku === undefined || value.hasSku === true);
}

function analysis(value: unknown) {
  // Consumers validate domain values. Check the structure before dispatching.
  return record(value) && typeof value.total === 'number' && targets(value.targets)
    && Array.isArray(value.rows) && value.rows.length <= FILE_LIMITS.rows
    && value.rows.every(row => record(row) && typeof row.product === 'string'
      && (row.sku === undefined || typeof row.sku === 'string')
      && (row.group === 'A' || row.group === 'B' || row.group === 'C')
      && typeof row.value === 'number')
    && Array.isArray(value.summary) && value.summary.length === 3
    && record(value.insights) && Array.isArray(value.commentary);
}

export function isAnalysisRequest(value: unknown): value is AnalysisRequest {
  if (!record(value) || !Object.hasOwn(value, 'kind')) return false;
  switch (value.kind) {
    case 'file': {
      const configuration = value.configuration;
      return value.bytes instanceof ArrayBuffer && typeof value.name === 'string' && targets(value.targets)
        && record(configuration)
        && typeof configuration.sheet === 'number' && typeof configuration.header === 'number'
        && (configuration.numbers === 'auto' || configuration.numbers === 'tr' || configuration.numbers === 'international')
        && (configuration.separator === undefined || configuration.separator === ',' || configuration.separator === ';' || configuration.separator === '\t')
        && (configuration.mapping === undefined || (Array.isArray(configuration.mapping)
          && configuration.mapping.length === 4 && configuration.mapping.every(Number.isInteger)))
        && (value.intent === 'open' || value.intent === 'preview' || value.intent === 'apply');
    }
    case 'calculate':
      return inputTable(value.source) && targets(value.targets);
    case 'period':
      return inputTable(value.previous) && analysis(value.current);
    case 'scenario':
      return inputTable(value.source) && analysis(value.current) && targets(value.targets);
    case 'decode':
      return value.bytes instanceof ArrayBuffer;
    case 'encode':
      return typeof value.name === 'string' && analysis(value.analysis);
    default:
      return false;
  }
}

export function isReportRequest(value: unknown): value is ReportRequest {
  return record(value) && Object.hasOwn(value, 'kind')
    && (value.kind === 'template' || (value.kind === 'report' && analysis(value.analysis)));
}
