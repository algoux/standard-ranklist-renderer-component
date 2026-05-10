import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
// @ts-ignore
import pkg from './package.json';

export default defineConfig({
  plugins: [svelte({ emitCss: false })],
  define: {
    SRK_SUPPORTED_VERSIONS: JSON.stringify(pkg.srkSupportedVersions),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['packages/svelte/src/**/*.spec.ts'],
  },
});
