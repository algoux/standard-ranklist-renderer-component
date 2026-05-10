import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import pkg from './package.json';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  define: {
    SRK_SUPPORTED_VERSIONS: JSON.stringify(pkg.srkSupportedVersions),
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['packages/angular/src/**/*.spec.ts'],
  },
});
