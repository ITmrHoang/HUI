/**
 * Sinh file .d.ts từ dist/custom-elements.json (chạy sau `cem analyze` trong npm run build).
 *   dist/types/index.d.ts   — class + HTMLElementTagNameMap (document.querySelector('hui-button') có kiểu)
 *   dist/types/<tag>.d.ts   — import lẻ từng component
 *   dist/types/core.d.ts    — HuiElement, HuiFormElement, tiện ích
 *   dist/types/vue.d.ts     — GlobalComponents cho Vue (gợi ý attribute/sự kiện/v-model trong template)
 *   dist/types/react.d.ts   — JSX.IntrinsicElements cho React 19
 *   dist/types/vue-plugin.d.ts, react-helper.d.ts — kiểu viết tay cho @itmrhoang/h-ui/vue và /react
 *   dist/undefined.css      — ẩn thẻ hui-* chưa được define (chống nháy layout khi SSR / tải chậm)
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

/**
 * "Khi gõ chữ, detail: { value, option }" → "{ value: any; option: any }".
 * Chỉ lấy TÊN trường (kiểu trong JSDoc là văn xuôi) — không đọc được thì trả 'any'.
 */
function detailType(desc) {
  const text = desc || '';
  const at = text.search(/detail\b/);
  if (at < 0) return 'any';
  const open = text.indexOf('{', at);
  if (open < 0 || open - at > 12) return 'any';
  // Tách các phần ở mức ngoặc ngoài cùng
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = open + 1; i < text.length; i++) {
    const c = text[i];
    if ('{(['.includes(c)) depth++;
    if ('})]'.includes(c)) {
      if (depth === 0) break;
      depth--;
    }
    if (c === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += c;
  }
  parts.push(cur);
  const names = [];
  for (const part of parts) {
    const m = part.trim().match(/^([A-Za-z_$][\w$]*)/);
    if (!m) return 'any';
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names.length ? `{ ${names.map((n) => `${n}: any`).join('; ')} }` : 'any';
}

/** Kiểu sự kiện: CustomEvent<detail> */
const eventType = (e) => `CustomEvent<${detailType(e.description)}>`;
/** 'hui-change' → 'onHuiChange' (Vue: @hui-change biên dịch thành prop onHuiChange) */
const vueEventProp = (name) => `on${name.replace(/(^|-)(\w)/g, (m, sep, c) => c.toUpperCase())}`;

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
// Bảng tra theo tên thẻ — dùng cho kiểu Vue/React và createComponent()
index += `/** Props của từng thẻ (theo tên thẻ) */\nexport interface HuiElementPropsMap {\n`;
for (const d of elements) index += `  '${d.tagName}': ${propsName(d)};\n`;
index += `}\n\n/** Sự kiện của từng thẻ: tên sự kiện → kiểu event */\nexport interface HuiElementEventMap {\n`;
for (const d of elements) {
  const evs = (d.events || []).filter((e) => e.name).map((e) => `'${e.name}': ${eventType(e)}`);
  index += `  '${d.tagName}': {${evs.length ? ` ${evs.join('; ')} ` : ''}};\n`;
}
index += `}\n\n`;
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

// Kiểu viết tay cho plugin Vue / helper React
copyFileSync(resolve(root, 'scripts/types/vue-plugin.d.ts'), resolve(out, 'vue-plugin.d.ts'));
copyFileSync(resolve(root, 'scripts/types/react-helper.d.ts'), resolve(out, 'react-helper.d.ts'));

/** Sự kiện có tên hợp lệ của 1 thẻ */
const eventsOf = (d) => (d.events || []).filter((e) => e.name);
/** Kiểu của property value (cho v-model) */
const valueType = (d) => {
  const f = publicFields(d).find((x) => x.name === 'value');
  return f ? tsType(f) : 'unknown';
};

// Vue — GlobalComponents. Vue biên dịch @hui-change → prop onHuiChange; v-model trên custom element
// (khi isCustomElement khớp) dùng vModelText: gán el.value + nghe 'input' → khai báo modelValue để Volar kiểm kiểu.
let vue = `// Sinh tự động bởi scripts/gen-types.mjs — không sửa tay
// Bật gợi ý cho Vue: thêm "@itmrhoang/h-ui/types/vue" vào compilerOptions.types (tsconfig)
// hoặc import plugin '@itmrhoang/h-ui/vue' (tự kéo theo file này).
import type { DefineComponent } from 'vue';
import type * as H from './index';

/** Chỉ dùng qua v-model (Vue gán el.value và nghe sự kiện input — hoặc change với .lazy) */
type HuiVModel<V> = { modelValue?: V; 'onUpdate:modelValue'?: (value: V) => void };

declare module 'vue' {
  interface GlobalComponents {
`;
for (const d of elements) {
  const events = eventsOf(d).map((e) => `'${vueEventProp(e.name)}'?: (e: ${eventType(e)}) => void`).join('; ');
  const model = isFormElement(d) ? ` & HuiVModel<${valueType(d)}>` : '';
  vue += `    '${d.tagName}': DefineComponent<Partial<H.${propsName(d)}>${model}${events ? ` & { ${events} }` : ''}>;\n`;
}
vue += `  }\n}\nexport {};\n`;
writeFileSync(resolve(out, 'vue.d.ts'), vue);

// React 19 — JSX.IntrinsicElements. React 19 với custom element:
//   prop trùng property của element → gán property (object/mảng/boolean giữ nguyên kiểu), còn lại → attribute
//   prop on<tên> không phải sự kiện React → addEventListener('<tên>') giữ nguyên hoa/thường: onhui-change → 'hui-change'
//   onClick / onInput / onChange… → sự kiện tổng hợp của React (onChange nghe sự kiện 'change' của custom element)
let react = `// Sinh tự động bởi scripts/gen-types.mjs — không sửa tay
// Bật gợi ý cho React 19: thêm "@itmrhoang/h-ui/types/react" vào compilerOptions.types (tsconfig)
// Sự kiện riêng: on + tên sự kiện nguyên văn, vd <hui-select onhui-search={(e) => e.detail.query} />
import type * as React from 'react';
import type * as H from './index';

type HuiBase<T, P> = Omit<React.DetailedHTMLProps<React.HTMLAttributes<T>, T>, keyof P> & { class?: string };
type HuiJsx<T, P> = HuiBase<T, P> & Partial<P>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
`;
for (const d of elements) {
  const events = eventsOf(d).map((e) => `'on${e.name}'?: (e: ${eventType(e)}) => void`).join('; ');
  react += `      '${d.tagName}': HuiJsx<H.${d.name}, H.${propsName(d)}>${events ? ` & { ${events} }` : ''};\n`;
}
react += `    }\n  }\n}\nexport {};\n`;
writeFileSync(resolve(out, 'react.d.ts'), react);

// CSS chống nháy: thẻ chưa define thì ẩn (vẫn giữ chỗ) — :not(:defined) không nhận wildcard nên liệt kê đủ tên thẻ
const tags = elements.map((d) => d.tagName);
const css = `/* Sinh tự động bởi scripts/gen-types.mjs — @itmrhoang/h-ui/undefined.css
 * Ẩn thẻ H-UI tới khi JS định nghĩa xong (chống nháy nội dung thô khi SSR / Nuxt / tải chậm). */
:is(${tags.join(', ')}):not(:defined) { visibility: hidden; }
`;
writeFileSync(resolve(root, 'dist/undefined.css'), css);

console.info(`✔ types: ${elements.length} custom elements → dist/types (+ vue, react) + dist/undefined.css`);
