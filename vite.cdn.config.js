/**
 * Bản build cho CDN: MỘT file đã nén (cả khoảng trắng), dùng bằng thẻ <script> thường —
 * không cần bundler, không cần type="module":
 *   <script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.min.js"></script>
 *   → đăng ký mọi thẻ hui-*, API ở window.HUI (HUI.message.success(...), HUI.setLocale('en'))
 * Ai muốn tải lẻ từng component qua CDN thì dùng bản ES: .../dist/hui-button.esm.js (type="module").
 */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minifyRawCss } from './scripts/vite-plugin-minify-raw-css.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [minifyRawCss()],
  build: {
    outDir: 'dist/cdn',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'esbuild',
    lib: {
      entry: resolve(root, 'src/index.js'),
      name: 'HUI',
      formats: ['iife'],
      fileName: () => 'h-ui.min.js',
    },
    rollupOptions: {
      // Gộp cả phần tải động (@itmrhoang/h-ui/effects) vào một file — CDN một file không tách chunk
      output: { inlineDynamicImports: true, assetFileNames: 'h-ui.[ext]' },
    },
  },
});
