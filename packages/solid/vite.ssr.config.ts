import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
// @ts-ignore
import pkg from '../../package.json';

const external = [
  '@algoux/standard-ranklist',
  '@algoux/standard-ranklist-utils',
  '@algoux/standard-ranklist-renderer-component-core',
  '@algoux/standard-ranklist-renderer-component-styles',
  'classnames',
  'color',
  'semver',
  'solid-js',
  'solid-js/web',
];

export default defineConfig({
  plugins: [solid({ ssr: true })],
  define: {
    SRK_SUPPORTED_VERSIONS: JSON.stringify(pkg.srkSupportedVersions),
  },
  build: {
    ssr: 'src/index.ts',
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external,
      output: {
        entryFileNames: 'index.server.es.js',
        format: 'es',
      },
    },
  },
});
