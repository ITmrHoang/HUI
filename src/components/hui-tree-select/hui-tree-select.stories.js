/**
 * Storybook Stories — HUI TreeSelect
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { VN_ADMIN, toTreeData } from '../hui-tree/vn-admin-data.js';

const trigger = (el) => el.shadowRoot.querySelector('[part="trigger"]');
const treeOf = (el) => el.shadowRoot.querySelector('hui-tree');
const rows = (el) => [...treeOf(el).shadowRoot.querySelectorAll('[role="treeitem"]')];
const rowOf = (el, text) => rows(el).find((r) => r.querySelector('[part~="title"]').textContent === text);
const isOpen = (el) => trigger(el).getAttribute('aria-expanded') === 'true';
const tagTexts = (el) => [...el.shadowRoot.querySelectorAll('[part~="tag"]')].map((t) => t.textContent.replace('✕', ''));
const DATA = () => toTreeData(VN_ADMIN);

export default {
  title: 'Molecules/HuiTreeSelect',
  component: 'hui-tree-select',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI TreeSelect** — Ô chọn giá trị từ cây (Ant TreeSelect). Trigger giống \`hui-select\`, popup chứa \`<hui-tree>\`:
chọn một / nhiều (tag, gộp "+N"), \`tree-checkable\` với chiến lược giá trị \`show-checked\`, ô tìm kiếm lọc cây không dấu,
tải con bất đồng bộ. Tham gia \`<form>\` native (\`name\`, \`required\`, reset).

\`\`\`html
<hui-tree-select name="area" show-search clearable placeholder="Chọn khu vực"></hui-tree-select>
<hui-tree-select tree-checkable show-checked="parent" max-tag-count="2"></hui-tree-select>
<script>el.data = [{ value: 'hn', title: 'Hà Nội', children: [...] }];</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | string / JSON | — | Khóa đang chọn (\`node.value ?? node.key\`); nhiều giá trị: JSON \`["a","b"]\` hoặc \`a,b\` |
| \`data\` | JSON | \`[]\` | Cây \`[{ value \\| key, title, children, isLeaf, disabled, disableCheckbox, selectable }]\` |
| \`multiple\` | boolean | \`false\` | Chọn nhiều (tag) |
| \`tree-checkable\` | boolean | \`false\` | Ô check, cha–con liên kết |
| \`show-checked\` | \`all\` \\| \`parent\` \\| \`child\` | \`child\` | Giá trị khi check: mọi node / cha cao nhất đã đủ / chỉ lá |
| \`tree-check-strictly\` | boolean | \`false\` | Cha–con độc lập |
| \`show-search\` | boolean | \`false\` | Ô tìm kiếm lọc cây (không dấu) |
| \`clearable\` | boolean | \`false\` | Nút ✕ xóa |
| \`placeholder\` / \`label\` | string | "Chọn..." | |
| \`max-tag-count\` | number | — | Số tag tối đa, còn lại "+N" |
| \`tree-default-expand-all\` / \`tree-line\` / \`tree-icon\` | boolean | \`false\` | Truyền cho cây |
| \`virtual\` + \`list-height\` | boolean + number | \`256\` | Virtual scroll cho cây lớn |
| \`loading\` | boolean | \`false\` | Vòng xoay ở trigger |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | |
| \`name\` / \`required\` / \`disabled\` / \`readonly\` / \`status\` | — | — | Như control form |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng popup |

### Properties
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`value\` | \`string \\| string[]\` | Nhiều giá trị: mảng |
| \`loadData\` | \`(node) => Promise<children[] \\| void>\` | Tải con (chuyển cho \`hui-tree\`) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ value, label, node }\` | Nhiều giá trị: các trường là mảng |
| \`clear\` | — | Bấm ✕ |

### Parts
\`base\`, \`label\`, \`trigger\`, \`value\`, \`tags\`, \`tag\` (+ \`tag-rest\`), \`tag-remove\`, \`clear\`, \`arrow\`, \`loading\`, \`dropdown\`, \`search\`, \`tree\`.
State: \`:state(open)\`, \`:state(filled)\`, \`:state(user-invalid)\`.

### CSS Variables
\`--hui-tree-select-height\`, \`-radius\`, \`-bg\`, \`-color\`, \`-border-color\`, \`-hover-border-color\`, \`-focus-border-color\`, \`-focus-shadow\`,
\`-placeholder-color\`, \`-dropdown-bg\`, \`-dropdown-radius\`, \`-dropdown-shadow\`, \`-dropdown-max-height\`, \`-tag-bg\`, \`-tag-color\`
(tiền tố \`--hui-tree-select\`). Cây trong popup nhận tiếp mọi biến \`--hui-tree-*\`.

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Enter\` / \`Space\` / \`↓\` / \`Alt+↓\` | Mở popup, focus vào ô tìm kiếm (show-search) hoặc cây |
| \`↓\` (trong ô tìm kiếm) | Vào cây |
| Phím cây (APG Tree) | \`↑↓→←\`, \`Home/End\`, \`Enter\` chọn, \`Space\` check… (xem HuiTree) |
| \`Esc\` / \`Alt+↑\` | Đóng, focus về trigger |
| \`Tab\` | Đóng (focus về trigger) |
| \`Backspace\` | Xóa tag cuối (nhiều giá trị) |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <div style="max-width: 360px;">
      <hui-tree-select id="ts-default" label="Khu vực" placeholder="Chọn quận / huyện" clearable .data=${DATA()}></hui-tree-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ts-default');
    const changes = [];
    el.addEventListener('change', (e) => changes.push(e.detail.value));
    await expect(el.shadowRoot.querySelector('[part="value"]').textContent).toBe('Chọn quận / huyện');

    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(true));
    rowOf(el, 'Hà Nội').querySelector('[part~="switcher"]').click();
    await waitFor(() => expect(rowOf(el, 'Quận Hoàn Kiếm')).toBeTruthy());
    rowOf(el, 'Quận Hoàn Kiếm').querySelector('[part~="content"]').click();
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(el.value).toBe('hn-hk');
    await expect(changes).toEqual(['hn-hk']);
    await expect(el.shadowRoot.querySelector('[part="value"]').textContent).toBe('Quận Hoàn Kiếm');

    // Mở lại: node đang chọn được đánh dấu, bấm lại không bỏ chọn
    trigger(el).click();
    await waitFor(() => expect(rowOf(el, 'Quận Hoàn Kiếm').getAttribute('aria-selected')).toBe('true'));
    rowOf(el, 'Quận Hoàn Kiếm').querySelector('[part~="content"]').click();
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(el.value).toBe('hn-hk');
    await expect(changes.length).toBe(1);

    el.shadowRoot.querySelector('[part="clear"]').click();
    await expect(el.value).toBe(null);
  },
};

/** Bàn phím: Enter mở, focus vào cây, mũi tên + Enter chọn, Esc đóng */
export const Keyboard = {
  render: () => html`<div style="max-width: 360px;"><hui-tree-select id="ts-kb" label="Tỉnh / thành" .data=${DATA()}></hui-tree-select></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ts-kb');
    el.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await waitFor(() => expect(treeOf(el).matches(':focus-within') || el.shadowRoot.activeElement === treeOf(el)).toBe(true));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await waitFor(() => expect(treeOf(el).activeKey).toBe('dn'));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(el.value).toBe('dn');
    await expect(el.shadowRoot.activeElement).toBe(trigger(el));

    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await expect(treeOf(el).activeKey).toBe('dn');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(el.shadowRoot.activeElement).toBe(trigger(el));
    el.blur();
  },
};

/** Chọn nhiều: tag, gộp "+N", Backspace / ✕ xóa tag */
export const Multiple = {
  render: () => html`
    <div style="max-width: 420px;">
      <hui-tree-select id="ts-multi" multiple max-tag-count="2" tree-default-expand-all
        .data=${DATA()} .value=${['hn-bd', 'hcm-q1', 'dn-hc']}></hui-tree-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ts-multi');
    await expect(tagTexts(el)).toEqual(['Quận Ba Đình', 'Quận 1', '+1']);
    el.shadowRoot.querySelector('[part="tag-remove"]').click();
    await expect(el.value).toEqual(['hcm-q1', 'dn-hc']);
    await expect(tagTexts(el)).toEqual(['Quận 1', 'Quận Hải Châu']);

    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(true));
    rowOf(el, 'Cần Thơ').querySelector('[part~="content"]').click();
    await waitFor(() => expect(el.value).toEqual(['hcm-q1', 'dn-hc', 'ct']));
    await expect(isOpen(el)).toBe(true); // nhiều giá trị: popup vẫn mở
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await userEvent.keyboard('{Backspace}');
    await expect(el.value).toEqual(['hcm-q1', 'dn-hc']);
    el.blur();
  },
};

/** tree-checkable + show-checked: parent (gộp lên cha) / child (chỉ lá) / all */
export const Checkable = {
  render: () => html`
    <div style="display: grid; gap: 16px; max-width: 460px;">
      <hui-tree-select id="ts-parent" label="show-checked=parent" tree-checkable show-checked="parent" .data=${DATA()}></hui-tree-select>
      <hui-tree-select id="ts-child" label="show-checked=child" tree-checkable max-tag-count="3" .data=${DATA()}></hui-tree-select>
      <hui-tree-select id="ts-all" label="show-checked=all" tree-checkable show-checked="all" .data=${DATA()}></hui-tree-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const check = async (el, text) => {
      trigger(el).click();
      await waitFor(() => expect(isOpen(el)).toBe(true));
      rowOf(el, text).querySelector('[part~="checkbox"]').click();
    };
    const parent = canvasElement.querySelector('#ts-parent');
    await check(parent, 'Thừa Thiên Huế');
    await waitFor(() => expect(parent.value).toEqual(['hue']));
    await expect(tagTexts(parent)).toEqual(['Thừa Thiên Huế']);
    trigger(parent).click(); // đóng
    await waitFor(() => expect(isOpen(parent)).toBe(false));

    const child = canvasElement.querySelector('#ts-child');
    await check(child, 'Thừa Thiên Huế');
    await waitFor(() => expect(child.value).toEqual(['hue-tp-ph', 'hue-tp-vn', 'hue-ht-pb', 'hue-ht-tv']));
    await expect(tagTexts(child)).toEqual(['Phường Phú Hội', 'Phường Vĩnh Ninh', 'Phường Phú Bài', '+1']);
    // Xóa 1 tag → cha thành nửa chọn
    child.shadowRoot.querySelector('[part="tag-remove"]').click();
    await expect(child.value).toEqual(['hue-tp-vn', 'hue-ht-pb', 'hue-ht-tv']);
    await waitFor(() => expect(rowOf(child, 'Thừa Thiên Huế').getAttribute('aria-checked')).toBe('mixed'));
    trigger(child).click();
    await waitFor(() => expect(isOpen(child)).toBe(false));

    const all = canvasElement.querySelector('#ts-all');
    await check(all, 'Cần Thơ');
    await waitFor(() => expect(all.value).toEqual(['ct', 'ct-nk', 'ct-nk-ah', 'ct-nk-ck', 'ct-nk-ta', 'ct-cr', 'ct-cr-hp', 'ct-cr-lt']));
    trigger(all).click();
    await waitFor(() => expect(isOpen(all)).toBe(false));
  },
};

/** Ô tìm kiếm: lọc cây không dấu, tự mở tổ tiên; ↓ vào cây */
export const Search = {
  render: () => html`<div style="max-width: 360px;"><hui-tree-select id="ts-search" show-search placeholder="Tìm phường..." .data=${DATA()}></hui-tree-select></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ts-search');
    trigger(el).click();
    await waitFor(() => expect(el.shadowRoot.activeElement).toBe(el.shadowRoot.querySelector('[part="search"]')));
    await userEvent.keyboard('thao dien');
    await waitFor(() => expect(rows(el).map((r) => r.querySelector('[part~="title"]').textContent))
      .toEqual(['TP. Hồ Chí Minh', 'TP. Thủ Đức', 'Phường Thảo Điền']));
    await expect(rowOf(el, 'Phường Thảo Điền').querySelector('[part="highlight"]').textContent).toBe('Thảo Điền');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{End}{Enter}');
    await waitFor(() => expect(el.value).toBe('hcm-td-tdi'));
    el.blur();
  },
};

/** Tải con bất đồng bộ (loadData) */
export const AsyncLoad = {
  render: () => html`<div style="max-width: 360px;"><hui-tree-select id="ts-async" placeholder="Chọn (tải động)"></hui-tree-select></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ts-async');
    el.loadData = async (node) => {
      await new Promise((r) => setTimeout(r, 30));
      return VN_ADMIN.find((p) => p.value === node.value).children.map((d) => ({ value: d.value, title: d.label, isLeaf: true }));
    };
    el.data = VN_ADMIN.map((p) => ({ value: p.value, title: p.label }));
    await el.updateComplete;
    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(true));
    rowOf(el, 'Cần Thơ').querySelector('[part~="switcher"]').click();
    await waitFor(() => expect(rowOf(el, 'Quận Cái Răng')).toBeTruthy());
    rowOf(el, 'Quận Cái Răng').querySelector('[part~="content"]').click();
    await waitFor(() => expect(el.value).toBe('ct-cr'));
    await expect(el.shadowRoot.querySelector('[part="value"]').textContent).toBe('Quận Cái Răng');
  },
};

/** Tham gia <form>: FormData, required, reset */
export const InForm = {
  render: () => html`
    <form id="ts-form" style="display: grid; gap: 12px; max-width: 420px;" @submit=${(e) => e.preventDefault()}>
      <hui-tree-select name="area" required label="Khu vực" value="dn" .data=${DATA()}></hui-tree-select>
      <hui-tree-select name="wards" tree-checkable label="Phường áp dụng" value='["hn-hk-hb","hn-hk-tt"]' .data=${DATA()}></hui-tree-select>
      <div><button type="reset">Đặt lại</button></div>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#ts-form');
    const [area, wards] = form.querySelectorAll('hui-tree-select');
    let fd = new FormData(form);
    await expect(fd.get('area')).toBe('dn');
    await expect(fd.getAll('wards')).toEqual(['hn-hk-hb', 'hn-hk-tt']);
    await expect(area.checkValidity()).toBe(true);
    area.value = null;
    await expect(area.checkValidity()).toBe(false);
    wards.value = ['hcm-q1-bn'];
    form.reset();
    await expect(area.value).toBe('dn');
    await expect(wards.value).toEqual(['hn-hk-hb', 'hn-hk-tt']);
    fd = new FormData(form);
    await expect(fd.get('area')).toBe('dn');
  },
};

/** Override từ ngoài: biến --hui-tree-select-* / --hui-tree-* + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .custom-ts {
        --hui-tree-select-radius: 999px;
        --hui-tree-select-focus-border-color: var(--hui-success);
        --hui-tree-select-tag-bg: var(--hui-success-light);
        --hui-tree-select-tag-color: var(--hui-success);
        --hui-tree-node-selected-bg: var(--hui-success-light);
        --hui-tree-checked-bg: var(--hui-success);
      }
      .custom-ts::part(trigger) { padding-inline: 14px; }
      .custom-ts::part(dropdown) { border-color: var(--hui-success); }
    </style>
    <div style="max-width: 420px;">
      <hui-tree-select id="ts-custom" class="custom-ts" tree-checkable tree-line show-checked="parent" .value=${['dn']} .data=${DATA()}></hui-tree-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ts-custom');
    await expect(getComputedStyle(trigger(el)).borderTopLeftRadius).toBe('999px');
    await expect(tagTexts(el)).toEqual(['Đà Nẵng']);
  },
};

export const Sizes = {
  render: () => html`
    <div style="display: grid; gap: 12px; max-width: 360px;">
      <hui-tree-select size="sm" placeholder="Nhỏ" .data=${DATA()}></hui-tree-select>
      <hui-tree-select placeholder="Vừa" .data=${DATA()}></hui-tree-select>
      <hui-tree-select size="lg" placeholder="Lớn" .data=${DATA()}></hui-tree-select>
      <hui-tree-select disabled value="hn" .data=${DATA()}></hui-tree-select>
      <hui-tree-select status="error" placeholder="Lỗi" .data=${DATA()}></hui-tree-select>
    </div>
  `,
};
