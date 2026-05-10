import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import solid from 'vite-plugin-solid';
// @ts-ignore
import pkg from '../../package.json';

export default defineConfig({
  plugins: [
    solid({ ssr: false }),
    dts({
      include: 'src/**/*',
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
        'solid-js',
        'solid-js/web',
      ],
    },
  },
});
