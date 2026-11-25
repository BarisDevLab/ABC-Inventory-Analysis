import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const securityHeaders = JSON.parse(readFileSync(new URL('./vercel.json',import.meta.url),'utf8')).headers[0].headers as {key:string;value:string}[];

export default defineConfig({
  preview: { headers: Object.fromEntries(securityHeaders.map(({key,value})=>[key,value])) },
  resolve: { alias: [{ find: /^exceljs$/, replacement: fileURLToPath(new URL('./src/generated/exceljs-browser.cjs',import.meta.url)) }] },
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      input: { app: 'index.html', fileReader: 'src/io/read-file.ts' },
      preserveEntrySignatures: 'strict',
    },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts','tests/**/*.test.tsx'] },
});
