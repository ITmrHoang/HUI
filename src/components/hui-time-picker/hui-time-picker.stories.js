/**
 * Storybook Stories — HUI Time Picker
 * Story kiểm tra logic đặt `value` / `now` cố định → không phụ thuộc giờ máy chạy test.
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { setLocale } from '../../core/locale.js';
import './index.js';

const sr = (el) => el.shadowRoot;
const input = (el) => sr(el).querySelector('[part~="input"]');
const popup = (el) => sr(el).querySelector('[part="popup"]');
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);
const opt = (el, unit, value) => sr(el).querySelector(`li[data-unit="${unit}"][data-value="${value}"]`);
const col = (el, unit) => sr(el).querySelector(`[part~="${unit}-column"]`);
const isOpen = (el) => !popup(el).hidden;
const focused = (el) => sr(el).activeElement;

async function retype(el, text) {
  const box = input(el);
  box.focus();
  box.value = '';
  box.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'deleteContentBackward' }));
  if (text) await userEvent.keyboard(text);
}

export default {
  title: 'Molecules/HuiTimePicker',
  component: 'hui-time-picker',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Time Picker** — Chọn giờ (Ant TimePicker + MUI TimePicker), tham gia \`<form>\` native.
Các cột giờ / phút / giây cuộn được (bước nhảy riêng từng cột), 12 giờ SA/CH, \`disabledTime\`, \`min\` / \`max\`,
nút "Bây giờ", gõ giờ trực tiếp. **Giá trị form luôn 24 giờ** \`HH:mm\` (hoặc \`HH:mm:ss\` khi format có giây).

\`\`\`html
<hui-time-picker name="start" value="09:30"></hui-time-picker>
<hui-time-picker format="HH:mm:ss" minute-step="5"></hui-time-picker>
<hui-time-picker use12-hours value="21:05"></hui-time-picker>          <!-- 09:05 CH -->
<hui-time-picker min="08:00" max="17:30"></hui-time-picker>
<script>
  tp.disabledTime = () => ({ disabledHours: () => [12, 13] });
</script>
\`\`\`

Chọn trong cột là **tạm** (ô nhập đổi theo); "Đồng ý" / Enter / click ra ngoài / Tab = xác nhận, \`Esc\` = hủy.

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | \`HH:mm\` \\| \`HH:mm:ss\` | — | Giá trị 24 giờ |
| \`format\` | \`HH:mm\` \\| \`HH:mm:ss\` \\| \`hh:mm A\` \\| \`hh:mm:ss A\` | \`HH:mm\` | Mẫu hiển thị (có \`ss\` → cột giây + value có giây; \`A\` → 12 giờ) |
| \`use12-hours\` | boolean | \`false\` | 12 giờ khi không đặt format (= \`hh:mm A\`) |
| \`hour-step\` / \`minute-step\` / \`second-step\` | number | \`1\` | Bước nhảy từng cột |
| \`min\` / \`max\` | \`HH:mm[:ss]\` | — | Giới hạn (ô ngoài khoảng bị chặn) |
| \`now\` | ISO | giờ máy | Giờ của nút "Bây giờ" (cố định cho test) |
| \`hide-now\` | boolean | \`false\` | Ẩn nút "Bây giờ" |
| \`placeholder\` / \`clearable\` / \`allow-clear\` / \`size\` / \`status\` / \`variant\` / \`placement\` / \`open\` / \`label\` / \`no-animation\` | | | Như \`hui-date-picker\` |
| \`name\` / \`required\` / \`disabled\` / \`readonly\` | — | — | Như input native |

### Properties (JS)
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`disabledTime\` | \`() => { disabledHours?(): number[], disabledMinutes?(h): number[], disabledSeconds?(h, m): number[] }\` | Giờ không chọn được |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` / \`change\` | \`{ value }\` | Giá trị đổi do người dùng |
| \`clear\` | — | Bấm nút xóa |
| \`hui-open\` / \`hui-close\` | — | Mở / đóng popup |

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`↓\` / \`Alt+↓\` (ô nhập) | Mở popup, focus cột giờ |
| \`↑ ↓\` / \`Home\` \`End\` (cột) | Đổi giá trị (bỏ qua ô bị chặn) |
| \`← →\` | Sang cột trước / sau |
| \`Enter\` | Đồng ý (trong ô nhập: xác nhận chữ đã gõ) |
| \`Esc\` | Đóng, hủy thay đổi |

### Parts
\`base\`, \`trigger\`, \`input\`, \`suffix\`, \`clear\`, \`popup\`, \`time-panel\`, \`time-column\` (+ \`hour-column\` \`minute-column\`
\`second-column\` \`meridiem-column\`), \`time-cell\` (+ \`time-cell-selected\` \`time-cell-disabled\`), \`footer\`, \`now-btn\`, \`ok-btn\`.

### Biến CSS
| Biến | Mô tả |
|------|-------|
| \`--hui-time-picker-column-height\` / \`--hui-time-picker-column-width\` / \`--hui-time-picker-cell-height\` | Kích thước cột / ô |
| \`--hui-time-picker-selected-bg\` / \`--hui-time-picker-hover-bg\` | Nền ô chọn / hover |
| \`--hui-picker-*\` | Ô nhập + popup (xem HuiDatePicker) |
        `,
      },
    },
  },
  argTypes: {
    format: { control: 'select', options: ['HH:mm', 'HH:mm:ss', 'hh:mm A', 'hh:mm:ss A'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-time-picker value=${args.value} format=${args.format} size=${args.size}
      minute-step=${args.minuteStep} ?clearable=${args.clearable} ?disabled=${args.disabled}></hui-time-picker>
  `,
  args: { value: '09:30', format: 'HH:mm', size: 'md', minuteStep: 1, clearable: true, disabled: false },
};

/** Chọn trong cột = tạm; "Đồng ý" xác nhận → input + change */
export const SelectInColumns = {
  render: () => html`<hui-time-picker id="tp-sel" value="09:15" no-animation></hui-time-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tp-sel');
    await el.updateComplete;
    await expect(input(el).value).toBe('09:15');
    const events = [];
    el.addEventListener('change', (e) => events.push(e.detail.value));
    await userEvent.click(input(el));
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await expect(opt(el, 'hour', 9).getAttribute('aria-selected')).toBe('true');
    await expect(col(el, 'hour').getAttribute('aria-activedescendant')).toBe(opt(el, 'hour', 9).id);
    await expect(sr(el).querySelectorAll('li[data-unit="hour"]').length).toBe(24);
    await userEvent.click(opt(el, 'hour', 14));
    await userEvent.click(opt(el, 'minute', 30));
    await expect(input(el).value).toBe('14:30');
    await expect(el.value).toBe('09:15');
    await userEvent.click(part(el, 'ok-btn'));
    await expect(el.value).toBe('14:30');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(events).toEqual(['14:30']);
    await expect(focused(el)).toBe(input(el));

    // Esc hủy thay đổi tạm
    await userEvent.click(input(el));
    await userEvent.click(opt(el, 'hour', 6));
    await userEvent.keyboard('{Escape}');
    await expect(el.value).toBe('14:30');
    await expect(input(el).value).toBe('14:30');
    input(el).blur();
  },
};

/** ↓ mở + focus cột giờ; ↑↓ đổi giá trị, ←→ đổi cột, End, Enter = Đồng ý */
export const Keyboard = {
  render: () => html`<hui-time-picker id="tp-kb" value="09:15" no-animation></hui-time-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tp-kb');
    await el.updateComplete;
    el.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(focused(el)).toBe(col(el, 'hour')));
    await userEvent.keyboard('{ArrowDown}');
    await expect(input(el).value).toBe('10:15');
    await userEvent.keyboard('{ArrowRight}');
    await expect(focused(el)).toBe(col(el, 'minute'));
    await userEvent.keyboard('{End}');
    await expect(input(el).value).toBe('10:59');
    await userEvent.keyboard('{ArrowUp}{ArrowLeft}{Home}');
    await expect(input(el).value).toBe('00:58');
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toBe('00:58');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(focused(el)).toBe(input(el));
    input(el).blur();
  },
};

/** Bước nhảy + có giây (HH:mm:ss) */
export const StepsAndSeconds = {
  render: () => html`
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <hui-time-picker id="tp-step" value="10:30" hour-step="2" minute-step="15" no-animation></hui-time-picker>
      <hui-time-picker id="tp-sec" format="HH:mm:ss" value="08:05:30" second-step="10" no-animation></hui-time-picker>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const step = canvasElement.querySelector('#tp-step');
    await step.updateComplete;
    await expect(sr(step).querySelectorAll('li[data-unit="hour"]').length).toBe(12);
    await expect(sr(step).querySelectorAll('li[data-unit="minute"]').length).toBe(4);
    await expect([...sr(step).querySelectorAll('li[data-unit="minute"]')].map((li) => li.textContent)).toEqual(['00', '15', '30', '45']);

    const sec = canvasElement.querySelector('#tp-sec');
    await expect(input(sec).value).toBe('08:05:30');
    await expect(col(sec, 'second')).toBeTruthy();
    await userEvent.click(input(sec));
    await waitFor(() => expect(isOpen(sec)).toBe(true));
    await userEvent.click(opt(sec, 'second', 50));
    await userEvent.click(part(sec, 'ok-btn'));
    await expect(sec.value).toBe('08:05:50');
  },
};

/** 12 giờ: hiển thị SA/CH, value vẫn 24 giờ */
export const TwelveHours = {
  render: () => html`<hui-time-picker id="tp-12" use12-hours value="21:05" no-animation></hui-time-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tp-12');
    await el.updateComplete;
    await expect(input(el).value).toBe('09:05 CH');
    await userEvent.click(input(el));
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await expect(opt(el, 'hour', 9).getAttribute('aria-selected')).toBe('true');
    await expect(opt(el, 'hour', 0).textContent).toBe('12');
    await expect(opt(el, 'meridiem', 1).getAttribute('aria-selected')).toBe('true');
    await userEvent.click(opt(el, 'meridiem', 0));
    await expect(input(el).value).toBe('09:05 SA');
    await userEvent.click(opt(el, 'hour', 0));
    await userEvent.click(part(el, 'ok-btn'));
    await expect(el.value).toBe('00:05');
    try {
      setLocale('en');
      await waitFor(() => expect(input(el).value).toBe('12:05 AM'));
    } finally {
      setLocale('vi');
    }
    await waitFor(() => expect(input(el).value).toBe('12:05 SA'));
  },
};

/** Gõ giờ: theo format, nhận cả 24 giờ; sai → trả lại giá trị cũ */
export const Typing = {
  render: () => html`<hui-time-picker id="tp-type" value="09:15" no-animation></hui-time-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tp-type');
    await el.updateComplete;
    await userEvent.click(input(el));
    await retype(el, '7:45');
    await waitFor(() => expect(opt(el, 'hour', 7).getAttribute('aria-selected')).toBe('true'));
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toBe('07:45');
    await expect(input(el).value).toBe('07:45');
    await retype(el, '25:00');
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toBe('07:45');
    await expect(input(el).value).toBe('07:45');
    input(el).blur();
  },
};

/** disabledTime + min / max: ô bị chặn, phím mũi tên bỏ qua */
export const DisabledTime = {
  render: () => html`<hui-time-picker id="tp-dis" value="09:00" min="08:30" max="18:00" no-animation></hui-time-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tp-dis');
    el.disabledTime = () => ({ disabledHours: () => [12, 13] });
    await el.updateComplete;
    await userEvent.click(input(el));
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await expect(opt(el, 'hour', 7).getAttribute('aria-disabled')).toBe('true');
    await expect(opt(el, 'hour', 12).getAttribute('aria-disabled')).toBe('true');
    await expect(opt(el, 'hour', 19).getAttribute('aria-disabled')).toBe('true');
    await expect(opt(el, 'hour', 8).hasAttribute('aria-disabled')).toBe(false);
    await userEvent.click(opt(el, 'hour', 12));
    await expect(input(el).value).toBe('09:00');
    // Từ 11 ↓ → nhảy qua 12, 13 → 14
    await userEvent.click(opt(el, 'hour', 11));
    col(el, 'hour').focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(input(el).value).toBe('14:00');
    await userEvent.click(opt(el, 'hour', 8));
    await expect(opt(el, 'minute', 0).getAttribute('aria-disabled')).toBe('true'); // 08:00 < min
    await expect(opt(el, 'minute', 30).hasAttribute('aria-disabled')).toBe(false);
    await userEvent.keyboard('{Escape}');
    el.value = '07:00';
    await expect(el.validity.rangeUnderflow).toBe(true);
  },
};

/** "Bây giờ" theo `now` cố định + form (required, FormData, reset) */
export const NowAndForm = {
  render: () => html`
    <form id="tp-form" style="display: flex; gap: 12px; align-items: center;">
      <hui-time-picker id="tp-now" name="at" required now="2026-10-22T16:40:12" no-animation clearable></hui-time-picker>
      <button type="reset">Reset</button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#tp-form');
    const el = canvasElement.querySelector('#tp-now');
    await el.updateComplete;
    await expect(el.checkValidity()).toBe(false);
    await userEvent.click(input(el));
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await userEvent.click(part(el, 'now-btn'));
    await expect(el.value).toBe('16:40');
    await expect(new FormData(form).get('at')).toBe('16:40');
    await expect(el.checkValidity()).toBe(true);
    await userEvent.click(part(el, 'clear'));
    await expect(el.value).toBe('');
    el.value = '10:00';
    form.reset();
    await expect(el.value).toBe('');
  },
};

export const SizesAndStates = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
      <hui-time-picker size="sm" value="09:30"></hui-time-picker>
      <hui-time-picker size="md" value="09:30"></hui-time-picker>
      <hui-time-picker size="lg" value="09:30"></hui-time-picker>
      <hui-time-picker status="error"></hui-time-picker>
      <hui-time-picker status="warning"></hui-time-picker>
      <hui-time-picker variant="filled"></hui-time-picker>
      <hui-time-picker disabled value="09:30"></hui-time-picker>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .tp-brand {
        --hui-picker-width: 150px;
        --hui-picker-radius: 999px;
        --hui-time-picker-column-height: 180px;
        --hui-time-picker-column-width: 64px;
        --hui-time-picker-selected-bg: var(--hui-success-light);
      }
      .tp-brand::part(suffix) { color: var(--hui-success); }
      .tp-brand::part(time-cell-selected) { color: var(--hui-success); font-weight: 700; }
      .tp-brand::part(ok-btn) { background: var(--hui-success); border-color: var(--hui-success); }
    </style>
    <hui-time-picker class="tp-brand" value="14:45" minute-step="5" clearable></hui-time-picker>
  `,
};
