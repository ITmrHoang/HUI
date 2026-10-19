/**
 * Storybook Stories — HUI Image Zoom (phóng to ảnh sản phẩm)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

/** Ảnh sản phẩm SVG tự sinh — nhiều chi tiết nhỏ để thấy rõ khi phóng */
function productSvg(size) {
  const dots = Array.from({ length: 64 }, (_, i) => {
    const x = 40 + (i % 8) * 40;
    const y = 40 + Math.floor(i / 8) * 40;
    return `<circle cx="${x}" cy="${y}" r="2" fill="#c7b9a6"/>`;
  }).join('');
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#f6f1ea"/>${dots}
    <path d="M70 250c40-6 70-40 92-78 10-17 30-20 44-6l30 30c16 16 40 24 64 24h20c18 0 30 14 30 30v20H70z" fill="#2f5d8a"/>
    <path d="M70 296h280v18c0 8-6 14-14 14H84c-8 0-14-6-14-14z" fill="#f2f2f2" stroke="#c9c9c9"/>
    <path d="M160 190l14 12M176 172l14 12M192 156l14 12" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
    <text x="280" y="268" font-family="sans-serif" font-size="11" fill="#fff">H-UI RUN</text>
    <text x="200" y="370" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#8a7d6b">Chất liệu vải lưới thoáng khí · Đế cao su chống trượt</text>
  </svg>`)}`;
}

const SRC = productSvg(400);
const ZOOM_SRC = productSvg(1200);

const frameOf = (el) => el.shadowRoot.querySelector('[part="frame"]');

function pointer(el, type, rx, ry, pointerType = 'mouse') {
  const r = frameOf(el).getBoundingClientRect();
  frameOf(el).dispatchEvent(new PointerEvent(type, {
    bubbles: true, composed: true, pointerType, pointerId: 1, isPrimary: true,
    clientX: r.left + r.width * rx, clientY: r.top + r.height * ry,
  }));
}

export default {
  title: 'Molecules/HuiImageZoom',
  component: 'hui-image-zoom',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Image Zoom** — rê chuột phóng to ảnh sản phẩm: kính lúp tròn (\`lens\`), khung phóng bên cạnh (\`side\`)
hoặc phóng tại chỗ (\`inner\`). Ảnh lớn \`zoom-src\` tải ngầm ở lần phóng đầu. Trên màn hình cảm ứng: chạm để bật/tắt
phóng tại chỗ, kéo để di chuyển.

\`\`\`html
<hui-image-zoom src="shoe-600.jpg" zoom-src="shoe-1800.jpg" alt="Giày chạy bộ" mode="lens" zoom="3"></hui-image-zoom>
<hui-image-zoom src="shoe.jpg" mode="side" style="width:360px"></hui-image-zoom>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`src\` | string | — | Ảnh hiển thị |
| \`zoom-src\` | string | = src | Ảnh độ phân giải cao dùng khi phóng |
| \`alt\` | string | \`''\` | Mô tả ảnh |
| \`mode\` | \`lens\` \\| \`side\` \\| \`inner\` | \`lens\` | Kiểu phóng |
| \`zoom\` | number | \`2.5\` | Hệ số phóng |
| \`lens-size\` | number | \`160\` | Đường kính kính lúp (px) |
| \`side-placement\` | \`right\` \\| \`left\` | \`right\` | Phía đặt khung phóng (mode side) |
| \`disabled\` | boolean | — | Tắt phóng |
| \`no-animation\` | boolean | — | Tắt hiệu ứng mờ dần |

### Properties
| Property | Mô tả |
|----------|-------|
| \`zoomed\` | \`boolean\` — đang phóng (chỉ đọc) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-zoom-change\` | \`{ active }\` | Bật / tắt phóng |

### Parts
\`base\`, \`frame\` (role="button", aria-pressed), \`image\`, \`lens\`, \`inner\`, \`panel\`. State: \`:state(zoomed)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-image-zoom-radius\` | Bo góc khung ảnh / khung phóng |
| \`--hui-image-zoom-lens-border\` / \`--hui-image-zoom-lens-shadow\` | Kính lúp |
| \`--hui-image-zoom-region-bg\` | Nền ô chọn vùng (side) |
| \`--hui-image-zoom-panel-width\` / \`--hui-image-zoom-panel-height\` | Kích thước khung side (mặc định = ảnh) |
| \`--hui-image-zoom-panel-gap\` / \`--hui-image-zoom-panel-shadow\` | Khoảng cách / bóng khung side |
| \`--hui-image-zoom-cursor\` | Con trỏ trên ảnh |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Enter\` / \`Space\` | Bật / tắt phóng tại chỗ (giữa ảnh) |
| \`←\` \`→\` \`↑\` \`↓\` | Di chuyển vùng phóng (10%) |
| \`Esc\` / rời focus | Thoát phóng |
        `,
      },
    },
  },
  argTypes: {
    mode: { control: 'select', options: ['lens', 'side', 'inner'] },
    zoom: { control: { type: 'number', min: 1.5, max: 6, step: 0.5 } },
    lensSize: { control: 'number' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-image-zoom style="width:320px" src=${SRC} zoom-src=${ZOOM_SRC} alt="Giày chạy bộ H-UI Run"
      mode=${args.mode} zoom=${args.zoom} lens-size=${args.lensSize}></hui-image-zoom>
  `,
  args: { mode: 'lens', zoom: 2.5, lensSize: 160 },
};

export const Modes = {
  render: () => html`
    <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start">
      <figure style="margin:0"><hui-image-zoom style="width:240px" src=${SRC} zoom-src=${ZOOM_SRC} alt="lens" mode="lens"></hui-image-zoom><figcaption>lens</figcaption></figure>
      <figure style="margin:0"><hui-image-zoom style="width:240px" src=${SRC} zoom-src=${ZOOM_SRC} alt="inner" mode="inner" zoom="3"></hui-image-zoom><figcaption>inner</figcaption></figure>
      <figure style="margin:0"><hui-image-zoom style="width:240px" src=${SRC} zoom-src=${ZOOM_SRC} alt="side" mode="side"></hui-image-zoom><figcaption>side</figcaption></figure>
    </div>
  `,
};

export const Disabled = {
  render: () => html`<hui-image-zoom style="width:240px" src=${SRC} alt="Không phóng" disabled></hui-image-zoom>`,
};

/** Rê chuột: kính lúp đi theo con trỏ, rời ảnh thì tắt */
export const LensFollowsPointer = {
  render: () => html`<hui-image-zoom id="iz-l" style="width:300px" src=${SRC} zoom-src=${ZOOM_SRC} alt="Giày" lens-size="100" zoom="2"></hui-image-zoom>`,
  play: async ({ canvasElement }) => {
    const iz = canvasElement.querySelector('#iz-l');
    await iz.updateComplete;
    const events = [];
    iz.addEventListener('hui-zoom-change', (e) => events.push(e.detail.active));
    pointer(iz, 'pointerenter', 0.5, 0.5);
    pointer(iz, 'pointermove', 0.5, 0.5);
    await waitFor(() => expect(iz.zoomed).toBe(true));
    const lens = iz.shadowRoot.querySelector('[part="lens"]');
    // tâm ảnh 300px → kính 100px đặt tại (150-50, 150-50)
    expect(lens.style.transform).toBe('translate(100px, 100px)');
    expect(lens.style.backgroundSize).toBe('600px 600px');
    expect(lens.style.backgroundPosition).toBe('-250px -250px');
    pointer(iz, 'pointerleave', 1.2, 0.5);
    await waitFor(() => expect(iz.zoomed).toBe(false));
    expect(events).toEqual([true, false]);
  },
};

/** Side: ô chọn vùng kẹp trong ảnh, khung bên cạnh hiện */
export const SidePanel = {
  render: () => html`<hui-image-zoom id="iz-s" style="width:200px" src=${SRC} alt="Giày" mode="side" zoom="2"></hui-image-zoom>`,
  play: async ({ canvasElement }) => {
    const iz = canvasElement.querySelector('#iz-s');
    await iz.updateComplete;
    pointer(iz, 'pointerenter', 0.95, 0.95);
    await waitFor(() => expect(iz.zoomed).toBe(true));
    const lens = iz.shadowRoot.querySelector('[part="lens"]');
    // vùng 100×100 (200/2) kẹp về góc dưới phải (100, 100)
    expect(lens.style.transform).toBe('translate(100px, 100px)');
    const panel = iz.shadowRoot.querySelector('[part="panel"]');
    await waitFor(() => expect(getComputedStyle(panel).visibility).toBe('visible'));
    expect(panel.style.backgroundPosition).toBe('-200px -200px');
  },
};

/** Chạm: tap bật phóng tại chỗ, tap lần nữa tắt */
export const TouchToggle = {
  render: () => html`<hui-image-zoom id="iz-t" style="width:240px" src=${SRC} alt="Giày" mode="lens"></hui-image-zoom>`,
  play: async ({ canvasElement }) => {
    const iz = canvasElement.querySelector('#iz-t');
    await iz.updateComplete;
    const frame = frameOf(iz);
    pointer(iz, 'pointerdown', 0.25, 0.25, 'touch');
    frame.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: frame.getBoundingClientRect().left + 60, clientY: frame.getBoundingClientRect().top + 60 }));
    await waitFor(() => expect(iz.zoomed).toBe(true));
    expect(iz.shadowRoot.querySelector('[part="base"]').dataset.render).toBe('inner');
    pointer(iz, 'pointerdown', 0.25, 0.25, 'touch');
    frame.click();
    await waitFor(() => expect(iz.zoomed).toBe(false));
  },
};

/** Bàn phím: Enter bật, mũi tên di chuyển, Esc thoát */
export const Keyboard = {
  render: () => html`<hui-image-zoom id="iz-k" style="width:240px" src=${SRC} alt="Giày" mode="side"></hui-image-zoom>`,
  play: async ({ canvasElement }) => {
    const iz = canvasElement.querySelector('#iz-k');
    await iz.updateComplete;
    const frame = frameOf(iz);
    expect(frame.getAttribute('role')).toBe('button');
    frame.focus();
    await userEvent.keyboard('{Enter}');
    expect(iz.zoomed).toBe(true);
    expect(frame.getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard('{ArrowRight}');
    const inner = iz.shadowRoot.querySelector('[part="inner"]');
    expect(inner.style.backgroundPosition).toBe('60% 50%');
    await userEvent.keyboard('{Escape}');
    expect(iz.zoomed).toBe(false);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .iz-custom {
        --hui-image-zoom-radius: 20px;
        --hui-image-zoom-lens-border: 3px solid var(--hui-primary);
        --hui-image-zoom-cursor: none;
      }
      .iz-custom::part(frame) { border: 1px solid var(--hui-border); }
    </style>
    <hui-image-zoom class="iz-custom" style="width:300px" src=${SRC} zoom-src=${ZOOM_SRC} alt="Giày" lens-size="200" zoom="3"></hui-image-zoom>
  `,
};
