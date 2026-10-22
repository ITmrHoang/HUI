/**
 * Storybook Stories — HUI Map (Molecule)
 * Google Maps facade: hình bản đồ minh họa + địa chỉ, bấm "Mở bản đồ" mới tải iframe.
 * Lưu ý: story KHÔNG tự tải iframe Google (play function chặn bằng preventDefault trên hui-load).
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';

const part = (el, name) => el.shadowRoot.querySelector(`[part="${name}"]`);

export default {
  title: 'Molecules/HuiMap',
  component: 'hui-map',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Map** — nhúng Google Maps dạng **facade**: trang chỉ hiện hình bản đồ minh họa (SVG tự sinh theo địa chỉ, màu theo token)
+ thẻ thông tin. Bấm **"Mở bản đồ"** mới tạo iframe \`https://www.google.com/maps?q=…&output=embed\` → không tải script, cookie
của Google khi chưa cần, trang nhanh hơn.

\`\`\`html
<hui-map heading="H-UI Store" query="Hồ Hoàn Kiếm, Hà Nội" zoom="16" ratio="21/9">
  <div>Mở cửa 8:00 – 22:00 · 0909 123 456</div>
</hui-map>
<hui-map lat="10.7769" lng="106.7009" heading="Nhà thờ Đức Bà"></hui-map>
<script>
  // Hỏi đồng ý trước khi tải nội dung bên thứ ba
  map.addEventListener('hui-load', (e) => { if (!readConsent()?.marketing) e.preventDefault(); });
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`query\` | string | — | Địa chỉ / tên địa điểm |
| \`lat\` / \`lng\` | number | — | Tọa độ (ưu tiên hơn query) |
| \`zoom\` | number | \`15\` | Mức phóng 1–21 |
| \`ratio\` | string | \`'16/9'\` | Tỉ lệ khung (\`4:3\`, \`1\`…) |
| \`heading\` | string | — | Tên địa điểm |
| \`address\` | string | = query | Địa chỉ hiển thị |
| \`hide-external\` | boolean | \`false\` | Ẩn link "Mở trong Google Maps" |
| \`no-animation\` | boolean | \`false\` | Tắt ghim nảy / hiện mờ |

### Properties & methods
\`load()\` (tạo iframe), \`loaded\`, \`embedUrl\`, \`externalUrl\` (\`https://www.google.com/maps/search/?api=1&query=…\`).

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-load\` | \`{ src }\` | Ngay trước khi tạo iframe — cancelable (vd: chờ đồng ý cookie) |

### Slots
_(default)_ nội dung thêm trong thẻ thông tin · \`placeholder\` — ảnh thay hình minh họa

### Parts
\`base\`, \`art\`, \`pin\`, \`info\`, \`heading\`, \`address\`, \`load-button\`, \`external-link\`, \`frame\`

### CSS Variables
\`--hui-map-radius\`, \`-border-color\`, \`-land\`, \`-block\`, \`-road\`, \`-water\`, \`-park\`, \`-pin-color\`, \`-info-bg\`, \`-info-max-width\`, \`-min-height\` (240px)

### Bàn phím & trợ năng
\`Tab\` tới nút "Mở bản đồ" (\`aria-label\` kèm tên địa điểm) và link mở tab mới. Mở xong focus chuyển vào iframe
(có \`title\`). Hình minh họa \`aria-hidden\`; khung có \`role="group"\` + \`aria-label\`.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-map heading="H-UI Store Hoàn Kiếm" query="Hồ Hoàn Kiếm, Hà Nội" zoom="16" style="max-width: 720px;">
      <div>Mở cửa 8:00 – 22:00 · 0909 123 456</div>
    </hui-map>
  `,
  play: async ({ canvasElement }) => {
    const map = canvasElement.querySelector('hui-map');
    await map.updateComplete;
    // Không có iframe khi tải trang
    await expect(map.shadowRoot.querySelector('iframe')).toBe(null);
    await expect(map.loaded).toBe(false);
    await expect(part(map, 'art')).toBeTruthy();
    await expect(part(map, 'heading').textContent).toBe('H-UI Store Hoàn Kiếm');
    await expect(part(map, 'address').textContent).toBe('Hồ Hoàn Kiếm, Hà Nội');
    await expect(part(map, 'load-button').getAttribute('aria-label')).toBe('Mở bản đồ: H-UI Store Hoàn Kiếm');

    const external = part(map, 'external-link');
    await expect(external.href).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Hồ Hoàn Kiếm, Hà Nội')}`);
    await expect(external.rel).toContain('noopener');
    await expect(map.embedUrl).toContain('https://www.google.com/maps?q=');
    await expect(map.embedUrl).toContain('output=embed');
    await expect(map.embedUrl).toContain('z=16');

    // Bấm "Mở bản đồ": story chặn bằng preventDefault → vẫn là facade, không gọi tới Google
    let detail = null;
    map.addEventListener('hui-load', (e) => { detail = e.detail; e.preventDefault(); }, { once: true });
    part(map, 'load-button').click();
    await expect(detail.src).toBe(map.embedUrl);
    await expect(map.loaded).toBe(false);
    await expect(map.shadowRoot.querySelector('iframe')).toBe(null);
  },
};

export const Coordinates = {
  name: 'Tọa độ lat / lng',
  render: () => html`<hui-map lat="10.7798" lng="106.6990" zoom="17" heading="Nhà thờ Đức Bà" address="01 Công xã Paris, Bến Nghé, Quận 1, TP.HCM" ratio="21/9"></hui-map>`,
  play: async ({ canvasElement }) => {
    const map = canvasElement.querySelector('hui-map');
    await map.updateComplete;
    await expect(map.embedUrl).toContain(`q=${encodeURIComponent('10.7798,106.699')}`);
    await expect(map.externalUrl).toContain(encodeURIComponent('10.7798,106.699'));
    // Mỗi địa điểm có hình minh họa riêng nhưng cố định
    const before = part(map, 'art').innerHTML;
    map.lat = 21.0285;
    await map.updateComplete;
    await expect(part(map, 'art').innerHTML).not.toBe(before);
  },
};

export const Ratios = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
      <hui-map query="Chợ Bến Thành" ratio="1" hide-external></hui-map>
      <hui-map query="Phố cổ Hội An" ratio="4:3" heading="Hội An"></hui-map>
      <hui-map query="Vịnh Hạ Long" ratio="3/4" heading="Vịnh Hạ Long" no-animation></hui-map>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [square] = canvasElement.querySelectorAll('hui-map');
    await square.updateComplete;
    await expect(part(square, 'external-link').hidden).toBe(true);
    await expect(part(square, 'base').style.getPropertyValue('--_map-ratio')).toBe('1');
  },
};

export const CustomPlaceholder = {
  name: 'Ảnh thay hình minh họa',
  render: () => html`
    <hui-map query="Landmark 81, TP.HCM" heading="Landmark 81" style="max-width: 640px;">
      <img slot="placeholder" alt="" src=${`data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><defs><linearGradient id="s" x2="0" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs><rect width="800" height="450" fill="url(#s)"/><rect x="380" y="60" width="40" height="390" fill="#0f172a"/></svg>')}`}>
    </hui-map>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-map {
        --hui-map-radius: 24px;
        --hui-map-land: var(--hui-primary-1);
        --hui-map-block: var(--hui-primary-2);
        --hui-map-road: var(--hui-bg-container);
        --hui-map-water: var(--hui-info-3);
        --hui-map-pin-color: var(--hui-primary);
        --hui-map-info-max-width: 300px;
      }
      .brand-map::part(load-button) { border-radius: 999px; }
      .brand-map::part(heading) { color: var(--hui-primary); }
    </style>
    <hui-map class="brand-map" query="Đà Lạt, Lâm Đồng" heading="Văn phòng Đà Lạt" style="max-width: 640px;"></hui-map>
  `,
};
