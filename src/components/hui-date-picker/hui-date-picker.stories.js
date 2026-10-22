/**
 * Storybook Stories — HUI Date Picker
 * Story kiểm tra logic luôn đặt `now` + `value` cố định → không phụ thuộc ngày / múi giờ của máy chạy test.
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { setLocale } from '../../core/locale.js';
import './index.js';

const sr = (el) => el.shadowRoot;
const input = (el) => sr(el).querySelector('[part~="input"]');
const popup = (el) => sr(el).querySelector('[part="popup"]');
const cell = (el, key) => sr(el).querySelector(`[data-key="${key}"]`);
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);
const isOpen = (el) => !popup(el).hidden;
const focused = (el) => sr(el).activeElement;
/** Xóa chữ trong ô nhập rồi gõ text (userEvent.clear không focus được input trong shadow DOM) */
async function retype(el, text) {
  const box = input(el);
  box.focus();
  box.value = '';
  box.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'deleteContentBackward' }));
  if (text) await userEvent.keyboard(text);
}

export default {
  title: 'Molecules/HuiDatePicker',
  component: 'hui-date-picker',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Date Picker** — Ô chọn ngày với popup lịch (Ant DatePicker + MUI DatePicker), tham gia \`<form>\` native.
\`picker\`: ngày / tuần / tháng / quý / năm; \`show-time\` thêm cột giờ. Hiển thị theo \`format\` (mặc định vi \`DD/MM/YYYY\`,
en \`MM/DD/YYYY\`), **giá trị form luôn là ISO** (\`2026-10-22\`, \`2026-10-22T14:30\`, \`2026-W43\`, \`2026-10\`, \`2026-Q4\`, \`2026\`).
Gõ ngày vào ô nhập (theo \`format\`, không cần số 0 đầu) → Enter / rời ô để xác nhận; gõ sai → trả lại giá trị cũ.

\`\`\`html
<hui-date-picker name="dob" value="2026-10-22" clearable></hui-date-picker>
<hui-date-picker picker="month" format="MM/YYYY"></hui-date-picker>
<hui-date-picker show-time time-format="HH:mm" minute-step="15"></hui-date-picker>
<script>
  dp.disabledDate = (d) => d.getDay() === 0;
  dp.presets = [{ label: 'Hôm nay', value: () => new Date() }, { label: 'Tết', value: '2027-02-06' }];
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | ISO | — | Giá trị (attribute = giá trị ban đầu khi reset form) |
| \`picker\` | \`date\` \\| \`week\` \\| \`month\` \\| \`quarter\` \\| \`year\` | \`date\` | Đơn vị chọn |
| \`format\` | string | theo locale | Mẫu hiển thị: \`YYYY YY MMMM MMM MM M DD D dddd ddd ww gggg Q HH H hh h mm ss A\`, chữ cố định trong \`[...]\` |
| \`show-time\` | boolean | \`false\` | Cột giờ (picker date), value \`YYYY-MM-DDTHH:mm\` |
| \`time-format\` | \`HH:mm\` \\| \`HH:mm:ss\` \\| \`hh:mm A\` | \`HH:mm\` | Mẫu giờ (có \`ss\` → value có giây; \`A\` → 12 giờ SA/CH) |
| \`hour-step\` / \`minute-step\` / \`second-step\` | number | \`1\` | Bước nhảy cột giờ |
| \`min\` / \`max\` | ISO | — | Giới hạn (so theo đơn vị picker) |
| \`now\` | ISO | giờ máy | "Hôm nay / Bây giờ" cố định (test, demo) |
| \`default-picker-value\` | ISO | hôm nay | Tháng hiện khi mở lúc chưa có giá trị |
| \`show-week\` | boolean | \`false\` | Cột số tuần (picker week luôn hiện) |
| \`placeholder\` | string | theo locale | Chữ gợi ý |
| \`clearable\` / \`allow-clear\` | boolean | \`false\` | Nút xóa |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Kích thước (bỏ trống = theo hui-form) |
| \`status\` | \`error\` \\| \`warning\` | — | Viền trạng thái |
| \`variant\` | \`outlined\` \\| \`filled\` \\| \`borderless\` | \`outlined\` | Kiểu khung |
| \`placement\` | string | \`bottom-start\` | Vị trí popup (tự lật) |
| \`inline\` | boolean | \`false\` | Bảng hiện ngay trong trang, không ô nhập |
| \`open\` | boolean | \`false\` | Popup đang mở (gán để mở / đóng) |
| \`label\` | string | — | aria-label của ô nhập (khi không trong hui-form-item) |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |
| \`name\` / \`required\` / \`disabled\` / \`readonly\` | — | — | Như input native |

### Properties (JS)
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`presets\` | \`{ label, value }[]\` | Chọn nhanh — \`value\`: ISO, \`Date\` hoặc hàm trả về Date |
| \`disabledDate\` | \`(date: Date) => boolean\` | Ô không chọn được |
| \`disabledTime\` | \`(date) => { disabledHours?(), disabledMinutes?(h), disabledSeconds?(h, m) }\` | Giờ không chọn được |
| \`valueAsDate\` | \`Date \\| null\` | Giá trị dạng Date (chỉ đọc) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` / \`change\` | \`{ value, date }\` | Giá trị đổi do người dùng |
| \`clear\` | — | Bấm nút xóa |
| \`hui-open\` / \`hui-close\` | — | Mở / đóng popup |

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`↓\` / \`Alt+↓\` (ô nhập) | Mở popup, focus vào ô ngày đang chọn |
| \`Enter\` (ô nhập) | Xác nhận chữ đã gõ |
| \`← → ↑ ↓ Home End PageUp PageDown\` | Di chuyển trong lưới (Shift+PageUp/Down: năm) |
| \`Enter\` / \`Space\` (lưới) | Chọn ngày (show-time: chọn tạm, bấm "Đồng ý") |
| \`↑ ↓ ← →\` (cột giờ) | Đổi giờ / phút / sang cột khác; \`Enter\` = Đồng ý |
| \`Esc\` | Đóng, hủy thay đổi chưa xác nhận |
| \`Tab\` | Đi qua header / lưới / cột giờ / nút; ra khỏi popup = xác nhận + đóng |

### Parts
\`base\`, \`trigger\`, \`input\`, \`suffix\`, \`clear\`, \`popup\`, \`presets\`, \`preset\`, \`footer\`, \`today-btn\`, \`now-btn\`, \`ok-btn\`,
cùng các part của bảng lịch (\`panel\`, \`header\`, \`nav-btn\`, \`title-btn\`, \`grid\`, \`cell\`, \`cell-selected\`…) và cột giờ
(\`time-panel\`, \`time-column\`, \`time-cell\`, \`time-cell-selected\`).

### Biến CSS
| Biến | Mô tả |
|------|-------|
| \`--hui-picker-width\` / \`--hui-picker-height\` / \`--hui-picker-radius\` | Kích thước / bo góc ô nhập |
| \`--hui-picker-bg\` / \`--hui-picker-color\` / \`--hui-picker-placeholder-color\` | Nền / chữ |
| \`--hui-picker-border-color\` / \`--hui-picker-hover-border-color\` / \`--hui-picker-focus-border-color\` | Viền |
| \`--hui-picker-focus-shadow\` / \`--hui-picker-icon-color\` | Vòng sáng / icon |
| \`--hui-picker-popup-bg\` / \`--hui-picker-popup-radius\` / \`--hui-picker-popup-shadow\` / \`--hui-picker-popup-padding\` | Popup |
| \`--hui-picker-presets-width\` / \`--hui-calendar-panel-width\` | Cột chọn nhanh / bảng lịch |
| \`--hui-calendar-*\` | Màu ô (xem HuiCalendar) |
| \`--hui-time-picker-*\` | Cột giờ (xem HuiTimePicker) |
        `,
      },
    },
  },
  argTypes: {
    picker: { control: 'select', options: ['date', 'week', 'month', 'quarter', 'year'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    status: { control: 'select', options: ['', 'error', 'warning'] },
    variant: { control: 'select', options: ['outlined', 'filled', 'borderless'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-date-picker
      value=${args.value}
      now="2026-10-22"
      picker=${args.picker}
      size=${args.size}
      status=${args.status}
      variant=${args.variant}
      ?show-time=${args.showTime}
      ?clearable=${args.clearable}
      ?disabled=${args.disabled}
    ></hui-date-picker>
  `,
  args: { value: '2026-10-22', picker: 'date', size: 'md', status: '', variant: 'outlined', showTime: false, clearable: true, disabled: false },
};

/** Bấm mở → chọn ngày: value ISO, ô nhập DD/MM/YYYY, phát input + change, popup đóng */
export const SelectDate = {
  render: () => html`<hui-date-picker id="dp-sel" value="2026-10-22" now="2026-10-22" no-animation></hui-date-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dp-sel');
    await el.updateComplete;
    await expect(input(el).value).toBe('22/10/2026');
    const events = [];
    for (const type of ['input', 'change', 'hui-open', 'hui-close']) el.addEventListener(type, (e) => events.push(`${type}:${e.detail?.value ?? ''}`));

    await userEvent.click(input(el));
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await expect(input(el).getAttribute('aria-expanded')).toBe('true');
    await expect(cell(el, '2026-10-22').getAttribute('aria-selected')).toBe('true');
    await expect(cell(el, '2026-10-22').getAttribute('aria-current')).toBe('date');
    await userEvent.click(cell(el, '2026-10-09'));
    await expect(el.value).toBe('2026-10-09');
    await expect(input(el).value).toBe('09/10/2026');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(events).toEqual(['hui-open:', 'input:2026-10-09', 'change:2026-10-09', 'hui-close:']);
    await expect(focused(el)).toBe(input(el));
    await expect(el.valueAsDate.getDate()).toBe(9);
  },
};

/** Gõ ngày theo format → Enter xác nhận; gõ ngày không tồn tại → trả lại giá trị cũ */
export const TypeDate = {
  render: () => html`<hui-date-picker id="dp-type" value="2026-10-22" now="2026-10-22" no-animation></hui-date-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dp-type');
    await el.updateComplete;
    const changes = [];
    el.addEventListener('change', (e) => changes.push(e.detail.value));
    await userEvent.click(input(el));
    await retype(el, '5/11/2026');
    // Bảng nhảy tới tháng đang gõ (chưa xác nhận)
    await waitFor(() => expect(cell(el, '2026-11-05')?.getAttribute('aria-selected')).toBe('true'));
    await expect(el.value).toBe('2026-10-22');
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toBe('2026-11-05');
    await expect(input(el).value).toBe('05/11/2026');
    await waitFor(() => expect(isOpen(el)).toBe(false));

    await retype(el, '31/02/2026');
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toBe('2026-11-05');
    await expect(input(el).value).toBe('05/11/2026');
    await expect(changes).toEqual(['2026-11-05']);

    // Xóa hết chữ + Enter = xóa giá trị
    await retype(el, '');
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toBe('');
    await expect(changes).toEqual(['2026-11-05', '']);
    await userEvent.keyboard('{Escape}');
    input(el).blur();
  },
};

/** ↓ mở popup + focus vào ô đang chọn; mũi tên + Enter chọn; Esc đóng không đổi giá trị */
export const Keyboard = {
  render: () => html`<hui-date-picker id="dp-kb" value="2026-10-22" now="2026-10-22" no-animation></hui-date-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dp-kb');
    await el.updateComplete;
    el.focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await waitFor(() => expect(focused(el)?.dataset.key).toBe('2026-10-22'));
    await userEvent.keyboard('{ArrowRight}{ArrowDown}');
    await expect(focused(el).dataset.key).toBe('2026-10-30');
    await userEvent.keyboard('{PageDown}');
    await expect(focused(el).dataset.key).toBe('2026-11-30');
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toBe('2026-11-30');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(focused(el)).toBe(input(el));

    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(focused(el)?.dataset.key).toBe('2026-11-30'));
    await userEvent.keyboard('{ArrowLeft}{Escape}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await expect(el.value).toBe('2026-11-30');
    await expect(focused(el)).toBe(input(el));
    input(el).blur();
  },
};

/** picker week / month / quarter / year — value ISO tương ứng */
export const Pickers = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
      <hui-date-picker id="pk-week" picker="week" value="2026-W43" now="2026-10-22" no-animation></hui-date-picker>
      <hui-date-picker id="pk-month" picker="month" value="2026-10" now="2026-10-22" no-animation></hui-date-picker>
      <hui-date-picker id="pk-quarter" picker="quarter" value="2026-Q4" now="2026-10-22" no-animation></hui-date-picker>
      <hui-date-picker id="pk-year" picker="year" value="2026" now="2026-10-22" no-animation></hui-date-picker>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [week, month, quarter, year] = ['week', 'month', 'quarter', 'year'].map((k) => canvasElement.querySelector(`#pk-${k}`));
    await week.updateComplete;
    await expect(input(week).value).toBe('2026-W43');
    await expect(input(month).value).toBe('10/2026');
    await expect(input(quarter).value).toBe('2026-Q4');
    await expect(input(year).value).toBe('2026');

    await userEvent.click(input(week));
    await waitFor(() => expect(isOpen(week)).toBe(true));
    await expect(cell(week, '2026-10-19').part.contains('cell-week-selected')).toBe(true);
    await expect(cell(week, '2026-10-25').part.contains('cell-week-selected')).toBe(true);
    await userEvent.click(cell(week, '2026-10-29'));
    await expect(week.value).toBe('2026-W44');

    await userEvent.click(input(month));
    await waitFor(() => expect(isOpen(month)).toBe(true));
    await expect(cell(month, '2026-10').getAttribute('aria-selected')).toBe('true');
    await userEvent.click(cell(month, '2026-03'));
    await expect(month.value).toBe('2026-03');
    await expect(input(month).value).toBe('03/2026');

    await userEvent.click(input(quarter));
    await waitFor(() => expect(isOpen(quarter)).toBe(true));
    await userEvent.click(cell(quarter, '2026-Q2'));
    await expect(quarter.value).toBe('2026-Q2');

    await userEvent.click(input(year));
    await waitFor(() => expect(isOpen(year)).toBe(true));
    await userEvent.click(cell(year, '2028'));
    await expect(year.value).toBe('2028');
    await waitFor(() => expect(isOpen(year)).toBe(false));
  },
};

/** show-time: chọn ngày + giờ là tạm, "Đồng ý" mới xác nhận; "Bây giờ" lấy `now` */
export const ShowTime = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
      <hui-date-picker id="dp-time" show-time value="2026-10-22T09:15" now="2026-10-22T16:40" minute-step="5" no-animation></hui-date-picker>
      <hui-date-picker id="dp-time12" show-time time-format="hh:mm A" value="2026-10-22T21:05" now="2026-10-22T16:40" no-animation></hui-date-picker>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dp-time');
    await el.updateComplete;
    await expect(input(el).value).toBe('22/10/2026 09:15');
    await userEvent.click(input(el));
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await expect(part(el, 'ok-btn').disabled).toBe(true);
    await userEvent.click(cell(el, '2026-10-25'));
    await expect(input(el).value).toBe('25/10/2026 09:15');
    await expect(el.value).toBe('2026-10-22T09:15');
    const hour14 = sr(el).querySelector('[data-unit="hour"][data-value="14"]');
    await userEvent.click(hour14);
    await expect(hour14.getAttribute('aria-selected')).toBe('true');
    await expect(sr(el).querySelectorAll('li[data-unit="minute"]').length).toBe(12); // minute-step 5
    // Bàn phím trong cột phút: ↓ = +5 phút
    sr(el).querySelector('[part~="minute-column"]').focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(input(el).value).toBe('25/10/2026 14:20');
    await userEvent.click(part(el, 'ok-btn'));
    await expect(el.value).toBe('2026-10-25T14:20');
    await waitFor(() => expect(isOpen(el)).toBe(false));

    // Esc hủy giá trị tạm
    await userEvent.click(input(el));
    await userEvent.click(cell(el, '2026-10-01'));
    await userEvent.keyboard('{Escape}');
    await expect(el.value).toBe('2026-10-25T14:20');
    await expect(input(el).value).toBe('25/10/2026 14:20');

    await userEvent.click(input(el));
    await userEvent.click(part(el, 'now-btn'));
    await expect(el.value).toBe('2026-10-22T16:40');

    const el12 = canvasElement.querySelector('#dp-time12');
    await expect(input(el12).value).toBe('22/10/2026 09:05 CH');
    input(el).blur();
  },
};

/** Chọn nhanh (presets) + nút Hôm nay */
export const Presets = {
  render: () => html`<hui-date-picker id="dp-pre" now="2026-10-22" no-animation placeholder="Chọn ngày giao hàng"></hui-date-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dp-pre');
    el.presets = [
      { label: 'Hôm nay', value: '2026-10-22' },
      { label: 'Ngày mai', value: () => new Date(2026, 9, 23) },
      { label: 'Tuần sau', value: new Date(2026, 9, 29) },
    ];
    await el.updateComplete;
    await expect(input(el).placeholder).toBe('Chọn ngày giao hàng');
    await userEvent.click(input(el));
    await waitFor(() => expect(isOpen(el)).toBe(true));
    const presets = sr(el).querySelectorAll('[part="preset"]');
    await expect(presets.length).toBe(3);
    await userEvent.click(presets[1]);
    await expect(el.value).toBe('2026-10-23');
    await userEvent.click(input(el));
    await userEvent.click(part(el, 'today-btn'));
    await expect(el.value).toBe('2026-10-22');
  },
};

/** min / max / disabledDate: ô bị chặn; value ngoài khoảng → rangeUnderflow; required + FormData + reset */
export const ValidationAndForm = {
  render: () => html`
    <form id="dp-form" style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
      <hui-date-picker id="dp-min" name="start" required min="2026-10-10" max="2026-10-30" now="2026-10-22" no-animation></hui-date-picker>
      <hui-date-picker id="dp-v" name="due" value="2026-10-22" now="2026-10-22" no-animation></hui-date-picker>
      <button type="reset">Reset</button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#dp-form');
    const el = canvasElement.querySelector('#dp-min');
    el.disabledDate = (d) => d.getDay() === 0;
    await el.updateComplete;
    await expect(el.checkValidity()).toBe(false);
    await expect(el.validity.valueMissing).toBe(true);
    await expect([...new FormData(form).entries()]).toEqual([['due', '2026-10-22']]);

    await userEvent.click(input(el));
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await expect(cell(el, '2026-10-09').getAttribute('aria-disabled')).toBe('true');
    await expect(cell(el, '2026-10-25').getAttribute('aria-disabled')).toBe('true'); // Chủ nhật
    await userEvent.click(cell(el, '2026-10-25'));
    await expect(el.value).toBe('');
    await userEvent.click(cell(el, '2026-10-12'));
    await expect(el.value).toBe('2026-10-12');
    await expect(el.checkValidity()).toBe(true);
    await expect(new FormData(form).get('start')).toBe('2026-10-12');

    // Gõ ngày bị chặn → không nhận
    await retype(el, '01/11/2026{Enter}');
    await expect(el.value).toBe('2026-10-12');

    el.value = '2026-10-01';
    await expect(el.validity.rangeUnderflow).toBe(true);
    await expect(el.validationMessage).toContain('10/10/2026');
    form.reset();
    await expect(el.value).toBe('');
    const due = canvasElement.querySelector('#dp-v');
    await expect(due.value).toBe('2026-10-22');
    input(el).blur();
  },
};

/** Nút xóa (clearable) */
export const Clearable = {
  render: () => html`<hui-date-picker id="dp-clr" clearable value="2026-10-22" now="2026-10-22" no-animation></hui-date-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dp-clr');
    await el.updateComplete;
    let cleared = 0;
    el.addEventListener('clear', () => cleared++);
    const btn = part(el, 'clear');
    await expect(btn.hidden).toBe(false);
    await userEvent.click(btn);
    await expect(el.value).toBe('');
    await expect(input(el).value).toBe('');
    await expect(cleared).toBe(1);
    await el.updateComplete;
    await expect(btn.hidden).toBe(true);
  },
};

export const SizesStatusVariants = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
      <hui-date-picker size="sm" value="2026-10-22" now="2026-10-22"></hui-date-picker>
      <hui-date-picker size="md" value="2026-10-22" now="2026-10-22"></hui-date-picker>
      <hui-date-picker size="lg" value="2026-10-22" now="2026-10-22"></hui-date-picker>
      <hui-date-picker status="error" now="2026-10-22"></hui-date-picker>
      <hui-date-picker status="warning" now="2026-10-22"></hui-date-picker>
      <hui-date-picker variant="filled" now="2026-10-22"></hui-date-picker>
      <hui-date-picker variant="borderless" now="2026-10-22"></hui-date-picker>
      <hui-date-picker disabled value="2026-10-22" now="2026-10-22"></hui-date-picker>
    </div>
  `,
};

/** inline: bảng hiện luôn, bấm ô = chọn */
export const Inline = {
  render: () => html`<hui-date-picker id="dp-inline" inline value="2026-10-22" now="2026-10-22" name="d"></hui-date-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dp-inline');
    await el.updateComplete;
    await expect(isOpen(el)).toBe(true);
    await expect(part(el, 'trigger').hidden).toBe(true);
    await userEvent.click(cell(el, '2026-10-02'));
    await expect(el.value).toBe('2026-10-02');
    await expect(cell(el, '2026-10-02').getAttribute('aria-selected')).toBe('true');
    await expect(isOpen(el)).toBe(true);
  },
};

/** Đổi ngôn ngữ: en → MM/DD/YYYY, tuần bắt đầu Chủ nhật */
export const Locale = {
  render: () => html`<hui-date-picker id="dp-loc" value="2026-10-22" now="2026-10-22" no-animation></hui-date-picker>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dp-loc');
    await el.updateComplete;
    try {
      setLocale('en');
      await waitFor(() => expect(input(el).value).toBe('10/22/2026'));
      await expect(el.value).toBe('2026-10-22');
      await userEvent.click(input(el));
      await waitFor(() => expect(isOpen(el)).toBe(true));
      await expect(sr(el).querySelector('[role="gridcell"]').dataset.key).toBe('2026-09-27');
      await userEvent.keyboard('{Escape}');
    } finally {
      setLocale('vi');
    }
    await waitFor(() => expect(input(el).value).toBe('22/10/2026'));
    input(el).blur();
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .dp-brand {
        --hui-picker-width: 220px;
        --hui-picker-radius: 999px;
        --hui-picker-focus-border-color: var(--hui-success);
        --hui-picker-popup-radius: 16px;
        --hui-calendar-selected-bg: var(--hui-success);
        --hui-calendar-cell-radius: 50%;
      }
      .dp-brand::part(suffix) { color: var(--hui-success); }
      .dp-brand::part(header) { border-bottom: 0; }
      .dp-brand::part(today-btn) { color: var(--hui-success); font-weight: 600; }
    </style>
    <hui-date-picker class="dp-brand" value="2026-10-22" now="2026-10-20" clearable></hui-date-picker>
  `,
};
