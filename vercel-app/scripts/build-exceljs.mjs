/** Rebuild the pinned ExcelJS source with patched UUID for both page and workers.
 * No edits to node_modules and no patches to minified vendor code. All output
 * paths stay under this application. Browserify supplies its normal browser shims.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname,join,relative,resolve } from 'node:path';
import { readFile,writeFile,mkdir,cp,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Transform } from 'node:stream';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const excelRoot=dirname(require.resolve('exceljs/package.json')),uuidRoot=dirname(require.resolve('uuid/package.json'));
const excel=JSON.parse(await readFile(join(excelRoot,'package.json'))),uuid=JSON.parse(await readFile(join(uuidRoot,'package.json')));
if(excel.version!=='4.4.0'||uuid.version!=='11.1.1')throw new Error('ExcelJS/UUID source versions changed: review and retest this adapter before building.');
const files=[];
async function collect(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())await collect(path);else files.push(path);}}
await collect(join(excelRoot,'lib'));files.sort();
const hash=createHash('sha256');hash.update(await readFile(fileURLToPath(import.meta.url)));hash.update(await readFile(join(root,'package-lock.json')));
hash.update(await readFile(join(root,'scripts/excel-crypto.cjs')));
for(const file of files){hash.update(relative(excelRoot,file));hash.update(await readFile(file));}
const sourceSha256=hash.digest('hex'),generated=join(root,'src/generated'),artifact=join(generated,'exceljs-browser.cjs'),manifest=join(generated,'provenance.json');
const notices=join(root,'public/third-party/ExcelJS-NOTICES.txt');
try{const prior=JSON.parse(await readFile(manifest,'utf8'));const bytes=await readFile(artifact);await readFile(notices);if(prior.sourceSha256===sourceSha256&&prior.artifactSha256===createHash('sha256').update(bytes).digest('hex')){console.log('ExcelJS secure browser bundle is current.');process.exit(0);}}catch{ /* Regenerate when the cached files are missing or unreadable. */ }
const workspace=join(root,'.tmp/exceljs-build',sourceSha256);
await mkdir(workspace,{recursive:true});await mkdir(generated,{recursive:true});await mkdir(dirname(notices),{recursive:true});
await cp(join(excelRoot,'lib'),join(workspace,'lib'),{recursive:true});
await cp(join(excelRoot,'LICENSE'),join(workspace,'LICENSE'));
// Vite's supported browsers already provide these APIs. Keep ExcelJS's own
// Workbook and enum exports, leaving legacy global polyfills out of the worker.
const browserEntry = join(workspace, 'lib/exceljs.browser.js');
const upstreamEntry = await readFile(browserEntry, 'utf8');
const modernEntry = upstreamEntry.replace(/^require\('(?:core-js\/modules\/[^']+|regenerator-runtime\/runtime)'\);\r?\n/gm, '');
await writeFile(browserEntry, modernEntry);
const browserUuid=join(uuidRoot,'dist/cjs-browser/index.js');
await readFile(browserUuid); // Fail closed if the reviewed package layout changes.
await writeFile(join(workspace,'package.json'),JSON.stringify({name:'abc-exceljs-browser-source',version:excel.version,license:'MIT',browser:{uuid:browserUuid}}));
const browserify=require('browserify'),bundler=browserify({entries:[join(workspace,'lib/exceljs.browser.js')],standalone:'ExcelJS',basedir:root,debug:false,
  builtins:{...require('browserify/lib/builtins'),crypto:join(root,'scripts/excel-crypto.cjs')}});
const { transform }=await import('esbuild');
// Browserify's dependency scanner predates UUID 11's optional chaining. Lower
// syntax via a normal build transform; do not modify the reviewed dependency.
bundler.transform(file=>{
  let source='';const transpile=!relative(uuidRoot,file).startsWith('..')&&file.endsWith('.js');
  return new Transform({transform(chunk,encoding,callback){source+=chunk;callback();},flush(callback){
    if(!transpile){this.push(source);callback();return;}
    transform(source,{loader:'js',target:'es2017',format:'cjs'}).then(result=>{this.push(result.code);callback();},callback);
  }});
},{global:true});
const uuidFiles=[],packages=new Map();
const excludedCryptoModules=[];
bundler.on('file',file=>{const normalized=file.replaceAll('\\','/');if(normalized.includes('/uuid/'))uuidFiles.push(resolve(file));if(/\/(elliptic|crypto-browserify|browserify-sign|create-ecdh)\//.test(normalized))excludedCryptoModules.push(file);});
bundler.on('package',packageInfo=>{if(packageInfo.__dirname)packages.set(packageInfo.__dirname,packageInfo);});
const bundle=await new Promise((resolve,reject)=>bundler.bundle((error,buffer)=>error?reject(new Error(error.message)):resolve(buffer)));
if(!uuidFiles.length||uuidFiles.some(file=>relative(uuidRoot,file).startsWith('..')))throw new Error('Unexpected or missing UUID implementation in browser bundle.');
if(excludedCryptoModules.length)throw new Error('Unneeded elliptic-curve crypto unexpectedly entered ExcelJS browser bundle.');
const minified=await transform(bundle.toString('utf8'),{loader:'js',minify:true,target:'es2022',legalComments:'inline',banner:'/*! ExcelJS 4.4.0 + uuid 11.1.1. Licenses: /third-party/ExcelJS-NOTICES.txt */'});
await writeFile(artifact,minified.code);
// License text is public, but never contains local absolute source paths.
packages.set(excelRoot,excel);packages.set(uuidRoot,uuid);
const licenseTexts=[];
for(const [directory,info]of [...packages.entries()].sort((a,b)=>String(a[1].name).localeCompare(String(b[1].name)))){
  const candidates=(await readdir(directory)).filter(name=>/^(licen[cs]e|copying)(\.|$)/i.test(name));
  const parts=[];for(const candidate of candidates){try{parts.push(await readFile(join(directory,candidate),'utf8'));}catch{ /* Try the remaining license candidates. */ }}
  licenseTexts.push(`${info.name} ${info.version} (${typeof info.license==='string'?info.license:JSON.stringify(info.license??'see package')})\n${parts.join('\n')}`);
}
await writeFile(notices,licenseTexts.join('\n\n'+'='.repeat(72)+'\n\n'));
await writeFile(manifest,JSON.stringify({exceljs:excel.version,uuid:uuid.version,usesPrebuiltExcelJs:false,ellipticCryptoExcluded:true,sourceSha256,artifactSha256:createHash('sha256').update(minified.code).digest('hex'),uuidModules:uuidFiles.map(file=>relative(uuidRoot,file).replaceAll('\\','/')).sort()},null,2)+'\n');
console.log(`Built ExcelJS ${excel.version} with UUID ${uuid.version}: ${uuidFiles.length} reviewed UUID modules, ${Buffer.byteLength(minified.code)} bytes.`);
