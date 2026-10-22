/**
 * Storybook Stories — HUI Range Picker
 * Story kiểm tra logic luôn đặt `now` + `value` cố định → không phụ thuộc ngày / múi giờ máy chạy test.
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';
import { rangePresets } from './index.js';

const sr = (el) => el.shadowRoot;
const inputs = (el) => [...sr(el).querySelectorAll('[part~="input"]')];
const popup = (el) => sr(el).querySelector('[part="popup"]');
const panels = (el) => [...sr(el).querySelectorAll('.hui-cal')];
const cell = (el, key) => sr(el).querySelector(`.hui-cal:not([hidden]) [data-key="${key}"]`);
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);
const has = (el, key, p) => cell(el, key)?.part.contains(p);
const isOpen = (el) => !popup(el).hidden;
const focused = (el) => sr(el).activeElement;
const FIXED_NOW = () => new Date(2026, 9, 22);

async function retype(box, text) {
  box.focus();
  box.value = '';
  box.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'deleteContentBackward' }));
  if (text) await userEvent.keyboard(text);
}

export default {
  title: 'Molecules/HuiRangePicker',
  component: 'hui-range-picker',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Range Picker** — Chọn khoảng ngày / tháng / năm (Ant RangePicker + MUI DateRangePicker), tham gia \`<form>\` native.
Hai bảng lịch cạnh nhau (màn hẹp < 640px: một bảng), bấm ngày đầu rồi ngày cuối, **hover / phím mũi tên xem trước khoảng**
(nét đứt), chọn ngày cuối trước ngày đầu → tự đảo. Chọn nhanh qua \`presets\` (có sẵn \`rangePresets()\`: 7 ngày qua, 30 ngày qua,
Tuần này, Tháng này, Tháng trước, Năm nay).

\`\`\`html
<hui-range-picker name="period" value="2026-10-01/2026-10-15"></hui-range-picker>
<hui-range-picker name-start="from" name-end="to" picker="month"></hui-range-picker>
<script type="module">
  import { rangePresets } from '@itmrhoang/h-ui/hui-range-picker';
  rp.presets = rangePresets();             // hoặc [{ label: 'Quý 4', value: ['2026-10-01', '2026-12-31'] }]
  rp.addEventListener('change', (e) => console.log(e.detail.value)); // ['2026-10-01', '2026-10-15']
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | \`start/end\` \\| JSON | — | Khoảng ISO (property: mảng \`[start, end]\`, rỗng = \`[]\`) |
| \`picker\` | \`date\` \\| \`month\` \\| \`year\` | \`date\` | Đơn vị chọn |
| \`show-time\` | boolean | \`false\` | Cột giờ: chọn ngày + giờ đầu → "Đồng ý" → ngày + giờ cuối → "Đồng ý" |
| \`time-format\` / \`hour-step\` / \`minute-step\` / \`second-step\` | | | Như \`hui-date-picker\` |
| \`name\` | string | — | Gửi form 1 trường \`start/end\` |
| \`name-start\` / \`name-end\` | string | — | Gửi form 2 trường riêng (ưu tiên hơn \`name\`) |
| \`separator\` | string | \`→\` | Ký tự giữa 2 ô |
| \`placeholder-start\` / \`placeholder-end\` | string | theo locale | Chữ gợi ý từng ô |
| \`format\` / \`min\` / \`max\` / \`now\` / \`default-picker-value\` | | | Như \`hui-date-picker\` |
| \`clearable\` / \`size\` / \`status\` / \`variant\` / \`placement\` / \`inline\` / \`open\` / \`label\` / \`no-animation\` | | | Như \`hui-date-picker\` |
| \`required\` / \`disabled\` / \`readonly\` | — | — | Như input native |

### Properties (JS)
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`value\` | \`[string, string] \\| []\` | Khoảng ISO |
| \`presets\` | \`{ label, value: [start, end] \\| () => [start, end] }[]\` | Chọn nhanh |
| \`disabledDate\` | \`(date: Date) => boolean\` | Ô không chọn được |
| \`disabledTime\` | \`(date, part: 'start' \\| 'end') => {...}\` | Giờ không chọn được |
| \`valueAsDates\` | \`[Date, Date] \\| []\` | Chỉ đọc |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` / \`change\` | \`{ value: [start, end], dates: [Date, Date] }\` | Khoảng đổi do người dùng (xóa: \`value: []\`) |
| \`clear\` / \`hui-open\` / \`hui-close\` | — | |

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`↓\` / \`Alt+↓\` (ô nhập) | Mở popup, focus vào ngày đầu (hoặc ngày cuối nếu đang ở ô cuối) |
| \`← → ↑ ↓ Home End PageUp PageDown\` | Di chuyển + xem trước khoảng |
| \`Enter\` / \`Space\` | Chọn ngày đầu → chọn ngày cuối (xong thì đóng) |
| \`Enter\` (ô nhập) | Ô đầu: sang ô cuối; ô cuối: xác nhận chữ đã gõ |
| \`Esc\` | Đóng, hủy |

### Parts
\`base\`, \`trigger\`, \`input\` (+ \`input-start\` \`input-end\`), \`separator\`, \`suffix\`, \`clear\`, \`popup\`, \`presets\`, \`preset\`,
\`panel\`, \`cell-range-start\`, \`cell-range-end\`, \`cell-in-range\`, \`cell-preview-start\`, \`cell-preview-end\`, \`cell-in-preview\`…,
\`time-panel\`, \`footer\`, \`ok-btn\`.

### Biến CSS
\`--hui-picker-*\` (ô nhập, popup — xem HuiDatePicker), \`--hui-calendar-range-bg\` (dải khoảng),
\`--hui-calendar-preview-color\` (nét đứt xem trước), \`--hui-calendar-selected-bg\` (2 đầu), \`--hui-calendar-panel-width\`.
        `,
      },
    },
  },
  argTypes: {
    picker: { control: 'select', options: ['date', 'month', 'year'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-range-picker value=${args.value} now="2026-10-22" picker=${args.picker} size=${args.size}
      ?show-time=${args.showTime} ?clearable=${args.clearable} .presets=${rangePresets(FIXED_NOW)}></hui-range-picker>
  `,
  args: { value: '2026-10-05/2026-10-12', picker: 'date', size: 'md', showTime: false, clearable: true },
};

/** Chọn ngày đầu → hover xem trước → ngày cuối: value + đóng popup */
export const SelectRange = {
  render: () => html`<hui-range-picker id="rp-sel" value="2026-10-05/2026-10-12" now="2026-10-22" no-animation></hui-range-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rp-sel');
    await el.updateComplete;
    const [start, end] = inputs(el);
    await expect(el.value).toEqual(['2026-10-05', '2026-10-12']);
    await expect(start.value).toBe('05/10/2026');
    await expect(end.value).toBe('12/10/2026');
    const changes = [];
    el.addEventListener('change', (e) => changes.push(e.detail.value));

    await userEvent.click(start);
    await waitFor(() => expect(isOpen(el)).toBe(true));
    // 2 bảng: tháng 10 + tháng 11
    await expect(cell(el, '2026-11-15')).toBeTruthy();
    await expect(has(el, '2026-10-05', 'cell-range-start')).toBe(true);
    await expect(has(el, '2026-10-08', 'cell-in-range')).toBe(true);
    await expect(has(el, '2026-10-12', 'cell-range-end')).toBe(true);

    await userEvent.click(cell(el, '2026-10-20'));
    await expect(start.value).toBe('20/10/2026');
    await expect(end.value).toBe(''); // ngày cuối cũ (12) trước ngày đầu mới → bỏ
    await expect(end.classList.contains('hui-picker__input--active')).toBe(true);
    await userEvent.hover(cell(el, '2026-11-03'));
    await expect(has(el, '2026-10-25', 'cell-in-preview')).toBe(true);
    await expect(has(el, '2026-11-03', 'cell-preview-end')).toBe(true);
    await userEvent.click(cell(el, '2026-11-03'));
    await expect(el.value).toEqual(['2026-10-20', '2026-11-03']);
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(end.value).toBe('03/11/2026');
    await expect(changes).toEqual([['2026-10-20', '2026-11-03']]);
  },
};

/** Ngày cuối trước ngày đầu → tự đảo; Esc giữa chừng → hủy */
export const ReverseAndCancel = {
  render: () => html`<hui-range-picker id="rp-rev" now="2026-10-22" no-animation></hui-range-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rp-rev');
    await el.updateComplete;
    const [start] = inputs(el);
    await userEvent.click(start);
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await userEvent.click(cell(el, '2026-10-20'));
    await expect(has(el, '2026-10-20', 'cell-range-start')).toBe(true);
    await userEvent.click(cell(el, '2026-10-10'));
    await expect(el.value).toEqual(['2026-10-10', '2026-10-20']);

    await userEvent.click(start);
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await userEvent.click(cell(el, '2026-10-01'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(el.value).toEqual(['2026-10-10', '2026-10-20']);
    await expect(start.value).toBe('10/10/2026');
    start.blur();
  },
};

/** Bàn phím: ↓ vào lưới, Enter chọn đầu, mũi tên xem trước, Enter chọn cuối */
export const Keyboard = {
  render: () => html`<hui-range-picker id="rp-kb" value="2026-10-05/2026-10-12" now="2026-10-22" no-animation></hui-range-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rp-kb');
    await el.updateComplete;
    // Chặn sự kiện chuột lạc (con trỏ thật của runner CI) để xem trước chỉ đến từ bàn phím
    const block = (e) => e.stopImmediatePropagation();
    const panelsBox = sr(el).querySelector('.hui-picker__panels');
    panelsBox.addEventListener('mouseover', block, true);
    panelsBox.addEventListener('mouseleave', block, true);
    el.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(focused(el)?.dataset.key).toBe('2026-10-05'));
    await userEvent.keyboard('{ArrowRight}{Enter}');
    await expect(inputs(el)[0].value).toBe('06/10/2026');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(focused(el).dataset.key).toBe('2026-10-20');
    await expect(has(el, '2026-10-13', 'cell-in-preview')).toBe(true);
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toEqual(['2026-10-06', '2026-10-20']);
    await waitFor(() => expect(isOpen(el)).toBe(false));
    inputs(el)[1].blur();
  },
};

/** Gõ 2 ô: Enter ở ô đầu sang ô cuối, Enter ô cuối xác nhận */
export const Typing = {
  render: () => html`<hui-range-picker id="rp-type" now="2026-10-22" no-animation></hui-range-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rp-type');
    await el.updateComplete;
    const [start, end] = inputs(el);
    await retype(start, '1/10/2026');
    await waitFor(() => expect(has(el, '2026-10-01', 'cell-range-start')).toBe(true));
    await userEvent.keyboard('{Enter}');
    await expect(focused(el)).toBe(end);
    await retype(end, '15/10/2026');
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toEqual(['2026-10-01', '2026-10-15']);
    await waitFor(() => expect(isOpen(el)).toBe(false));
    // Sai định dạng → trả lại
    await retype(end, '99/99/2026');
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toEqual(['2026-10-01', '2026-10-15']);
    await expect(end.value).toBe('15/10/2026');
    end.blur();
  },
};

/** Điều hướng: 2 bảng đi cùng nhau; bấm tiêu đề → 1 bảng chọn tháng, chọn xong hiện lại 2 bảng */
export const LinkedPanels = {
  render: () => html`<hui-range-picker id="rp-nav" value="2026-10-05/2026-10-12" now="2026-10-22" no-animation></hui-range-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rp-nav');
    await el.updateComplete;
    await userEvent.click(inputs(el)[0]);
    await waitFor(() => expect(isOpen(el)).toBe(true));
    const [left, right] = panels(el);
    await userEvent.click(left.querySelector('[part~="prev"]'));
    await expect(left.querySelector('[data-key="2026-09-15"]')).toBeTruthy();
    await expect(right.querySelector('[data-key="2026-10-15"]')).toBeTruthy();
    await userEvent.click(right.querySelector('[part~="super-next"]'));
    await expect(right.querySelector('[data-key="2027-10-15"]')).toBeTruthy();
    await expect(left.querySelector('[data-key="2027-09-15"]')).toBeTruthy();
    await userEvent.click(left.querySelector('[part~="month-btn"]'));
    await expect(right.hidden).toBe(true);
    await userEvent.click(left.querySelector('[data-key="2027-02"]'));
    await expect(right.hidden).toBe(false);
    await expect(left.querySelector('[data-key="2027-02-15"]')).toBeTruthy();
    await expect(right.querySelector('[data-key="2027-03-15"]')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
  },
};

/** Chọn nhanh rangePresets() theo ngày cố định */
export const Presets = {
  render: () => html`<hui-range-picker id="rp-pre" now="2026-10-22" no-animation></hui-range-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rp-pre');
    el.presets = [...rangePresets(FIXED_NOW), { label: 'Quý 4', value: ['2026-10-01', '2026-12-31'] }];
    await el.updateComplete;
    await userEvent.click(inputs(el)[0]);
    await waitFor(() => expect(isOpen(el)).toBe(true));
    const buttons = () => [...sr(el).querySelectorAll('[part="preset"]')];
    await expect(buttons().map((b) => b.textContent)).toEqual(['7 ngày qua', '30 ngày qua', 'Tuần này', 'Tháng này', 'Tháng trước', 'Năm nay', 'Quý 4']);
    await userEvent.click(buttons()[0]);
    await expect(el.value).toEqual(['2026-10-16', '2026-10-22']);
    await userEvent.click(inputs(el)[0]);
    await userEvent.click(buttons()[2]);
    await expect(el.value).toEqual(['2026-10-19', '2026-10-25']); // tuần bắt đầu thứ Hai
    await userEvent.click(inputs(el)[0]);
    await userEvent.click(buttons()[4]);
    await expect(el.value).toEqual(['2026-09-01', '2026-09-30']);
    await userEvent.click(inputs(el)[0]);
    await userEvent.click(buttons()[6]);
    await expect(el.value).toEqual(['2026-10-01', '2026-12-31']);
  },
};

/** picker month / year: 2 bảng tháng (2 năm liền) / 2 bảng năm (2 thập kỷ) */
export const MonthAndYear = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
      <hui-range-picker id="rp-month" picker="month" value="2026-03/2026-08" now="2026-10-22" no-animation></hui-range-picker>
      <hui-range-picker id="rp-year" picker="year" value="2021/2024" now="2026-10-22" no-animation></hui-range-picker>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const m = canvasElement.querySelector('#rp-month');
    await m.updateComplete;
    await expect(inputs(m).map((i) => i.value)).toEqual(['03/2026', '08/2026']);
    await userEvent.click(inputs(m)[0]);
    await waitFor(() => expect(isOpen(m)).toBe(true));
    await expect(has(m, '2026-05', 'cell-in-range')).toBe(true);
    await userEvent.click(cell(m, '2026-11'));
    await userEvent.click(cell(m, '2027-02'));
    await expect(m.value).toEqual(['2026-11', '2027-02']);

    const y = canvasElement.querySelector('#rp-year');
    await userEvent.click(inputs(y)[0]);
    await waitFor(() => expect(isOpen(y)).toBe(true));
    await expect(has(y, '2022', 'cell-in-range')).toBe(true);
    await userEvent.click(cell(y, '2028'));
    await userEvent.click(cell(y, '2033'));
    await expect(y.value).toEqual(['2028', '2033']);
  },
};

/** Form: name → 'start/end'; name-start + name-end → 2 trường; required; reset */
export const InForm = {
  render: () => html`
    <form id="rp-form" style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
      <hui-range-picker id="rp-a" name="period" value="2026-10-01/2026-10-07" now="2026-10-22"></hui-range-picker>
      <hui-range-picker id="rp-b" name-start="from" name-end="to" required now="2026-10-22" clearable no-animation></hui-range-picker>
      <button type="reset">Reset</button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#rp-form');
    const a = canvasElement.querySelector('#rp-a');
    const b = canvasElement.querySelector('#rp-b');
    await b.updateComplete;
    await expect(new FormData(form).get('period')).toBe('2026-10-01/2026-10-07');
    await expect(b.checkValidity()).toBe(false);
    b.value = ['2026-10-10', '2026-10-20'];
    const data = new FormData(form);
    await expect(data.get('from')).toBe('2026-10-10');
    await expect(data.get('to')).toBe('2026-10-20');
    await expect(b.checkValidity()).toBe(true);
    await expect(b.valueAsDates[1].getDate()).toBe(20);
    a.value = '2026-11-01/2026-11-30';
    await expect(new FormData(form).get('period')).toBe('2026-11-01/2026-11-30');
    form.reset();
    await expect(a.value).toEqual(['2026-10-01', '2026-10-07']);
    await expect(b.value).toEqual([]);
  },
};

/** min / max / disabledDate + nút xóa */
export const DisabledAndClear = {
  render: () => html`<hui-range-picker id="rp-dis" min="2026-10-03" max="2026-11-20" value="2026-10-05/2026-10-09" now="2026-10-22" clearable no-animation></hui-range-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rp-dis');
    el.disabledDate = (d) => d.getDay() === 0;
    await el.updateComplete;
    await userEvent.click(inputs(el)[0]);
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await expect(cell(el, '2026-10-02').getAttribute('aria-disabled')).toBe('true');
    await expect(cell(el, '2026-11-21').getAttribute('aria-disabled')).toBe('true');
    await expect(cell(el, '2026-10-11').getAttribute('aria-disabled')).toBe('true'); // Chủ nhật
    await userEvent.keyboard('{Escape}');
    let cleared = 0;
    el.addEventListener('clear', () => cleared++);
    await userEvent.click(part(el, 'clear'));
    await expect(el.value).toEqual([]);
    await expect(inputs(el).map((i) => i.value)).toEqual(['', '']);
    await expect(cleared).toBe(1);
  },
};

/** show-time: ngày + giờ đầu → Đồng ý → ngày + giờ cuối → Đồng ý */
export const ShowTime = {
  render: () => html`<hui-range-picker id="rp-time" show-time value="2026-10-05T08:00/2026-10-12T17:30" now="2026-10-22" no-animation></hui-range-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rp-time');
    await el.updateComplete;
    const [start, end] = inputs(el);
    await expect(start.value).toBe('05/10/2026 08:00');
    await userEvent.click(start);
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await userEvent.click(cell(el, '2026-10-06'));
    await userEvent.click(sr(el).querySelector('li[data-unit="hour"][data-value="9"]'));
    await expect(start.value).toBe('06/10/2026 09:00');
    await userEvent.click(part(el, 'ok-btn'));
    await expect(focused(el)).toBe(end);
    await userEvent.click(cell(el, '2026-10-10'));
    await expect(end.value).toBe('10/10/2026 17:30');
    await userEvent.click(part(el, 'ok-btn'));
    await expect(el.value).toEqual(['2026-10-06T09:00', '2026-10-10T17:30']);
    await waitFor(() => expect(isOpen(el)).toBe(false));
    end.blur();
  },
};

export const Inline = {
  render: () => html`<hui-range-picker inline value="2026-10-05/2026-10-12" now="2026-10-22"></hui-range-picker>`,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .rp-brand {
        --hui-picker-width: 320px;
        --hui-picker-radius: 12px;
        --hui-calendar-range-bg: var(--hui-success-light);
        --hui-calendar-selected-bg: var(--hui-success);
        --hui-calendar-preview-color: var(--hui-success);
      }
      .rp-brand::part(separator) { color: var(--hui-success); font-weight: 700; }
      .rp-brand::part(preset) { color: var(--hui-success); }
    </style>
    <hui-range-picker class="rp-brand" separator="~" value="2026-10-05/2026-10-12" now="2026-10-22"
      .presets=${rangePresets(FIXED_NOW)}></hui-range-picker>
  `,
};
