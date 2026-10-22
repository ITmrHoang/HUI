/**
 * Sinh file .d.ts từ dist/custom-elements.json (chạy sau `cem analyze` trong npm run build).
 *   dist/types/index.d.ts   — class + HTMLElementTagNameMap (document.querySelector('hui-button') có kiểu)
 *   dist/types/<tag>.d.ts   — import lẻ từng component
 *   dist/types/core.d.ts    — HuiElement, HuiFormElement, tiện ích
 *   dist/types/vue.d.ts     — GlobalComponents cho Vue (gợi ý attribute trong template)
 *   dist/types/react.d.ts   — JSX.IntrinsicElements cho React 19
 * Kiểu union ('sm' | 'md' | 'lg') lấy từ dòng mô tả dạng "sm | md | lg" của property.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist/types');
mkdirSync(out, { recursive: true });

const manifest = JSON.parse(readFileSync(resolve(root, 'dist/custom-elements.json'), 'utf8'));
const decls = manifest.modules.flatMap((m) => (m.declarations || []).map((d) => ({ ...d, module: m.path })));
const byName = new Map(decls.map((d) => [d.name, d]));
const elements = decls.filter((d) => d.tagName).sort((a, b) => a.tagName.localeCompare(b.tagName));

/** "primary | secondary | danger — mô tả" → "'primary' | 'secondary' | 'danger'" */
function unionFromDescription(desc) {
  const first = (desc || '').split('\n')[0].split(/\s[—(-]\s?/)[0].trim();
  if (!/^[\w-]+(\s*\|\s*[\w-]+)+$/.test(first)) return null;
  return first.split('|').map((s) => `'${s.trim()}'`).join(' | ');
}

function tsType(field) {
  const union = unionFromDescription(field.description);
  if (union) return union;
  const t = field.type?.text || 'unknown';
  if (/^(string|number|boolean)$/.test(t)) return t;
  if (t === 'array' || t === 'Array') return 'unknown[]';
  if (t === 'object' || t === 'Object') return 'Record<string, unknown>';
  return t.includes('|') ? t : 'unknown';
}

/** Gom field công khai của class + mọi lớp cha (HuiFormElement...) có trong manifest */
function publicFields(decl) {
  const fields = new Map();
  for (let d = decl; d; d = d.superclass && byName.get(d.superclass.name)) {
    for (const m of d.members || []) {
      if (m.kind !== 'field' || m.static || m.privacy === 'private' || m.privacy === 'protected') continue;
      if (m.name.startsWith('_') || fields.has(m.name)) continue;
      if (!m.attribute && !m.reflects && m.privacy !== 'public') continue;
      fields.set(m.name, m);
    }
  }
  return [...fields.values()];
}

/** Lớp có kế thừa HuiFormElement (trực tiếp hoặc qua lớp trung gian, vd HuiPickerBase) không */
function isFormElement(decl) {
  for (let d = decl; d; d = byName.get(d.superclass?.name)) {
    if (d.superclass?.name === 'HuiFormElement') return true;
  }
  return false;
}

const FORM_BASE_FIELDS = new Set(['name', 'value', 'disabled', 'readonly', 'required', 'status', 'size', 'minlength', 'maxlength', 'pattern']);

const doc = (text, indent = '  ') => (text ? `${indent}/** ${text.replace(/\*\//g, '*\\/').replace(/\n/g, ' ')} */\n` : '');
const propsName = (d) => `${d.name}Props`;

let index = `// Sinh tự động bởi scripts/gen-types.mjs — không sửa tay\nimport type { HuiElement, HuiFormElement } from './core';\nexport * from './core';\n\n`;

for (const d of elements) {
  const fields = publicFields(d);
  const base = isFormElement(d) ? 'HuiFormElement' : 'HuiElement';
  index += `/** <${d.tagName}>${d.description ? ` — ${d.description.split('\n')[0]}` : ''} */\n`;
  index += `export interface ${propsName(d)} {\n`;
  for (const f of fields) index += `${doc(f.description)}  ${f.name}?: ${tsType(f)};\n`;
  index += `}\n`;
  index += `export declare class ${d.name} extends ${base} {\n`;
  // Field đã khai báo ở lớp nền (core.d.ts) không lặp lại — tránh xung đột kiểu khi lớp con khai báo rộng hơn
  for (const f of fields) {
    if (base === 'HuiFormElement' && FORM_BASE_FIELDS.has(f.name)) continue;
    index += `${doc(f.description)}  ${f.name}: ${tsType(f)};\n`;
  }
  index += `}\n\n`;
}

index += `export declare function registerIcon(name: string, svgContent: string): void;\n`;
index += `export declare function getIcon(name: string): string | undefined;\n`;
index += `export declare function getIconNames(): string[];\n\n`;
index += `declare global {\n  interface HTMLElementTagNameMap {\n`;
for (const d of elements) index += `    '${d.tagName}': ${d.name};\n`;
index += `  }\n}\n`;
writeFileSync(resolve(out, 'index.d.ts'), index);

// Từng component: @itmrhoang/h-ui/hui-button
for (const d of elements) {
  const folder = d.module.split('/').at(-2);
  if (!folder?.startsWith('hui-')) continue;
  const file = resolve(out, `${folder}.d.ts`);
  const isMain = folder === d.tagName;
  const extra = folder === 'hui-icon' ? `export { registerIcon, getIcon, getIconNames } from './index';\n` : '';
  if (isMain) writeFileSync(file, `export { ${d.name} as default, ${d.name} } from './index';\n${extra}`);
}
// hui-avatar xuất kèm hui-avatar-group
const group = elements.find((d) => d.tagName === 'hui-avatar-group');
if (group) {
  writeFileSync(resolve(out, 'hui-avatar.d.ts'), `export { HuiAvatar as default, HuiAvatar, ${group.name} } from './index';\n`);
}

// Kiểu viết tay cho core
copyFileSync(resolve(root, 'scripts/types/core.d.ts'), resolve(out, 'core.d.ts'));
copyFileSync(resolve(root, 'scripts/types/effects.d.ts'), resolve(out, 'effects.d.ts'));

// Vue — GlobalComponents
let vue = `// Bật gợi ý cho Vue: thêm "@itmrhoang/h-ui/types/vue" vào compilerOptions.types (tsconfig)\nimport type { DefineComponent } from 'vue';\nimport type * as H from './index';\n\ndeclare module 'vue' {\n  interface GlobalComponents {\n`;
for (const d of elements) {
  const events = (d.events || []).map((e) => `'on${e.name.replace(/(^|-)(\w)/g, (m, s, c) => c.toUpperCase())}'?: (e: CustomEvent) => void`).join('; ');
  vue += `    '${d.tagName}': DefineComponent<Partial<H.${propsName(d)}>${events ? ` & { ${events} }` : ''}>;\n`;
}
vue += `  }\n}\nexport {};\n`;
writeFileSync(resolve(out, 'vue.d.ts'), vue);

// React 19 — JSX.IntrinsicElements (React 19 tự gán property + nhận on<tên-sự-kiện>)
let react = `// Bật gợi ý cho React 19: thêm "@itmrhoang/h-ui/types/react" vào compilerOptions.types (tsconfig)\nimport type * as React from 'react';\nimport type * as H from './index';\n\ntype Base<T> = React.DetailedHTMLProps<React.HTMLAttributes<T>, T> & { class?: string };\n\ndeclare module 'react' {\n  namespace JSX {\n    interface IntrinsicElements {\n`;
for (const d of elements) {
  const events = (d.events || []).map((e) => `'on${e.name}'?: (e: CustomEvent) => void`).join('; ');
  react += `      '${d.tagName}': Base<H.${d.name}> & Partial<H.${propsName(d)}>${events ? ` & { ${events} }` : ''};\n`;
}
react += `    }\n  }\n}\nexport {};\n`;
writeFileSync(resolve(out, 'react.d.ts'), react);

console.info(`✔ types: ${elements.length} custom elements → dist/types`);
