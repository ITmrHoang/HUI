/**
 * Storybook Stories — HUI Back Top
 * Nút cuộn lên đầu trang: hiện sau khi cuộn, vòng tiến độ, vùng cuộn tùy chọn, hình dạng & kích thước.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Molecules/HuiBackTop',
  component: 'hui-back-top',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Back Top** — Nút cuộn lên đầu trang (Ant FloatButton.BackTop + MUI Scroll to top).

Hiện với hiệu ứng zoom + fade khi cuộn quá \`visibility-height\`, ẩn lại khi cuộn lên trên ngưỡng.
\`progress\` vẽ vòng quanh nút thể hiện % trang đã đọc. Bấm → cuộn mượt về đầu
(người dùng bật *giảm chuyển động* → nhảy thẳng). Đặt trong \`<hui-float-group>\` → tự nằm trong cụm nút.

> Các ví dụ dưới đây đặt trong khung có \`transform\` để nút \`position: fixed\` bám theo khung thay vì cửa sổ.

### Cách sử dụng
\`\`\`html
<!-- Cả trang -->
<hui-back-top progress></hui-back-top>

<!-- Trong một vùng cuộn -->
<div id="feed" style="height: 400px; overflow: auto">...</div>
<hui-back-top target="#feed" visibility-height="200" position="bottom-left" offset="16,32"></hui-back-top>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`visibility-height\` | number | \`400\` | Cuộn quá số px này thì hiện nút |
| \`target\` | string | — | CSS selector vùng cuộn; bỏ trống = cửa sổ |
| \`position\` | string | \`'bottom-right'\` | \`bottom-right\` \\| \`bottom-left\` |
| \`offset\` | string | \`'24'\` | Khoảng cách tới mép (px): \`"24"\` hoặc \`"x,y"\` |
| \`shape\` | string | \`'circle'\` | \`circle\` \\| \`square\` |
| \`size\` | string | \`'md'\` | \`sm\` (32) \\| \`md\` (40) \\| \`lg\` (48) |
| \`progress\` | boolean | \`false\` | Vòng tiến độ % đã cuộn |
| \`inline\` | boolean | \`false\` | Nằm trong luồng trang (hui-float-group tự đặt) |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng hiện/ẩn + cuộn mượt |
| \`visible\` | boolean | — | **Chỉ đọc** — có mặt khi nút đang hiển thị (cũng là \`:state(visible)\`) |

### Methods
| Method | Mô tả |
|--------|-------|
| \`scrollToTop()\` | Cuộn vùng đích về đầu |

### Slots
| Slot | Mô tả |
|------|-------|
| \`icon\` | Icon thay cho \`chevron-up\` |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Focus vào nút (khi đang hiển thị) |
| \`Enter\` / \`Space\` | Cuộn lên đầu |

\`aria-label\` mặc định theo locale (\`backTop.label\`: "Lên đầu trang" / "Back to top"), đặt \`aria-label\` trên thẻ để thay.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-back-top-size\` | Đường kính |
| \`--hui-back-top-radius\` | Bo góc (square) |
| \`--hui-back-top-bg\` / \`--hui-back-top-color\` / \`--hui-back-top-hover-bg\` | Nền / icon / nền hover |
| \`--hui-back-top-shadow\` | Đổ bóng |
| \`--hui-back-top-icon-size\` | Cỡ icon |
| \`--hui-back-top-focus-color\` | Viền focus |
| \`--hui-back-top-progress-color\` / \`--hui-back-top-track-color\` | Vòng tiến độ / nền vòng |
| \`--hui-back-top-offset-x\` / \`--hui-back-top-offset-y\` | Khoảng cách tới mép (attribute \`offset\` ưu tiên hơn) |

**Parts:** \`base\`, \`icon\`, \`progress\`, \`progress-track\`, \`progress-bar\`. Custom state: \`hui-back-top:state(visible)\`.
        `,
      },
    },
  },
  argTypes: {
    visibilityHeight: { control: 'number', table: { defaultValue: { summary: 400 } } },
    position: { control: 'select', options: ['bottom-right', 'bottom-left'], table: { defaultValue: { summary: 'bottom-right' } } },
    shape: { control: 'select', options: ['circle', 'square'], table: { defaultValue: { summary: 'circle' } } },
    size: { control: 'select', options: ['sm', 'md', 'lg'], table: { defaultValue: { summary: 'md' } } },
    offset: { control: 'text' },
    progress: { control: 'boolean' },
    noAnimation: { control: 'boolean' },
  },
};

/** Khung có transform → con `position: fixed` bám theo khung (để demo trong docs) */
const frame = (id, content, extra = '') => html`
  <div style="position: relative; transform: translateZ(0); border: 1px solid var(--hui-border); border-radius: 12px; overflow: hidden; ${extra}">
    <div id=${id} style="height: 320px; overflow: auto; padding: 16px 20px; color: var(--hui-text-secondary);">
      <p><strong>Cuộn xuống</strong> trong khung này để thấy nút xuất hiện.</p>
      ${Array.from({ length: 30 }, (_, i) => html`<p>Đoạn nội dung số ${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`)}
    </div>
    ${content}
  </div>
`;

/** Cuộn trong một vùng (`target`) — Controls đổi hình dạng, kích thước, vị trí... */
export const Default = {
  args: { visibilityHeight: 200, position: 'bottom-right', shape: 'circle', size: 'md', offset: '24', progress: false, noAnimation: false },
  render: (args) => frame('bt-scroll-default', html`
    <hui-back-top
      id="bt-default"
      target="#bt-scroll-default"
      visibility-height=${args.visibilityHeight}
      position=${args.position}
      shape=${args.shape}
      size=${args.size}
      offset=${args.offset}
      ?progress=${args.progress}
      ?no-animation=${args.noAnimation}
    ></hui-back-top>
  `),
  // Kiểm thử: ẩn lúc đầu → cuộn quá ngưỡng thì hiện → bấm thì vùng cuộn về đầu và nút ẩn lại
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector('#bt-scroll-default');
    const backTop = canvasElement.querySelector('#bt-default');
    const button = backTop.shadowRoot.querySelector('[part="base"]');

    await expect(backTop.hasAttribute('visible')).toBe(false);
    await expect(button.getAttribute('aria-label')).toBe('Lên đầu trang');

    scroller.scrollTop = 600;
    await waitFor(() => expect(backTop.hasAttribute('visible')).toBe(true));

    button.click();
    await waitFor(() => expect(scroller.scrollTop).toBe(0), { timeout: 3000 });
    await waitFor(() => expect(backTop.hasAttribute('visible')).toBe(false), { timeout: 2000 });
  },
};

/** Vòng tiến độ quanh nút thể hiện % đã cuộn */
export const Progress = {
  render: () => frame('bt-scroll-progress', html`
    <hui-back-top id="bt-progress" target="#bt-scroll-progress" visibility-height="100" progress></hui-back-top>
    <hui-back-top target="#bt-scroll-progress" visibility-height="100" progress shape="square" position="bottom-left"></hui-back-top>
  `),
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector('#bt-scroll-progress');
    const backTop = canvasElement.querySelector('#bt-progress');
    const bar = backTop.shadowRoot.querySelector('.ring__circle.ring__bar');
    await expect(backTop.shadowRoot.querySelector('[part="progress"]').hidden).toBe(false);

    scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) / 2;
    await waitFor(() => expect(Math.round(parseFloat(bar.style.strokeDashoffset))).toBe(50));
  },
};

/** Hình dạng & kích thước (`inline` + `visibility-height="0"` để luôn hiển thị) */
export const ShapesAndSizes = {
  render: () => html`
    <div style="display: flex; gap: 16px; align-items: center;">
      ${['sm', 'md', 'lg'].map((size) => html`<hui-back-top inline visibility-height="0" size=${size}></hui-back-top>`)}
      ${['sm', 'md', 'lg'].map((size) => html`<hui-back-top inline visibility-height="0" size=${size} shape="square"></hui-back-top>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const items = canvasElement.querySelectorAll('hui-back-top');
    await waitFor(() => expect([...items].every((el) => el.hasAttribute('visible'))).toBe(true));
    await expect(items[0].shadowRoot.querySelector('[part="base"]').offsetWidth).toBe(32);
    await expect(items[2].shadowRoot.querySelector('[part="base"]').offsetWidth).toBe(48);
  },
};

/** Icon tùy chỉnh qua slot `icon` */
export const CustomIcon = {
  render: () => html`
    <div style="display: flex; gap: 16px;">
      <hui-back-top inline visibility-height="0" aria-label="Về đầu">
        <span slot="icon" style="font-size: 12px; font-weight: 700; line-height: 1;">TOP</span>
      </hui-back-top>
      <hui-back-top inline visibility-height="0" shape="square"><hui-icon slot="icon" name="upload"></hui-icon></hui-back-top>
    </div>
  `,
};

/** `no-animation`: hiện/ẩn tức thì, nhảy thẳng về đầu */
export const NoAnimation = {
  render: () => frame('bt-scroll-noanim', html`
    <hui-back-top id="bt-noanim" target="#bt-scroll-noanim" visibility-height="100" no-animation></hui-back-top>
  `),
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector('#bt-scroll-noanim');
    const backTop = canvasElement.querySelector('#bt-noanim');
    scroller.scrollTop = 400;
    await waitFor(() => expect(backTop.hasAttribute('visible')).toBe(true));
    backTop.scrollToTop();
    await waitFor(() => expect(scroller.scrollTop).toBe(0));
    await waitFor(() => expect(backTop.hasAttribute('visible')).toBe(false));
  },
};

/** Override từ bên ngoài — biến CSS trên thẻ cha + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .bt-brand {
        --hui-back-top-size: 52px;
        --hui-back-top-bg: var(--hui-primary);
        --hui-back-top-color: var(--hui-text-inverse);
        --hui-back-top-hover-bg: var(--hui-primary-hover);
        --hui-back-top-progress-color: var(--hui-warning);
        --hui-back-top-track-color: transparent;
        --hui-back-top-offset-x: 32px;
      }
      .bt-brand hui-back-top::part(base) { box-shadow: 0 8px 24px color-mix(in srgb, var(--hui-primary) 45%, transparent); }
      .bt-brand hui-back-top::part(progress-bar) { stroke-width: 4; }
    </style>
    <div class="bt-brand">
      ${frame('bt-scroll-custom', html`<hui-back-top target="#bt-scroll-custom" visibility-height="100" progress></hui-back-top>`)}
    </div>
  `,
};
