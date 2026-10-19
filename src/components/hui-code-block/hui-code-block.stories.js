/**
 * Storybook Stories — HUI Code Block
 */

import { html, nothing } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import { tokenize, parseLineRanges } from './highlight.js';
import './index.js';

const JS = `import { setLocale } from '@itmrhoang/h-ui/core';

// Đổi ngôn ngữ toàn cục
const total = items.reduce((sum, x) => sum + x.price * 1.1, 0);
export async function load(url) {
  const res = await fetch(\`\${url}?page=2\`);
  return res.ok ? res.json() : null;
}`;

const CSS = `/* Nút chính */
.btn:hover > .icon {
  color: var(--hui-primary);
  margin: 0 4px !important;
}
@media (max-width: 600px) {
  .btn { padding: 8px; }
}`;

const JSON_CODE = `{
  "name": "@itmrhoang/h-ui",
  "version": "1.2.0",
  "private": false,
  "keywords": ["web-components", null, 42]
}`;

const BASH = `# Cài đặt
$ npm install @itmrhoang/h-ui --save
echo "$HOME" && cd ./dist | grep esm`;

const lines = (el) => [...el.shadowRoot.querySelectorAll('[part~="line"]')];

/** Thay clipboard thật bằng bản ghi nhớ */
function mockClipboard() {
  const log = [];
  const clip = navigator.clipboard;
  if (clip) clip.writeText = async (text) => { log.push(text); };
  return { log, restore: () => { if (clip) delete clip.writeText; } };
}

export default {
  title: 'Molecules/HuiCodeBlock',
  component: 'hui-code-block',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Code Block** — Khối code có **nút copy** (hui-copy), **tên file**, **đánh số dòng**, **tô sáng dòng**
và tô màu cú pháp tối giản (không thư viện) cho \`js\` / \`ts\` / \`html\` / \`css\` / \`json\` / \`bash\`.
Mọi nội dung được đưa vào bằng \`textContent\` — **không bao giờ** chèn HTML của người dùng.

\`\`\`html
<hui-code-block language="js" filename="app.js" line-numbers highlight="2,4-6">
  const a = 1;
  …
</hui-code-block>

<!-- Code HTML: bọc trong <template> để trình duyệt không render -->
<hui-code-block language="html"><template><button class="x">Hi</button></template></hui-code-block>

<!-- Hoặc gán property -->
<script>codeBlock.code = source;</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`code\` | string | — | Code (ưu tiên hơn nội dung trong thẻ) |
| \`language\` | string | — | \`js\` \\| \`ts\` \\| \`html\` \\| \`css\` \\| \`json\` \\| \`bash\` (+ bí danh javascript, typescript, xml, svg, sh, shell…) |
| \`filename\` | string | — | Tên file trên thanh tiêu đề |
| \`line-numbers\` | boolean | \`false\` | Đánh số dòng |
| \`start-line\` | number | \`1\` | Số dòng bắt đầu |
| \`highlight\` | string | — | Dòng tô sáng, vd \`2,4-6\` |
| \`max-height\` | string | — | Chiều cao tối đa (số = px) — dài hơn thì cuộn |
| \`wrap\` | boolean | \`false\` | Xuống dòng thay vì cuộn ngang |
| \`no-copy\` | boolean | \`false\` | Ẩn nút copy |
| \`no-header\` | boolean | \`false\` | Ẩn thanh tiêu đề (nút copy nổi ở góc) |

### Properties
| Tên | Mô tả |
|-----|-------|
| \`displayedCode\` | (chỉ đọc) code đang hiển thị (đã bỏ thụt lề chung) — cũng là chuỗi được copy |

Hàm export từ \`highlight.js\`: \`tokenize(code, lang)\`, \`splitLines\`, \`parseLineRanges("2,4-6")\`, \`dedent\`.

### Events
\`hui-copy\` (nổi bọt từ nút copy bên trong) — detail \`{ value }\`.

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Code dạng chữ, hoặc một \`<template>\` chứa HTML hiển thị nguyên văn |

### Parts
\`base\`, \`header\`, \`filename\`, \`language\`, \`copy\`, \`pre\`, \`code\`, \`line\` (+ \`line-highlight\`), \`line-number\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-code-block-bg\` / \`-color\` / \`-header-bg\` / \`-border-color\` / \`-radius\` | Khung |
| \`--hui-code-block-font-family\` / \`-font-size\` / \`-line-height\` / \`-padding\` / \`-tab-size\` | Chữ |
| \`--hui-code-block-highlight-bg\` / \`-highlight-border\` / \`-line-number-color\` | Dòng |
| \`--hui-code-block-comment\` / \`-keyword\` / \`-string\` / \`-number\` / \`-function\` / \`-tag\` / \`-attr\` / \`-property\` / \`-punctuation\` | Màu token (mặc định lấy token sắc độ 7–8 → đủ tương phản cả sáng/tối) |

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Focus vùng code (cuộn bằng phím mũi tên) rồi nút copy |
| \`Enter\` / \`Space\` trên nút copy | Sao chép code |
        `,
      },
    },
  },
  argTypes: {
    language: { control: 'select', options: ['js', 'ts', 'html', 'css', 'json', 'bash', 'text'] },
    filename: { control: 'text' },
    lineNumbers: { control: 'boolean' },
    highlight: { control: 'text' },
    maxHeight: { control: 'text' },
    wrap: { control: 'boolean' },
    noCopy: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-code-block
      .code=${JS}
      language=${args.language}
      filename=${args.filename || nothing}
      ?line-numbers=${args.lineNumbers}
      highlight=${args.highlight || nothing}
      max-height=${args.maxHeight || nothing}
      ?wrap=${args.wrap}
      ?no-copy=${args.noCopy}
    ></hui-code-block>
  `,
  args: { language: 'js', filename: 'load.js', lineNumbers: true, highlight: '4,6-7', maxHeight: '', wrap: false, noCopy: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-code-block');
    const rows = lines(el);
    await expect(rows.length).toBe(8);
    await expect(rows[3].getAttribute('part')).toBe('line line-highlight');
    await expect(rows.filter((r) => r.classList.contains('cb__line--hl')).length).toBe(3);
    await expect(rows[0].querySelector('[part="line-number"]').textContent).toBe('1');
    await expect(el.shadowRoot.querySelector('.tok-keyword').textContent).toBe('import');
    await expect(el.shadowRoot.querySelector('.tok-comment').textContent).toBe('// Đổi ngôn ngữ toàn cục');
    await expect(el.shadowRoot.querySelector('[part="filename"]').textContent).toBe('load.js');
    await expect(el.shadowRoot.querySelector('[part="language"]').textContent).toBe('JavaScript');
    await expect(el.shadowRoot.querySelector('pre').getAttribute('tabindex')).toBe('0');

    // Copy: chép đúng code gốc (không gồm số dòng)
    const clip = mockClipboard();
    try {
      let copied = null;
      el.addEventListener('hui-copy', (e) => { copied = e.detail.value; }, { once: true });
      const copyBtn = el.shadowRoot.querySelector('hui-copy').shadowRoot.querySelector('hui-button').shadowRoot.querySelector('button');
      await userEvent.click(copyBtn);
      await waitFor(() => expect(copied).toBe(JS));
    } finally {
      clip.restore();
    }
  },
};

/** Các ngôn ngữ có tô màu */
export const Languages = {
  render: () => html`
    <hui-code-block id="l-css" language="css" filename="button.css" .code=${CSS}></hui-code-block>
    <hui-code-block id="l-json" language="json" filename="package.json" .code=${JSON_CODE}></hui-code-block>
    <hui-code-block id="l-bash" language="bash" .code=${BASH}></hui-code-block>
    <hui-code-block id="l-html" language="html" filename="index.html"><template><!-- Nút -->
<hui-button variant="primary" data-id=1 disabled>Đặt hàng &amp; thanh toán</hui-button>
<script type="module" src="./main.js"></script></template></hui-code-block>
    <hui-code-block language="ts" .code=${'interface User {\n  id: number;\n  name?: string;\n}\nconst u: User = { id: 1 };'}></hui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const q = (id, sel) => [...canvasElement.querySelector(`#${id}`).shadowRoot.querySelectorAll(sel)].map((n) => n.textContent);
    await expect(q('l-css', '.tok-property')).toContain('color');
    await expect(q('l-css', '.tok-selector')[0]).toBe('.btn:hover > .icon');
    await expect(q('l-json', '.tok-property')).toContain('"name"');
    await expect(q('l-json', '.tok-keyword')).toEqual(['false', 'null']);
    await expect(q('l-bash', '.tok-function')).toEqual(['npm', 'echo', 'cd', 'grep']);
    await expect(q('l-bash', '.tok-attr')).toEqual(['--save']);
    // <template> → HTML hiển thị nguyên văn (chữ), không render thành phần tử
    const htmlBlock = canvasElement.querySelector('#l-html');
    await expect(htmlBlock.shadowRoot.querySelector('hui-button')).toBe(null);
    await expect(q('l-html', '.tok-tag')).toContain('hui-button');
    await expect(q('l-html', '.tok-attr')).toContain('data-id');
    await expect(tokenize('a < b', 'unknown')).toEqual([{ type: 'plain', text: 'a < b' }]);
  },
};

/** An toàn: code chứa HTML/script chỉ hiện dạng chữ */
export const SafeByDefault = {
  render: () => html`
    <hui-code-block id="xss" language="html" .code=${'<img src=x onerror="window.__huiXss = 1"><script>window.__huiXss = 2</script>'}></hui-code-block>
    <hui-code-block id="slot-text" language="js">
      const a = '&lt;b&gt;not bold&lt;/b&gt;';
      console.log(a);
    </hui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#xss');
    await expect(el.shadowRoot.querySelector('img')).toBe(null);
    await expect(el.shadowRoot.querySelector('script')).toBe(null);
    await expect(window.__huiXss).toBe(undefined);
    const slotted = canvasElement.querySelector('#slot-text');
    // Bỏ thụt lề chung + dòng trống đầu/cuối
    await expect(slotted.displayedCode).toBe("const a = '<b>not bold</b>';\nconsole.log(a);");
    await expect(slotted.shadowRoot.querySelector('b')).toBe(null);
  },
};

/** max-height cuộn, wrap, không header (nút copy nổi), không copy */
export const LayoutOptions = {
  render: () => html`
    <hui-code-block id="mh" language="js" line-numbers max-height="140" .code=${JS + '\n' + JS}></hui-code-block>
    <hui-code-block id="wrap" language="text" wrap .code=${'Một dòng rất dài '.repeat(20)}></hui-code-block>
    <hui-code-block id="nohead" language="bash" no-header .code=${'npm run build'}></hui-code-block>
    <hui-code-block id="nocopy" no-copy .code=${'Chỉ hiển thị, không có header'}></hui-code-block>
  `,
  play: async ({ canvasElement }) => {
    const pre = canvasElement.querySelector('#mh').shadowRoot.querySelector('pre');
    await expect(pre.clientHeight).toBeLessThanOrEqual(140);
    await expect(pre.scrollHeight).toBeGreaterThan(pre.clientHeight);
    const wrapPre = canvasElement.querySelector('#wrap').shadowRoot.querySelector('pre');
    await expect(wrapPre.scrollWidth).toBeLessThanOrEqual(wrapPre.clientWidth + 1);
    const nohead = canvasElement.querySelector('#nohead').shadowRoot;
    await expect(nohead.querySelector('[part="header"]').hidden).toBe(true);
    await expect(nohead.querySelector('hui-copy').classList.contains('cb__copy--float')).toBe(true);
    const nocopy = canvasElement.querySelector('#nocopy').shadowRoot;
    await expect(nocopy.querySelector('[part="header"]').hidden).toBe(true);
    await expect([...parseLineRanges('3-1, 7')]).toEqual([1, 2, 3, 7]);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cb-dark {
        --hui-code-block-bg: #0b1020;
        --hui-code-block-header-bg: #111830;
        --hui-code-block-color: #e2e8f0;
        --hui-code-block-border-color: #1e293b;
        --hui-code-block-keyword: #c084fc;
        --hui-code-block-string: #86efac;
        --hui-code-block-comment: #94a3b8;
        --hui-code-block-function: #7dd3fc;
        --hui-code-block-number: #fdba74;
        --hui-code-block-punctuation: #cbd5e1;
        --hui-code-block-line-number-color: #64748b;
        --hui-code-block-highlight-bg: rgba(192, 132, 252, 0.15);
        --hui-code-block-highlight-border: #c084fc;
        --hui-code-block-radius: 14px;
        --hui-code-block-font-size: 13px;
      }
      .cb-dark hui-code-block::part(filename) { color: #e2e8f0; }
      .cb-dark hui-code-block::part(language) { background: #c084fc; color: #0b1020; }
    </style>
    <div class="cb-dark">
      <hui-code-block language="js" filename="dark-theme.js" line-numbers highlight="3" .code=${JS}></hui-code-block>
    </div>
  `,
};
