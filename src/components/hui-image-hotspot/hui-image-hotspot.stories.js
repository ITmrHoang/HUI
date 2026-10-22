/**
 * Storybook Stories — HUI Image Hotspot (ảnh có điểm thông tin)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { svgImage } from '../hui-image/story-images.js';
import './index.js';

const ROOM = svgImage({ w: 1200, h: 750, hue: 28, label: 'Phòng khách mẫu' });
const MAP = svgImage({ w: 1000, h: 600, hue: 160, label: 'Sơ đồ khu đô thị' });

const SPOTS = [
  { x: 22, y: 64, title: 'Sofa vải nỉ 3 chỗ', content: 'Khung gỗ sồi, đệm mút D40. Giá 12.900.000 ₫.', href: '#sofa', linkText: 'Xem sản phẩm' },
  { x: 48, y: 38, title: 'Đèn thả mây tre', content: 'Đan thủ công, bóng LED 9W ánh sáng vàng.', color: 'warning' },
  { x: 74, y: 30, title: 'Tranh canvas', content: 'Bộ 3 tranh trừu tượng 60×90 cm.', placement: 'bottom' },
  { x: 80, y: 74, title: 'Bàn trà mặt đá', content: 'Mặt đá marble trắng, chân thép sơn tĩnh điện.', href: '#table', color: 'success' },
];

const spotsOf = (el) => [...el.shadowRoot.querySelectorAll('[part~="spot"]')];
const popsOf = (el) => [...el.shadowRoot.querySelectorAll('[part="popover"]')];

export default {
  title: 'Organisms/HuiImageHotspot',
  component: 'hui-image-hotspot',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Image Hotspot** — Ảnh có các **điểm chấm nhấp nháy**; rê chuột / bấm / focus bàn phím vào điểm → **popover** (\`hui-popover\`)
hiện tiêu đề, mô tả, link. Toạ độ tính theo **%** nên đúng vị trí ở mọi kích thước (responsive). Dùng cho giới thiệu sản phẩm,
phòng mẫu nội thất, sơ đồ mặt bằng.

\`\`\`html
<hui-image-hotspot src="living-room.jpg" alt="Phòng khách" ratio="16/10"></hui-image-hotspot>
<script>
  el.spots = [{ x: 22, y: 64, title: 'Sofa', content: 'Khung gỗ sồi', href: '/sofa' }];
</script>
<!-- hoặc ảnh tự đặt -->
<hui-image-hotspot trigger="click" spots='[{"x":50,"y":50,"title":"Trung tâm"}]'><img src="map.png" alt="Sơ đồ"></hui-image-hotspot>
\`\`\`

### Spot
\`{ x, y (phần trăm 0–100), title, content, href, linkText, color, placement }\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`src\` / \`alt\` / \`ratio\` | string | — | Ảnh (dựng \`hui-image\`); bỏ trống \`src\` → dùng ảnh trong slot |
| \`spots\` | array (JSON) | — | Danh sách điểm |
| \`trigger\` | string | \`hover\` | \`hover\` (gồm focus bàn phím) \\| \`click\` |
| \`placement\` | string | \`top\` | Vị trí popover mặc định (spot.placement ưu tiên hơn) |
| \`color\` | string | primary | Màu chấm: token hoặc màu CSS (spot.color ưu tiên hơn) |
| \`numbered\` | boolean | \`false\` | Số thứ tự trong chấm |
| \`rounded\` | boolean | \`false\` | Bo góc ảnh |
| \`no-animation\` | boolean | \`false\` | Tắt nhấp nháy |

### Methods
\`openSpot(index)\`, \`closeAll()\`.

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-spot-toggle\` | \`{ index, spot, open }\` | Popover của một điểm mở / đóng |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | \`<img>\` / \`<picture>\` / \`<hui-image>\` khi không dùng \`src\` |

### Parts
\`base\`, \`image\`, \`spots\`, \`spot\` (+ \`spot-active\`), \`spot-label\`, \`popover\`, \`spot-title\`, \`spot-content\`, \`spot-link\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-image-hotspot-size\` | Đường kính chấm (24px; numbered 28px) |
| \`--hui-image-hotspot-color\` / \`--hui-image-hotspot-ring\` | Màu chấm / viền |
| \`--hui-image-hotspot-pulse-duration\` | Chu kỳ nhấp nháy (2s) |
| \`--hui-image-hotspot-radius\` | Bo góc ảnh |
| \`--hui-popover-*\` | Popover (kế thừa) |

### Bàn phím
| Phím | Hành động |
|------|-----------|
| Tab / Shift+Tab | Đi qua từng điểm (theo thứ tự \`spots\`), hover-mode tự mở popover khi focus |
| Enter / Space | (click-mode) mở / đóng popover |
| Esc | Đóng popover |

Mỗi chấm là \`<button>\` có \`aria-label\` (tiêu đề) và \`aria-expanded\`; vùng ảnh \`role="group"\` mô tả số điểm.
        `,
      },
    },
  },
  argTypes: {
    trigger: { control: 'select', options: ['hover', 'click'] },
    numbered: { control: 'boolean' },
    rounded: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 760px; padding-top: 24px;">
      <hui-image-hotspot id="ih-default" src=${ROOM} alt="Phòng khách mẫu" ratio="16/10" trigger=${args.trigger}
        ?numbered=${args.numbered} ?rounded=${args.rounded} .spots=${SPOTS}></hui-image-hotspot>
    </div>
  `,
  args: { trigger: 'hover', numbered: false, rounded: true },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ih-default');
    await el.updateComplete;
    const spots = spotsOf(el);
    await expect(spots.length).toBe(4);
    await expect(spots[0].getAttribute('aria-label')).toBe('Sofa vải nỉ 3 chỗ');
    await expect(el.shadowRoot.querySelector('[part="base"]').getAttribute('aria-label')).toBe('Phòng khách mẫu — Ảnh có 4 điểm thông tin');
    // Vị trí theo %
    const base = el.shadowRoot.querySelector('[part="base"]').getBoundingClientRect();
    await waitFor(() => expect(base.height).toBeGreaterThan(0));
    const s = spots[1].getBoundingClientRect();
    const cx = (s.left + s.width / 2 - base.left) / base.width;
    const cy = (s.top + s.height / 2 - base.top) / el.shadowRoot.querySelector('[part="base"]').getBoundingClientRect().height;
    await expect(Math.abs(cx - 0.48)).toBeLessThan(0.02);
    await expect(Math.abs(cy - 0.38)).toBeLessThan(0.03);
  },
};

/** Bàn phím: Tab vào điểm → popover mở (hover-mode), Esc đóng */
export const Keyboard = {
  render: () => html`
    <div style="max-width: 760px; padding-top: 24px;">
      <button id="ih-before" type="button">Trước ảnh</button>
      <hui-image-hotspot id="ih-kb" src=${ROOM} alt="Phòng khách mẫu" ratio="16/10" .spots=${SPOTS}></hui-image-hotspot>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ih-kb');
    const toggles = [];
    el.addEventListener('hui-spot-toggle', (e) => toggles.push([e.detail.index, e.detail.open]));
    await el.updateComplete;
    // userEvent.tab() không đi xuyên shadow DOM → focus trực tiếp (giống Tab: focus-visible)
    const spots = spotsOf(el);
    await expect(spots.every((s) => s.tabIndex === 0)).toBe(true);
    spots[0].focus();
    await expect(el.shadowRoot.activeElement).toBe(spots[0]);
    await waitFor(() => expect(spots[0].getAttribute('aria-expanded')).toBe('true'));
    await expect(spots[0].getAttribute('part')).toBe('spot spot-active');
    const popup = popsOf(el)[0].popup;
    await expect(popup.hidden).toBe(false);
    await expect(popsOf(el)[0].querySelector('[part="spot-link"]').textContent).toBe('Xem sản phẩm');
    // Tab sang điểm 2 → điểm 1 đóng, điểm 2 mở
    spots[1].focus();
    await expect(el.shadowRoot.activeElement).toBe(spots[1]);
    await waitFor(() => expect(spots[1].getAttribute('aria-expanded')).toBe('true'));
    await waitFor(() => expect(spots[0].getAttribute('aria-expanded')).toBe('false'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(spots[1].getAttribute('aria-expanded')).toBe('false'));
    await expect(toggles[0]).toEqual([0, true]);
    spots[1].blur();
  },
};

/** trigger="click" + numbered + ảnh trong slot */
export const ClickAndSlottedImage = {
  render: () => html`
    <div style="max-width: 760px; padding-top: 24px;">
      <hui-image-hotspot id="ih-click" trigger="click" numbered color="danger"
        spots='[{"x":18,"y":30,"title":"Khu A — Nhà phố","content":"120 căn, bàn giao Q2/2027"},{"x":55,"y":55,"title":"Công viên trung tâm","content":"5 ha cây xanh, hồ điều hòa","color":"success"},{"x":82,"y":22,"title":"Trường học liên cấp"}]'>
        <img src=${MAP} alt="Sơ đồ khu đô thị" style="border-radius: 12px;">
      </hui-image-hotspot>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ih-click');
    await el.updateComplete;
    await expect(el.shadowRoot.querySelector('[part="image"]').hidden).toBe(true);
    const spots = spotsOf(el);
    await expect(spots.map((s) => s.textContent)).toEqual(['1', '2', '3']);
    await userEvent.click(spots[1]);
    await waitFor(() => expect(spots[1].getAttribute('aria-expanded')).toBe('true'));
    await userEvent.click(spots[1]);
    await waitFor(() => expect(spots[1].getAttribute('aria-expanded')).toBe('false'));
    // API
    el.openSpot(0);
    await waitFor(() => expect(spots[0].getAttribute('aria-expanded')).toBe('true'));
    el.closeAll();
    await waitFor(() => expect(spots[0].getAttribute('aria-expanded')).toBe('false'));
  },
};

/** Không nhấp nháy (no-animation) */
export const Static = {
  render: () => html`
    <div style="max-width: 560px; padding-top: 24px;">
      <hui-image-hotspot id="ih-static" no-animation src=${ROOM} alt="Phòng khách" ratio="16/10" .spots=${SPOTS.slice(0, 2)}></hui-image-hotspot>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ih-static');
    await el.updateComplete;
    await expect(el.shadowRoot.querySelector('[part="base"]').classList.contains('ih--pulse')).toBe(false);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .ih-brand {
        --hui-image-hotspot-size: 32px;
        --hui-image-hotspot-color: var(--hui-info);
        --hui-image-hotspot-ring: var(--hui-info-1);
        --hui-image-hotspot-pulse-duration: 1.2s;
        --hui-image-hotspot-radius: 20px;
        --hui-popover-bg: var(--hui-bg-spotlight);
        --hui-popover-color: var(--hui-text-light-solid);
        --hui-popover-title-color: var(--hui-text-light-solid);
      }
      .ih-brand::part(spot) { box-shadow: 0 0 0 6px rgb(0 0 0 / 0.15); }
      .ih-brand::part(spot-link) { color: var(--hui-warning); }
    </style>
    <div style="max-width: 760px; padding-top: 24px;">
      <hui-image-hotspot id="ih-brand" class="ih-brand" rounded numbered src=${ROOM} alt="Phòng khách" ratio="16/10" .spots=${SPOTS}></hui-image-hotspot>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ih-brand');
    await el.updateComplete;
    await expect(spotsOf(el)[0].getBoundingClientRect().width).toBe(32);
  },
};
