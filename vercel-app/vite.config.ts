import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const securityHeaders = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')).headers[0].headers as {key: string; value: string}[];
const appFile = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const workerUrls = appFile('./src/worker-urls.ts');

export default defineConfig(({ command, mode }) => ({
  preview: { headers: Object.fromEntries(securityHeaders.map(({key, value}) => [key, value])) },
  resolve: { alias: [{ find: /^exceljs$/, replacement: appFile('./src/generated/exceljs-browser.cjs') }] },
  plugins: [{
    name: 'abc-worker-entries',
    // Keep both module workers in the app's production graph so Rollup can
    // deduplicate their dynamically imported ExcelJS module.
    enforce: 'pre',
    load(id) {
      if (id !== workerUrls || mode === 'test') return;
      if (command === 'serve') return [
        "export { default as analysisWorkerUrl } from './processing/analysis.worker.ts?worker&url';",
        "export { default as excelWorkerUrl } from './export/excel.worker.ts?worker&url';",
      ].join('\n');
      return [
        ['analysisWorkerUrl', './src/processing/analysis.worker.ts', 'analysis.worker'],
        ['excelWorkerUrl', './src/export/excel.worker.ts', 'excel.worker'],
      ].map(([binding, path, name]) => {
        const reference = this.emitFile({ type: 'chunk', id: appFile(path), name });
        return `export const ${binding} = import.meta.ROLLUP_FILE_URL_${reference};`;
      }).join('\n');
    },
  }],
  worker: { format: 'es' },
  build: {
    manifest: true,
    // Native dynamic imports work with connect-src 'none'; Vite fetch-based
    // modulepreload polyfills would request scripts through the blocked channel.
    modulePreload: false,
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'] },
}));
