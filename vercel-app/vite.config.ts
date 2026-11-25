import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
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
