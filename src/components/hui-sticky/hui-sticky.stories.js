import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const box = 'height: 320px; overflow: auto; border: 1px solid var(--hui-border-secondary); border-radius: 8px; position: relative;';
const header = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--hui-bg-container); border-bottom: 1px solid var(--hui-border-secondary);';
const filler = (n, label = 'Nội dung') => Array.from({ length: n }, (_, i) => html`<p style="margin: 0; padding: 12px 16px;">${label} dòng ${i + 1}</p>`);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

export default {
  title: 'Atoms/HuiSticky',
  component: 'hui-sticky',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Sticky** — dính khi cuộn trong khung cha (CSS \`position: sticky\` trên chính thẻ), thêm trạng thái "đang dính"
để đổi style (bóng đổ header, thu nhỏ logo…). Phát hiện bằng IntersectionObserver với 2 mốc 1px trong shadow DOM —
không chèn phần tử vào trang. Khung cuộn tự tìm (tổ tiên gần nhất có overflow), không có thì là cửa sổ.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`top\` | \`0\` (khi không đặt top/bottom) | Khoảng cách tới mép trên khi dính: số (px) hoặc CSS length |
| \`bottom\` | — | Dính ở đáy (thanh hành động cuối form, giỏ hàng) |
| \`z-index\` | \`--hui-z-sticky\` | Thứ tự lớp khi dính |
| \`stuck\` | — | **Chỉ đọc** — component tự gắn khi đang dính |
| \`disabled\` | — | Tắt dính (position: static) |

**Sự kiện:** \`hui-stuck-change\` {stuck, edge: 'top' | 'bottom' | null}
**Trạng thái CSS:** \`hui-sticky:state(stuck)\` (hoặc \`hui-sticky[stuck]\`), \`:state(stuck-top)\`, \`:state(stuck-bottom)\`
**Slot:** mặc định · **Part:** \`base\`

| Biến CSS | Mặc định | Mô tả |
|----------|----------|-------|
| \`--hui-sticky-bg\` | trong suốt | Nền khi đang dính |
| \`--hui-sticky-shadow\` | không | Bóng khi đang dính |
| \`--hui-sticky-transition\` | nền + bóng theo \`--hui-motion-duration\` | Chuyển tiếp |

**Lưu ý:** dính trong phạm vi **thẻ cha** (giống CSS sticky) — đặt hui-sticky là con trực tiếp của vùng muốn dính.
**Bàn phím:** không có tương tác riêng (nội dung bên trong giữ hành vi gốc).
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <style>
      .demo-sticky:state(stuck) { --hui-sticky-shadow: var(--hui-shadow-md); }
      .demo-sticky[stuck] .demo-status::after { content: 'đang dính'; color: var(--hui-primary); }
      .demo-sticky:not([stuck]) .demo-status::after { content: 'chưa dính'; color: var(--hui-text-tertiary); }
    </style>
    <div class="scroll-box" style=${box}>
      <p style="margin: 0; padding: 16px;">Cuộn xuống — thanh dưới đây dính ở mép trên và đổ bóng khi dính.</p>
      <hui-sticky class="demo-sticky">
        <div style=${header}><strong>Tiêu đề dính</strong><span class="demo-status"></span></div>
      </hui-sticky>
      ${filler(30)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('.scroll-box');
    const sticky = canvasElement.querySelector('hui-sticky');
    const events = [];
    sticky.addEventListener('hui-stuck-change', (e) => events.push(e.detail));
    await nextFrame();
    await expect(sticky.stuck).toBe(false);
    box.scrollTop = 300;
    await waitFor(() => expect(sticky.stuck).toBe(true));
    await expect(sticky.hasAttribute('stuck')).toBe(true);
    await expect(sticky.matches(':state(stuck)')).toBe(true);
    // Thực sự đứng ở mép trên khung cuộn
    const top = sticky.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientTop;
    await expect(Math.abs(top)).toBeLessThan(2);
    box.scrollTop = 0;
    await waitFor(() => expect(sticky.stuck).toBe(false));
    await expect(events.map((e) => e.stuck)).toEqual([true, false]);
    await expect(events[0].edge).toBe('top');
  },
};

export const OffsetAndSections = {
  name: 'top offset + dính theo từng phần',
  render: () => html`
    <style>
      .sec-sticky { --hui-sticky-bg: var(--hui-bg-elevated); --hui-sticky-shadow: var(--hui-shadow-sm); }
    </style>
    <div class="scroll-box" style=${box}>
      <hui-sticky top="0" z-index="3">
        <div style="${header} background: var(--hui-primary); color: var(--hui-text-light-solid);">Header trang (top=0)</div>
      </hui-sticky>
      ${['A', 'B', 'C'].map((s) => html`
        <section>
          <hui-sticky class="sec-sticky" top="45">
            <div style="padding: 8px 16px; font-weight: 600;">Mục ${s} (top=45, chỉ dính trong mục ${s})</div>
          </hui-sticky>
          ${filler(8, `Mục ${s}`)}
        </section>
      `)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('.scroll-box');
    const [, secA, secB] = canvasElement.querySelectorAll('hui-sticky');
    await nextFrame();
    // Cuộn vào giữa mục A → tiêu đề A dính dưới header
    const sectionA = secA.parentElement;
    box.scrollTop = sectionA.offsetTop + 120;
    await waitFor(() => expect(secA.stuck).toBe(true));
    await expect(secB.stuck).toBe(false);
    // Sang mục B → A bị đẩy đi (hết khung cha) → thôi dính
    box.scrollTop = secB.parentElement.offsetTop + 120;
    await waitFor(() => expect(secB.stuck).toBe(true));
    await waitFor(() => expect(secA.stuck).toBe(false));
  },
};

export const Bottom = {
  name: 'Dính ở đáy (bottom)',
  render: () => html`
    <div class="scroll-box" style=${box}>
      ${filler(14, 'Trường form')}
      <hui-sticky bottom="0" style="--hui-sticky-shadow: 0 -4px 12px rgb(0 0 0 / 0.08);">
        <div style="display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; background: var(--hui-bg-container); border-top: 1px solid var(--hui-border-secondary);">
          <button type="button">Hủy</button><button type="button">Lưu</button>
        </div>
      </hui-sticky>
      ${filler(2, 'Cuối trang')}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('.scroll-box');
    const sticky = canvasElement.querySelector('hui-sticky');
    await nextFrame();
    // Ban đầu thanh nằm dưới khung nhìn → đang dính ở đáy
    await waitFor(() => expect(sticky.stuck).toBe(true));
    await expect(sticky.matches(':state(stuck-bottom)')).toBe(true);
    box.scrollTop = box.scrollHeight;
    await waitFor(() => expect(sticky.stuck).toBe(false));
  },
};

export const Disabled = {
  render: () => html`
    <div style=${box}>
      <hui-sticky disabled><div style=${header}>disabled — không dính</div></hui-sticky>
      ${filler(20)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sticky = canvasElement.querySelector('hui-sticky');
    await expect(getComputedStyle(sticky).position).toBe('static');
    await expect(sticky.stuck).toBe(false);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-sticky.brand {
        --hui-sticky-bg: color-mix(in srgb, var(--hui-bg-container) 80%, transparent);
        --hui-sticky-shadow: 0 1px 0 var(--hui-border), var(--hui-shadow-lg);
        --hui-sticky-transition: all 0.4s ease;
      }
      hui-sticky.brand::part(base) { backdrop-filter: blur(8px); }
      hui-sticky.brand:state(stuck) .logo { font-size: 14px; }
      hui-sticky.brand .logo { font-size: 20px; transition: font-size 0.3s; padding: 12px 16px; display: block; font-weight: 700; }
    </style>
    <div style=${box}>
      <hui-sticky class="brand"><span class="logo">LOGO (thu nhỏ khi dính)</span></hui-sticky>
      ${filler(30)}
    </div>
  `,
};
