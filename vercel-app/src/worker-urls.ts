// Vite's dev runner compiles each worker on demand. The production build
// replaces this module with URLs to entries in the same Rollup build graph.
export const analysisWorkerUrl = new URL('./processing/analysis.worker.ts', import.meta.url);
export const excelWorkerUrl = new URL('./export/excel.worker.ts', import.meta.url);
