import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';
// @ts-ignore
import pkg from './package.json';

export default defineConfig({
  plugins: [solid({ ssr: false })],
  define: {
    SRK_SUPPORTED_VERSIONS: JSON.stringify(pkg.srkSupportedVersions),
  },
  resolve: {
    alias: [
      { find: /^solid-js\/web$/, replacement: 'solid-js/web/dist/web.js' },
      { find: /^solid-js$/, replacement: 'solid-js/dist/solid.js' },
      {
        find: '@algoux/standard-ranklist-renderer-component-core',
        replacement: resolve(__dirname, 'packages/core/src/index.ts'),
      },
      { find: 'color', replacement: resolve(__dirname, 'packages/core/node_modules/color/index.js') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['packages/solid/src/**/*.spec.tsx'],
  },
});
