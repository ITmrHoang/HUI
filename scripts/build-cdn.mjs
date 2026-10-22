/**
 * Build bản CDN (thẻ <script> thường, không cần bundler) — `npm run build:cdn`:
 *   dist/cdn/h-ui.min.js          trọn gói, như trước (tương thích ngược)
 *   dist/cdn/h-ui-core.min.js     lớp nền + atom / molecule cơ bản — PHẢI tải trước các nhóm
 *   dist/cdn/h-ui-<nhóm>.min.js   form | data | marketing | shop (nhóm khai báo ở scripts/cdn-groups.mjs)
 *
 * Cách các nhóm dùng chung code mà không nhân đôi (không thêm runtime / loader nào):
 * - core để lộ MỌI module nguồn của nó ở `HUI.__m` (khóa = đường dẫn trong src/, vd `core_hui_element_js`).
 * - Bundle nhóm coi các module đó là external: IIFE nhận `HUI.__m.<khóa>` làm tham số; import() tới module của core
 *   đổi thành Promise.resolve(HUI.__m.<khóa>) → HuiElement, locale, icon, thẻ của core chỉ có MỘT bản.
 * - Module mà ≥ 2 nhóm (ngoài core) cùng dùng được tự đẩy vào core → không thẻ nào được 2 bundle đăng ký.
 * - Bundle nhóm gộp export vào window.HUI có sẵn (output.extend) và báo lỗi rõ ràng nếu chưa tải core.
 * Kiểm tra cuối: không module nào nằm trong 2 bundle nhóm/core; in bảng kích thước (gzip).
 */
import { build } from 'vite';
import { readFileSync, readdirSync, existsSync, appendFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { cdnConfig } from '../vite.cdn.config.js';
import { CDN_GROUPS, EXCLUDED } from './cdn-groups.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const posix = (p) => p.replace(/\\/g, '/');
const SRC = posix(resolve(root, 'src'));
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
const GROUPS = Object.keys(CDN_GROUPS);
const OTHER = GROUPS.filter((g) => g !== 'core');

// ---------------------------------------------------------------
// 1. Kiểm tra nhóm: mỗi thư mục component nằm trong đúng một nhóm
// ---------------------------------------------------------------
const folders = readdirSync(resolve(root, 'src/components'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(resolve(root, 'src/components', d.name, 'index.js')))
  .map((d) => d.name)
  .filter((n) => !EXCLUDED.includes(n));
const owner = new Map();
const errors = [];
for (const [group, list] of Object.entries(CDN_GROUPS)) {
  for (const name of list) {
    if (!folders.includes(name)) errors.push(`"${name}" (nhóm ${group}) không có src/components/${name}/index.js`);
    else if (owner.has(name)) errors.push(`"${name}" nằm ở 2 nhóm: ${owner.get(name)} và ${group}`);
    else owner.set(name, group);
  }
}
const unassigned = folders.filter((n) => !owner.has(n));
if (unassigned.length) errors.push(`Chưa xếp nhóm CDN: ${unassigned.join(', ')} → thêm vào scripts/cdn-groups.mjs`);
if (errors.length) {
  console.error(`✗ scripts/cdn-groups.mjs:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------
// 2. Entry của từng nhóm, dựng từ src/index.js (giữ đúng tên export của bản trọn gói)
// ---------------------------------------------------------------
const indexSrc = readFileSync(resolve(root, 'src/index.js'), 'utf8');
const STMT = /(?:export\s*(?:\{[^}]*\}|\*)\s*from\s*|import\s*)['"]\.\/components\/([^/'"]+)\/index\.js['"];?[ \t]*\r?\n?/g;
/** thư mục → các câu export/import của nó trong src/index.js */
const stmts = new Map();
for (const m of indexSrc.matchAll(STMT)) {
  if (!stmts.has(m[1])) stmts.set(m[1], []);
  stmts.get(m[1]).push(m[0].trim());
}
const absolutize = (code) => code.replace(/(['"])\.\//g, `$1${SRC}/`);
// Phần còn lại của src/index.js (reset.css, export * from core, enableAnimations…) thuộc core
const preamble = absolutize(indexSrc.replace(STMT, ''));
const groupBody = (group) => CDN_GROUPS[group].map((name) => (stmts.has(name)
  ? absolutize(stmts.get(name).join('\n'))
  // Chưa có trong src/index.js → chỉ đăng ký thẻ
  : `import '${SRC}/components/${name}/index.js';`)).join('\n');

const VIRTUAL = 'virtual:h-ui-cdn/';
/** Plugin cấp code entry ảo `virtual:h-ui-cdn/<nhóm>` */
const entryPlugin = (codeOf) => ({
  name: 'h-ui-cdn-entry',
  enforce: 'pre',
  resolveId(id) {
    if (id.startsWith(VIRTUAL)) return `\0${id}.js`;
  },
  load(id) {
    if (id.startsWith(`\0${VIRTUAL}`)) return codeOf(id.slice(VIRTUAL.length + 1, -3));
  },
});

/** Khóa của module trong HUI.__m: đường dẫn trong src/, ký tự lạ → "_" */
const keyOf = (id) => posix(relative(SRC, id)).replace(/[^a-zA-Z0-9]/g, '_');
/** Module JS nguồn (bỏ module ảo, CSS ?raw…) */
const isSrcJs = (id) => id.startsWith(`${SRC}/`) && !id.includes('?') && id.endsWith('.js');

/** Build 1 entry; trả về { code, moduleIds } của file IIFE */
async function buildOne({ entryCode, fileName, write, plugins = [], output = {}, emptyOutDir = false }) {
  const config = cdnConfig({
    entry: `${VIRTUAL}${fileName}`,
    fileName,
    emptyOutDir,
    plugins: [entryPlugin(() => entryCode), ...plugins],
    output,
  });
  // Entry ảo: vite resolve(lib.entry) thành đường dẫn tuyệt đối → truyền thẳng input cho bundler
  config.build.rollupOptions.input = `${VIRTUAL}${fileName}`;
  if (!write) {
    config.build.write = false;
    config.build.minify = false;
    config.build.sourcemap = false;
  }
  const result = await build(config);
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output);
  const chunk = outputs.find((o) => o.type === 'chunk' && o.fileName === fileName);
  return { code: chunk.code, moduleIds: chunk.moduleIds.map(posix).filter(isSrcJs) };
}

const coreEntry = (promoted, exposed) => [
  preamble,
  groupBody('core'),
  ...promoted.map((id) => `import '${id}';`),
  ...exposed.map((id, i) => `import * as __m${i} from '${id}';`),
  // Namespace bọc lại có __esModule → interop của IIFE nhóm giữ đúng `default`; getter giữ live binding
  `const __esm = (ns) => {
  const o = { __esModule: true };
  for (const k of Object.keys(ns)) Object.defineProperty(o, k, { get: () => ns[k], enumerable: true });
  return o;
};`,
  `export const __m = { __version: ${JSON.stringify(version)}, ${exposed.map((id, i) => `${keyOf(id)}: __esm(__m${i})`).join(', ')} };`,
].join('\n');

// ---------------------------------------------------------------
// 3. Phân tích: module của từng nhóm → module dùng chung giữa các nhóm được đẩy vào core
// ---------------------------------------------------------------
const t0 = Date.now();
const analyzed = {};
for (const group of GROUPS) {
  const entryCode = group === 'core' ? coreEntry([], []) : groupBody(group);
  analyzed[group] = new Set((await buildOne({ entryCode, fileName: `h-ui-${group}.min.js`, write: false })).moduleIds);
}
const usedBy = new Map();
for (const g of OTHER) {
  for (const id of analyzed[g]) {
    if (analyzed.core.has(id)) continue;
    usedBy.set(id, [...(usedBy.get(id) || []), g]);
  }
}
const promoted = [...usedBy].filter(([, gs]) => gs.length > 1).map(([id]) => id).sort();
// Module của core sau khi thêm phần được đẩy vào (kèm phụ thuộc của chúng)
const coreModules = promoted.length
  ? new Set((await buildOne({ entryCode: coreEntry(promoted, []), fileName: 'h-ui-core.min.js', write: false })).moduleIds)
  : analyzed.core;
const exposed = [...coreModules].sort();
const exposedSet = new Set(exposed);
if (promoted.length || process.env.CDN_VERBOSE) {
  console.log(`\nĐẩy vào core (dùng chung giữa các nhóm): ${promoted.map((id) => relative(SRC, id).replace(/\\/g, '/')).join(', ')}`);
}

// ---------------------------------------------------------------
// 4. Build thật (nén + sourcemap)
// ---------------------------------------------------------------
/** Plugin của bundle nhóm: module của core → external HUI.__m.<khóa> */
const shareCorePlugin = {
  name: 'h-ui-cdn-share-core',
  enforce: 'pre',
  transform(code, id) {
    const file = posix(id);
    if (!isSrcJs(file) || !code.includes('import(')) return null;
    // import() tới module đã có trong core → lấy luôn namespace (IIFE không có import() tới external)
    let changed = false;
    const out = code.replace(/\bimport\(\s*(['"])(\.{1,2}\/[^'"]+)\1\s*\)/g, (all, q, spec) => {
      const target = posix(resolve(dirname(file), spec));
      if (!exposedSet.has(target)) return all;
      changed = true;
      return `Promise.resolve(HUI.__m.${keyOf(target)})`;
    });
    return changed ? { code: out, map: null } : null;
  },
  resolveId(source, importer) {
    // Đường dẫn tương đối / tuyệt đối (entry nhóm import bằng đường dẫn tuyệt đối, kể cả "D:/…" trên Windows)
    if (!importer || !/^(\.{1,2}\/|\/|[A-Za-z]:\/)/.test(source) || source.includes('?')) return null;
    const base = posix(importer).startsWith('\0') ? SRC : dirname(posix(importer));
    const target = posix(resolve(base, source));
    if (exposedSet.has(target)) return { id: target, external: true };
    return null;
  },
};

const bannerOf = (group) => `/*! H-UI v${version} | ${group} — cần h-ui-core.min.js tải trước */
(function(){var h=window.HUI;if(!h||!h.__m)throw new Error("[h-ui] Tải h-ui-core.min.js trước h-ui-${group}.min.js");if(h.__m.__version!==${JSON.stringify(version)})console.warn("[h-ui] h-ui-${group}.min.js v${version} khác phiên bản h-ui-core.min.js ("+h.__m.__version+") — nên dùng cùng phiên bản");})();`;

const sizes = [];
const record = (fileName, code) => sizes.push({ fileName, raw: Buffer.byteLength(code), gz: gzipSync(code).length });

// 4a. Trọn gói (giữ nguyên như trước) — dọn dist/cdn
const all = await build(cdnConfig({ entry: resolve(root, 'src/index.js'), fileName: 'h-ui.min.js', emptyOutDir: true }));
record('h-ui.min.js', (Array.isArray(all) ? all : [all]).flatMap((r) => r.output).find((o) => o.fileName === 'h-ui.min.js').code);

// 4b. core
const builtModules = {};
const core = await buildOne({
  entryCode: coreEntry(promoted, exposed),
  fileName: 'h-ui-core.min.js',
  write: true,
  output: { extend: true, banner: `/*! H-UI v${version} | core — tải trước h-ui-form / data / marketing / shop */` },
});
record('h-ui-core.min.js', core.code);
builtModules.core = core.moduleIds;

// 4c. Các nhóm
for (const group of OTHER) {
  const res = await buildOne({
    entryCode: groupBody(group),
    fileName: `h-ui-${group}.min.js`,
    write: true,
    plugins: [shareCorePlugin],
    output: {
      extend: true,
      banner: bannerOf(group),
      globals: (id) => `HUI.__m.${keyOf(posix(id))}`,
    },
  });
  record(`h-ui-${group}.min.js`, res.code);
  builtModules[group] = res.moduleIds;
}

// ---------------------------------------------------------------
// 5. Kiểm tra: không module nguồn nào bị gộp vào 2 bundle (core + nhóm)
// ---------------------------------------------------------------
const seenIn = new Map();
for (const [group, ids] of Object.entries(builtModules)) {
  for (const id of ids) seenIn.set(id, [...(seenIn.get(id) || []), group]);
}
const dup = [...seenIn].filter(([, gs]) => gs.length > 1);
if (dup.length) {
  console.error(`✗ Module bị gộp vào nhiều bundle CDN:\n${dup.map(([id, gs]) => `  - ${posix(relative(root, id))}: ${gs.join(', ')}`).join('\n')}`);
  process.exit(1);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const table = [
  '| File | Kích thước | gzip |',
  '|---|---:|---:|',
  ...sizes.map((s) => `| ${s.fileName} | ${kb(s.raw)} | ${kb(s.gz)} |`),
].join('\n');
console.log(table);
console.log(`\n✔ CDN: trọn gói + ${GROUPS.length} nhóm (${exposed.length} module chia sẻ qua HUI.__m) — ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Bản CDN\n\n${table}\n`);
