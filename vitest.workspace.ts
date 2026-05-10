import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
// @ts-ignore
import pkg from './package.json';

export default defineConfig({
  plugins: [
    react(),
    vue(),
  ],
  define: {
    SRK_SUPPORTED_VERSIONS: JSON.stringify(pkg.srkSupportedVersions),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'packages/react/**/*.spec.tsx',
      'tests/structure/**/*.spec.ts',
      'packages/vue/src/**/*.spec.ts',
    ],
  },
});
