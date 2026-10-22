/**
 * Storybook Stories — HUI Reaction (nút cảm xúc)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const mainOf = (el) => el.shadowRoot.querySelector('[part="button"]');
const pickerOf = (el) => el.shadowRoot.querySelector('[part="picker"]');
const optionsOf = (el) => [...el.shadowRoot.querySelectorAll('[role="menuitemradio"]')];

export default {
  title: 'Molecules/HuiReaction',
  component: 'hui-reaction',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Reaction** — Nút bày tỏ cảm xúc kiểu mạng xã hội. **Bấm** = Thích / bỏ thích. **Rê chuột** (giữ ~0,5 giây),
**giữ** trên màn hình cảm ứng, hoặc phím **↑ / ↓** mở bảng chọn 👍 ❤️ 😂 😮 😢 😡 (biểu tượng bung lần lượt, phóng to khi rê).
Đếm theo từng cảm xúc + tổng hợp 3 cảm xúc nhiều nhất; số đếm đổi ngay khi bấm (lạc quan, \`preventDefault()\` để hoàn tác).

\`\`\`html
<hui-reaction counts='{"like": 128, "love": 32, "haha": 5}'></hui-reaction>
<hui-reaction reactions='["🔥","🎉","👏"]' value="🎉"></hui-reaction>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`reactions\` | array (JSON) | 6 cảm xúc | \`[{ key, emoji, label, color }]\` hoặc mảng emoji |
| \`value\` | string | \`''\` | key cảm xúc đang chọn |
| \`counts\` | object (JSON) | — | \`{ "like": 12, "love": 3 }\` — tự cộng/trừ khi bấm |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`icon-only\` | boolean | \`false\` | Ẩn chữ "Thích" |
| \`no-summary\` | boolean | \`false\` | Ẩn tổng hợp số lượt |
| \`no-picker\` | boolean | \`false\` | Không mở bảng chọn (chỉ bật/tắt cảm xúc đầu) |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng nảy / bung |

### Properties / Methods
\`reactionList\` (chỉ đọc, đã chuẩn hóa) · \`selectedReaction\` · \`pickerOpen\` · \`openPicker({ focus })\` · \`closePicker()\` · \`react(key)\`.

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-react\` | \`{ reaction, previous, counts }\` | Đổi cảm xúc (reaction null = bỏ). Cancelable → hoàn tác |
| \`hui-picker-toggle\` | \`{ open }\` | Bảng chọn mở / đóng |

### Parts
\`base\`, \`button\`, \`emoji\`, \`label\`, \`picker\`, \`option\` (+ \`option-selected\`), \`summary\`, \`summary-emoji\`, \`total\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-reaction-color\` | Màu chữ khi đã chọn (mặc định theo cảm xúc) |
| \`--hui-reaction-button-bg\` / \`--hui-reaction-button-hover-bg\` / \`--hui-reaction-radius\` | Nút chính |
| \`--hui-reaction-picker-bg\` / \`--hui-reaction-picker-shadow\` | Bảng chọn |
| \`--hui-reaction-option-size\` | Cỡ biểu tượng trong bảng (32px) |
| \`--hui-reaction-summary-color\` | Màu tổng số |

### Bàn phím (APG Menu Button)
| Phím | Hành động |
|------|-----------|
| Enter / Space (nút) | Thích / bỏ cảm xúc |
| ↑ / ↓ (nút) | Mở bảng chọn, focus cảm xúc đang chọn |
| ← / → / ↑ / ↓ · Home / End | Di chuyển giữa các cảm xúc (roving tabindex) |
| Enter / Space (bảng) | Chọn cảm xúc (chọn lại = bỏ), focus về nút |
| Esc / Tab | Đóng bảng chọn, focus về nút |

Nút có \`aria-pressed\`, \`aria-haspopup="menu"\`, \`aria-expanded\` và gợi ý phím (\`aria-describedby\`);
bảng chọn \`role="menu"\` với \`menuitemradio\` + \`aria-checked\`; kết quả đọc qua \`aria-live\`.
        `,
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    iconOnly: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="padding-top: 64px;">
      <hui-reaction id="rx-default" size=${args.size} ?icon-only=${args.iconOnly} ?disabled=${args.disabled}
        .counts=${{ like: 128, love: 32, haha: 5 }}></hui-reaction>
    </div>
  `,
  args: { size: 'md', iconOnly: false, disabled: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rx-default');
    const events = [];
    el.addEventListener('hui-react', (e) => events.push({ reaction: e.detail.reaction, previous: e.detail.previous }));
    await el.updateComplete;
    const main = mainOf(el);
    await expect(main.getAttribute('aria-pressed')).toBe('false');
    await expect(el.shadowRoot.querySelector('[part="label"]').textContent).toBe('Thích');
    await expect(el.shadowRoot.querySelector('[part="total"]').textContent).toBe('165');
    await expect(el.shadowRoot.querySelector('[part="summary"]').getAttribute('aria-label')).toBe('165 lượt bày tỏ cảm xúc: Thích 128, Yêu thích 32, Haha 5');

    main.click();
    await el.updateComplete;
    await expect(el.value).toBe('like');
    await expect(el.counts.like).toBe(129);
    await expect(main.getAttribute('aria-pressed')).toBe('true');
    main.click();
    await el.updateComplete;
    await expect(el.value).toBe('');
    await expect(el.counts.like).toBe(128);
    await expect(events).toEqual([{ reaction: 'like', previous: null }, { reaction: null, previous: 'like' }]);
  },
};

/** Bàn phím: ↑ mở bảng, ←/→ di chuyển, Enter chọn, Esc đóng */
export const KeyboardPicker = {
  render: () => html`<div style="padding-top: 72px;"><hui-reaction id="rx-kb" .counts=${{ like: 3 }}></hui-reaction></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rx-kb');
    await el.updateComplete;
    const main = mainOf(el);
    main.focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(el.pickerOpen).toBe(true);
    await expect(main.getAttribute('aria-expanded')).toBe('true');
    const opts = optionsOf(el);
    await expect(opts.length).toBe(6);
    await expect(pickerOf(el).getAttribute('role')).toBe('menu');
    await expect(el.shadowRoot.activeElement).toBe(opts[0]);
    await userEvent.keyboard('{ArrowRight}');
    await expect(el.shadowRoot.activeElement).toBe(opts[1]);
    await userEvent.keyboard('{End}');
    await expect(el.shadowRoot.activeElement).toBe(opts[5]);
    await userEvent.keyboard('{Home}{ArrowLeft}');
    await expect(el.shadowRoot.activeElement).toBe(opts[5]); // vòng lại cuối
    await userEvent.keyboard('{Home}{ArrowRight}{Enter}');
    await expect(el.value).toBe('love');
    await expect(el.pickerOpen).toBe(false);
    await expect(el.shadowRoot.activeElement).toBe(main);
    await expect(el.counts).toEqual({ like: 3, love: 1 });
    await expect(el.shadowRoot.querySelector('[part="label"]').textContent).toBe('Yêu thích');
    // Mở lại → focus vào cảm xúc đang chọn, Esc đóng
    await userEvent.keyboard('{ArrowDown}');
    await expect(el.shadowRoot.activeElement.getAttribute('aria-checked')).toBe('true');
    await expect(el.shadowRoot.activeElement.dataset.key).toBe('love');
    await userEvent.keyboard('{Escape}');
    await expect(el.pickerOpen).toBe(false);
    await expect(el.shadowRoot.activeElement).toBe(main);
    main.blur();
  },
};

/** Rê chuột ~0,5 giây mở bảng chọn; bấm ra ngoài để đóng */
export const HoverPicker = {
  render: () => html`<div style="padding-top: 72px;"><hui-reaction id="rx-hover" value="haha" .counts=${{ like: 10, haha: 4 }}></hui-reaction></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rx-hover');
    await el.updateComplete;
    await userEvent.hover(mainOf(el));
    await waitFor(() => expect(el.pickerOpen).toBe(true), { timeout: 2000 });
    const picked = optionsOf(el).find((o) => o.dataset.key === 'haha');
    await expect(picked.getAttribute('part')).toBe('option option-selected');
    await userEvent.click(optionsOf(el).find((o) => o.dataset.key === 'wow'));
    await expect(el.value).toBe('wow');
    await expect(el.counts).toEqual({ like: 10, haha: 3, wow: 1 });
    await expect(el.pickerOpen).toBe(false);
    // Mở lại rồi bấm ra ngoài
    el.openPicker();
    await expect(el.pickerOpen).toBe(true);
    await userEvent.click(canvasElement.ownerDocument.body);
    await waitFor(() => expect(el.pickerOpen).toBe(false));
  },
};

/** Bộ cảm xúc tùy chỉnh (mảng emoji hoặc object) */
export const CustomReactions = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; padding-top: 64px;">
      <hui-reaction id="rx-custom" reactions='["🔥","🎉","👏","🚀"]' value="🎉" .counts=${{ '🔥': 12, '🎉': 7 }}></hui-reaction>
      <hui-reaction .reactions=${[
        { key: 'up', emoji: '⬆️', label: 'Ủng hộ', color: 'var(--hui-success)' },
        { key: 'down', emoji: '⬇️', label: 'Phản đối', color: 'var(--hui-danger)' },
      ]} .counts=${{ up: 42, down: 3 }}></hui-reaction>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rx-custom');
    await el.updateComplete;
    await expect(el.reactionList.map((r) => r.key)).toEqual(['🔥', '🎉', '👏', '🚀']);
    await expect(el.shadowRoot.querySelector('[part="emoji"]').textContent).toBe('🎉');
    await expect(mainOf(el).getAttribute('aria-pressed')).toBe('true');
  },
};

/** Kích thước + chỉ icon + vô hiệu hóa */
export const SizesAndStates = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; padding-top: 64px;">
      ${['sm', 'md', 'lg'].map((s) => html`<div><hui-reaction size=${s} .counts=${{ like: 3, love: 1 }}></hui-reaction></div>`)}
      <div><hui-reaction id="rx-icon" icon-only value="love" .counts=${{ love: 9 }}></hui-reaction></div>
      <div><hui-reaction id="rx-disabled" disabled .counts=${{ like: 2 }}></hui-reaction></div>
      <div><hui-reaction no-picker no-summary .counts=${{ like: 2 }}></hui-reaction> (no-picker, no-summary)</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const icon = canvasElement.querySelector('#rx-icon');
    await icon.updateComplete;
    await expect(mainOf(icon).getAttribute('aria-label')).toBe('Yêu thích');
    const disabled = canvasElement.querySelector('#rx-disabled');
    await disabled.updateComplete;
    await expect(mainOf(disabled).disabled).toBe(true);
  },
};

/** preventDefault() trong hui-react → hoàn tác (vd API lỗi) */
export const Cancelable = {
  render: () => html`<div style="padding-top: 64px;"><hui-reaction id="rx-cancel" .counts=${{ like: 5 }}></hui-reaction></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rx-cancel');
    el.addEventListener('hui-react', (e) => e.preventDefault());
    await el.updateComplete;
    mainOf(el).click();
    await el.updateComplete;
    await expect(el.value).toBe('');
    await expect(el.counts).toEqual({ like: 5 });
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .rx-brand {
        --hui-reaction-button-bg: var(--hui-fill-tertiary);
        --hui-reaction-button-hover-bg: var(--hui-fill-secondary);
        --hui-reaction-radius: 999px;
        --hui-reaction-option-size: 40px;
        --hui-reaction-picker-bg: var(--hui-bg-container);
        --hui-reaction-summary-color: var(--hui-primary);
      }
      .rx-brand::part(picker) { border: 1px solid var(--hui-border-secondary); }
      .rx-brand::part(total) { font-weight: 700; }
    </style>
    <div style="padding-top: 80px;"><hui-reaction id="rx-brand" class="rx-brand" value="like" .counts=${{ like: 2400, love: 860, wow: 12 }}></hui-reaction></div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rx-brand');
    await el.updateComplete;
    await expect(getComputedStyle(mainOf(el)).borderTopLeftRadius).toBe('999px');
    // Intl dùng khoảng trắng không ngắt (U+00A0) → chuẩn hóa trước khi so sánh
    await expect(el.shadowRoot.querySelector('[part="total"]').textContent.replace(/\s/g, ' ')).toBe('3,3 N');
  },
};
