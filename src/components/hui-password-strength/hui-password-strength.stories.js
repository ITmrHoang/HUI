/**
 * Storybook Stories — HUI Password Strength (độ mạnh mật khẩu)
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-input/index.js';

const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const activeSegments = (el) => el.shadowRoot.querySelectorAll('[part~="segment-active"]').length;
const ruleStates = (el) => [...el.shadowRoot.querySelectorAll('[part~="rule"]')].map((li) => li.getAttribute('part').includes('rule-passed'));

export default {
  title: 'Molecules/HuiPasswordStrength',
  component: 'hui-password-strength',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Password Strength** — Thanh đo độ mạnh mật khẩu 4 nấc (Yếu · Trung bình · Khá · Mạnh, màu
danger / warning / info / success) + danh sách điều kiện ✓/✗. Gắn vào ô mật khẩu theo 3 cách:

\`\`\`html
<!-- 1. for = id của <input> / <hui-input> trong cùng root -->
<hui-input id="pw" type="password" label="Mật khẩu"></hui-input>
<hui-password-strength for="pw"></hui-password-strength>

<!-- 2. Bọc ô nhập trong slot -->
<hui-password-strength><hui-input type="password"></hui-input></hui-password-strength>

<!-- 3. Gán value trực tiếp -->
<hui-password-strength value="Abc12345!"></hui-password-strength>
\`\`\`

**Cách chấm:** \`score = round(số luật đạt / tổng luật × 4)\` (tối thiểu 1 khi đã nhập); luật \`length\` chưa đạt
→ luôn là **Yếu**. Không phải control form — dùng kèm \`hui-form-item\` của ô mật khẩu để validate.

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`for\` | string | — | id ô nhập cần theo dõi (cùng document / shadow root) |
| \`value\` | string | \`''\` | Mật khẩu cần chấm (tự cập nhật khi gắn ô nhập) |
| \`min-length\` | number | \`8\` | Độ dài tối thiểu của luật mặc định \`length\` |
| \`rules\` | JSON array | 5 luật | \`[{ id, label, pattern }]\` (property nhận cả \`test\` là hàm / RegExp) |
| \`hide-checklist\` | boolean | \`false\` | Chỉ hiện thanh đo |
| \`label\` | string | "Độ mạnh mật khẩu" | Nhãn thanh đo |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Properties
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`htmlFor\` | \`string\` | = attribute \`for\` |
| \`rules\` | \`Array<{ id, label, test: (v) => boolean \\| RegExp \\| string }>\` | Thay toàn bộ luật mặc định |
| \`strength\` | \`{ score, level, passed, results }\` (chỉ đọc) | Kết quả chấm hiện tại |

Luật mặc định (id): \`length\`, \`lower\`, \`upper\`, \`number\`, \`symbol\`. Hàm \`scorePassword(value, rules)\` được export.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-strength\` | \`{ score, level, passed }\` | Điểm (0–4) / mức (\`''\` \\| \`weak\` \\| \`fair\` \\| \`good\` \\| \`strong\`) / id luật đạt thay đổi |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Ô mật khẩu (\`<input>\` / \`<hui-input>\`) — tự theo dõi khi không có \`for\` |

### Parts
\`base\`, \`header\`, \`label\`, \`level\`, \`meter\`, \`segment\` (+ \`segment-active\`), \`checklist\`,
\`rule\` (+ \`rule-passed\` \\| \`rule-failed\`), \`rule-icon\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-password-strength-height\` / \`-gap\` / \`-radius\` | Kích thước nấc |
| \`--hui-password-strength-track-color\` | Nấc chưa sáng |
| \`--hui-password-strength-weak-color\` / \`-fair-color\` / \`-good-color\` / \`-strong-color\` | Màu theo mức |
| \`--hui-password-strength-pass-color\` / \`-fail-color\` | Điều kiện đạt / chưa đạt |
| \`--hui-password-strength-font-size\` | Cỡ chữ |

### Bàn phím / A11y
Không nhận focus. Thanh đo \`role="meter"\` (\`aria-valuenow\` 0–4, \`aria-valuetext\` "Mạnh"); chữ mức độ và danh sách
điều kiện là vùng \`aria-live="polite"\` — chỉ mục vừa đổi trạng thái được đọc lại ("…, đã đạt").
        `,
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    minLength: { control: 'number' },
    hideChecklist: { control: 'boolean' },
    noAnimation: { control: 'boolean' },
  },
};

export const Default = {
  render: () => html`
    <div style="max-width: 380px; display: flex; flex-direction: column; gap: 8px;">
      <hui-input id="pw-default" type="password" label="Mật khẩu" placeholder="Nhập mật khẩu"></hui-input>
      <hui-password-strength id="ps-default" for="pw-default"></hui-password-strength>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('#pw-default');
    const el = canvasElement.querySelector('#ps-default');
    const events = [];
    el.addEventListener('hui-strength', (e) => events.push(e.detail));
    const meter = part(el, 'meter');
    await expect(meter.getAttribute('role')).toBe('meter');
    await expect(meter.getAttribute('aria-valuenow')).toBe('0');

    const inner = input.shadowRoot.querySelector('input');
    await userEvent.type(inner, 'abc');
    await waitFor(() => expect(el.strength.score).toBe(1));
    await expect(el.strength.level).toBe('weak');
    await expect(ruleStates(el)).toEqual([false, true, false, false, false]);

    await userEvent.type(inner, 'DEF12');
    await waitFor(() => expect(el.strength.score).toBe(3)); // 8 ký tự + thường + hoa + số = 4/5
    await expect(el.strength.level).toBe('good');
    await expect(activeSegments(el)).toBe(3);

    await userEvent.type(inner, '!');
    await waitFor(() => expect(el.strength.score).toBe(4));
    await expect(part(el, 'level').textContent).toBe('Mạnh');
    await expect(meter.getAttribute('aria-valuetext')).toBe('Mạnh');
    await expect(ruleStates(el).every(Boolean)).toBe(true);
    await expect(events.at(-1)).toEqual({ score: 4, level: 'strong', passed: ['length', 'lower', 'upper', 'number', 'symbol'] });
    inner.blur();
  },
};

/** Các mức độ (gán value trực tiếp) */
export const Levels = {
  render: () => html`
    <div style="max-width: 380px; display: flex; flex-direction: column; gap: 20px;">
      <hui-password-strength id="ps-empty" hide-checklist></hui-password-strength>
      <hui-password-strength id="ps-weak" value="Ab1!" hide-checklist></hui-password-strength>
      <hui-password-strength id="ps-fair" value="abcdefgh" hide-checklist></hui-password-strength>
      <hui-password-strength id="ps-good" value="Abcdefgh12" hide-checklist></hui-password-strength>
      <hui-password-strength id="ps-strong" value="Abcdefg1!" hide-checklist></hui-password-strength>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const score = (id) => canvasElement.querySelector(`#${id}`).strength.score;
    await expect(score('ps-empty')).toBe(0);
    await expect(score('ps-weak')).toBe(1); // đủ 4 loại ký tự nhưng quá ngắn → Yếu
    await expect(score('ps-fair')).toBe(2);
    await expect(score('ps-good')).toBe(3); // thiếu ký tự đặc biệt: 4/5 → round(3.2) = 3
    await expect(score('ps-strong')).toBe(4);
    const strong = canvasElement.querySelector('#ps-strong');
    await expect(part(strong, 'checklist').hidden).toBe(true);
    await expect(activeSegments(strong)).toBe(4);
  },
};

/** Bọc ô nhập trong slot (native <input>) + min-length */
export const SlottedInput = {
  render: () => html`
    <div style="max-width: 380px;">
      <hui-password-strength id="ps-slot" min-length="12">
        <input id="pw-native" type="password" aria-label="Mật khẩu"
          style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid var(--hui-border); border-radius: var(--hui-radius); background: var(--hui-bg); color: var(--hui-text);" />
      </hui-password-strength>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ps-slot');
    const input = canvasElement.querySelector('#pw-native');
    await expect(el.shadowRoot.querySelector('[part~="rule"]').textContent).toContain('Ít nhất 12 ký tự');
    await userEvent.type(input, 'Abcdefg1!');
    await waitFor(() => expect(el.value).toBe('Abcdefg1!'));
    await expect(el.strength.score).toBe(1); // chưa đủ 12 ký tự
    await userEvent.type(input, 'xyz');
    await waitFor(() => expect(el.strength.score).toBe(4));
    input.blur();
  },
};

/** Luật tùy chỉnh: hàm, RegExp, chuỗi pattern */
export const CustomRules = {
  render: () => html`
    <div style="max-width: 380px;">
      <hui-password-strength id="ps-custom" value="hello"
        .rules=${[
          { id: 'len', label: 'Từ 6 ký tự', test: (v) => v.length >= 6 },
          { id: 'digit', label: 'Có chữ số', test: /\d/ },
          { id: 'noSpace', label: 'Không có khoảng trắng', test: '^\\S+$' },
          { id: 'notCommon', label: 'Không phải "password"', test: (v) => !/password/i.test(v) },
        ]}></hui-password-strength>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ps-custom');
    await expect(ruleStates(el)).toEqual([false, false, true, true]);
    await expect(el.strength.score).toBe(2);
    let detail = null;
    el.addEventListener('hui-strength', (e) => { detail = e.detail; });
    el.value = 'hello42';
    await waitFor(() => expect(detail).toEqual({ score: 4, level: 'strong', passed: ['len', 'digit', 'noSpace', 'notCommon'] }));
  },
};

/** Override từ ngoài: biến CSS + ::part(segment | rule-passed | level) */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .ps-brand {
        --hui-password-strength-height: 8px;
        --hui-password-strength-gap: 6px;
        --hui-password-strength-radius: 2px;
        --hui-password-strength-strong-color: var(--hui-primary);
        --hui-password-strength-pass-color: var(--hui-primary);
        --hui-password-strength-font-size: var(--hui-font-sm);
      }
      hui-password-strength.ps-brand::part(level) { text-transform: uppercase; letter-spacing: 0.05em; }
      hui-password-strength.ps-brand::part(rule-passed) { text-decoration: line-through; }
    </style>
    <div style="max-width: 380px;">
      <hui-password-strength class="ps-brand" value="Hoang2026!" label="Mật khẩu của bạn"></hui-password-strength>
    </div>
  `,
};
