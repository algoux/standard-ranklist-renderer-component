import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
// @ts-ignore
import pkg from '../../package.json';

export default defineConfig({
  plugins: [react(), dts({
    include: 'src/**/*',
    insertTypesEntry: true,
  })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'StandardRanklistRendererComponent',
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'classnames',
        'color',
        'semver',
        '@algoux/standard-ranklist-utils',
        '@algoux/standard-ranklist-renderer-component-core',
        '@algoux/standard-ranklist-renderer-component-styles',
      ],
    },
  },
  define: {
    SRK_SUPPORTED_VERSIONS: JSON.stringify(pkg.srkSupportedVersions),
  },
});
