/**
 * Bản build cho CDN: file đã nén, dùng bằng thẻ <script> thường — không cần bundler, không cần type="module".
 *   npm run build:cdn  (scripts/build-cdn.mjs) build cả bản trọn gói lẫn các bản chia nhóm:
 *   - h-ui.min.js            trọn gói (mọi thẻ hui-*), API ở window.HUI (HUI.message.success(...), HUI.setLocale('en'))
 *   - h-ui-core.min.js       lớp nền + atom / molecule cơ bản — tải TRƯỚC các nhóm bên dưới
 *   - h-ui-form / -data / -marketing / -shop.min.js — dùng chung module của core lúc chạy (không nhân đôi)
 * Ai muốn tải lẻ từng component qua CDN thì dùng bản ES: .../dist/hui-button.esm.js (type="module").
 * `vite build --config vite.cdn.config.js` vẫn chạy được: chỉ build bản trọn gói.
 */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minifyRawCss } from './scripts/vite-plugin-minify-raw-css.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Cấu hình chung cho 1 file IIFE trong dist/cdn.
 * @param {{ entry: string, fileName: string, emptyOutDir?: boolean, plugins?: any[], output?: object }} opts
 */
export function cdnConfig({ entry, fileName, emptyOutDir = false, plugins = [], output = {} }) {
  return {
    configFile: false,
    root,
    logLevel: 'warn',
    plugins: [minifyRawCss(), ...plugins],
    build: {
      outDir: resolve(root, 'dist/cdn'),
      emptyOutDir,
      sourcemap: true,
      minify: 'esbuild',
      lib: {
        entry,
        name: 'HUI',
        formats: ['iife'],
        fileName: () => fileName,
      },
      rollupOptions: {
        // Gộp cả phần tải động (import()) vào cùng file — CDN một file không tách chunk
        output: { inlineDynamicImports: true, assetFileNames: 'h-ui.[ext]', ...output },
      },
    },
  };
}

export default defineConfig(cdnConfig({ entry: resolve(root, 'src/index.js'), fileName: 'h-ui.min.js', emptyOutDir: true }));
