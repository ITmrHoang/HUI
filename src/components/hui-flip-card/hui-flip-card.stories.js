import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';
import '../hui-icon/index.js';

export default {
  title: 'Molecules/HuiFlipCard',
  component: 'hui-flip-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Flip Card** — thẻ lật mặt trước / mặt sau.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`trigger\` | \`hover\` | \`hover\` (chạm để lật trên cảm ứng, focus bằng Tab cũng lật) · \`click\` (Enter/Space) · \`manual\` |
| \`direction\` | \`horizontal\` | Trục lật: \`horizontal\` / \`vertical\` |
| \`flipped\` | — | Đang hiện mặt sau |
| \`auto-height\` | — | Cao theo mặt cao hơn |
| \`no-animation\` | — | Đổi mặt bằng mờ dần, không xoay |

**Slots:** \`front\`, \`back\` · **Sự kiện:** \`change\` {flipped} · **Phương thức:** \`flip()\`
**Parts:** base, inner, front, back

**Biến CSS:** \`--hui-flip-card-height\`, \`-radius\`, \`-duration\`, \`-perspective\`, \`-front-bg\`, \`-back-bg\`, \`-shadow\`, \`-padding\`
        `,
      },
    },
  },
};

const grid = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;';
const center = 'display: grid; place-content: center; text-align: center; gap: 8px;';

export const Default = {
  render: () => html`
    <div style=${grid}>
      <hui-flip-card>
        <div slot="front" style=${center}><hui-icon name="star" size="40" style="color: var(--hui-warning)"></hui-icon><strong>Rê chuột để lật</strong></div>
        <div slot="back" style=${center}><strong>Mặt sau</strong><span>Nội dung chi tiết ở đây.</span></div>
      </hui-flip-card>
      <hui-flip-card trigger="click" direction="vertical">
        <div slot="front" style=${center}><strong>Bấm để lật (trục dọc)</strong></div>
        <div slot="back" style=${center}><strong>Đã lật</strong><hui-button size="sm" variant="secondary">Nút ở mặt sau</hui-button></div>
      </hui-flip-card>
      <hui-flip-card no-animation trigger="click">
        <div slot="front" style=${center}><strong>no-animation</strong><span>Đổi mặt bằng mờ dần</span></div>
        <div slot="back" style=${center}><strong>Mặt sau</strong></div>
      </hui-flip-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [, clickCard] = canvasElement.querySelectorAll('hui-flip-card');
    const base = clickCard.shadowRoot.querySelector('[part="base"]');
    let events = 0;
    clickCard.addEventListener('change', () => events++);
    await expect(base.getAttribute('role')).toBe('button');
    base.click();
    await expect(clickCard.flipped).toBe(true);
    await expect(base.getAttribute('aria-pressed')).toBe('true');
    await expect(clickCard.shadowRoot.querySelector('[part="front"]').inert).toBe(true);
    // Bấm nút bên trong mặt sau không lật lại
    clickCard.querySelector('hui-button').click();
    await expect(clickCard.flipped).toBe(true);
    base.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await expect(clickCard.flipped).toBe(false);
    await expect(events).toBe(2);
  },
};

export const AutoHeight = {
  render: () => html`
    <hui-flip-card auto-height trigger="click" style="max-width: 320px">
      <div slot="front"><strong>Mặt trước ngắn</strong></div>
      <div slot="back"><p>Mặt sau dài hơn nhiều — thẻ tự cao theo mặt cao hơn để nội dung không bị cắt.</p><p>Dòng thứ hai.</p><p>Dòng thứ ba.</p></div>
    </hui-flip-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('hui-flip-card');
    await expect(card.getBoundingClientRect().height).toBeGreaterThan(80);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-flip-card.brand {
        --hui-flip-card-height: 180px;
        --hui-flip-card-back-bg: linear-gradient(135deg, #db2777, #4f46e5);
        --hui-flip-card-radius: 24px;
        --hui-flip-card-duration: 900ms;
      }
      hui-flip-card.brand::part(front) { border: 2px dashed var(--hui-primary); }
    </style>
    <hui-flip-card class="brand" style="max-width: 280px">
      <div slot="front" style=${center}>Biến CSS + ::part(front)</div>
      <div slot="back" style=${center}>Nền gradient, lật chậm</div>
    </hui-flip-card>
  `,
};
