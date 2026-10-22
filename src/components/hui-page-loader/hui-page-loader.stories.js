/**
 * Storybook Stories — HUI Page Loader (Molecule)
 * Màn chờ tải trang lần đầu: logo + spinner / thanh tiến độ, tự ẩn khi load, mờ dần.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

/** Khung có transform → lớp phủ position:fixed nằm gọn trong khung (chỉ để xem trong Storybook) */
const frame = (content) => html`
  <div style="position: relative; height: 280px; transform: translateZ(0); overflow: hidden;
    border: 1px dashed var(--hui-border); border-radius: 12px;">
    <div style="padding: 16px;">Nội dung trang phía sau…</div>
    ${content}
  </div>
`;

const LOGO = html`
  <svg slot="logo" width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
    <rect width="56" height="56" rx="14" fill="var(--hui-primary)"/>
    <path d="M17 38V18h5v8h12v-8h5v20h-5v-8H22v8z" fill="var(--hui-text-inverse)"/>
  </svg>
`;

export default {
  title: 'Molecules/HuiPageLoader',
  component: 'hui-page-loader',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Page Loader** — màn chờ toàn màn hình khi tải trang lần đầu. Đặt ngay đầu \`<body>\`:

\`\`\`html
<body>
  <hui-page-loader min-duration="600" remove-on-hide>
    <img slot="logo" src="/logo.svg" alt="" width="64">
  </hui-page-loader>
  …
</body>

<!-- SPA: tự điều khiển -->
<hui-page-loader manual indicator="bar" id="pl"></hui-page-loader>
<script>pl.progress = 40; await loadData(); pl.progress = 100; await pl.hide();</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`min-duration\` | number | \`400\` | Hiện tối thiểu (ms) kể từ khi gắn — tránh nháy |
| \`manual\` | boolean | \`false\` | Không tự ẩn khi \`load\`, tự gọi \`hide()\` |
| \`indicator\` | string | \`'spinner'\` | \`spinner\` / \`dots\` / \`bar\` / \`none\` |
| \`progress\` | number | — | 0–100 → tiến độ xác định; bỏ trống = vô hạn |
| \`text\` | string | — | Dòng chữ (cũng là nhãn trợ năng) |
| \`remove-on-hide\` | boolean | \`false\` | Ẩn xong gỡ thẻ khỏi DOM |
| \`no-animation\` | boolean | \`false\` | Tắt mờ dần |

### Properties & methods
| Tên | Mô tả |
|-----|-------|
| \`hide()\` | Promise — chờ đủ min-duration, mờ dần, host \`hidden\` (rời layout) |
| \`show()\` | Hiện lại |
| \`isVisible\` | Đang hiện |

### Events
| Event | Mô tả |
|-------|-------|
| \`hui-hide\` | Đã ẩn xong |
| \`hui-show\` | Hiện lại bằng show() |

### Slots
\`logo\` (logo phía trên), _(default)_ nội dung phụ dưới chỉ báo.

### Parts
\`base\`, \`content\`, \`logo\`, \`indicator\`, \`bar\`, \`bar-fill\`, \`text\`

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-page-loader-bg\` | \`--hui-bg\` | Nền lớp phủ |
| \`--hui-page-loader-color\` | \`--hui-text-secondary\` | Chữ |
| \`--hui-page-loader-accent\` | \`--hui-primary\` | Màu chỉ báo |
| \`--hui-page-loader-gap\` | \`--hui-space-xl\` | Khoảng cách |
| \`--hui-page-loader-bar-width\` / \`-bar-height\` | min(220px, 60vw) / 4px | Thanh tiến độ |
| \`--hui-page-loader-z-index\` | trên mọi lớp HUI | z-index |
| \`--hui-page-loader-duration\` | 400ms | Thời lượng mờ dần |

### Trợ năng
Lớp phủ là \`role="progressbar"\` có \`aria-label\` (+ \`aria-valuenow\` khi có progress). Trong lúc hiện,
\`<body aria-busy="true">\` — chỉ đặt khi trang chưa tự đặt \`aria-busy\`, và chỉ gỡ khi loader cuối cùng ẩn.
\`prefers-reduced-motion\`: không mờ dần / nhịp thở, thanh vô hạn hiện tĩnh.
        `,
      },
    },
  },
  argTypes: {
    indicator: { control: 'inline-radio', options: ['spinner', 'dots', 'bar', 'none'] },
    progress: { control: { type: 'range', min: 0, max: 100 } },
  },
};

export const Default = {
  render: (args) => frame(html`
    <hui-page-loader manual indicator=${args.indicator} text=${args.text} .progress=${args.progress ?? null}>${LOGO}</hui-page-loader>
  `),
  args: { indicator: 'spinner', text: 'Đang chuẩn bị cửa hàng…' },
  play: async ({ canvasElement }) => {
    const pl = canvasElement.querySelector('hui-page-loader');
    await pl.updateComplete;
    const base = pl.shadowRoot.querySelector('[part="base"]');
    await expect(base.getAttribute('role')).toBe('progressbar');
    await expect(base.getAttribute('aria-label')).toBe('Đang chuẩn bị cửa hàng…');
    await expect(pl.isVisible).toBe(true);
    await expect(document.body.getAttribute('aria-busy')).toBe('true');
  },
};

export const Indicators = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
      ${frame(html`<hui-page-loader manual indicator="spinner" text="spinner"></hui-page-loader>`)}
      ${frame(html`<hui-page-loader manual indicator="dots" text="dots"></hui-page-loader>`)}
      ${frame(html`<hui-page-loader manual indicator="bar" text="bar (vô hạn)"></hui-page-loader>`)}
      ${frame(html`<hui-page-loader manual indicator="bar" progress="65" text="bar 65%"></hui-page-loader>`)}
      ${frame(html`<hui-page-loader manual indicator="spinner" progress="40" text="spinner 40%"></hui-page-loader>`)}
      ${frame(html`<hui-page-loader manual indicator="none">${LOGO}</hui-page-loader>`)}
    </div>
  `,
};

export const AutoHideOnLoad = {
  name: 'Tự ẩn khi load + min-duration',
  render: () => frame(html`<div id="host"></div>`),
  play: async ({ canvasElement }) => {
    // Trang đã load xong → loader mới gắn vẫn hiện đủ min-duration rồi mới ẩn
    const pl = document.createElement('hui-page-loader');
    pl.setAttribute('min-duration', '300');
    let hidden = false;
    pl.addEventListener('hui-hide', () => { hidden = true; });
    const t0 = performance.now();
    canvasElement.querySelector('#host').append(pl);
    await pl.updateComplete;
    await expect(pl.isVisible).toBe(true);
    await waitFor(() => expect(hidden).toBe(true), { timeout: 3000 });
    await expect(performance.now() - t0).toBeGreaterThanOrEqual(290);
    await expect(pl.hidden).toBe(true);
    await expect(getComputedStyle(pl).display).toBe('none');
  },
};

export const ManualProgress = {
  name: 'Điều khiển thủ công (progress + hide)',
  render: () => frame(html`<hui-page-loader manual indicator="bar" min-duration="0" remove-on-hide text="Đang tải dữ liệu…"></hui-page-loader>`),
  play: async ({ canvasElement }) => {
    const pl = canvasElement.querySelector('hui-page-loader');
    await pl.updateComplete;
    const base = pl.shadowRoot.querySelector('[part="base"]');
    await expect(base.hasAttribute('aria-valuenow')).toBe(false);
    pl.progress = 60;
    await pl.updateComplete;
    await expect(base.getAttribute('aria-valuenow')).toBe('60');
    await expect(pl.shadowRoot.querySelector('[part="bar-fill"]').style.width).toBe('60%');

    // body aria-busy: chỉ gỡ khi loader cuối cùng ẩn (các story khác có thể còn loader đang hiện)
    await pl.hide();
    await expect(pl.isConnected).toBe(false); // remove-on-hide
  },
};

export const BodyBusyRespected = {
  name: 'Không đụng aria-busy của trang',
  render: () => frame(html`<div id="host"></div>`),
  play: async ({ canvasElement }) => {
    // Gỡ mọi loader đang hiện của các story khác để kiểm tra độc lập
    const others = [...document.querySelectorAll('hui-page-loader')];
    await Promise.all(others.map((el) => { el.noAnimation = true; el.minDuration = 0; return el.hide(); }));
    const body = document.body;
    await expect(body.hasAttribute('aria-busy')).toBe(false);

    const make = () => {
      const pl = document.createElement('hui-page-loader');
      pl.manual = true;
      pl.noAnimation = true;
      pl.minDuration = 0;
      canvasElement.querySelector('#host').append(pl);
      return pl;
    };
    const a = make();
    const b = make();
    await expect(body.getAttribute('aria-busy')).toBe('true');
    await a.hide();
    await expect(body.getAttribute('aria-busy')).toBe('true'); // b còn hiện
    await b.hide();
    await expect(body.hasAttribute('aria-busy')).toBe(false);

    // Trang tự đặt aria-busy="false" → loader không ghi đè, không xóa
    body.setAttribute('aria-busy', 'false');
    const c = make();
    await expect(body.getAttribute('aria-busy')).toBe('false');
    await c.hide();
    await expect(body.getAttribute('aria-busy')).toBe('false');
    body.removeAttribute('aria-busy');

    // show() lại
    let shown = false;
    c.addEventListener('hui-show', () => { shown = true; });
    c.show();
    await expect(shown).toBe(true);
    await expect(c.hidden).toBe(false);
    await c.hide();
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-loader {
        --hui-page-loader-bg: linear-gradient(135deg, var(--hui-primary-7), var(--hui-primary-9));
        --hui-page-loader-color: var(--hui-text-light-solid);
        --hui-page-loader-accent: var(--hui-text-light-solid);
        --hui-page-loader-bar-width: 160px;
        --hui-page-loader-bar-height: 6px;
      }
      .brand-loader::part(text) { letter-spacing: 0.2em; text-transform: uppercase; font-size: 12px; }
      .brand-loader::part(bar) { background: rgb(255 255 255 / 0.2); }
    </style>
    ${frame(html`<hui-page-loader class="brand-loader" manual indicator="bar" text="H-UI Store">${LOGO}</hui-page-loader>`)}
  `,
};
