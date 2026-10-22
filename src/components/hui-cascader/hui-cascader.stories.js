/**
 * Storybook Stories — HUI Cascader
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { VN_ADMIN } from '../hui-tree/vn-admin-data.js';

const OPTS = () => structuredClone(VN_ADMIN);
const trigger = (el) => el.shadowRoot.querySelector('[part="trigger"]');
const isOpen = (el) => trigger(el).getAttribute('aria-expanded') === 'true';
const menus = (el) => [...el.shadowRoot.querySelectorAll('[part="menu"]')].filter((m) => !m.hidden);
const optionOf = (el, text) => [...el.shadowRoot.querySelectorAll('[role="option"]')]
  .find((o) => o.querySelector('[part="option-label"]').textContent === text);
const activeText = (el) => {
  const id = trigger(el).getAttribute('aria-activedescendant');
  return id ? el.shadowRoot.getElementById(id)?.querySelector('[part="option-label"]').textContent : null;
};
const display = (el) => el.shadowRoot.querySelector('[part="value"]').textContent;
const tagTexts = (el) => [...el.shadowRoot.querySelectorAll('[part~="tag"]')].map((t) => t.textContent.replace('✕', ''));

export default {
  title: 'Molecules/HuiCascader',
  component: 'hui-cascader',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Cascader** — Chọn theo nhiều cấp (Ant Cascader), vd **Tỉnh/Thành → Quận/Huyện → Phường/Xã**. Menu nhiều cột ở top-layer,
\`value\` là mảng đường dẫn. Hỗ trợ \`change-on-select\`, \`multiple\` (check cha–con, tag), \`show-search\` (tìm theo cả đường dẫn,
**không dấu**, tô đậm), tải động \`loadData\`, \`expand-trigger="hover"\`. Màn hình hẹp (< 576px): các cột **xếp chồng** — mỗi lần một cột,
có nút quay lại, cột mới trượt vào. Tham gia \`<form>\` native.

\`\`\`html
<hui-cascader name="address" label="Địa chỉ" show-search clearable></hui-cascader>
<script>
  el.options = [{ value: 'hn', label: 'Hà Nội', children: [{ value: 'hn-bd', label: 'Quận Ba Đình' }] }];
  el.value = ['hn', 'hn-bd'];
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | JSON / chuỗi | — | Đường dẫn \`["hn","hn-bd"]\` (hoặc chuỗi nối bằng \`value-separator\`); multiple: \`[["hn"],["dn","dn-hc"]]\` |
| \`options\` | JSON | \`[]\` | \`[{ value, label, children, isLeaf, disabled }]\` — nên gán bằng property |
| \`multiple\` | boolean | \`false\` | Ô check từng mục, cha–con liên kết, tag |
| \`show-checked\` | \`parent\` \\| \`child\` | \`parent\` | multiple: giá trị gồm cha cao nhất đã check đủ / chỉ lá |
| \`change-on-select\` | boolean | \`false\` | Chọn được cả mục cha |
| \`show-search\` | boolean | \`false\` | Ô tìm kiếm trong popup |
| \`expand-trigger\` | \`click\` \\| \`hover\` | \`click\` | Cách mở cột con |
| \`separator\` | string | \`' / '\` | Chuỗi nối nhãn khi hiển thị |
| \`value-separator\` | string | — | Form gửi \`hn/hn-bd\` thay vì JSON |
| \`placeholder\` / \`label\` / \`clearable\` / \`max-tag-count\` | — | — | Như hui-select |
| \`size\` / \`name\` / \`required\` / \`disabled\` / \`readonly\` / \`status\` | — | — | Như control form |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Properties
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`value\` | \`string[] \\| string[][]\` | |
| \`loadData\` | \`(selectedOptions) => Promise<children[] \\| void>\` | Tải con của mục cuối trong đường dẫn (vòng xoay trên mục) |
| \`displayRender\` | \`(labels, selectedOptions) => string\` | Tự hiển thị giá trị |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ value, selectedOptions }\` | multiple: \`value\` = mảng đường dẫn, \`selectedOptions\` = mảng các mảng node |
| \`clear\` | — | Bấm ✕ |

### Parts
\`base\`, \`label\`, \`trigger\`, \`value\`, \`tags\`, \`tag\` (+ \`tag-rest\`), \`tag-remove\`, \`clear\`, \`arrow\`, \`dropdown\`, \`search\`, \`menus\`, \`menu\`,
\`menu-header\`, \`option\` (+ \`option-active\` \\| \`option-expanded\` \\| \`option-selected\` \\| \`option-disabled\`), \`option-label\`, \`checkbox\`,
\`expand-icon\`, \`loading\`, \`results\`, \`highlight\`, \`empty\`.

### CSS Variables
\`--hui-cascader-height\`, \`-radius\`, \`-bg\`, \`-color\`, \`-border-color\`, \`-hover-border-color\`, \`-focus-border-color\`, \`-focus-shadow\`,
\`-placeholder-color\`, \`-dropdown-bg\`, \`-dropdown-radius\`, \`-dropdown-shadow\`, \`-menu-width\`, \`-menu-height\`, \`-option-padding\`,
\`-option-hover-bg\`, \`-option-active-bg\`, \`-option-active-color\`, \`-tag-bg\`, \`-highlight-color\` (tiền tố \`--hui-cascader\`).

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Enter\` / \`Space\` / \`↓\` | Mở popup (focus ở mục đang chọn) |
| \`↑\` / \`↓\` / \`Home\` / \`End\` | Di chuyển trong cột |
| \`→\` | Mở cột con, focus mục đầu |
| \`←\` | Về cột cha |
| \`Enter\` | Lá: chọn + đóng; cha: mở cột con (change-on-select: chọn luôn) |
| \`Space\` | multiple: check / bỏ check |
| \`Esc\` / \`Tab\` | Đóng |
| \`Backspace\` | multiple: bỏ tag cuối |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <div style="max-width: 420px;">
      <hui-cascader id="cas-default" label="Địa chỉ" placeholder="Tỉnh / Quận / Phường" clearable .options=${OPTS()}></hui-cascader>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cas-default');
    const changes = [];
    el.addEventListener('change', (e) => changes.push(e.detail));
    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await expect(menus(el).length).toBe(1);
    optionOf(el, 'Hà Nội').click();
    await waitFor(() => expect(menus(el).length).toBe(2));
    await expect(optionOf(el, 'Hà Nội').part.contains('option-expanded')).toBe(true);
    optionOf(el, 'Quận Ba Đình').click();
    await waitFor(() => expect(menus(el).length).toBe(3));
    optionOf(el, 'Phường Phúc Xá').click();
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(el.value).toEqual(['hn', 'hn-bd', 'hn-bd-px']);
    await expect(display(el)).toBe('Hà Nội / Quận Ba Đình / Phường Phúc Xá');
    await expect(changes.length).toBe(1);
    await expect(changes[0].selectedOptions.map((o) => o.label)).toEqual(['Hà Nội', 'Quận Ba Đình', 'Phường Phúc Xá']);

    // Mở lại: các cột mở sẵn theo giá trị, mục đã chọn được đánh dấu
    trigger(el).click();
    await waitFor(() => expect(menus(el).length).toBe(3));
    await expect(optionOf(el, 'Phường Phúc Xá').getAttribute('aria-selected')).toBe('true');
    await expect(activeText(el)).toBe('Phường Phúc Xá');
    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(false));
    el.shadowRoot.querySelector('[part="clear"]').click();
    await expect(el.value).toBe(null);
    await expect(display(el)).toBe('Tỉnh / Quận / Phường');
  },
};

/** Bàn phím: ↑↓ trong cột, → vào cột con, ← về cột cha, Enter chọn lá */
export const Keyboard = {
  render: () => html`<div style="max-width: 420px;"><hui-cascader id="cas-kb" label="Địa chỉ" .options=${OPTS()}></hui-cascader></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cas-kb');
    el.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await expect(activeText(el)).toBe('Hà Nội');
    await userEvent.keyboard('{ArrowDown}');
    await expect(activeText(el)).toBe('TP. Hồ Chí Minh');
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(activeText(el)).toBe('Quận 1'));
    await expect(menus(el).length).toBe(2);
    await userEvent.keyboard('{End}');
    await expect(activeText(el)).toBe('TP. Thủ Đức');
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(activeText(el)).toBe('Phường Thảo Điền'));
    await userEvent.keyboard('{ArrowLeft}');
    await expect(activeText(el)).toBe('TP. Thủ Đức');
    await expect(menus(el).length).toBe(3); // Thủ Đức vẫn đang mở → cột con còn hiện
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(activeText(el)).toBe('Phường Thảo Điền'));
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(el.value).toEqual(['hcm', 'hcm-td', 'hcm-td-ap']);
    await expect(el.shadowRoot.activeElement).toBe(trigger(el));

    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    el.blur();
  },
};

/** change-on-select: chọn được cả cấp tỉnh / quận */
export const ChangeOnSelect = {
  render: () => html`<div style="max-width: 420px;"><hui-cascader id="cas-cos" change-on-select .options=${OPTS()}></hui-cascader></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cas-cos');
    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(true));
    optionOf(el, 'Đà Nẵng').click();
    await waitFor(() => expect(el.value).toEqual(['dn']));
    await expect(isOpen(el)).toBe(true);
    optionOf(el, 'Quận Sơn Trà').click();
    await waitFor(() => expect(el.value).toEqual(['dn', 'dn-st']));
    await expect(display(el)).toBe('Đà Nẵng / Quận Sơn Trà');
    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(false));
  },
};

/** multiple: check cha – con, tag; show-checked parent gộp lên cấp cao nhất */
export const Multiple = {
  render: () => html`
    <div style="display: grid; gap: 16px; max-width: 460px;">
      <hui-cascader id="cas-multi" multiple label="Vùng giao hàng" max-tag-count="3" .options=${OPTS()}></hui-cascader>
      <hui-cascader id="cas-child" multiple show-checked="child" label="show-checked=child" .options=${OPTS()}></hui-cascader>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cas-multi');
    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(true));
    optionOf(el, 'Thừa Thiên Huế').querySelector('[part~="checkbox"]').click();
    await waitFor(() => expect(el.value).toEqual([['hue']]));
    await expect(tagTexts(el)).toEqual(['Thừa Thiên Huế']);
    // Mở cột con rồi bỏ 1 phường → tách thành các nhánh còn lại
    optionOf(el, 'Thừa Thiên Huế').click();
    await waitFor(() => expect(optionOf(el, 'TP. Huế')).toBeTruthy());
    optionOf(el, 'TP. Huế').click();
    await waitFor(() => expect(optionOf(el, 'Phường Phú Hội')).toBeTruthy());
    optionOf(el, 'Phường Phú Hội').click(); // lá: bấm = bỏ check
    await waitFor(() => expect(el.value).toEqual([['hue', 'hue-tp', 'hue-tp-vn'], ['hue', 'hue-ht']]));
    await expect(optionOf(el, 'Thừa Thiên Huế').getAttribute('aria-checked')).toBe('mixed');
    await expect(tagTexts(el)).toEqual(['Thừa Thiên Huế / TP. Huế / Phường Vĩnh Ninh', 'Thừa Thiên Huế / Thị xã Hương Thủy']);
    // Space trên mục đang focus = check (focus ở trigger như khi bấm chuột thật)
    trigger(el).focus();
    await userEvent.keyboard('{ArrowUp} ');
    await waitFor(() => expect(el.value).toEqual([['hue']]));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await userEvent.keyboard('{Backspace}');
    await expect(el.value).toEqual([]);
    el.blur();

    const child = canvasElement.querySelector('#cas-child');
    trigger(child).click();
    await waitFor(() => expect(isOpen(child)).toBe(true));
    optionOf(child, 'Cần Thơ').click();
    await waitFor(() => expect(optionOf(child, 'Quận Cái Răng')).toBeTruthy());
    optionOf(child, 'Quận Cái Răng').querySelector('[part~="checkbox"]').click();
    await waitFor(() => expect(child.value).toEqual([['ct', 'ct-cr', 'ct-cr-hp'], ['ct', 'ct-cr', 'ct-cr-lt']]));
    trigger(child).click();
    await waitFor(() => expect(isOpen(child)).toBe(false));
  },
};

/** show-search: tìm theo cả đường dẫn, không dấu, tô đậm phần khớp */
export const Search = {
  render: () => html`<div style="max-width: 420px;"><hui-cascader id="cas-search" show-search placeholder="Gõ để tìm (vd: ben nghe)" .options=${OPTS()}></hui-cascader></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cas-search');
    trigger(el).click();
    await waitFor(() => expect(el.shadowRoot.activeElement).toBe(el.shadowRoot.querySelector('[part="search"]')));
    await userEvent.keyboard('ben');
    const results = () => [...el.shadowRoot.querySelectorAll('[part="results"] [role="option"]')].map((o) => o.textContent);
    await waitFor(() => expect(results()).toEqual(['TP. Hồ Chí Minh / Quận 1 / Phường Bến Nghé', 'TP. Hồ Chí Minh / Quận 1 / Phường Bến Thành']));
    await expect(el.shadowRoot.querySelector('[part="results"] [part="highlight"]').textContent).toBe('Bến');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(el.value).toEqual(['hcm', 'hcm-q1', 'hcm-q1-bt']);

    // Khớp ở cấp trên → mọi lá bên dưới
    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(true));
    // user-event nhớ chữ đã gõ lần trước trong ô (shadow DOM) → lần này gán thẳng + phát input
    const search = el.shadowRoot.querySelector('[part="search"]');
    search.value = 'can tho';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await waitFor(() => expect(results().length).toBe(5));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    el.blur();
  },
};

/** Tải động: loadData(selectedOptions) — vòng xoay trên mục đang tải */
export const AsyncLoad = {
  render: () => html`<div style="max-width: 420px;"><hui-cascader id="cas-async" placeholder="Chọn (tải động)"></hui-cascader></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cas-async');
    let release;
    el.loadData = (selected) => new Promise((resolve) => {
      release = () => {
        const src = selected.reduce((list, o) => list.find((x) => x.value === o.value).children, VN_ADMIN);
        resolve(src.map((o) => ({ value: o.value, label: o.label, isLeaf: !o.children })));
      };
    });
    el.options = VN_ADMIN.map((p) => ({ value: p.value, label: p.label }));
    await el.updateComplete;
    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(true));
    optionOf(el, 'Cần Thơ').click();
    await waitFor(() => expect(optionOf(el, 'Cần Thơ').querySelector('[part="loading"]')).not.toBeNull());
    release();
    await waitFor(() => expect(optionOf(el, 'Quận Ninh Kiều')).toBeTruthy());
    optionOf(el, 'Quận Ninh Kiều').click();
    await waitFor(() => expect(optionOf(el, 'Quận Ninh Kiều').querySelector('[part="loading"]')).not.toBeNull());
    release();
    await waitFor(() => expect(optionOf(el, 'Phường Cái Khế')).toBeTruthy());
    optionOf(el, 'Phường Cái Khế').click();
    await waitFor(() => expect(el.value).toEqual(['ct', 'ct-nk', 'ct-nk-ck']));
    await expect(display(el)).toBe('Cần Thơ / Quận Ninh Kiều / Phường Cái Khế');
  },
};

/** expand-trigger="hover": rê chuột vào mục cha là mở cột con */
export const HoverExpand = {
  render: () => html`<div style="max-width: 420px;"><hui-cascader id="cas-hover" expand-trigger="hover" .options=${OPTS()}></hui-cascader></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cas-hover');
    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(true));
    optionOf(el, 'Đà Nẵng').dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
    await waitFor(() => expect(optionOf(el, 'Quận Hải Châu')).toBeTruthy());
    optionOf(el, 'Quận Hải Châu').dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
    await waitFor(() => expect(menus(el).length).toBe(3));
    trigger(el).click();
    await waitFor(() => expect(isOpen(el)).toBe(false));
  },
};

/** Màn hẹp: cột xếp chồng, nút quay lại (giả lập matchMedia) */
export const MobileStacked = {
  render: () => html`<div style="max-width: 360px;"><hui-cascader id="cas-mobile" .options=${OPTS()}></hui-cascader></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cas-mobile');
    const original = window.matchMedia;
    window.matchMedia = (q) => (q.includes('max-width: 575px') ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : original.call(window, q));
    try {
      trigger(el).click();
      await waitFor(() => expect(isOpen(el)).toBe(true));
      await expect(el.shadowRoot.querySelector('[part="dropdown"]').classList.contains('cas__dropdown--stacked')).toBe(true);
      optionOf(el, 'Hà Nội').click();
      await waitFor(() => expect(el.shadowRoot.querySelector('[part="menu-header"]')).not.toBeNull());
      await expect(menus(el).length).toBe(1);
      await expect(menus(el)[0].querySelector('[part="option-label"]').textContent).toBe('Quận Ba Đình');
      await expect(el.shadowRoot.querySelector('[part="menu-header"]').textContent).toBe('Hà Nội');
      el.shadowRoot.querySelector('[part="menu-header"] button').click();
      await waitFor(() => expect(menus(el)[0].querySelector('[part="option-label"]').textContent).toBe('Hà Nội'));
      trigger(el).click();
      await waitFor(() => expect(isOpen(el)).toBe(false));
    } finally {
      window.matchMedia = original;
    }
  },
};

/** Form: value-separator="/" gửi chuỗi "hn/hn-bd", reset về giá trị ban đầu */
export const InForm = {
  render: () => html`
    <form id="cas-form" style="display: grid; gap: 12px; max-width: 420px;" @submit=${(e) => e.preventDefault()}>
      <hui-cascader name="address" required value-separator="/" value="dn/dn-hc/dn-hc-tt" label="Địa chỉ" .options=${OPTS()}></hui-cascader>
      <hui-cascader name="areas" multiple label="Khu vực" .options=${OPTS()} .value=${[['hn'], ['ct', 'ct-nk']]}></hui-cascader>
      <div><button type="reset">Đặt lại</button></div>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#cas-form');
    const [addr, areas] = form.querySelectorAll('hui-cascader');
    await expect(display(addr)).toBe('Đà Nẵng / Quận Hải Châu / Phường Thạch Thang');
    let fd = new FormData(form);
    await expect(fd.get('address')).toBe('dn/dn-hc/dn-hc-tt');
    await expect(fd.getAll('areas')).toEqual(['["hn"]', '["ct","ct-nk"]']);
    addr.value = ['hn', 'hn-cg'];
    fd = new FormData(form);
    await expect(fd.get('address')).toBe('hn/hn-cg');
    addr.value = null;
    await expect(addr.checkValidity()).toBe(false);
    form.reset();
    await expect(addr.value).toEqual(['dn', 'dn-hc', 'dn-hc-tt']);
  },
};

/** Override từ ngoài: biến --hui-cascader-* + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .custom-cas {
        --hui-cascader-radius: 12px;
        --hui-cascader-menu-width: 180px;
        --hui-cascader-option-active-bg: var(--hui-success-light);
        --hui-cascader-option-active-color: var(--hui-success);
        --hui-cascader-focus-border-color: var(--hui-success);
      }
      .custom-cas::part(menu) { padding: 6px; }
      .custom-cas::part(value) { font-weight: 500; }
    </style>
    <div style="max-width: 420px;">
      <hui-cascader id="cas-custom" class="custom-cas" .options=${OPTS()} .value=${['hue', 'hue-tp', 'hue-tp-ph']}></hui-cascader>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cas-custom');
    await expect(getComputedStyle(trigger(el)).borderTopLeftRadius).toBe('12px');
    await expect(getComputedStyle(el.shadowRoot.querySelector('[part="value"]')).fontWeight).toBe('500');
  },
};

export const Sizes = {
  render: () => html`
    <div style="display: grid; gap: 12px; max-width: 360px;">
      <hui-cascader size="sm" placeholder="Nhỏ" .options=${OPTS()}></hui-cascader>
      <hui-cascader placeholder="Vừa" .options=${OPTS()}></hui-cascader>
      <hui-cascader size="lg" placeholder="Lớn" .options=${OPTS()}></hui-cascader>
      <hui-cascader disabled .options=${OPTS()} .value=${['hn', 'hn-bd']}></hui-cascader>
      <hui-cascader status="error" placeholder="Lỗi" .options=${OPTS()}></hui-cascader>
    </div>
  `,
};
