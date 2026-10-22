import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-tag/index.js';
import '../hui-icon/index.js';

/** Logo giả bằng SVG data-URI (không dùng tài nguyên mạng) */
const logo = (text, hue) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="48" viewBox="0 0 140 48"><rect width="140" height="48" rx="10" fill="hsl(${hue} 70% 94%)"/><circle cx="24" cy="24" r="10" fill="hsl(${hue} 65% 50%)"/><text x="44" y="30" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="hsl(${hue} 55% 30%)">${text}</text></svg>`
)}`;
const brands = [['Acme', 210], ['Globex', 140], ['Initech', 20], ['Umbrella', 340], ['Hooli', 260], ['Vandelay', 45]];

const clonesOf = (el) => [...el.querySelectorAll(':scope > [data-hui-marquee-clone]')];
const partOf = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);

export default {
  title: 'Molecules/HuiMarquee',
  component: 'hui-marquee',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Marquee** — dải chạy vô hạn (logo đối tác, tin nhanh, đánh giá…), ngang hoặc dọc.
Item được nhân bản (bản sao \`aria-hidden\` + \`inert\`, nằm ở light DOM nên CSS trang vẫn áp dụng) để vòng lặp liền mạch.
Tự dừng khi ra khỏi màn hình hoặc tab bị ẩn. **Giảm chuyển động** / \`no-animation\` → hàng tĩnh, cuộn tay được (focus bằng Tab + phím mũi tên).

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`speed\` | \`50\` | Tốc độ (px/giây) |
| \`direction\` | \`left\` | \`left\` · \`right\` · \`up\` · \`down\` (dọc: đặt \`--hui-marquee-height\`) |
| \`pause-on-hover\` | — | Dừng khi rê chuột / focus vào item |
| \`paused\` | — | Dừng bằng code (vd nút tạm dừng — WCAG 2.2.2) |
| \`gap\` | \`md\` | \`xs\` · \`sm\` · \`md\` · \`lg\` · \`xl\` · \`none\`, số (px) hoặc CSS length |
| \`edge-fade\` | — | Mờ dần 2 mép |
| \`label\` | — | Nhãn ARIA (có → \`role="region"\`) |
| \`no-animation\` | — | Hàng tĩnh |

**Thuộc tính JS:** \`running\` (chỉ đọc) · **Phương thức:** \`refresh()\` (đo lại, dựng lại bản sao)
**Trạng thái CSS:** \`:state(paused)\`, \`:state(static)\`
**Slot:** mặc định (các item) · **Parts:** \`base\`, \`track\`, \`group\`, \`clones\`

| Biến CSS | Mặc định | Mô tả |
|----------|----------|-------|
| \`--hui-marquee-gap\` | \`--hui-space-lg\` | Khoảng cách item |
| \`--hui-marquee-fade-size\` | \`64px\` | Độ dài vùng mờ mép |
| \`--hui-marquee-height\` | \`240px\` | Chiều cao khi chạy dọc |
| \`--hui-marquee-padding\` | \`0\` | Đệm trong khung |

**Bàn phím:** chỉ ở chế độ tĩnh — Tab vào khung rồi ←/→ để cuộn. Item focus được (link) chỉ có ở bộ gốc, bản sao bị \`inert\`.
        `,
      },
    },
  },
  argTypes: {
    speed: { control: { type: 'number', min: 5, max: 400, step: 5 } },
    direction: { control: 'inline-radio', options: ['left', 'right', 'up', 'down'] },
    gap: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'] },
  },
};

const logos = () => brands.map(([name, hue]) => html`<img src=${logo(name, hue)} alt=${name} width="140" height="48">`);

export const Default = {
  args: { speed: 50, direction: 'left', gap: 'md', pauseOnHover: true, edgeFade: true },
  render: (args) => html`
    <hui-marquee speed=${args.speed} direction=${args.direction} gap=${args.gap}
      ?pause-on-hover=${args.pauseOnHover} ?edge-fade=${args.edgeFade} label="Đối tác">
      ${logos()}
    </hui-marquee>
  `,
  play: async ({ canvasElement }) => {
    const mq = canvasElement.querySelector('hui-marquee');
    // Bản sao phủ kín khung, ẩn khỏi trình đọc màn hình
    await waitFor(() => expect(clonesOf(mq).length).toBeGreaterThanOrEqual(6));
    for (const c of clonesOf(mq)) {
      await expect(c.getAttribute('aria-hidden')).toBe('true');
      await expect(c.inert).toBe(true);
    }
    await expect(partOf(mq, 'base').getAttribute('role')).toBe('region');
    // Con trỏ còn đè lên story (pause-on-hover) sẽ giữ trạng thái dừng → rời con trỏ trước khi chờ chạy
    mq.dispatchEvent(new PointerEvent('pointerleave'));
    await waitFor(() => expect(mq.running, `visibility=${document.visibilityState}`).toBe(true), { timeout: 3000 });
    const track = partOf(mq, 'track');
    await expect(getComputedStyle(track).animationName).toBe('hui-marquee-x');
    // Quãng dịch = đúng 1 bộ item + gap → vòng lặp liền mạch
    const group = partOf(mq, 'group');
    const gap = parseFloat(getComputedStyle(track).columnGap);
    const distance = parseFloat(partOf(mq, 'base').style.getPropertyValue('--_marquee-distance'));
    await expect(Math.abs(Math.abs(distance) - (group.offsetWidth + gap))).toBeLessThan(1);
    // Hover → dừng
    mq.dispatchEvent(new PointerEvent('pointerenter'));
    await waitFor(() => expect(mq.running).toBe(false));
    await expect(getComputedStyle(track).animationPlayState).toBe('paused');
    mq.dispatchEvent(new PointerEvent('pointerleave'));
    await waitFor(() => expect(mq.running).toBe(true));
    // paused bằng code
    mq.paused = true;
    await waitFor(() => expect(mq.running).toBe(false));
    mq.paused = false;
    await waitFor(() => expect(mq.running).toBe(true));
  },
};

export const Directions = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <hui-marquee speed="40" gap="sm">
        ${['Freeship đơn từ 300K', 'Đổi trả 30 ngày', 'Bảo hành chính hãng', 'Trả góp 0%'].map((t) => html`<hui-tag color="primary">${t}</hui-tag>`)}
      </hui-marquee>
      <hui-marquee speed="40" gap="sm" direction="right">
        ${['Mới về: Bộ sưu tập Thu', 'Giảm 20% phụ kiện', 'Hotline 1900 1234'].map((t) => html`<hui-tag color="success">${t}</hui-tag>`)}
      </hui-marquee>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <hui-marquee direction="up" speed="30" edge-fade style="--hui-marquee-height: 200px;">
          ${['“Giao hàng nhanh!” — Lan', '“Đóng gói cẩn thận” — Minh', '“Sẽ ủng hộ tiếp” — Hà', '“Giá tốt” — Quân'].map((t) => html`<div style="padding: 12px; border: 1px solid var(--hui-border-secondary); border-radius: 8px;">${t}</div>`)}
        </hui-marquee>
        <hui-marquee direction="down" speed="30" edge-fade style="--hui-marquee-height: 200px;">
          ${logos()}
        </hui-marquee>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [, right, up, down] = canvasElement.querySelectorAll('hui-marquee');
    await waitFor(() => expect(up.running).toBe(true));
    await expect(getComputedStyle(partOf(up, 'track')).animationName).toBe('hui-marquee-y');
    await expect(getComputedStyle(partOf(right, 'track')).animationDirection).toBe('reverse');
    await expect(getComputedStyle(partOf(down, 'track')).animationDirection).toBe('reverse');
  },
};

export const Static = {
  name: 'Tĩnh (no-animation / giảm chuyển động)',
  render: () => html`
    <hui-marquee no-animation gap="lg">${logos()}</hui-marquee>
  `,
  play: async ({ canvasElement }) => {
    const mq = canvasElement.querySelector('hui-marquee');
    await waitFor(() => expect(partOf(mq, 'base').getAttribute('tabindex')).toBe('0'));
    await expect(clonesOf(mq).length).toBe(0);
    await expect(mq.running).toBe(false);
    await expect(getComputedStyle(partOf(mq, 'base')).overflowX).toBe('auto');
    // Bật lại chuyển động → có bản sao
    mq.noAnimation = false;
    await waitFor(() => expect(clonesOf(mq).length).toBeGreaterThan(0));
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-marquee.brand {
        --hui-marquee-gap: 48px;
        --hui-marquee-fade-size: 120px;
        --hui-marquee-padding: 16px 0;
      }
      hui-marquee.brand::part(base) {
        background: var(--hui-primary-1);
        border-radius: var(--hui-radius-lg);
      }
      hui-marquee.brand img { filter: grayscale(1); opacity: 0.7; transition: 0.2s; }
      hui-marquee.brand img:hover { filter: none; opacity: 1; }
    </style>
    <hui-marquee class="brand" edge-fade pause-on-hover speed="70">${logos()}</hui-marquee>
  `,
};
