import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';

const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const excel = Object.keys(manifest).filter(key => manifest[key].name === 'exceljs-browser');
const plotly = Object.keys(manifest).filter(key => manifest[key].name === 'plotly-basic.min');
assert.equal(excel.length, 1, 'the two workers share one ExcelJS asset');
assert.equal(plotly.length, 1, 'there is one Plotly asset');
function imports(key, edge) {
  const visited = new Set();
  const queue = [key];
  while (queue.length) {
    const next = queue.pop();
    if (visited.has(next)) continue;
    visited.add(next);
    queue.push(...(manifest[next][edge] ?? []));
    if (edge === 'dynamicImports') queue.push(...(manifest[next].imports ?? []));
  }
  visited.delete(key);
  return visited;
}
const analysisWorker = 'src/processing/analysis.worker.ts';
const excelWorker = 'src/export/excel.worker.ts';
for (const key of ['index.html', analysisWorker, excelWorker]) {
  assert(!imports(key, 'imports').has(excel[0]), 'ExcelJS stays off the static import graph');
  assert(!imports(key, 'imports').has(plotly[0]), 'Plotly stays off the static import graph');
}
assert(imports('index.html', 'dynamicImports').has(plotly[0]));
for (const key of [analysisWorker, excelWorker]) {
  assert(imports(key, 'dynamicImports').has(excel[0]), 'each worker resolves to the shared ExcelJS chunk');
}

async function request(key, data) {
  const entry = pathToFileURL(resolve('dist', manifest[key].file)).href;
  // Adapt only the Web Worker message surface. Run the emitted ESM without a DOM.
  const bootstrap = `
    import { parentPort, workerData } from 'node:worker_threads';
    globalThis.self = globalThis;
    globalThis.importScripts = () => { throw new Error('Expected an ESM worker'); };
    globalThis.postMessage = (message, transfer) => parentPort.postMessage(message, transfer);
    await import(workerData);
    parentPort.on('message', data => globalThis.onmessage({ data }));
  `;
  const worker = new Worker(new URL('data:text/javascript,' + encodeURIComponent(bootstrap)), { workerData: entry });
  try {
    return await new Promise((done, reject) => {
      worker.once('message', done);
      worker.once('error', reject);
      worker.once('exit', code => reject(new Error('Worker exited before responding: ' + code)));
      worker.postMessage(data);
    });
  } finally {
    await worker.terminate();
  }
}
const targets = { a: 80, b: 15, c: 5 };
for (const filename of ['csv-utf-8-comma.csv', 'xlsx-demo.xlsx']) {
  const file = readFileSync('tests/fixtures/files/' + filename);
  const result = await request(analysisWorker, { kind: 'file', bytes: Uint8Array.from(file).buffer, name: filename, targets, configuration: { sheet: 0, header: 1, numbers: 'auto' }, intent: 'open' });
  assert.equal(result.ok, true, result.message);
  assert.equal(result.result.result.analysis.total, 304000);
}
const template = await request(excelWorker, { kind: 'template' });
assert.equal(template.ok, true, template.message);
assert.equal(new DataView(template.buffer).getUint32(0), 0x504b0304);
console.log('Production module workers: CSV, XLSX, template and lazy asset graph verified.');
