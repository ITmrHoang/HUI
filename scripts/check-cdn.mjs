/**
 * Kiểm tra bản CDN trong Chromium thật (Playwright): mở examples/cdn-check.html bằng file:// với từng cách tải
 *   ?bundle=all          h-ui.min.js trọn gói
 *   ?bundle=groups       h-ui-core + form + data + marketing + shop cùng lúc
 *   ?bundle=core         chỉ core
 *   ?bundle=core,<nhóm>  core + 1 nhóm (nhóm không phụ thuộc ngầm vào nhóm khác)
 * Lỗi khi: có lỗi JS, thẻ trên trang không được đăng ký, thẻ của nhóm chưa tải lại có mặt, 1 thẻ bị define 2 lần,
 * thẻ của nhóm không dùng chung HuiElement với core, hoặc core + 4 nhóm thiếu thẻ nào đó của bản trọn gói.
 *   npm run build:cdn && npm run check:cdn
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CDN_GROUPS, EXCLUDED } from './cdn-groups.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(resolve(root, 'dist/cdn/h-ui-core.min.js'))) {
  console.error('Chưa có dist/cdn — chạy npm run build:cdn trước.');
  process.exit(1);
}
const page0 = pathToFileURL(resolve(root, 'examples/cdn-check.html')).href;
const MODES = ['all', 'groups', 'core', ...Object.keys(CDN_GROUPS).filter((g) => g !== 'core').map((g) => `core,${g}`)];

const browser = await chromium.launch();
const results = {};
let failed = 0;
const fail = (mode, msg) => {
  failed++;
  console.error(`✗ ${mode}: ${msg}`);
};
try {
  for (const mode of MODES) {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto(`${page0}?bundle=${mode}`);
    const r = await page.evaluate(() => window.__cdnCheck());
    results[mode] = r;
    const errors = [...r.errors, ...pageErrors];
    if (errors.length) fail(mode, `lỗi JS: ${errors.join(' | ')}`);
    if (!r.hasHUI) fail(mode, 'thiếu window.HUI');
    if (r.apis.length < 6) fail(mode, `thiếu API trên window.HUI (có: ${r.apis.join(', ')})`);
    if (r.duplicateDefines.length) fail(mode, `thẻ bị define 2 lần: ${r.duplicateDefines.join(', ')}`);
    if (r.undefinedTags.length) fail(mode, `thẻ chưa được đăng ký: ${r.undefinedTags.join(', ')}`);
    if (r.leakedTags.length) fail(mode, `có thẻ của nhóm chưa tải: ${r.leakedTags.join(', ')}`);
    if (!r.sharedBase) fail(mode, 'thẻ của nhóm không kế thừa HUI.HuiElement của core (bị nhân bản lớp nền)');
    if (r.dataViewSearch === false) fail(mode, 'hui-data-view chưa dựng được ô tìm (hui-input tải động)');
    console.log(`${mode.padEnd(15)} ${String(r.defined.length).padStart(3)} thẻ đăng ký`);
    await page.close();
  }
  // Mọi thẻ của bản trọn gói đều có trong core + 4 nhóm (trừ component tài liệu EXCLUDED)
  const missing = results.all.defined.filter((t) => !results.groups.defined.includes(t) && !EXCLUDED.includes(t));
  if (missing.length) fail('groups', `thiếu thẻ so với bản trọn gói: ${missing.join(', ')}`);
} finally {
  await browser.close();
}
if (failed) process.exit(1);
console.log('✔ Bản CDN (trọn gói / core + nhóm) chạy đúng');
