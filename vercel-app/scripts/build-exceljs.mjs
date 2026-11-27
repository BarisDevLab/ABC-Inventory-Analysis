/** Build the pinned ExcelJS source and reviewed browser UUID for the app and workers. */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const script = fileURLToPath(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const excelRoot = dirname(require.resolve('exceljs/package.json'));
const uuidRoot = dirname(require.resolve('uuid/package.json'));
const readPackage = async directory => JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
const excel = await readPackage(excelRoot);
const uuid = await readPackage(uuidRoot);
if (excel.version !== '4.4.0' || uuid.version !== '11.1.1') {
  throw new Error('ExcelJS/UUID source versions changed: review and retest this adapter before building.');
}

const hash = createHash('sha256');
const cryptoShim = join(root, 'scripts/excel-crypto.cjs');
const globals = join(root, 'scripts/excel-browser-globals.mjs');
for (const input of [script, join(root, 'package-lock.json'), cryptoShim, globals]) {
  hash.update(await readFile(input));
}
const sourceDirectory = join(excelRoot, 'lib');
for (const path of (await readdir(sourceDirectory, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name)).sort()) {
  hash.update(relative(excelRoot, path));
  hash.update(await readFile(path));
}

const sourceSha256 = hash.digest('hex');
const generated = join(root, 'src/generated');
const artifact = join(generated, 'exceljs-browser.cjs');
const manifest = join(generated, 'provenance.json');
const notices = join(root, 'public/third-party/ExcelJS-NOTICES.txt');

try {
  const prior = JSON.parse(await readFile(manifest, 'utf8'));
  const bytes = await readFile(artifact);
  await readFile(notices);
  if (prior.bundler === 'esbuild' && prior.sourceSha256 === sourceSha256 &&
      prior.artifactSha256 === createHash('sha256').update(bytes).digest('hex')) {
    console.log('ExcelJS secure browser bundle is current.');
    process.exit(0);
  }
} catch { /* Regenerate an incomplete or outdated bundle. */ }

const browserEntry = join(sourceDirectory, 'exceljs.browser.js');
const browserUuid = join(uuidRoot, 'dist/cjs-browser/index.js');
await readFile(browserUuid);
const shims = new Map([
  ['buffer', require.resolve('buffer/')],
  ['crypto', cryptoShim],
  ['events', require.resolve('events/')],
  ['stream', require.resolve('stream-browserify')],
  ['string_decoder', require.resolve('string_decoder/')],
  ['util', require.resolve('util/')],
  ['uuid', browserUuid],
]);

const { outputFiles, metafile } = await build({
  absWorkingDir: root,
  entryPoints: [browserEntry],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  minify: true,
  legalComments: 'inline',
  sourcemap: false,
  write: false,
  metafile: true,
  inject: [globals],
  define: { global: 'globalThis' },
  banner: { js: '/*! ExcelJS 4.4.0 + uuid 11.1.1. Licenses: /third-party/ExcelJS-NOTICES.txt */' },
  plugins: [{
    name: 'exceljs-browser-adapter',
    setup(builder) {
      builder.onLoad({ filter: /exceljs\.browser\.js$/ }, async ({ path }) => {
        if (path !== browserEntry) return;
        // The app targets browsers with the APIs these legacy polyfills supplied.
        const contents = (await readFile(path, 'utf8'))
          .replace(/^require\('(?:core-js\/modules\/[^']+|regenerator-runtime\/runtime)'\);\r?\n/gm, '');
        return { contents, loader: 'js' };
      });
      builder.onResolve({ filter: /^(?:buffer|crypto|events|fs|setimmediate|stream|string_decoder|util|uuid)$/ }, ({ path }) => {
        if (path === 'fs' || path === 'setimmediate') return { path, namespace: 'exceljs-browser-stub' };
        return { path: shims.get(path) };
      });
      // XLSX input/output is in memory. As in the previous browser bundle,
      // Node filesystem methods are unavailable. JSZip's global timer polyfill
      // is unnecessary because the bundle uses the injected, callback-only timers.
      builder.onLoad({ filter: /^(?:fs|setimmediate)$/, namespace: 'exceljs-browser-stub' }, () => ({
        contents: 'module.exports = {};', loader: 'js',
      }));
    },
  }],
});

const inputs = Object.keys(metafile.inputs);
const forbidden = /(?:^|\/)node_modules\/(?:browserify|elliptic|crypto-browserify|browserify-sign|create-ecdh|core-js|regenerator-runtime|setimmediate)(?:\/|$)/;
if (inputs.some(path => forbidden.test(path)) || Object.values(metafile.outputs).some(output => output.imports.length)) {
  throw new Error('Unexpected dependency or unresolved import in the ExcelJS browser bundle.');
}
const uuidModules = inputs.filter(path => /(?:^|\/)node_modules\/uuid\//.test(path))
  .map(path => relative(uuidRoot, resolve(root, path)).replaceAll('\\', '/')).sort();
if (!uuidModules.length || uuidModules.some(path => !path.startsWith('dist/cjs-browser/'))) {
  throw new Error('Unexpected or missing UUID implementation in the ExcelJS browser bundle.');
}

const packages = new Map();
for (const input of inputs) {
  if (!input.includes('node_modules/')) continue;
  // esbuild lists source files. The nearest package manifest with a name
  // identifies each bundled version, including nested dependencies.
  let directory = dirname(resolve(root, input));
  while (directory !== root && directory !== dirname(directory)) {
    if (packages.has(directory)) break;
    const info = await readPackage(directory).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (info?.name) {
      packages.set(directory, info);
      break;
    }
    directory = dirname(directory);
  }
}
const licenseTexts = [];
for (const [directory, info] of [...packages].sort(([, a], [, b]) => a.name.localeCompare(b.name))) {
  const names = (await readdir(directory)).filter(name => /^(licen[cs]e|copying)(\.|$)/i.test(name)).sort();
  const parts = await Promise.all(names.map(name => readFile(join(directory, name), 'utf8')));
  licenseTexts.push(`${info.name} ${info.version} (${typeof info.license === 'string' ? info.license : JSON.stringify(info.license ?? 'see package')})\n${parts.join('\n')}`);
}

const bundle = outputFiles[0].contents;
await mkdir(generated, { recursive: true });
await mkdir(dirname(notices), { recursive: true });
await writeFile(artifact, bundle);
await writeFile(notices, licenseTexts.join('\n\n' + '='.repeat(72) + '\n\n'));
await writeFile(manifest, JSON.stringify({
  exceljs: excel.version,
  uuid: uuid.version,
  bundler: 'esbuild',
  usesPrebuiltExcelJs: false,
  ellipticCryptoExcluded: true,
  bundledPackages: [...new Set([...packages.values()].map(info => info.name))].sort(),
  sourceSha256,
  artifactSha256: createHash('sha256').update(bundle).digest('hex'),
  uuidModules,
}, null, 2) + '\n');
console.log(`Built ExcelJS ${excel.version} with UUID ${uuid.version}: ${bundle.byteLength} bytes.`);
