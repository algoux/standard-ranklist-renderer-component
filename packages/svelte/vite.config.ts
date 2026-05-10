import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
// @ts-ignore
import pkg from '../../package.json';

export default defineConfig({
  plugins: [
    svelte({ emitCss: false }),
    dts({
      include: ['src/**/*.ts'],
      insertTypesEntry: true,
    }),
  ],
  define: {
    SRK_SUPPORTED_VERSIONS: JSON.stringify(pkg.srkSupportedVersions),
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    outDir: 'dist',
    rollupOptions: {
      external: [
        '@algoux/standard-ranklist',
        '@algoux/standard-ranklist-utils',
        '@algoux/standard-ranklist-renderer-component-core',
        '@algoux/standard-ranklist-renderer-component-styles',
        'classnames',
        'color',
        'semver',
        'svelte',
      ],
    },
  },
});
