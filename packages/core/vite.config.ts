import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
// @ts-ignore
import pkg from '../../package.json';

export default defineConfig({
  plugins: [
    dts({
      include: 'src/**/*',
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    outDir: 'dist',
    rollupOptions: {
      external: [
        '@algoux/standard-ranklist',
        '@algoux/standard-ranklist-utils',
        'color',
        'semver',
      ],
    },
  },
  define: {
    SRK_SUPPORTED_VERSIONS: JSON.stringify(pkg.srkSupportedVersions),
  },
});
