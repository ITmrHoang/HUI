import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import { encodeQR } from './qr-encoder.js';

/** Logo mẫu dạng data URI (không dùng tài nguyên mạng) */
const LOGO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6366f1"/><text x="32" y="42" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">H</text></svg>'
)}`;

export default {
  title: 'Atoms/HuiQrcode',
  component: 'hui-qrcode',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI QR Code** — sinh mã QR bằng encoder tự viết (\`qr-encoder.js\`, không thư viện): byte mode UTF-8 (tiếng Việt),
numeric / alphanumeric tự chọn, phiên bản 1–40 tự chọn, Reed–Solomon, xen kẽ khối, chọn mặt nạ theo điểm phạt.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`value\` | \`''\` | Nội dung mã hóa |
| \`error-level\` | \`M\` | \`L\` · \`M\` · \`Q\` · \`H\` (~7% / 15% / 25% / 30% khôi phục). Có \`icon\` → tự nâng lên \`H\` |
| \`size\` | \`160\` | Cạnh (px), gồm vùng lặng |
| \`color\` / \`bg-color\` | token | Màu ô tối / nền. Mặc định \`--hui-text\` / \`--hui-bg-container\` (đổi theo dark mode) |
| \`margin\` | \`4\` | Vùng lặng (số ô) |
| \`render\` | \`svg\` | \`svg\` · \`canvas\` (canvas vẽ theo \`devicePixelRatio\`) |
| \`icon\` / \`icon-size\` | — | Logo ở giữa (nền đệm cùng màu nền) / kích thước px (mặc định 22% cạnh, tối đa 30%) |
| \`status\` | \`active\` | \`active\` · \`loading\` · \`expired\` (nút làm mới) · \`scanned\` |
| \`bordered\` | — | Viền + khoảng đệm |
| \`label\` | "Mã QR: value" | aria-label của ảnh |

**Sự kiện:** \`hui-refresh\` (bấm Làm mới khi expired) · \`hui-error\` {message} (nội dung quá dài)
**Phương thức:** \`toDataURL(type?, quality?)\` (PNG/JPEG/WebP 2× hoặc \`image/svg+xml\`) · \`download(filename?, type?)\` · getter \`matrix\`, \`effectiveLevel\`
**Slot:** \`status\` — nội dung lớp phủ tùy chỉnh · **Parts:** base, code, status, refresh-button
**Biến CSS:** \`--hui-qrcode-color\`, \`-bg\`, \`-padding\`, \`-radius\`, \`-border-color\`, \`-mask-bg\`
**A11y:** \`<svg>\`/\`<canvas>\` có \`role="img"\` + \`aria-label\`; lớp phủ là \`role="status"\`. **Bàn phím:** Tab tới nút Làm mới.

**Encoder thuần** (dùng được ngoài component): \`import { encodeQR } from '@itmrhoang/h-ui/hui-qrcode'\` →
\`encodeQR(text, { ecl, minVersion, maxVersion, mask, mode })\` trả \`{ size, version, ecl, mask, mode, modules: boolean[][] }\`.

> Mẹo quét tốt nhất (in ấn, máy quét cũ): dùng \`color="#000" bg-color="#fff"\` — ở dark mode mặc định mã bị đảo màu (ô sáng trên nền tối);
> camera điện thoại hiện đại đọc được nhưng một số máy quét cũ thì không.
        `,
      },
    },
  },
};

const row = 'display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start;';
const cap = 'display: grid; gap: 6px; justify-items: center; font: 13px var(--hui-font-family); color: var(--hui-text-secondary);';

export const Default = {
  render: () => html`<hui-qrcode value="https://github.com/itmrhoang/h-ui"></hui-qrcode>`,
  play: async ({ canvasElement }) => {
    const qr = canvasElement.querySelector('hui-qrcode');
    const svg = qr.shadowRoot.querySelector('[part="code"]');
    await expect(svg.tagName.toLowerCase()).toBe('svg');
    await expect(svg.getAttribute('role')).toBe('img');
    await expect(svg.getAttribute('aria-label')).toContain('https://github.com/itmrhoang/h-ui');
    await expect(qr.matrix.version).toBe(3); // 33 byte ở mức M → phiên bản 3
    await expect(svg.getAttribute('viewBox')).toBe(`0 0 ${qr.matrix.size + 8} ${qr.matrix.size + 8}`);
    // Ma trận component = encoder thuần
    await expect(qr.matrix.modules).toEqual(encodeQR('https://github.com/itmrhoang/h-ui', { ecl: 'M' }).modules);
    await expect(Math.round(svg.getBoundingClientRect().width)).toBe(160);
    // attr ↔ prop
    qr.errorLevel = 'H';
    await waitFor(() => expect(qr.getAttribute('error-level')).toBe('H'));
    await expect(qr.matrix.ecl).toBe('H');
    qr.setAttribute('size', '120');
    await waitFor(() => expect(Math.round(qr.shadowRoot.querySelector('[part="code"]').getBoundingClientRect().width)).toBe(120));
  },
};

/** 4 mức sửa lỗi: mức càng cao mã càng dày (phiên bản lớn hơn) */
export const ErrorLevels = {
  render: () => html`
    <div style=${row}>
      ${['L', 'M', 'Q', 'H'].map((l) => html`
        <div style=${cap}><hui-qrcode value="https://hui.dev/docs/components/qrcode" error-level=${l} size="140"></hui-qrcode>${l}</div>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const versions = [...canvasElement.querySelectorAll('hui-qrcode')].map((q) => q.matrix.version);
    await expect(versions[3]).toBeGreaterThan(versions[0]);
  },
};

/** Tiếng Việt có dấu (UTF-8 byte mode) + nội dung dài */
export const VietnameseText = {
  render: () => html`
    <div style=${row}>
      <div style=${cap}><hui-qrcode value="Xin chào! Đây là mã QR tiếng Việt có dấu: ắ ằ ẳ ẵ ặ đ ơ ư" size="180"></hui-qrcode>Tiếng Việt</div>
      <div style=${cap}><hui-qrcode value=${'Nội dung dài '.repeat(40)} size="220" error-level="L"></hui-qrcode>~520 byte</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [vi] = canvasElement.querySelectorAll('hui-qrcode');
    await expect(vi.matrix.mode).toBe('byte');
  },
};

/** Màu, kích thước, vùng lặng, viền */
export const ColorsAndSizes = {
  render: () => html`
    <div style=${row}>
      <div style=${cap}><hui-qrcode value="HUI" size="96"></hui-qrcode>96px</div>
      <div style=${cap}><hui-qrcode value="HUI" color="#1677ff"></hui-qrcode>color</div>
      <div style=${cap}><hui-qrcode value="HUI" color="#fff" bg-color="#0f172a"></hui-qrcode>bg-color</div>
      <div style=${cap}><hui-qrcode value="HUI" color="#000" bg-color="#fff" bordered></hui-qrcode>bordered, đen/trắng</div>
      <div style=${cap}><hui-qrcode value="HUI" margin="0" bordered></hui-qrcode>margin=0</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const qr = canvasElement.querySelectorAll('hui-qrcode')[1];
    const path = qr.shadowRoot.querySelector('.qr__modules');
    await expect(getComputedStyle(path).fill).toBe('rgb(22, 119, 255)');
    const noMargin = canvasElement.querySelectorAll('hui-qrcode')[4];
    await expect(noMargin.shadowRoot.querySelector('svg').getAttribute('viewBox')).toBe(`0 0 ${noMargin.matrix.size} ${noMargin.matrix.size}`);
  },
};

/** Logo ở giữa → tự nâng mức sửa lỗi lên H */
export const WithIcon = {
  render: () => html`
    <div style=${row}>
      <div style=${cap}><hui-qrcode value="https://hui.dev" icon=${LOGO} size="180"></hui-qrcode>SVG</div>
      <div style=${cap}><hui-qrcode value="https://hui.dev" icon=${LOGO} icon-size="48" render="canvas" size="180"></hui-qrcode>Canvas, icon 48px</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [svgQr, canvasQr] = canvasElement.querySelectorAll('hui-qrcode');
    await expect(svgQr.errorLevel).toBe('M');
    await expect(svgQr.effectiveLevel).toBe('H');
    await expect(svgQr.matrix.ecl).toBe('H');
    await expect(svgQr.shadowRoot.querySelector('image').getAttribute('href')).toBe(LOGO);
    await expect(canvasQr.shadowRoot.querySelector('canvas').getAttribute('role')).toBe('img');
  },
};

/** Vẽ bằng canvas (sắc nét theo devicePixelRatio) + xuất ảnh */
export const CanvasAndDownload = {
  render: () => html`
    <div style=${row}>
      <hui-qrcode id="qr-canvas" value="https://hui.dev/canvas" render="canvas" bordered></hui-qrcode>
      <div style="display: grid; gap: 8px; align-content: start;">
        <hui-button size="sm" @click=${() => document.getElementById('qr-canvas').download('hui-qrcode.png')}>Tải PNG</hui-button>
        <hui-button size="sm" variant="secondary" @click=${() => document.getElementById('qr-canvas').download('hui-qrcode.svg')}>Tải SVG</hui-button>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const qr = canvasElement.querySelector('hui-qrcode');
    const canvas = qr.shadowRoot.querySelector('canvas');
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    await expect(canvas.width).toBe(Math.round(160 * dpr));
    await expect(qr.toDataURL()).toMatch(/^data:image\/png;base64,/);
    await expect(qr.toDataURL('image/svg+xml')).toMatch(/^data:image\/svg\+xml/);
    // Ô tối thật sự được vẽ: góc finder trên-trái (ô 4,4 tính cả vùng lặng) không trong suốt và tối hơn nền
    const ctx = canvas.getContext('2d');
    const unit = canvas.width / (qr.matrix.size + 8);
    const [r, g, b] = ctx.getImageData(Math.floor(unit * 4.5), Math.floor(unit * 4.5), 1, 1).data;
    const [br, bgc, bb] = ctx.getImageData(1, 1, 1, 1).data;
    await expect(Math.abs(r + g + b - (br + bgc + bb))).toBeGreaterThan(200);
  },
};

/** Trạng thái: loading / expired (nút làm mới → hui-refresh) / scanned */
export const Status = {
  render: () => html`
    <div style=${row}>
      <div style=${cap}><hui-qrcode value="loading" status="loading"></hui-qrcode>loading</div>
      <div style=${cap}><hui-qrcode id="qr-expired" value="expired" status="expired"
        @hui-refresh=${(e) => {
          const el = e.currentTarget;
          el.status = 'loading';
          setTimeout(() => { el.value = `refreshed-${Date.now()}`; el.status = 'active'; }, 800);
        }}></hui-qrcode>expired</div>
      <div style=${cap}><hui-qrcode value="scanned" status="scanned"></hui-qrcode>scanned</div>
      <div style=${cap}>
        <hui-qrcode value="custom" status="expired">
          <div slot="status" style="display: grid; gap: 4px; justify-items: center;"><strong>Hết hạn sau 60s</strong><span>Nội dung slot tùy chỉnh</span></div>
        </hui-qrcode>slot="status"
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [loading, expired] = canvasElement.querySelectorAll('hui-qrcode');
    const status = loading.shadowRoot.querySelector('[part="status"]');
    await expect(status.hidden).toBe(false);
    await expect(status.getAttribute('role')).toBe('status');
    await expect(loading.shadowRoot.querySelector('hui-spinner').hidden).toBe(false);

    let refreshed = 0;
    expired.addEventListener('hui-refresh', () => refreshed++);
    const btn = expired.shadowRoot.querySelector('[part="refresh-button"]');
    await expect(btn.hidden).toBe(false);
    await expect(btn.textContent).toBe('Làm mới');
    btn.shadowRoot.querySelector('button').click();
    await expect(refreshed).toBe(1);
    await waitFor(() => expect(expired.status).toBe('loading'));
    await waitFor(() => expect(expired.status).toBe('active'), { timeout: 4000 });
    await waitFor(() => expect(expired.shadowRoot.querySelector('[part="status"]').hidden).toBe(true));
  },
};

/** Nội dung vượt dung lượng phiên bản 40 → khung lỗi, aria-label báo lỗi */
export const TooLong = {
  render: () => html`<hui-qrcode value=${'x'.repeat(3000)} error-level="H"></hui-qrcode>`,
  play: async ({ canvasElement }) => {
    const qr = canvasElement.querySelector('hui-qrcode');
    await expect(qr.matrix).toBe(null);
    const holder = qr.shadowRoot.querySelector('.holder');
    await expect(holder.getAttribute('role')).toBe('img');
    await expect(holder.getAttribute('aria-label')).toContain('quá dài');
    await expect(qr.toDataURL()).toBe('');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-qrcode.brand {
        --hui-qrcode-color: #db2777;
        --hui-qrcode-bg: #fdf2f8;
        --hui-qrcode-radius: 20px;
        --hui-qrcode-padding: 16px;
        --hui-qrcode-border-color: #f9a8d4;
      }
      hui-qrcode.brand::part(base) { box-shadow: 0 10px 30px -10px #db277766; }
    </style>
    <hui-qrcode class="brand" value="Biến CSS + ::part(base)" bordered></hui-qrcode>
  `,
  play: async ({ canvasElement }) => {
    const qr = canvasElement.querySelector('hui-qrcode');
    await expect(getComputedStyle(qr.shadowRoot.querySelector('.qr__modules')).fill).toBe('rgb(219, 39, 119)');
  },
};
