import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-pattern/index.js';

export default {
  title: 'Molecules/HuiParallax',
  component: 'hui-parallax',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Parallax** — các lớp con trôi với tốc độ khác nhau khi cuộn trang.

\`\`\`html
<hui-parallax speed="0.3" style="height: 420px">
  <img data-layer data-speed="0.5" src="hero.jpg" alt="">   <!-- data-layer: phủ kín khung -->
  <div data-layer data-speed="0.2">…</div>
  <h1 data-speed="-0.15">Tiêu đề</h1>                      <!-- âm: trôi nhanh hơn (tiền cảnh) -->
</hui-parallax>
\`\`\`

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`speed\` | 0.3 | Tốc độ cho lớp không có \`data-speed\`: > 0 chậm hơn trang (xa), 0 theo trang, < 0 nhanh hơn (gần) |
| \`axis\` | \`y\` | \`y\` · \`x\` |
| \`no-animation\` | — | Các lớp đứng yên |

**Trên lớp con:** \`data-speed\` (tốc độ riêng), \`data-layer\` (absolute phủ kín khung, cao hơn 30% để trôi không hở mép)

**Thuộc tính JS:** \`layers\` · **Phương thức:** \`refresh()\` (tính lại khi tự đổi bố cục)

**Slot:** mặc định (các lớp) · **Part:** \`base\` · **Biến CSS:** \`--hui-parallax-height\`, \`--hui-parallax-overflow\` (hidden), \`--hui-parallax-radius\`

Dùng \`onScroll\` (gom 1 lần mỗi frame) + thuộc tính \`translate\` (không đè \`transform\` của lớp).
Tự tìm khung cuộn gần nhất (hoặc window); chỉ tính khi khung ở gần màn hình.
Giảm chuyển động / \`html[data-hui-no-animation]\` → các lớp về vị trí gốc.
        `,
      },
    },
  },
  argTypes: {
    speed: { control: { type: 'range', min: -1, max: 1, step: 0.05 } },
    axis: { control: 'inline-radio', options: ['y', 'x'] },
  },
};

/** Ảnh nền SVG tự tạo (không dùng tài nguyên mạng) */
const mountains = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" preserveAspectRatio="none">
<path d="M0 300 L120 180 L220 260 L360 120 L480 240 L600 150 L800 280 L800 400 L0 400Z" fill="#6366f1" opacity=".35"/></svg>`)}`;
const hills = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" preserveAspectRatio="none">
<path d="M0 340 Q200 250 400 320 T800 300 L800 400 L0 400Z" fill="#10b981" opacity=".45"/></svg>`)}`;

const scene = (speed, axis) => html`
  <hui-parallax speed=${speed} axis=${axis} style="height: 320px; --hui-parallax-radius: 16px; background: var(--hui-primary-1);">
    <img data-layer data-speed="0.6" src=${mountains} alt="">
    <img data-layer data-speed="0.3" src=${hills} alt="">
    <h2 data-speed="-0.1" style="margin: 0; padding-top: 110px; text-align: center; font: 800 36px var(--hui-font-family); color: var(--hui-text);">Cuộn để thấy chiều sâu</h2>
  </hui-parallax>`;

export const Default = {
  render: (args) => html`
    <div id="box" style="height: 420px; overflow: auto; border: 1px dashed var(--hui-border); border-radius: 12px; padding: 16px;">
      <p style="font-family: var(--hui-font-family); color: var(--hui-text-secondary)">Cuộn trong khung này ↓</p>
      <div style="height: 260px"></div>
      ${scene(args.speed, args.axis)}
      <div style="height: 500px"></div>
    </div>
  `,
  args: { speed: 0.3, axis: 'y' },
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('#box');
    const el = canvasElement.querySelector('hui-parallax');
    const [far] = el.layers;
    await expect(el.layers.length).toBe(3);
    box.scrollTop = 0;
    await waitFor(() => expect(far.style.translate).not.toBe(''));
    const before = parseFloat(far.style.translate.split(' ')[1]);
    box.scrollTop = 300;
    await waitFor(() => expect(parseFloat(far.style.translate.split(' ')[1])).not.toBe(before));
    const after = parseFloat(far.style.translate.split(' ')[1]);
    // Cuộn xuống 300px → lớp xa (0.6) bị đẩy ngược lại ~180px so với trước
    await expect(after - before).toBeCloseTo(180, -1);
  },
};

/** Khung trên trang chính (cuộn cả trang) */
export const WindowScroll = {
  render: () => html`
    <div style="height: 120px"></div>
    ${scene(0.3, 'y')}
    <hui-pattern variant="dots" style="height: 600px; margin-top: 24px; --hui-pattern-radius: 16px;"></hui-pattern>
  `,
};

/** no-animation: lớp đứng yên */
export const NoAnimation = {
  render: () => html`
    <hui-parallax no-animation style="height: 200px; background: var(--hui-primary-1); --hui-parallax-radius: 16px;">
      <img data-layer data-speed="0.6" src=${mountains} alt="">
      <p style="margin: 0; padding: 80px 0; text-align: center; font: 600 20px var(--hui-font-family); color: var(--hui-text);">Đứng yên</p>
    </hui-parallax>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-parallax');
    el.refresh();
    await expect(el.layers.every((l) => l.style.translate === '')).toBe(true);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .px-custom { --hui-parallax-height: 220px; --hui-parallax-radius: 32px; --hui-parallax-overflow: clip; }
      .px-custom::part(base) { outline: 2px solid var(--hui-primary-3); background: var(--hui-bg-secondary); }
    </style>
    <hui-parallax class="px-custom" speed="0.2">
      <img data-layer src=${hills} alt="">
      <p style="margin: 0; padding: 90px 0; text-align: center; font: 600 20px var(--hui-font-family); color: var(--hui-text);">Biến CSS + ::part(base)</p>
    </hui-parallax>
  `,
};
