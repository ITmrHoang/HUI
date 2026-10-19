/**
 * Báo cáo kích thước khi import lẻ từng component (file entry + mọi chunk nó kéo theo), gzip.
 *   npm run size            → in bảng
 *   SIZE_LIMIT_KB=40 npm run size  → thoát mã lỗi nếu component nào vượt ngưỡng (dùng trong CI)
 * Trên GitHub Actions, bảng được ghi thêm vào $GITHUB_STEP_SUMMARY.
 */
import { readFileSync, readdirSync, appendFileSync, existsSync } from 'node:fs';
import { resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
if (!existsSync(dist)) {
  console.error('Chưa có dist/ — chạy npm run build trước.');
  process.exit(1);
}

/** Mọi file .js mà entry import tĩnh (đệ quy), không tính import() động */
function graph(entry) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(resolve(dist, file), 'utf8');
    for (const m of src.matchAll(/(?:^|[;\n])\s*(?:import|export)\s*(?:[^'"]*?from\s*)?["'](\.\/[^"']+)["']/g)) {
      visit(normalize(m[1]).replace(/\\/g, '/'));
    }
  };
  visit(entry);
  return [...seen];
}

const kb = (n) => (n / 1024).toFixed(1);
const entries = readdirSync(dist).filter((f) => /\.esm\.js$/.test(f)).sort();
const rows = entries.map((entry) => {
  const files = graph(entry);
  let gz = 0;
  for (const f of files) gz += gzipSync(readFileSync(resolve(dist, f))).length;
  const own = gzipSync(readFileSync(resolve(dist, entry))).length;
  return { name: entry.replace('.esm.js', ''), files: files.length, own, gz };
});

const limit = Number(process.env.SIZE_LIMIT_KB || 0) * 1024;
const lines = [
  '| Entry | File tải | Riêng (gzip) | Tổng khi import lẻ (gzip) |',
  '|---|---:|---:|---:|',
  ...rows.map((r) => `| ${r.name} | ${r.files} | ${kb(r.own)} KB | ${kb(r.gz)} KB${limit && r.gz > limit && r.name !== 'index' ? ' ⚠️' : ''} |`),
];
const table = lines.join('\n');
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Kích thước bundle\n\n${table}\n`);
}

// index (bundle tổng) không áp ngưỡng — nó chứa toàn bộ thư viện
const over = limit ? rows.filter((r) => r.name !== 'index' && r.gz > limit) : [];
if (over.length) {
  console.error(`\nVượt ngưỡng ${process.env.SIZE_LIMIT_KB} KB: ${over.map((r) => r.name).join(', ')}`);
  process.exit(1);
}
