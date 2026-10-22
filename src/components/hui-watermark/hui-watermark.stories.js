import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import { createWatermarkDataUrl } from './index.js';

const LOGO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40"><rect width="120" height="40" rx="8" fill="#6366f1" opacity="0.25"/><text x="60" y="26" font-family="Arial" font-size="16" font-weight="700" fill="#4f46e5" text-anchor="middle" opacity="0.6">H-UI</text></svg>'
)}`;

export default {
  title: 'Molecules/HuiWatermark',
  component: 'hui-watermark',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Watermark** — phủ chữ / ảnh chìm lặp lại lên nội dung bên trong. Ô lặp sinh bằng canvas theo \`devicePixelRatio\`
(→ PNG data URL; không có canvas thì SVG data URL). Lớp phủ \`pointer-events: none\` → không cản thao tác.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`content\` | — | Chữ; JSON mảng (\`'["Dòng 1","Dòng 2"]'\`) hoặc property mảng → nhiều dòng |
| \`image\` | — | URL / data URI ảnh (ưu tiên hơn chữ; lỗi tải → dùng chữ) |
| \`image-width\` / \`image-height\` | 120 / theo tỉ lệ | Kích thước ảnh (px) |
| \`rotate\` | \`-22\` | Góc xoay (độ) |
| \`gap\` | \`[100,100]\` | Khoảng cách giữa các mục: \`"[x,y]"\`, \`"x,y"\` hoặc \`"x"\` |
| \`offset\` | gap / 2 | Độ lệch ô đầu tiên \`[x,y]\` |
| \`font\` | — | JSON \`{ fontSize, fontWeight, fontStyle, fontFamily, color }\` (mặc định 16px, font của trang) |
| \`z-index\` | \`9\` | z-index lớp phủ |
| \`opacity\` | \`1\` | Độ mờ cả lớp |
| \`layout\` | \`stagger\` | \`stagger\` (so le) · \`grid\` (thẳng hàng) |

**Sự kiện:** \`hui-tamper\` {reason: \`removed\` | \`attributes\`} — lớp phủ bị gỡ / sửa và đã dựng lại
**Phương thức:** \`refresh()\` · getter \`tile\` ({url, width, height, ratio, format, mode})
**Helper:** \`createWatermarkDataUrl(options)\` → \`Promise<{ url, width, height, ratio, format }>\` (width/height = background-size CSS)
**Slot:** (mặc định) nội dung · **Part:** content · **Biến CSS:** \`--hui-watermark-color\` (mặc định \`--hui-fill\`, đổi theo dark mode)

**Màu & dark mode:** watermark chữ dùng ô lặp làm \`mask-image\`, màu là \`background-color\` lấy từ CSS → đổi theme không cần vẽ lại.
\`font.color\` (nếu có) ưu tiên hơn biến CSS. Watermark ảnh giữ nguyên màu ảnh.

**Chống xóa — giới hạn thật:** lớp phủ nằm trong Shadow DOM (mode \`open\`), style ghi inline \`!important\`, không có \`part\`;
MutationObserver dựng lại khi lớp bị gỡ, bị chèn phần tử, bị đẩy khỏi vị trí cuối hoặc bị sửa attribute/style.
KHÔNG chống được: xóa cả thẻ \`<hui-watermark>\` hay chuyển nội dung ra ngoài, \`adoptedStyleSheets\` chèn vào shadow root,
tắt JavaScript, DevTools chặn breakpoint/override, chụp màn hình rồi chỉnh ảnh. Watermark là biện pháp răn đe, **không phải bảo mật** —
dữ liệu nhạy cảm phải được bảo vệ ở server.
        `,
      },
    },
  },
};

const panel = 'min-height: 260px; padding: 24px; border: 1px solid var(--hui-border); border-radius: var(--hui-radius-lg); background: var(--hui-bg-container); color: var(--hui-text); font: 14px/1.6 var(--hui-font-family);';
const lorem = html`
  <h3 style="margin: 0 0 8px;">Báo cáo doanh thu quý III</h3>
  <p style="margin: 0 0 8px;">Doanh thu tăng 18% so với cùng kỳ, chủ yếu đến từ kênh bán hàng trực tuyến. Chi phí vận hành giảm nhờ tự động hóa kho.</p>
  <p style="margin: 0;">Tài liệu chỉ lưu hành nội bộ. Vui lòng không chia sẻ ra ngoài công ty.</p>
  <p><button type="button">Nút vẫn bấm được</button></p>
`;

export const Default = {
  render: () => html`<hui-watermark content="H-UI nội bộ"><div style=${panel}>${lorem}</div></hui-watermark>`,
  play: async ({ canvasElement }) => {
    const wm = canvasElement.querySelector('hui-watermark');
    const layer = wm.shadowRoot.querySelector('.layer');
    await waitFor(() => expect(wm.tile?.url).toMatch(/^data:image\/(png|svg)/));
    const cs = getComputedStyle(layer);
    await expect(cs.pointerEvents).toBe('none');
    await expect(cs.position).toBe('absolute');
    await expect(cs.maskImage || cs.webkitMaskImage).toContain('data:image');
    await expect(layer.getAttribute('aria-hidden')).toBe('true');
    await expect(Number(cs.zIndex)).toBe(9);
    // Lớp phủ không cản click
    let clicked = 0;
    const btn = wm.querySelector('button');
    btn.addEventListener('click', () => clicked++);
    const r = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    await expect(hit).toBe(btn);
    hit.click();
    await expect(clicked).toBe(1);
    // Ô lặp có chiều theo DPR
    const ratio = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    await expect(wm.tile.ratio).toBe(ratio);
  },
};

/** Nhiều dòng (mảng) — vd: tên người xem + thời điểm */
export const MultiLine = {
  render: () => html`
    <hui-watermark content='["Nguyễn Văn A", "nva@congty.vn", "22/10/2026 09:30"]' gap="[80,80]" font='{"fontSize":14}'>
      <div style=${panel}>${lorem}</div>
    </hui-watermark>
  `,
  play: async ({ canvasElement }) => {
    const wm = canvasElement.querySelector('hui-watermark');
    await waitFor(() => expect(wm.tile?.url).toBeTruthy());
    const single = await createWatermarkDataUrl({ content: 'Nguyễn Văn A', gap: [80, 80], font: { fontSize: 14 }, ratio: 1 });
    // 3 dòng → ô lặp cao hơn 1 dòng
    await expect(wm.tile.height).toBeGreaterThan(single.height);
  },
};

/** Watermark ảnh (SVG data URI) */
export const ImageWatermark = {
  render: () => html`
    <hui-watermark image=${LOGO} image-width="120" image-height="40" rotate="-15" gap="[60,60]">
      <div style=${panel}>${lorem}</div>
    </hui-watermark>
  `,
  play: async ({ canvasElement }) => {
    const wm = canvasElement.querySelector('hui-watermark');
    await waitFor(() => expect(wm.tile?.mode).toBe('image'));
    const layer = wm.shadowRoot.querySelector('.layer');
    await expect(getComputedStyle(layer).backgroundImage).toContain('data:image');
  },
};

/** Góc xoay, khoảng cách, font, màu, lưới thẳng hàng, độ mờ */
export const Customize = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
      <hui-watermark content="rotate=0, grid" rotate="0" layout="grid" gap="40"><div style=${panel}>Lưới thẳng hàng, không xoay</div></hui-watermark>
      <hui-watermark content="BẢN NHÁP" rotate="-45" gap="[30,30]" font='{"fontSize":28,"fontWeight":800,"color":"rgba(239,68,68,0.18)"}'>
        <div style=${panel}>font.color đỏ, chữ đậm 28px</div>
      </hui-watermark>
      <hui-watermark content="opacity 0.5" opacity="0.5" offset="[0,0]"><div style=${panel}>Cả lớp mờ 50%, offset [0,0]</div></hui-watermark>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [, draft, faded] = canvasElement.querySelectorAll('hui-watermark');
    await waitFor(() => expect(draft.tile?.url).toBeTruthy());
    await expect(getComputedStyle(draft.shadowRoot.querySelector('.layer')).backgroundColor).toBe('rgba(239, 68, 68, 0.18)');
    await expect(getComputedStyle(faded.shadowRoot.querySelector('.layer')).opacity).toBe('0.5');
  },
};

/** Chống xóa: gỡ lớp phủ / sửa style → tự dựng lại (hui-tamper) */
export const TamperResistance = {
  render: () => html`
    <hui-watermark id="wm-tamper" content="Không xóa được">
      <div style=${panel}>
        <p style="margin-top: 0;">Thử gỡ hoặc ẩn lớp watermark (giống thao tác trong DevTools):</p>
        <button type="button" @click=${() => document.getElementById('wm-tamper').shadowRoot.querySelector('.layer').remove()}>Gỡ lớp phủ</button>
        <button type="button" @click=${() => { document.getElementById('wm-tamper').shadowRoot.querySelector('.layer').style.display = 'none'; }}>style.display = none</button>
        <p id="wm-log" role="status" style="color: var(--hui-text-secondary);"></p>
      </div>
    </hui-watermark>
  `,
  play: async ({ canvasElement }) => {
    const wm = canvasElement.querySelector('hui-watermark');
    const reasons = [];
    wm.addEventListener('hui-tamper', (e) => {
      reasons.push(e.detail.reason);
      canvasElement.querySelector('#wm-log').textContent = `Đã dựng lại lớp phủ (${e.detail.reason})`;
    });
    await waitFor(() => expect(wm.tile?.url).toBeTruthy());

    wm.shadowRoot.querySelector('.layer').remove();
    await waitFor(() => expect(wm.shadowRoot.querySelector('.layer')).not.toBe(null));
    await expect(getComputedStyle(wm.shadowRoot.querySelector('.layer')).display).toBe('block');

    wm.shadowRoot.querySelector('.layer').style.display = 'none';
    await waitFor(() => expect(getComputedStyle(wm.shadowRoot.querySelector('.layer')).display).toBe('block'));

    wm.shadowRoot.querySelector('.layer').setAttribute('hidden', '');
    await waitFor(() => expect(wm.shadowRoot.querySelector('.layer').hasAttribute('hidden')).toBe(false));

    // Chèn phần tử che lên trên lớp phủ → lớp phủ được đưa lại về cuối
    const cover = document.createElement('div');
    wm.shadowRoot.append(cover);
    await waitFor(() => expect(wm.shadowRoot.lastElementChild.classList.contains('layer')).toBe(true));
    cover.remove();

    // CSS ngoài không ẩn được (style inline !important)
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('.layer { display: none !important; }');
    wm.shadowRoot.adoptedStyleSheets = [...wm.shadowRoot.adoptedStyleSheets, sheet];
    await expect(getComputedStyle(wm.shadowRoot.querySelector('.layer')).display).toBe('block');
    wm.shadowRoot.adoptedStyleSheets = wm.shadowRoot.adoptedStyleSheets.filter((s) => s !== sheet);

    await waitFor(() => expect(reasons).toEqual(['removed', 'attributes', 'attributes', 'removed']));
  },
};

/** Helper createWatermarkDataUrl: dùng ô lặp cho vùng tùy ý */
export const HelperFunction = {
  render: () => {
    const box = document.createElement('div');
    box.style.cssText = `${panel} min-height: 180px;`;
    box.textContent = 'Nền của khung này dùng createWatermarkDataUrl({ content, rotate, gap, font })';
    createWatermarkDataUrl({ content: ['HELPER', 'data URL'], rotate: -30, gap: [40, 40], font: { color: 'rgba(99,102,241,0.25)', fontSize: 14 } })
      .then(({ url, width, height }) => {
        box.style.backgroundImage = `url("${url}")`;
        box.style.backgroundSize = `${width}px ${height}px`;
        box.dataset.ready = 'true';
      });
    return box;
  },
  play: async ({ canvasElement }) => {
    const box = canvasElement.firstElementChild;
    await waitFor(() => expect(box.dataset.ready).toBe('true'));
    const res = await createWatermarkDataUrl({ content: 'x', ratio: 2, layout: 'grid', rotate: 0, gap: [10, 10] });
    await expect(res.format).toBe('png');
    await expect(res.ratio).toBe(2);
    await expect(res.url).toMatch(/^data:image\/png;base64,/);
    const empty = await createWatermarkDataUrl({});
    await expect(empty.url).toBe('');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-watermark.brand { --hui-watermark-color: rgba(219, 39, 119, 0.2); }
      hui-watermark.brand::part(content) { border-radius: 20px; overflow: hidden; }
    </style>
    <hui-watermark class="brand" content="--hui-watermark-color"><div style=${panel}>Màu chữ qua biến CSS + ::part(content)</div></hui-watermark>
  `,
  play: async ({ canvasElement }) => {
    const wm = canvasElement.querySelector('hui-watermark');
    await waitFor(() => expect(wm.tile?.url).toBeTruthy());
    await expect(getComputedStyle(wm.shadowRoot.querySelector('.layer')).backgroundColor).toBe('rgba(219, 39, 119, 0.2)');
  },
};
