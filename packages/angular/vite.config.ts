import { defineConfig } from 'vite';
// @ts-ignore
import pkg from '../../package.json';

export default defineConfig({
  define: {
    SRK_SUPPORTED_VERSIONS: JSON.stringify(pkg.srkSupportedVersions),
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
});
