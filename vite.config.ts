import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dts({
    include: 'src/lib/**/*',
    insertTypesEntry: true,
  })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/main.ts'),
      name: 'StandardRanklistRendererComponent',
      // the proper extensions will be added
      fileName: 'index',
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ['react', 'react-dom'],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        }
      }
    }
  }
});
