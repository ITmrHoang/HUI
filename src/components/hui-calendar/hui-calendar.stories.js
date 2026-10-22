/**
 * Storybook Stories — HUI Calendar (lịch tháng / năm / thập kỷ)
 * Mọi story kiểm tra logic đều đặt `now` + `value` cố định → không phụ thuộc ngày / múi giờ của máy chạy test.
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { setLocale } from '../../core/locale.js';
import './index.js';

const sr = (el) => el.shadowRoot;
const cell = (el, key) => sr(el).querySelector(`[data-key="${key}"]`);
const active = (el) => sr(el).querySelector('[role="gridcell"][tabindex="0"]');
const titleText = (el) => sr(el).querySelector('[part="title"]').textContent.replace(/\s+/g, ' ').trim();

/** Sự kiện mẫu cố định cho tháng 10/2026 */
const EVENTS = {
  '2026-10-05': [{ type: 'success', text: 'Họp kick-off' }],
  '2026-10-12': [{ type: 'warning', text: 'Hạn nộp báo cáo' }, { type: 'info', text: 'Demo sprint' }],
  '2026-10-22': [{ type: 'danger', text: 'Phát hành v1.0' }, { type: 'info', text: 'Họp khách hàng' }, { type: 'success', text: 'Tiệc team' }],
  '2026-10-28': [{ type: 'info', text: 'Đào tạo nội bộ' }],
};

function eventList(date) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const list = EVENTS[key];
  if (!list) return null;
  const ul = document.createElement('ul');
  ul.style.cssText = 'list-style:none;margin:0;padding:0;display:grid;gap:2px';
  for (const ev of list) {
    const li = document.createElement('li');
    li.style.cssText = `display:flex;gap:4px;align-items:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
    const dot = document.createElement('span');
    dot.style.cssText = `width:6px;height:6px;border-radius:50%;flex-shrink:0;background:var(--hui-${ev.type})`;
    li.append(dot, ev.text);
    ul.append(li);
  }
  return ul;
}

export default {
  title: 'Organisms/HuiCalendar',
  component: 'hui-calendar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Calendar** — Lịch tháng / năm / thập kỷ (Ant Calendar + MUI DateCalendar), tự viết bằng \`Intl.DateTimeFormat\`
(không thư viện ngày giờ). Tên tháng / thứ theo ngôn ngữ (\`vi\`: tuần bắt đầu thứ Hai, \`en\`: Chủ nhật).
Variant \`card\` (thẻ nhỏ) hoặc \`full\` (toàn chiều rộng, ô cao chứa sự kiện). Nội dung ô qua \`dateCellRender\` hoặc \`<template>\`.

\`\`\`html
<hui-calendar value="2026-10-22"></hui-calendar>
<hui-calendar variant="full" mode="month"></hui-calendar>
<hui-calendar id="cal">
  <template><span data-bind="count"></span> việc</template>
</hui-calendar>
<script>
  cal.cellData = { '2026-10-22': { count: 3 } };
  cal.disabledDate = (d) => d.getDay() === 0;
  cal.addEventListener('hui-select', (e) => console.log(e.detail.value));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | \`YYYY-MM-DD\` | — | Ngày đang chọn |
| \`mode\` | \`month\` \\| \`year\` \\| \`decade\` | \`month\` | Lưới ngày / lưới tháng / lưới năm (đơn vị được chọn) |
| \`variant\` | \`card\` \\| \`full\` | \`card\` | Thẻ nhỏ gọn / toàn trang |
| \`min\` / \`max\` | \`YYYY-MM-DD\` | — | Giới hạn ngày chọn được |
| \`now\` | \`YYYY-MM-DD\` | ngày máy | Ngày "hôm nay" (cố định cho test / demo) |
| \`default-month\` | \`YYYY-MM\` | tháng của \`now\` | Tháng hiển thị khi chưa có value |
| \`show-week\` | boolean | \`false\` | Cột số tuần (vi: ISO 8601) |
| \`hide-today\` | boolean | \`false\` | Ẩn nút "Hôm nay" |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng trượt khi đổi tháng |

### Properties (JS)
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`disabledDate\` | \`(date: Date) => boolean\` | Ngày không chọn được |
| \`dateCellRender\` | \`(date: Date) => Node \\| string \\| null\` | Nội dung thêm ô ngày |
| \`monthCellRender\` | \`(date: Date) => Node \\| string \\| null\` | Nội dung thêm ô tháng (mode year) |
| \`cellData\` | object \\| \`(date, unit) => object\` | Dữ liệu cho \`<template>\` (khóa \`YYYY-MM-DD\` / \`YYYY-MM\`) |
| \`valueAsDate\` | \`Date \\| null\` | Ngày đang chọn dạng Date (chỉ đọc) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-select\` | \`{ value, date, source }\` | Chọn ô (\`source\`: \`date\` \\| \`month\` \\| \`year\`) — kể cả nút "Hôm nay" |
| \`hui-panel-change\` | \`{ year, month, mode, value }\` | Đổi tháng / năm / view (\`month\` 1-12) |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | \`<template>\` vẽ nội dung ô có dữ liệu trong \`cellData\` (item = \`{ date, day, month, year, ...dữ liệu }\`) |

### Bàn phím (WAI-ARIA APG Grid)
| Phím | Hành động |
|------|-----------|
| \`← → ↑ ↓\` | Ngày trước / sau / tuần trước / sau (mode year: ±1 / ±3 tháng; decade: ±1 / ±3 năm) |
| \`Home\` / \`End\` | Đầu / cuối tuần (hoặc hàng) |
| \`PageUp\` / \`PageDown\` | Tháng trước / sau (\`Shift\` = năm; mode year: năm; decade: 10 năm) |
| \`Enter\` / \`Space\` | Chọn ô (ở view cấp trên: đi xuống) |
| \`Tab\` | Header → lưới (chỉ 1 ô nhận Tab — roving tabindex) |

Bấm tiêu đề tháng / năm = đi lên view tháng / năm tạm thời; chọn ô ở đó = quay về \`mode\` gốc.
Variant \`full\` có nhóm nút Tháng / Năm đổi \`mode\`.

### Parts
\`base\`, \`panel\`, \`header\`, \`nav-btn\` (+ \`super-prev\` \`prev\` \`next\` \`super-next\`), \`title\`, \`title-btn\` (+ \`month-btn\` \`year-btn\`),
\`today-btn\`, \`footer\`, \`mode-switch\`, \`mode-btn\`, \`grid\`, \`weekday\`, \`week-num\`, \`row\`,
\`cell\` (+ \`cell-today\` \`cell-selected\` \`cell-disabled\` \`cell-outside\`), \`cell-inner\`, \`cell-content\`.

### Biến CSS
| Biến | Mô tả |
|------|-------|
| \`--hui-calendar-bg\` / \`--hui-calendar-padding\` | Nền / đệm |
| \`--hui-calendar-radius\` / \`--hui-calendar-border-color\` / \`--hui-calendar-width\` | Bo góc / viền / rộng (card) |
| \`--hui-calendar-cell-size\` / \`--hui-calendar-cell-radius\` | Kích thước / bo góc ô |
| \`--hui-calendar-cell-hover-bg\` | Nền ô khi hover |
| \`--hui-calendar-selected-bg\` / \`--hui-calendar-selected-color\` | Ô đang chọn |
| \`--hui-calendar-range-bg\` | Nền ô chọn (full) / dải khoảng (range picker) |
| \`--hui-calendar-today-color\` | Viền ô hôm nay |
| \`--hui-calendar-disabled-bg\` | Nền ô bị vô hiệu |
| \`--hui-calendar-full-cell-height\` | Chiều cao ô (full) |

### Tiện ích ngày (import từ \`@itmrhoang/h-ui/hui-calendar\`)
\`dateUtils.parseISO\`, \`formatPattern(d, 'DD/MM/YYYY HH:mm')\`, \`parsePattern\`, \`toISO(d, 'date' | 'week' | 'month' | 'quarter' | 'year')\`,
\`addDays\`, \`addMonths\`, \`diffDays\`, \`startOfWeek\`, \`weekInfo\`, \`monthGrid\`, \`monthNames\`, \`weekdayNames\`…
        `,
      },
    },
  },
  argTypes: {
    mode: { control: 'select', options: ['month', 'year', 'decade'] },
    variant: { control: 'select', options: ['card', 'full'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-calendar
      value=${args.value}
      now="2026-10-22"
      mode=${args.mode}
      variant=${args.variant}
      ?show-week=${args.showWeek}
      ?hide-today=${args.hideToday}
    ></hui-calendar>
  `,
  args: { value: '2026-10-22', mode: 'month', variant: 'card', showWeek: false, hideToday: false },
};

/** Lưới đúng tuần bắt đầu thứ Hai (vi), hôm nay + ngày chọn + ngày tràn được đánh dấu */
export const GridAndSelection = {
  render: () => html`<hui-calendar id="c-grid" value="2026-10-15" now="2026-10-22"></hui-calendar>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#c-grid');
    await el.updateComplete;
    const grid = sr(el).querySelector('[role="grid"]');
    await expect(grid.querySelectorAll('[role="gridcell"]').length).toBe(42);
    // 1/10/2026 là thứ Năm → ô đầu tiên là thứ Hai 28/9
    await expect(grid.querySelector('[role="gridcell"]').dataset.key).toBe('2026-09-28');
    await expect(cell(el, '2026-09-28').part.contains('cell-outside')).toBe(true);
    await expect(cell(el, '2026-10-22').getAttribute('aria-current')).toBe('date');
    await expect(cell(el, '2026-10-15').getAttribute('aria-selected')).toBe('true');
    await expect(active(el).dataset.key).toBe('2026-10-15');

    const picked = [];
    el.addEventListener('hui-select', (e) => picked.push(e.detail));
    await userEvent.click(cell(el, '2026-10-20'));
    await expect(el.value).toBe('2026-10-20');
    await expect(picked[0].value).toBe('2026-10-20');
    await expect(picked[0].source).toBe('date');
    await expect(cell(el, '2026-10-20').getAttribute('aria-selected')).toBe('true');
    await expect(cell(el, '2026-10-15').getAttribute('aria-selected')).toBe('false');

    // Bấm ngày tràn của tháng sau → chuyển sang tháng 11
    await userEvent.click(cell(el, '2026-11-01'));
    await expect(el.value).toBe('2026-11-01');
    await expect(cell(el, '2026-11-30')).toBeTruthy();
    await expect(cell(el, '2026-11-01').part.contains('cell-outside')).toBe(false);
  },
};

/** Bàn phím APG: mũi tên, Home/End, PageUp/PageDown (+Shift), Enter chọn; header điều hướng */
export const Keyboard = {
  render: () => html`<hui-calendar id="c-kb" value="2026-10-22" now="2026-10-22" no-animation></hui-calendar>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#c-kb');
    await el.updateComplete;
    const changes = [];
    el.addEventListener('hui-panel-change', (e) => changes.push(`${e.detail.year}-${e.detail.month}-${e.detail.mode}`));
    el.focus();
    await expect(active(el).dataset.key).toBe('2026-10-22');
    await userEvent.keyboard('{ArrowRight}');
    await expect(active(el).dataset.key).toBe('2026-10-23');
    await userEvent.keyboard('{ArrowDown}');
    await expect(active(el).dataset.key).toBe('2026-10-30');
    await userEvent.keyboard('{ArrowDown}'); // sang tháng 11
    await expect(active(el).dataset.key).toBe('2026-11-06');
    await expect(changes).toEqual(['2026-11-month']);
    await expect(titleText(el)).toContain('2026');
    await userEvent.keyboard('{Home}'); // thứ Hai
    await expect(active(el).dataset.key).toBe('2026-11-02');
    await userEvent.keyboard('{End}'); // Chủ nhật
    await expect(active(el).dataset.key).toBe('2026-11-08');
    await userEvent.keyboard('{PageUp}');
    await expect(active(el).dataset.key).toBe('2026-10-08');
    await userEvent.keyboard('{Shift>}{PageDown}{/Shift}');
    await expect(active(el).dataset.key).toBe('2027-10-08');
    await userEvent.keyboard('{ArrowLeft}{Enter}');
    await expect(el.value).toBe('2027-10-07');
    // Focus vẫn ở ô vừa chọn sau khi vẽ lại
    await expect(sr(el).activeElement?.dataset.key).toBe('2027-10-07');
    el.blur();
  },
};

/** Tiêu đề: tháng → lưới tháng, năm → lưới năm; chọn ô ở đó = đi xuống, không đổi value */
export const HeaderNavigation = {
  render: () => html`<hui-calendar id="c-nav" value="2026-10-22" now="2026-10-22" no-animation></hui-calendar>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#c-nav');
    await el.updateComplete;
    const changes = [];
    el.addEventListener('hui-panel-change', (e) => changes.push(e.detail));
    const btn = (p) => sr(el).querySelector(`[part~="${p}"]`);

    await userEvent.click(btn('next'));
    await expect(changes.at(-1)).toMatchObject({ year: 2026, month: 11, mode: 'month' });
    await userEvent.click(btn('super-prev'));
    await expect(changes.at(-1)).toMatchObject({ year: 2025, month: 11 });
    await userEvent.click(btn('prev'));
    await expect(changes.at(-1)).toMatchObject({ year: 2025, month: 10 });

    await userEvent.click(btn('month-btn'));
    await expect(changes.at(-1).mode).toBe('year');
    await expect(sr(el).querySelectorAll('[role="gridcell"]').length).toBe(12);
    await userEvent.click(btn('year-btn'));
    await expect(changes.at(-1).mode).toBe('decade');
    await expect(cell(el, '2019').part.contains('cell-outside')).toBe(true);
    await userEvent.click(cell(el, '2024'));
    await expect(changes.at(-1).mode).toBe('year');
    await userEvent.click(cell(el, '2024-03'));
    await expect(changes.at(-1)).toMatchObject({ year: 2024, month: 3, mode: 'month' });
    await expect(el.value).toBe('2026-10-22');
    await expect(el.mode).toBe('month');

    // Hôm nay → về tháng hiện tại + chọn ngày hôm nay
    await userEvent.click(sr(el).querySelector('[part="today-btn"]'));
    await expect(cell(el, '2026-10-22').getAttribute('aria-selected')).toBe('true');
  },
};

/** mode year chọn tháng, mode decade chọn năm (giữ ngày/tháng hiện tại) */
export const Modes = {
  render: () => html`
    <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start;">
      <hui-calendar id="c-year" mode="year" value="2026-10-22" now="2026-10-22"></hui-calendar>
      <hui-calendar id="c-decade" mode="decade" value="2026-10-22" now="2026-10-22"></hui-calendar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const y = canvasElement.querySelector('#c-year');
    const d = canvasElement.querySelector('#c-decade');
    await y.updateComplete;
    await expect(cell(y, '2026-10').getAttribute('aria-selected')).toBe('true');
    const got = [];
    y.addEventListener('hui-select', (e) => got.push(e.detail));
    await userEvent.click(cell(y, '2026-02'));
    await expect(y.value).toBe('2026-02-22');
    await expect(got[0].source).toBe('month');
    await userEvent.keyboard('{ArrowDown}{Enter}'); // +3 tháng
    await expect(y.value).toBe('2026-05-22');

    await userEvent.click(cell(d, '2029'));
    await expect(d.value).toBe('2029-10-22');
    await expect(d.shadowRoot.querySelector('[part="title"]').textContent).toContain('2020 – 2029');
  },
};

/** min / max + disabledDate (cuối tuần): không chọn được, aria-disabled */
export const DisabledDates = {
  render: () => html`<hui-calendar id="c-dis" value="2026-10-14" now="2026-10-14" min="2026-10-05" max="2026-10-28"></hui-calendar>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#c-dis');
    el.disabledDate = (date) => date.getDay() === 0 || date.getDay() === 6;
    await el.updateComplete;
    await expect(cell(el, '2026-10-04').getAttribute('aria-disabled')).toBe('true'); // < min
    await expect(cell(el, '2026-10-29').getAttribute('aria-disabled')).toBe('true'); // > max
    await expect(cell(el, '2026-10-17').getAttribute('aria-disabled')).toBe('true'); // thứ Bảy
    await expect(cell(el, '2026-10-16').hasAttribute('aria-disabled')).toBe(false);
    await userEvent.click(cell(el, '2026-10-17'));
    await expect(el.value).toBe('2026-10-14');
    await userEvent.click(cell(el, '2026-10-16'));
    await expect(el.value).toBe('2026-10-16');
  },
};

/** Variant full + dateCellRender (danh sách sự kiện) + nhóm nút Tháng / Năm */
export const FullWithEvents = {
  render: () => html`<hui-calendar id="c-full" variant="full" value="2026-10-22" now="2026-10-22"></hui-calendar>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#c-full');
    el.dateCellRender = eventList;
    el.monthCellRender = (date) => (date.getMonth() === 9 ? '4 sự kiện' : null);
    await el.updateComplete;
    await expect(cell(el, '2026-10-22').querySelectorAll('li').length).toBe(3);
    await expect(cell(el, '2026-10-22').getAttribute('aria-label')).toContain('Phát hành v1.0');
    const modes = sr(el).querySelectorAll('[part="mode-btn"]');
    await expect(modes[0].getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(modes[1]);
    await waitFor(() => expect(el.mode).toBe('year'));
    await expect(cell(el, '2026-10').textContent).toContain('4 sự kiện');
    await userEvent.click(modes[0]);
    await waitFor(() => expect(el.mode).toBe('month'));
  },
};

/** <template> + cellData: số việc mỗi ngày (data-bind) */
export const TemplateCells = {
  render: () => html`
    <hui-calendar id="c-tpl" value="2026-10-22" now="2026-10-22">
      <template>
        <span style="display: inline-block; min-width: 14px; padding: 0 3px; border-radius: 7px; background: var(--hui-primary); color: var(--hui-text-light-solid, #fff);"
          data-bind="count"></span>
      </template>
    </hui-calendar>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#c-tpl');
    el.cellData = { '2026-10-05': { count: 2 }, '2026-10-22': { count: 5 } };
    await el.updateComplete;
    await expect(cell(el, '2026-10-22').querySelector('[part="cell-content"]').textContent.trim()).toBe('5');
    await expect(cell(el, '2026-10-06').querySelector('[part="cell-content"]')).toBe(null);
  },
};

/** Số tuần (ISO) + đổi ngôn ngữ: en bắt đầu tuần từ Chủ nhật */
export const WeekNumbersAndLocale = {
  render: () => html`<hui-calendar id="c-wk" value="2026-10-22" now="2026-10-22" show-week></hui-calendar>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#c-wk');
    await el.updateComplete;
    const firstWeek = () => sr(el).querySelector('[part="week-num"]').textContent;
    await expect(firstWeek()).toBe('40'); // tuần ISO chứa 28/9/2026
    try {
      setLocale('en');
      await waitFor(() => expect(sr(el).querySelector('[part="weekday"]').textContent).toBe('Sun'));
      await expect(sr(el).querySelector('[role="gridcell"]').dataset.key).toBe('2026-09-27');
      await expect(sr(el).querySelector('[part="today-btn"]').textContent).toBe('Today');
    } finally {
      setLocale('vi');
    }
    await waitFor(() => expect(sr(el).querySelector('[role="gridcell"]').dataset.key).toBe('2026-09-28'));
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cal-brand {
        --hui-calendar-selected-bg: var(--hui-success);
        --hui-calendar-today-color: var(--hui-warning);
        --hui-calendar-cell-size: 34px;
        --hui-calendar-cell-radius: 50%;
        --hui-calendar-width: 340px;
        --hui-calendar-radius: 16px;
      }
      .cal-brand::part(header) { border-bottom-style: dashed; }
      .cal-brand::part(weekday) { color: var(--hui-primary); font-weight: 600; }
      .cal-brand::part(cell-disabled) { text-decoration: line-through; }
    </style>
    <hui-calendar class="cal-brand" value="2026-10-22" now="2026-10-20" min="2026-10-03"></hui-calendar>
  `,
};
