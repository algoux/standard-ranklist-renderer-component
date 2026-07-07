import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
// @ts-ignore
import pkg from './package.json';

export default defineConfig({
  plugins: [svelte({ emitCss: false })],
  define: {
    SRK_SUPPORTED_VERSIONS: JSON.stringify(pkg.srkSupportedVersions),
  },
  resolve: {
    alias: {
      '@algoux/standard-ranklist-renderer-component-core': resolve(__dirname, 'packages/core/src/index.ts'),
      color: resolve(__dirname, 'packages/core/node_modules/color/index.js'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['packages/svelte/src/**/*.spec.ts'],
  },
});
