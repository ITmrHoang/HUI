/**
 * Storybook Stories — HUI Confirm Action
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

const btnHost = (el) => el.shadowRoot.querySelector('[part="button"]');
const inner = (el) => btnHost(el).shadowRoot.querySelector('button');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const press = (el, type) => btnHost(el).dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, button: 0, pointerId: 31, pointerType: 'mouse' }));

export default {
  title: 'Molecules/HuiConfirmAction',
  component: 'hui-confirm-action',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Confirm Action** — Nút hành động nguy hiểm cần xác nhận, dựng trên \`<hui-button>\` (variant / size / icon giống hệt):
- \`mode="hold"\` (mặc định): **nhấn giữ** \`duration\` ms — chuột, cảm ứng, hoặc giữ **Space / Enter**; thanh tiến độ lấp đầy nút, thả sớm thì chạy lùi.
- \`mode="type"\`: bấm nút → ô nhập nhỏ hiện **ngay tại chỗ**, gõ đúng \`confirm-text\` mới bật nút Xác nhận (Enter cũng được).

\`\`\`html
<hui-confirm-action icon="delete" @hui-confirm=\${remove}>Xóa dự án</hui-confirm-action>
<hui-confirm-action mode="type" confirm-text="shop-hui">Xóa kho mã nguồn</hui-confirm-action>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`mode\` | string | \`hold\` | \`hold\` \\| \`type\` |
| \`duration\` | number | \`1000\` | Thời gian giữ (ms) |
| \`confirm-text\` | string | "XÓA" / "DELETE" | Chữ phải gõ (mode="type") |
| \`ignore-case\` | boolean | \`false\` | Không phân biệt hoa thường |
| \`variant\` | string | \`danger\` | Như hui-button |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`shape\` | string | \`default\` | \`default\` \\| \`round\` |
| \`icon\` | string | — | Icon trước chữ |
| \`block\` | boolean | \`false\` | Chiếm hết chiều ngang |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa |
| \`confirm-label\` / \`cancel-label\` | string | "Xác nhận" / "Hủy" | Chữ 2 nút trong panel |
| \`no-animation\` | boolean | \`false\` | Tắt animation (vẫn hiện trạng thái giữ) |

### Methods
\`openPanel()\`, \`closePanel(restoreFocus)\` (mode="type"), \`panelOpen\` (chỉ đọc).

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-confirm\` | \`{ mode }\` | Đã xác nhận |
| \`hui-cancel\` | \`{ mode, progress? }\` | Thả tay sớm (progress 0–1) / đóng panel |

### Parts / States
Parts: \`button\`, \`button-base\`, \`button-label\`, \`button-icon\`, \`progress\`, \`panel\`, \`prompt\`, \`confirm-text\`, \`input\`, \`confirm-button\`, \`cancel-button\`.
States: \`:state(holding)\`, \`:state(confirmed)\`, \`:state(open)\`.

### CSS Variables
\`--hui-confirm-action-progress-bg\`, \`--hui-confirm-action-input-width\`, \`--hui-confirm-action-gap\` + mọi biến \`--hui-button-*\`.

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Focus nút |
| Giữ \`Space\` / \`Enter\` | (hold) giữ đủ thời gian để xác nhận, thả sớm = hủy |
| \`Enter\` / \`Space\` | (type) mở ô nhập |
| \`Enter\` trong ô nhập | Xác nhận khi đã gõ đúng |
| \`Esc\` | Đóng ô nhập, focus về nút |

Tên đọc của nút kèm hướng dẫn "nhấn giữ 1 giây để xác nhận"; xác nhận xong live region đọc "Đã xác nhận".
        `,
      },
    },
  },
  argTypes: {
    mode: { control: 'inline-radio', options: ['hold', 'type'] },
    variant: { control: 'select', options: ['primary', 'secondary', 'outline', 'dashed', 'ghost', 'text', 'link', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    duration: { control: 'number' },
    disabled: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-confirm-action mode=${args.mode} variant=${args.variant} size=${args.size} duration=${args.duration}
      icon="delete" ?disabled=${args.disabled}>Xóa dự án</hui-confirm-action>
  `,
  args: { mode: 'hold', variant: 'danger', size: 'md', duration: 400, disabled: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-confirm-action');
    // Hướng dẫn ẩn nằm trong tên đọc của nút
    await expect(el.shadowRoot.querySelector('.label').textContent).toContain('nhấn giữ 0.4 giây');

    // Thả sớm → hui-cancel, không xác nhận
    let cancel = null;
    let confirmed = 0;
    el.addEventListener('hui-cancel', (e) => { cancel = e.detail; }, { once: true });
    el.addEventListener('hui-confirm', () => { confirmed += 1; });
    press(el, 'pointerdown');
    await sleep(120);
    press(el, 'pointerup');
    await expect(cancel.mode).toBe('hold');
    await expect(cancel.progress).toBeLessThan(1);
    await expect(confirmed).toBe(0);

    // Giữ đủ → hui-confirm
    press(el, 'pointerdown');
    await waitFor(() => expect(confirmed).toBe(1), { timeout: 2000 });
    press(el, 'pointerup');

    // Bàn phím: giữ Space
    inner(el).focus();
    await userEvent.keyboard('[Space>]');
    await waitFor(() => expect(confirmed).toBe(2), { timeout: 2000 });
    await userEvent.keyboard('[/Space]');
  },
};

/** Gõ chữ xác nhận: nút Xác nhận chỉ bật khi gõ đúng */
export const TypeToConfirm = {
  render: () => html`
    <hui-confirm-action mode="type" confirm-text="shop-hui" icon="delete">Xóa kho mã nguồn</hui-confirm-action>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-confirm-action');
    let confirmed = null;
    el.addEventListener('hui-confirm', (e) => { confirmed = e.detail; }, { once: true });
    await userEvent.click(inner(el));
    await expect(el.panelOpen).toBe(true);
    const input = el.shadowRoot.querySelector('[part="input"]');
    await expect(el.shadowRoot.activeElement).toBe(input);
    await expect(el.shadowRoot.querySelector('[part="confirm-text"]').textContent).toBe('shop-hui');
    const ok = el.shadowRoot.querySelector('[part="confirm-button"]');
    await userEvent.type(input, 'shop');
    await expect(ok.hasAttribute('disabled')).toBe(true);
    await userEvent.keyboard('{Enter}');
    await expect(confirmed).toBe(null);
    await userEvent.type(input, '-hui{Enter}');
    await expect(confirmed).toEqual({ mode: 'type' });
    await expect(el.panelOpen).toBe(false);

    // Esc đóng panel, focus về nút
    await userEvent.click(inner(el));
    await userEvent.keyboard('{Escape}');
    await expect(el.panelOpen).toBe(false);
    await expect(btnHost(el).shadowRoot.activeElement).toBe(inner(el));
  },
};

/** Variant / size / chế độ khác nhau */
export const Variants = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <hui-confirm-action size="sm">Xóa (sm)</hui-confirm-action>
      <hui-confirm-action>Xóa</hui-confirm-action>
      <hui-confirm-action size="lg" duration="1500">Giữ 1,5 giây</hui-confirm-action>
      <hui-confirm-action variant="outline">Outline</hui-confirm-action>
      <hui-confirm-action variant="dashed" icon="delete">Dashed</hui-confirm-action>
      <hui-confirm-action variant="primary" shape="round">Xuất bản</hui-confirm-action>
      <hui-confirm-action mode="type" size="sm" ignore-case confirm-text="xoa">Gõ "xoa"</hui-confirm-action>
      <hui-confirm-action disabled>Disabled</hui-confirm-action>
    </div>
    <div style="max-width: 320px; margin-top: 16px;"><hui-confirm-action block icon="delete">Xóa tài khoản (block)</hui-confirm-action></div>
  `,
  play: async ({ canvasElement }) => {
    const all = canvasElement.querySelectorAll('hui-confirm-action');
    const disabled = all[7];
    await expect(inner(disabled).disabled).toBe(true);
    let fired = false;
    disabled.addEventListener('hui-confirm', () => { fired = true; });
    press(disabled, 'pointerdown');
    await sleep(50);
    await expect(disabled.matches(':state(holding)')).toBe(false);
    await expect(fired).toBe(false);
    await expect(btnHost(all[3]).getAttribute('variant')).toBe('outline');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .custom-confirm {
        --hui-confirm-action-progress-bg: rgba(255, 255, 255, 0.45);
        --hui-button-radius: 999px;
        --hui-confirm-action-input-width: 14em;
      }
      .custom-confirm::part(prompt) { font-weight: 600; }
      .custom-confirm::part(button-base) { letter-spacing: 0.03em; }
    </style>
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <hui-confirm-action class="custom-confirm" icon="delete">Giữ để xóa</hui-confirm-action>
      <hui-confirm-action class="custom-confirm" mode="type">Gõ XÓA</hui-confirm-action>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [hold, type] = canvasElement.querySelectorAll('hui-confirm-action');
    await expect(getComputedStyle(inner(hold)).letterSpacing).not.toBe('normal');
    await expect(getComputedStyle(hold.shadowRoot.querySelector('[part="progress"]')).backgroundColor).toBe('rgba(255, 255, 255, 0.45)');
    type.openPanel();
    await expect(getComputedStyle(type.shadowRoot.querySelector('[part="prompt"]')).fontWeight).toBe('600');
    type.closePanel(false);
  },
};
