/**
 * Kiểm tra bản build tĩnh của trang mẫu: mọi thẻ hui-* xuất hiện trong HTML phải được đăng ký trong
 * bundle JS (tìm chuỗi tên thẻ trong assets). Bắt lỗi kiểu "bundler xóa import side-effect" — lỗi chỉ lộ ra
 * ở bản build, không lộ ở dev/test.
 *   npm run build:examples && node scripts/check-static-build.mjs [thư-mục]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(process.argv[2] || process.env.EXAMPLES_OUT_DIR || join(root, 'storybook-static/examples'));
if (!existsSync(dir)) {
  console.error(`Không thấy ${dir} — chạy npm run build:examples trước.`);
  process.exit(1);
}

const assetsDir = join(dir, 'assets');
const js = readdirSync(assetsDir).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');

let failed = 0;
for (const page of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(join(dir, page), 'utf8');
  const tags = [...new Set([...html.matchAll(/<(hui-[a-z0-9-]+)/g)].map((m) => m[1]))];
  // Tên thẻ phải có mặt dạng chuỗi trong JS (đối số của defineElement / customElements.define)
  const missing = tags.filter((t) => !js.includes(`"${t}"`) && !js.includes(`'${t}'`) && !js.includes(`\`${t}\``));
  console.log(`${missing.length ? '✗' : '✓'} ${page}: ${tags.length} thẻ${missing.length ? ` — thiếu: ${missing.join(', ')}` : ''}`);
  failed += missing.length;
}
if (failed) {
  console.error('\nCó thẻ không được đăng ký trong bản build — kiểm tra "sideEffects" trong package.json.');
  process.exit(1);
}
