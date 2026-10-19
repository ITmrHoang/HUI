/**
 * Storybook Stories — HUI Grid (hui-row + hui-col)
 * Lưới 24 cột: span, offset, order, push/pull, gutter, responsive theo breakpoint.
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';

const cell = (label, tone = 2) => html`
  <div style="padding: 12px 0; text-align: center; border-radius: 6px; font: 13px var(--hui-font-family);
    background: var(--hui-primary-${tone}); color: ${tone > 5 ? 'var(--hui-text-inverse)' : 'var(--hui-primary-9)'};">${label}</div>
`;

export default {
  title: 'Components/Layout/HuiGrid',
  component: 'hui-col',
  subcomponents: { HuiRow: 'hui-row' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Grid** — Lưới 24 cột (Ant Grid + MUI Grid) gồm \`<hui-row>\` và \`<hui-col>\`.

\`\`\`html
<hui-row gutter="16,24">
  <hui-col span="24" span-md="12" span-lg="8">…</hui-col>
  <hui-col span="12" offset="6">…</hui-col>
</hui-row>
\`\`\`

### hui-row — Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`gutter\` | string | 0 | \`"h"\` hoặc \`"h,v"\`: số (px), từ khóa sm (8) / md (16) / lg (24) / xl (32) hoặc độ dài CSS |
| \`align\` | string | — | top, middle, bottom, stretch, baseline (căn dọc) |
| \`justify\` | string | — | start, end, center, space-around, space-between, space-evenly |
| \`wrap\` | string | \`true\` | \`"false"\` = không xuống dòng |

### hui-col — Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`span\` | number | — | Số cột (0–24); 0 = ẩn; không có = rộng theo nội dung |
| \`offset\` | number | 0 | Số cột lùi lề trái |
| \`order\` | number | — | Thứ tự hiển thị |
| \`push\` / \`pull\` | number | — | Dịch phải / trái n cột (không đẩy cột khác) |
| \`flex\` | string | — | \`2\` → \`2 2 auto\`, \`100px\` → \`0 0 100px\`, \`auto\`, \`none\` hoặc giá trị flex đầy đủ |
| \`span-xs\` … \`span-xxl\` | number | — | span theo breakpoint |
| \`offset-xs\` … \`offset-xxl\` | number | — | offset theo breakpoint |

### Breakpoint (mobile-first, giống Ant)
| xs | sm | md | lg | xl | xxl |
|----|----|----|----|----|-----|
| mọi kích thước | ≥ 576px | ≥ 768px | ≥ 992px | ≥ 1200px | ≥ 1600px |

Quy tắc responsive là CSS thuần \`@media\` + \`:host([span-md="6"])\` → không tốn JS theo dõi màn hình.
\`span-xs\` ghi đè \`span\`; breakpoint lớn hơn ghi đè breakpoint nhỏ hơn.

### Slots
| Thẻ | Slot | Mô tả |
|-----|------|-------|
| hui-row | (default) | Các hui-col |
| hui-col | (default) | Nội dung cột |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-row-gutter-x\` / \`--hui-row-gutter-y\` | Gutter mặc định khi không có attribute \`gutter\` |
| \`--hui-col-padding-y\` | Khoảng đệm dọc trong cột |

**Parts:** hui-row: \`base\` (khung flex, margin âm = gutter / 2). hui-col không có DOM bên trong.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <div style="width: 480px;" id="grid">
      <hui-row>
        <hui-col span="24">${cell('24')}</hui-col>
        <hui-col span="12">${cell('12', 3)}</hui-col>
        <hui-col span="12">${cell('12', 4)}</hui-col>
        <hui-col span="8">${cell('8')}</hui-col>
        <hui-col span="8">${cell('8', 3)}</hui-col>
        <hui-col span="8">${cell('8', 4)}</hui-col>
        <hui-col span="6" offset="6" id="offset">${cell('6 offset 6', 6)}</hui-col>
      </hui-row>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const width = (sel) => canvasElement.querySelector(sel).getBoundingClientRect().width;
    const cols = canvasElement.querySelectorAll('hui-col');
    await expect(Math.round(cols[0].getBoundingClientRect().width)).toBe(480);
    await expect(Math.round(cols[1].getBoundingClientRect().width)).toBe(240);
    await expect(Math.round(cols[3].getBoundingClientRect().width)).toBe(160);
    await expect(Math.round(width('#offset'))).toBe(120);
    const row = canvasElement.querySelector('hui-row').getBoundingClientRect();
    await expect(Math.round(canvasElement.querySelector('#offset').getBoundingClientRect().left - row.left)).toBe(120);

    // Đổi span bằng property → attribute phản chiếu, CSS cập nhật
    cols[1].span = 6;
    await cols[1].updateComplete;
    await expect(cols[1].getAttribute('span')).toBe('6');
    await expect(Math.round(cols[1].getBoundingClientRect().width)).toBe(120);
    cols[1].span = 12;
  },
};

/** Gutter ngang + dọc */
export const Gutter = {
  render: () => html`
    <div style="width: 496px;">
      <hui-row gutter="16,24" id="gutter">
        ${Array.from({ length: 8 }, (_, i) => html`<hui-col span="6">${cell(`col-6 #${i + 1}`)}</hui-col>`)}
      </hui-row>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cols = canvasElement.querySelectorAll('#gutter hui-col');
    const a = cols[0].querySelector('div').getBoundingClientRect();
    const b = cols[1].querySelector('div').getBoundingClientRect();
    const c = cols[4].querySelector('div').getBoundingClientRect();
    // Khoảng cách ngang giữa nội dung 2 cột = 16px, dọc giữa 2 hàng = 24px; cột đầu sát mép trái
    await expect(Math.round(b.left - a.right)).toBe(16);
    await expect(Math.round(c.top - a.bottom)).toBe(24);
    const row = canvasElement.querySelector('#gutter').getBoundingClientRect();
    await expect(Math.round(a.left - row.left)).toBe(0);
  },
};

/** Responsive — đổi kích thước khung xem (viewport) để thấy cột đổi span */
export const Responsive = {
  render: () => html`
    <hui-row gutter="12,12">
      <hui-col span-xs="24" span-sm="12" span-md="8" span-lg="6" span-xl="4">${cell('xs 24 · sm 12 · md 8 · lg 6 · xl 4')}</hui-col>
      <hui-col span-xs="24" span-sm="12" span-md="8" span-lg="6" span-xl="4">${cell('xs 24 · sm 12 · md 8 · lg 6 · xl 4', 3)}</hui-col>
      <hui-col span-xs="24" span-sm="12" span-md="8" span-lg="6" span-xl="4">${cell('xs 24 · sm 12 · md 8 · lg 6 · xl 4', 4)}</hui-col>
      <hui-col span-xs="24" span-sm="12" span-md="8" span-lg="6" span-xl="4">${cell('xs 24 · sm 12 · md 8 · lg 6 · xl 4')}</hui-col>
      <hui-col span="24" span-md="0">${cell('Chỉ hiện khi < 768px (span-md="0")', 6)}</hui-col>
    </hui-row>
  `,
  play: async ({ canvasElement }) => {
    const col = canvasElement.querySelector('hui-col');
    const row = canvasElement.querySelector('hui-row').shadowRoot.querySelector('[part="base"]').getBoundingClientRect();
    const w = window.innerWidth;
    const span = w >= 1200 ? 4 : w >= 992 ? 6 : w >= 768 ? 8 : w >= 576 ? 12 : 24;
    await expect(Math.round(col.getBoundingClientRect().width)).toBe(Math.round((row.width * span) / 24));
    const last = canvasElement.querySelectorAll('hui-col')[4];
    await expect(getComputedStyle(last).display).toBe(w >= 768 ? 'none' : 'block');
  },
};

/** Căn chỉnh hàng: justify + align */
export const Alignment = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'].map((j) => html`
        <hui-row justify=${j} align="middle" style="background: var(--hui-fill-tertiary); border-radius: 8px;">
          <hui-col span="4">${cell(j)}</hui-col>
          <hui-col span="4"><div style="height: 64px; display: grid; place-items: center; background: var(--hui-primary-3); border-radius: 6px;">cao</div></hui-col>
          <hui-col span="4">${cell('4', 4)}</hui-col>
        </hui-row>
      `)}
    </div>
  `,
};

/** order / push / pull / flex */
export const OrderPushPullFlex = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-row gutter="8">
        <hui-col span="6" order="3">${cell('1 (order 3)')}</hui-col>
        <hui-col span="6" order="2">${cell('2 (order 2)', 3)}</hui-col>
        <hui-col span="6" order="1">${cell('3 (order 1)', 4)}</hui-col>
      </hui-row>
      <hui-row gutter="8">
        <hui-col span="18" push="6">${cell('span 18 push 6')}</hui-col>
        <hui-col span="6" pull="18">${cell('span 6 pull 18', 4)}</hui-col>
      </hui-row>
      <hui-row gutter="8">
        <hui-col flex="100px">${cell('flex 100px', 4)}</hui-col>
        <hui-col flex="auto">${cell('flex auto')}</hui-col>
        <hui-col flex="2">${cell('flex 2', 3)}</hui-col>
      </hui-row>
    </div>
  `,
};

/** Override từ bên ngoài */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .dense-grid { --hui-row-gutter-x: 4px; --hui-row-gutter-y: 4px; --hui-col-padding-y: 2px; }
      hui-row.card::part(base) { padding: 8px; border-radius: 12px; background: var(--hui-bg-tertiary); }
    </style>
    <div class="dense-grid">
      <hui-row>
        ${Array.from({ length: 6 }, (_, i) => html`<hui-col span="4">${cell(`gutter từ biến CSS #${i + 1}`)}</hui-col>`)}
      </hui-row>
    </div>
    <br />
    <hui-row class="card" gutter="lg">
      <hui-col span="12">${cell('::part(base)', 3)}</hui-col>
      <hui-col span="12">${cell('gutter="lg" (24px)', 3)}</hui-col>
    </hui-row>
  `,
};
