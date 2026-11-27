// Run each size in a fresh process. Retained heap is sampled after forced GC.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const source = resolve(process.argv[2] ?? '.');
const sizes = [1_000, 10_000, 50_000, 100_000];
const runner = resolve('.tmp/dashboard-benchmark/runner.mjs');
mkdirSync(resolve(runner, '..'), { recursive: true });
const mappedImport = existsSync(resolve(source, 'src/io/inventory-import.ts'));
const operation = mappedImport
  ? {
      imports: "import { DEFAULT_IMPORT, prepareImport } from './src/io/inventory-import';",
      analysis: `const response = await prepareImport(encoded.buffer, 'inventory.csv', DEFAULT_IMPORT, undefined, 'open');
        if (!response.result) throw new Error(response.message || 'Expected an imported analysis');
        const { source: input, analysis: result } = response.result;`,
    }
  : {
      imports: "import { readInventoryFile } from './src/io/read-file';",
      analysis: "const input = await readInventoryFile(encoded, 'inventory.csv'); const result = calculateAbc(input);",
    };
await build({
  stdin: {
    resolveDir: source,
    contents: `
      ${operation.imports}
      import { FIELDS, calculateAbc } from './src/core/abc';
      import * as charts from './src/charts/models';
      const rows = Number(process.argv[2]);
      const encoded = new TextEncoder().encode(FIELDS.join(';') + '\\n' +
        Array.from({ length: rows }, (_, index) => 'Ürün ' + index + ';' + (rows - index) + ';12,50').join('\\n'));
      global.gc();
      const before = process.memoryUsage().heapUsed;
      const start = performance.now();
      ${operation.analysis}
      const analysisMs = performance.now() - start;
      global.gc();
      const afterAnalysis = process.memoryUsage().heapUsed;
      const chartStart = performance.now();
      const limit = charts.PARETO_WINDOW_SIZE ?? rows;
      const selected = charts.visibleRows(result, ['A', 'B', 'C'], 1, Math.min(rows, limit));
      const model = charts.paretoModel(selected, result.targets, false, 'zoom', 0);
      const prepared = structuredClone(model);
      const prepareMs = performance.now() - chartStart;
      global.gc();
      const afterChart = process.memoryUsage().heapUsed;
      console.log(JSON.stringify({
        rows: input.rows.length, points: prepared.data[0].y.length, analysisMs, prepareMs,
        analysisMiB: (afterAnalysis - before) / 1048576, chartMiB: (afterChart - afterAnalysis) / 1048576,
        peakRssMiB: process.resourceUsage().maxRSS / 1024, total: result.total,
      }));
    `,
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['exceljs'],
  outfile: runner,
});
const results = sizes.map(size => {
  const runs = Array.from({ length: 5 }, () => {
    const child = spawnSync(process.execPath, ['--expose-gc', runner, String(size)], { encoding: 'utf8' });
    if (child.status !== 0) throw new Error(child.stderr || String(child.error));
    return JSON.parse(child.stdout);
  });
  return Object.fromEntries(Object.keys(runs[0]).map(key => {
    const values = runs.map(run => run[key]).sort((a, b) => a - b);
    return [key, Number(values[2].toFixed(2))];
  }));
});
const assets = readdirSync(resolve(source, 'dist/assets'));
const packages = assets.filter(name => /^(plotly-basic|exceljs-browser)/.test(name)).map(name => {
  const asset = readFileSync(resolve(source, 'dist/assets', name));
  return { name, bytes: asset.length, gzipBytes: gzipSync(asset).length };
});
console.log(JSON.stringify({ node: process.version, source, results, packages }, null, 2));
