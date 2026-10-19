/**
 * Build các trang mẫu trong examples/ thành trang tĩnh (đưa lên GitHub Pages cùng Storybook).
 * Trang mẫu import trực tiếp ../src/index.js (CSS ?raw…) nên phải qua Vite mới chạy được khi deploy.
 * dist-check.html bỏ qua: trang đó kiểm tra bản dist/ đã build, chỉ dùng khi phát triển.
 */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { minifyRawCss } from './scripts/vite-plugin-minify-raw-css.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const pages = readdirSync(resolve(root, 'examples'))
  .filter((f) => f.endsWith('.html') && !['dist-check.html', 'cdn-check.html'].includes(f));

export default defineConfig({
  root: resolve(root, 'examples'),
  base: './', // đường dẫn tương đối → chạy được dưới /h-ui/examples/ trên GitHub Pages
  plugins: [minifyRawCss()],
  build: {
    outDir: process.env.EXAMPLES_OUT_DIR || resolve(root, 'storybook-static/examples'),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(pages.map((f) => [f.replace('.html', ''), resolve(root, 'examples', f)])),
    },
  },
});
