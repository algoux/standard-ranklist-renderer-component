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
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['packages/solid/src/**/*.spec.tsx'],
  },
});
