/**
 * Trang tài liệu "Override" — nội dung trong override.md; story = ví dụ sống cho từng cách tùy biến từ bên ngoài.
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import doc from './override.md?raw';
import { ensureTokens } from '../utils/dom.js';
import '../components/hui-button/index.js';
import '../components/hui-card/index.js';
import '../components/hui-input/index.js';
import '../components/hui-tag/index.js';
import '../components/hui-demo/index.js';

// Token phải có trên trang kể cả khi story chưa gắn component nào (vd palette chỉ dùng var(--hui-*))
ensureTokens();

export default {
  title: 'Docs/Override',
  id: 'docs-override',
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: doc } },
  },
};

/** Biến component đặt trên **thẻ cha** → mọi nút trong vùng đổi theo; nút ngoài vùng giữ mặc định. */
export const CssVariables = {
  name: '1. Biến CSS theo vùng',
  render: () => html`
    <style>
      .ov-zone { --hui-button-radius: 999px; --hui-button-height: 44px; --hui-button-padding-x: 24px;
        padding: 16px; border: 1px dashed var(--hui-border); border-radius: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
      hui-button.ov-cta { --hui-button-bg: linear-gradient(90deg, #6366f1, #db2777); --hui-button-hover-bg: linear-gradient(90deg, #4f46e5, #be185d); --hui-button-color: #fff; --hui-button-border-color: transparent; }
    </style>
    <div style="display:grid; gap:12px; font-family: var(--hui-font-family); color: var(--hui-text)">
      <div class="ov-zone">
        <hui-button id="ov-in" variant="primary">Trong vùng .ov-zone</hui-button>
        <hui-button variant="outline">Outline</hui-button>
        <hui-button class="ov-cta">Gradient (biến trên chính thẻ)</hui-button>
      </div>
      <div><hui-button id="ov-out" variant="primary">Ngoài vùng — mặc định</hui-button></div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const inner = (id) => canvasElement.querySelector(id).shadowRoot.querySelector('[part~="base"]');
    await waitFor(() => expect(inner('#ov-in')).not.toBe(null));
    await expect(getComputedStyle(inner('#ov-in')).height).toBe('44px');
    await expect(getComputedStyle(inner('#ov-out')).height).not.toBe('44px');
  },
};

/** `::part()` cho thuộc tính không có biến, kèm `:hover`; slot để thay nội dung (extra, actions). */
export const PartsAndSlots = {
  name: '2. ::part() và slot',
  render: () => html`
    <style>
      hui-card.ov-card::part(title) { font-style: italic; letter-spacing: 0.02em; color: var(--hui-primary); }
      hui-card.ov-card::part(actions) { background: var(--hui-fill-tertiary); }
      hui-card.ov-card hui-button::part(base):hover { transform: translateY(-1px); }
    </style>
    <hui-card class="ov-card" title="Đơn hàng #1024" style="max-width: 420px">
      <hui-tag slot="extra" color="success">Đã giao</hui-tag>
      Nội dung truyền vào slot mặc định — vẫn là light DOM nên CSS của trang áp dụng trực tiếp.
      <hui-button slot="actions" size="sm" variant="text" icon="eye">Chi tiết</hui-button>
      <hui-button slot="actions" size="sm" variant="text" icon="download">Hóa đơn</hui-button>
    </hui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('hui-card');
    await waitFor(() => expect(card.shadowRoot.querySelector('[part~="title"]')).not.toBe(null));
    await expect(getComputedStyle(card.shadowRoot.querySelector('[part~="title"]')).fontStyle).toBe('italic');
    const extra = card.querySelector('[slot="extra"]');
    await expect(extra.assignedSlot).not.toBe(null);
  },
};

/** `:state(user-invalid)` — chỉ báo lỗi **sau khi** người dùng đã chạm vào ô (gõ rồi xóa, rời ô). */
export const CustomStates = {
  name: '3. :state() của form control',
  render: () => html`
    <style>
      .ov-field { display: grid; gap: 6px; max-width: 360px; font-family: var(--hui-font-family); color: var(--hui-text); }
      .ov-field hui-input:state(user-invalid)::part(container) { box-shadow: 0 0 0 3px var(--hui-danger-light); }
      .ov-field hui-input:state(filled)::part(container) { border-style: solid; }
      .ov-field .hint { font-size: 12px; color: var(--hui-text-tertiary); }
      .ov-field:has(hui-input:state(user-invalid)) .hint { color: var(--hui-danger); }
    </style>
    <div class="ov-field">
      <hui-input id="ov-email" label="Email" type="email" required placeholder="ban@vidu.com"></hui-input>
      <span class="hint">Gõ vài ký tự rồi xóa hết → viền đỏ nhạt + dòng này đổi màu (CSS :has + :state).</span>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ov-email');
    await waitFor(() => expect(el.shadowRoot.querySelector('input')).not.toBe(null));
    await expect(el.matches(':state(user-invalid)')).toBe(false); // chưa chạm → không báo lỗi
    const input = el.shadowRoot.querySelector('input');
    await userEvent.type(input, 'ab');
    await waitFor(() => expect(el.matches(':state(filled)')).toBe(true));
    await userEvent.type(input, '{Backspace}{Backspace}');
    input.blur();
    await waitFor(() => expect(el.matches(':state(user-invalid)')).toBe(true));
  },
};

/** Component mẫu `hui-demo` (tài liệu sống) — đủ 5 cách: biến CSS, `::part`, `exportparts`, slot, `:state(has-count)`. */
export const HuiDemoAllTechniques = {
  name: '4. Tổng hợp với hui-demo',
  render: () => html`
    <style>
      .ov-brand { --hui-demo-accent: #db2777; --hui-demo-radius: 20px; }
      hui-demo.ov-demo::part(title) { font-style: italic; }
      hui-demo.ov-demo::part(button-base) { border-style: dashed; }
      hui-demo.ov-demo:state(has-count)::part(container) { box-shadow: 0 0 0 4px color-mix(in srgb, #db2777 30%, transparent); }
    </style>
    <div class="ov-brand">
      <hui-demo class="ov-demo" heading="Bấm “Tăng count” để bật :state(has-count)">
        <hui-button slot="actions" size="sm" variant="text" icon="settings">Cài đặt</hui-button>
        <p class="tieu-de">Đoạn này vào slot mặc định, style bằng ::slotted(.tieu-de)</p>
      </hui-demo>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const demo = canvasElement.querySelector('hui-demo');
    await waitFor(() => expect(demo.shadowRoot.querySelector('hui-button')).not.toBe(null));
    await expect(demo.matches(':state(has-count)')).toBe(false);
    const inner = demo.shadowRoot.querySelector('hui-button');
    await waitFor(() => expect(inner.shadowRoot?.querySelector('button')).toBeTruthy());
    await userEvent.click(inner.shadowRoot.querySelector('button'));
    await waitFor(() => expect(demo.matches(':state(has-count)')).toBe(true));
    await expect(demo.getAttribute('count')).toBe('1');
  },
};
