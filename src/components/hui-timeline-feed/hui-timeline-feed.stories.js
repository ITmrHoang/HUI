/**
 * Storybook Stories — HUI Timeline Feed (luồng hoạt động)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { svgImage } from '../hui-image/story-images.js';
import './index.js';

const avatar = (hue, label) => svgImage({ w: 96, h: 96, hue, label });
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** Dữ liệu tương đối với thời điểm hiện tại → luôn có "Hôm nay" / "Hôm qua" */
function liveData(now = Date.now()) {
  return [
    { id: 1, user: { name: 'Nguyễn An', avatar: avatar(210, 'A') }, action: 'đã bình luận về', target: 'Thiết kế trang chủ v2', href: '#task-12', time: new Date(now - 4 * MIN).toISOString(), icon: 'chat', color: 'info', content: 'Phần hero nên dùng ảnh sản phẩm thật thay cho minh họa nhé.' },
    { id: 2, user: { name: 'Trần Bình' }, action: 'đã hoàn thành', target: 'Tích hợp thanh toán', time: new Date(now - 50 * MIN).toISOString(), icon: 'check', color: 'success' },
    { id: 3, user: { name: 'Lê Chi', avatar: avatar(330, 'C') }, action: 'đã tải lên 3 tệp vào', target: 'Tài liệu dự án', time: new Date(now - 26 * HOUR).toISOString(), icon: 'upload', color: 'primary' },
    { id: 4, user: { name: 'Phạm Dũng' }, action: 'đã đổi trạng thái', target: 'Sửa lỗi đăng nhập', time: new Date(now - 30 * HOUR).toISOString(), icon: 'edit', color: 'warning', content: 'Đang xử lý → Chờ kiểm thử' },
    { id: 5, user: { name: 'Hoàng Em' }, action: 'đã xóa', target: 'Nhánh feature/old-cart', time: new Date(now - 5 * 24 * HOUR).toISOString(), icon: 'delete', color: 'danger' },
  ];
}

/** Dữ liệu cố định cho test (now = 20/10/2026 15:00 giờ địa phương) */
const FIXED_NOW = '2026-10-20T15:00:00';
const FIXED = [
  { id: 'a', user: { name: 'Ngọc' }, action: 'đã tạo', target: 'Đơn #1024', time: '2026-10-20T10:00:00', icon: 'cart' },
  { id: 'b', user: { name: 'Minh' }, action: 'đã duyệt', target: 'Đơn #1023', time: '2026-10-19T20:00:00', icon: 'check', color: 'success' },
  { id: 'c', user: { name: 'Lan' }, action: 'đã hủy', target: 'Đơn #1001', time: '2026-10-15T09:00:00', icon: 'close', color: 'danger' },
  { id: 'd', user: { name: 'Ngọc' }, action: 'đã cập nhật', target: 'Đơn #1022', time: '2026-10-20T14:30:00', icon: 'edit' },
];

const groupLabels = (el) => [...el.shadowRoot.querySelectorAll('[part="group-label"]')].map((n) => n.textContent);

export default {
  title: 'Organisms/HuiTimelineFeed',
  component: 'hui-timeline-feed',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Timeline Feed** — Luồng hoạt động (activity feed) từ dữ liệu: avatar + "**Ai** đã làm gì với **cái gì**" + thời gian tương đối
tự cập nhật (\`hui-time\`), **nhóm theo ngày** ("Hôm nay", "Hôm qua", "Thứ Năm, 15 tháng 10"). Dựng trên **DataController**:
\`data\` / \`src\` / \`fetchFn\`, tự có skeleton – empty – error – thử lại. Khuôn tùy biến bằng \`<template>\` con.

\`\`\`html
<hui-timeline-feed src="/api/activity" data-path="items" has-more></hui-timeline-feed>
<script>
  feed.addEventListener('hui-load-more', async () => {
    feed.data = [...feed.data, ...(await fetchMore())]; // loadingMore tự tắt khi data đổi
  });
</script>
\`\`\`

### Dữ liệu mỗi mục
\`{ id, user: { name, avatar }, action, target, href, time (ISO), icon, color, content }\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`group-by\` | string | \`day\` | \`day\` \\| \`none\` |
| \`order\` | string | \`desc\` | \`desc\` \\| \`asc\` \\| \`none\` (giữ thứ tự dữ liệu) |
| \`time-format\` | string | \`relative\` | \`relative\` \\| \`date\` \\| \`datetime\` \\| \`time\` (hui-time) |
| \`now\` | string | thời gian thật | Mốc "bây giờ" để tính Hôm nay / Hôm qua |
| \`sticky-header\` | boolean | \`false\` | Tiêu đề ngày dính khi cuộn |
| \`heading-level\` | number | \`3\` | aria-level của tiêu đề ngày |
| \`has-more\` | boolean | \`false\` | Hiện nút "Xem thêm" |
| \`loading-more\` | boolean | \`false\` | Nút đang tải (tự tắt khi data đổi) |
| \`label\` | string | "Hoạt động gần đây" | Nhãn ARIA |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng mục mới trượt vào |
| \`src\` / \`data-path\` / \`params\` / \`debounce\` / \`loading\` / \`empty-text\` | | | DataController |

### Properties
\`data\`, \`fetchFn\`, \`transform\` (DataController) · \`renderItem: (item, index) => Node\` · \`entries\` (chỉ đọc, đã sắp xếp) · \`reload()\`.

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-load-more\` | \`{ count }\` | Bấm "Xem thêm" |
| \`hui-action\` | \`{ action, item, index, originalEvent }\` | (template) bấm phần tử \`data-action\` |
| \`hui-load\` / \`hui-error\` | \`{ data, total }\` / \`{ error }\` | DataController |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Một \`<template>\` làm khuôn phần thân mỗi mục (\`data-bind\`, \`data-bind-attr\`, \`data-format\`, \`data-action\`…) |

### Parts
\`base\`, \`state\`, \`group\`, \`group-label\`, \`list\`, \`item\`, \`avatar\`, \`icon\`, \`text\`, \`user\`, \`target\`, \`time\`, \`content\`, \`footer\`, \`load-more\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-timeline-feed-avatar-size\` | Cỡ avatar (32px) |
| \`--hui-timeline-feed-gap\` | Khoảng cách giữa các mục |
| \`--hui-timeline-feed-line-color\` | Đường nối giữa avatar |
| \`--hui-timeline-feed-group-color\` / \`--hui-timeline-feed-group-bg\` | Tiêu đề ngày |
| \`--hui-timeline-feed-content-bg\` | Nền khối trích dẫn |
| \`--hui-timeline-feed-icon-color\` | Huy hiệu icon (mặc định, \`color\` của mục ưu tiên hơn) |

### Accessibility
Mỗi ngày là \`<section aria-labelledby>\` + tiêu đề \`role="heading"\`; mục là \`<li>\` trong \`<ol>\`. Avatar trang trí (\`aria-hidden\`),
thời gian là \`<time datetime>\` có tooltip ngày đầy đủ. Tab đi qua link đối tượng và nút "Xem thêm".
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`<div style="max-width: 560px;"><hui-timeline-feed id="tf-default" has-more .data=${liveData()}></hui-timeline-feed></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-default');
    await el.updateComplete;
    await waitFor(() => expect(el.shadowRoot.querySelectorAll('[part="item"]').length).toBe(5));
    await expect(el.shadowRoot.querySelector('[part="base"]').getAttribute('aria-label')).toBe('Hoạt động gần đây');
    const first = el.shadowRoot.querySelector('[part="item"]');
    await expect(first.querySelector('[part="user"]').textContent).toBe('Nguyễn An');
    await expect(first.querySelector('[part="target"]').getAttribute('href')).toBe('#task-12');
    await expect(first.querySelector('hui-time').getAttribute('datetime')).toBeTruthy();
  },
};

/** Nhóm theo ngày + sắp xếp mới nhất trước (now cố định) */
export const GroupedByDay = {
  render: () => html`<div style="max-width: 560px;"><hui-timeline-feed id="tf-group" now=${FIXED_NOW} .data=${FIXED}></hui-timeline-feed></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-group');
    await el.updateComplete;
    const labels = groupLabels(el);
    await expect(labels.length).toBe(3);
    await expect(labels[0]).toBe('Hôm nay');
    await expect(labels[1]).toBe('Hôm qua');
    await expect(labels[2]).toContain('15');
    // Trong "Hôm nay": 14:30 trước 10:00
    const today = el.shadowRoot.querySelector('[part="group"]');
    await expect([...today.querySelectorAll('[part="target"]')].map((n) => n.textContent)).toEqual(['Đơn #1022', 'Đơn #1024']);
    await expect(today.getAttribute('aria-labelledby')).toBeTruthy();
    // order="asc" → cũ nhất trước
    el.order = 'asc';
    await el.updateComplete;
    await expect(groupLabels(el)[0]).toContain('15');
    // group-by="none" → một danh sách liền, không tiêu đề
    el.groupBy = 'none';
    await el.updateComplete;
    await expect(groupLabels(el).length).toBe(0);
  },
};

/** Khuôn <template>: data-bind + data-format + data-action */
export const WithTemplate = {
  render: () => html`
    <div style="max-width: 560px;">
      <hui-timeline-feed id="tf-tpl" now=${FIXED_NOW} .data=${FIXED}>
        <template>
          <div style="display: flex; justify-content: space-between; gap: 8px; align-items: baseline;">
            <span><b data-bind="user.name"></b> <span data-bind="action"></span> <i data-bind="target"></i></span>
            <small style="color: var(--hui-text-tertiary)" data-bind="time" data-format="time"></small>
          </div>
          <button type="button" data-action="open" style="margin-top: 4px; font: inherit; font-size: 12px;">Mở chi tiết</button>
        </template>
      </hui-timeline-feed>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-tpl');
    await el.updateComplete;
    await waitFor(() => expect(el.shadowRoot.querySelectorAll('[data-bind="user.name"]').length).toBe(4));
    await expect(el.shadowRoot.querySelector('[data-bind="target"]').textContent).toBe('Đơn #1022');
    let action = null;
    el.addEventListener('hui-action', (e) => { action = e.detail; });
    await userEvent.click(el.shadowRoot.querySelector('[data-action="open"]'));
    await expect(action.action).toBe('open');
    await expect(action.item.id).toBe('d');
  },
};

/** Xem thêm — phát hui-load-more, nút xoay tới khi data đổi */
export const LoadMore = {
  render: () => html`<div style="max-width: 560px;"><hui-timeline-feed id="tf-more" has-more now=${FIXED_NOW} .data=${FIXED.slice(0, 2)}></hui-timeline-feed></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-more');
    const events = [];
    el.addEventListener('hui-load-more', (e) => {
      events.push(e.detail);
      setTimeout(() => {
        el.data = [...el.data, ...FIXED.slice(2)];
        el.hasMore = false;
      }, 50);
    });
    await el.updateComplete;
    const btn = el.shadowRoot.querySelector('[part="load-more"]');
    await expect(btn.textContent).toBe('Xem thêm hoạt động');
    await userEvent.click(btn);
    await expect(events).toEqual([{ count: 2 }]);
    await expect(el.loadingMore).toBe(true);
    await waitFor(() => expect(el.shadowRoot.querySelectorAll('[part="item"]').length).toBe(4));
    await expect(el.loadingMore).toBe(false);
    await expect(el.shadowRoot.querySelector('[part="footer"]').hidden).toBe(true);
  },
};

/** fetchFn: loading (skeleton) → dữ liệu; lỗi → hui-result + Thử lại; rỗng → hui-empty */
export const States = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">
      <hui-timeline-feed id="tf-loading" loading></hui-timeline-feed>
      <hui-timeline-feed id="tf-empty" .data=${[]} empty-text="Chưa có hoạt động nào"></hui-timeline-feed>
      <hui-timeline-feed id="tf-error"></hui-timeline-feed>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const loading = canvasElement.querySelector('#tf-loading');
    await loading.updateComplete;
    await expect(loading.dataState).toBe('loading');
    await expect(loading.shadowRoot.querySelector('hui-skeleton')).not.toBeNull();
    await expect(loading.getAttribute('aria-busy')).not.toBeNull();

    const empty = canvasElement.querySelector('#tf-empty');
    await empty.updateComplete;
    await expect(empty.dataState).toBe('empty');
    await expect(empty.shadowRoot.querySelector('hui-empty').getAttribute('description')).toBe('Chưa có hoạt động nào');

    const err = canvasElement.querySelector('#tf-error');
    let calls = 0;
    err.fetchFn = async () => {
      calls += 1;
      if (calls === 1) throw new Error('Mất kết nối');
      return FIXED;
    };
    await waitFor(() => expect(err.dataState).toBe('error'));
    await err.updateComplete;
    const result = err.shadowRoot.querySelector('hui-result');
    await expect(result.getAttribute('sub-title')).toBe('Mất kết nối');
    await userEvent.click(result.querySelector('hui-button'));
    await waitFor(() => expect(err.dataState).toBe('ready'));
    await err.updateComplete;
    await expect(err.shadowRoot.querySelectorAll('[part="item"]').length).toBe(4);
  },
};

/** Tiêu đề ngày dính khi cuộn trong khung cao cố định */
export const StickyHeader = {
  render: () => html`
    <div style="max-width: 560px; height: 320px; overflow: auto; border: 1px solid var(--hui-border-secondary); border-radius: 8px; padding: 0 16px 16px;">
      <hui-timeline-feed sticky-header time-format="datetime" .data=${[...liveData(), ...liveData(Date.now() - 3 * 24 * HOUR).map((d) => ({ ...d, id: `o${d.id}` }))]}></hui-timeline-feed>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .tf-brand {
        --hui-timeline-feed-avatar-size: 40px;
        --hui-timeline-feed-line-color: var(--hui-primary-2);
        --hui-timeline-feed-group-color: var(--hui-primary);
        --hui-timeline-feed-content-bg: var(--hui-primary-1);
        --hui-timeline-feed-gap: 24px;
      }
      .tf-brand::part(group-label) { text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; }
      .tf-brand::part(content) { border-left: 3px solid var(--hui-primary); border-radius: 0 8px 8px 0; }
    </style>
    <div style="max-width: 560px;"><hui-timeline-feed id="tf-brand" class="tf-brand" now=${FIXED_NOW} .data=${liveData(new Date(FIXED_NOW).getTime())}></hui-timeline-feed></div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-brand');
    await el.updateComplete;
    const av = el.shadowRoot.querySelector('[part="avatar"]');
    await waitFor(() => expect(av.getBoundingClientRect().width).toBe(40));
  },
};
