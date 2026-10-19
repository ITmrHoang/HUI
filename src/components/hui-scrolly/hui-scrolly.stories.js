import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

/** Biểu đồ cột SVG tự vẽ — cột thứ `i` được tô nổi khi tới bước i (đổi bằng CSS theo attribute step) */
const BARS = [42, 68, 55, 90];
const chart = html`
  <svg class="chart" viewBox="0 0 320 220" role="img" aria-label="Doanh thu theo quý" style="width: min(90%, 420px); height: auto;">
    <line x1="20" y1="200" x2="310" y2="200" stroke="currentColor" stroke-opacity="0.3"></line>
    ${BARS.map((v, i) => html`<rect class="bar bar-${i}" x=${30 + i * 72} y=${200 - v * 2} width="52" height=${v * 2} rx="6"></rect>
      <text x=${56 + i * 72} y="216" text-anchor="middle" font-size="12" fill="currentColor">Q${i + 1}</text>`)}
  </svg>
`;

const chartCss = html`
  <style>
    .story-scrolly .bar { fill: var(--hui-fill); transition: fill 0.4s, opacity 0.4s; }
    .story-scrolly:not([step]) .bar, .story-scrolly[step="-1"] .bar { fill: var(--hui-primary-3); }
    .story-scrolly[step="0"] .bar-0,
    .story-scrolly[step="1"] .bar-1,
    .story-scrolly[step="2"] .bar-2,
    .story-scrolly[step="3"] .bar { fill: var(--hui-primary); }
    .story-scrolly .chart { color: var(--hui-text-secondary); }
  </style>
`;

const STEPS = [
  ['Quý 1', 'Doanh thu khởi đầu ở mức 42 triệu.'],
  ['Quý 2', 'Chiến dịch hè đẩy doanh thu lên 68 triệu.'],
  ['Quý 3', 'Mùa thấp điểm, giảm nhẹ còn 55 triệu.'],
  ['Quý 4', 'Mùa lễ hội — kỷ lục 90 triệu. Cả năm tăng trưởng đều.'],
];

const steps = () => STEPS.map(([title, text]) => html`
  <hui-scrolly-step><h3 style="margin: 0 0 8px;">${title}</h3><p style="margin: 0;">${text}</p></hui-scrolly-step>
`);

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/** Cuộn khung để tâm bước `el` nằm giữa khung */
function centerStep(box, el) {
  const boxRect = box.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  box.scrollTop += r.top + r.height / 2 - (boxRect.top + box.clientHeight / 2);
}

export default {
  title: 'Organisms/HuiScrolly',
  component: 'hui-scrolly',
  subcomponents: { HuiScrollyStep: 'hui-scrolly-step' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Scrolly** — scrollytelling: cột **đồ họa dính** (sticky, cao full khung nhìn) + cột **các bước** \`<hui-scrolly-step>\`.
Bước nào cắt qua đường kích hoạt (mặc định giữa màn hình — IntersectionObserver \`rootMargin: -50% 0px -50% 0px\`) thì thành bước hiện tại:
gắn \`active\` lên bước, \`step="i"\` lên host, phát \`hui-step-enter\`. Đổi đồ họa bằng CSS (\`hui-scrolly[step="2"] .x {…}\`) hoặc JS.
Khung hẹp hơn \`breakpoint\` → xếp chồng: đồ họa dính trên cùng (\`--hui-scrolly-stacked-height\`), các bước cuộn bên dưới.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`side\` | \`left\` | Cột đồ họa bên \`left\` / \`right\` |
| \`breakpoint\` | \`768\` | Bề rộng khung (px) dưới mức này thì xếp chồng |
| \`offset\` | \`0.5\` | Vị trí đường kích hoạt (0 = mép trên … 1 = mép dưới) |
| \`step\` | \`-1\` | Bước hiện tại (tự cập nhật) |
| \`root\` | — | Selector khung cuộn (bỏ trống = cửa sổ) |
| \`no-animation\` | — | \`scrollToStep()\` không cuộn mượt |

**hui-scrolly-step:** attribute \`active\` (tự gắn, kèm \`aria-current="step"\`) · part \`base\`
**Phương thức:** \`scrollToStep(i)\` · **Thuộc tính JS:** \`steps\` (chỉ đọc)
**Sự kiện:** \`hui-step-enter\` {index, step, direction}, \`hui-step-exit\` {index, step}
**Trạng thái CSS:** \`:state(stacked)\`, \`:state(started)\`
**Slots:** \`sticky\` (đồ họa), mặc định (các bước) · **Parts:** \`base\`, \`graphic\`, \`steps\`

| Biến CSS | Mặc định |
|----------|----------|
| \`--hui-scrolly-graphic-width\` · \`--hui-scrolly-steps-width\` | \`minmax(0, 1fr)\` |
| \`--hui-scrolly-gap\` | \`--hui-space-2xl\` |
| \`--hui-scrolly-top\` | \`0\` (chừa chỗ header dính) |
| \`--hui-scrolly-graphic-height\` | \`100vh\` |
| \`--hui-scrolly-stacked-height\` | \`50vh\` |
| \`--hui-scrolly-graphic-bg\` | \`--hui-bg-container\` |
| \`--hui-scrolly-step-gap\` | \`0\` |
| \`--hui-scrolly-step-min-height\` · \`-align\` · \`-bg\` · \`-padding\` · \`-radius\` · \`-shadow\` · \`-inactive-opacity\` · \`-active-border\` | (bước) |

**Bàn phím:** cuộn trang bình thường (Space / PageDown / mũi tên) — không chặn cuộn tự nhiên.
        `,
      },
    },
  },
};

export const Default = {
  name: 'Trong khung cuộn',
  render: () => html`
    ${chartCss}
    <div class="scroll-box" style="height: 420px; overflow: auto; border: 1px solid var(--hui-border-secondary); border-radius: 8px;">
      <p style="padding: 16px; margin: 0;">Cuộn xuống để xem câu chuyện doanh thu.</p>
      <hui-scrolly class="story-scrolly" root=".scroll-box" breakpoint="560"
        style="--hui-scrolly-graphic-height: 420px; --hui-scrolly-stacked-height: 200px; --hui-scrolly-step-min-height: 320px;">
        <div slot="sticky">${chart}</div>
        ${steps()}
      </hui-scrolly>
      <p style="padding: 16px; margin: 0; height: 200px;">Hết câu chuyện.</p>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('.scroll-box');
    const scrolly = canvasElement.querySelector('hui-scrolly');
    const stepEls = scrolly.steps;
    const events = [];
    scrolly.addEventListener('hui-step-enter', (e) => events.push(e.detail));
    await expect(stepEls.length).toBe(4);
    await nextFrame();

    centerStep(box, stepEls[1]);
    await waitFor(() => expect(scrolly.step).toBe(1));
    await expect(scrolly.getAttribute('step')).toBe('1');
    await expect(stepEls[1].hasAttribute('active')).toBe(true);
    await expect(stepEls[1].getAttribute('aria-current')).toBe('step');
    await expect(stepEls[0].hasAttribute('active')).toBe(false);

    centerStep(box, stepEls[3]);
    await waitFor(() => expect(scrolly.step).toBe(3));
    const last = events[events.length - 1];
    await expect(last.index).toBe(3);
    await expect(last.step).toBe(stepEls[3]);
    await expect(last.direction).toBe('down');

    centerStep(box, stepEls[2]);
    await waitFor(() => expect(scrolly.step).toBe(2));
    await expect(events[events.length - 1].direction).toBe('up');

    // Đồ họa đứng yên (sticky) trong lúc các bước cuộn
    const graphic = scrolly.shadowRoot.querySelector('[part="graphic"]');
    const before = graphic.getBoundingClientRect().top;
    box.scrollTop += 40;
    await nextFrame();
    await expect(Math.abs(graphic.getBoundingClientRect().top - before)).toBeLessThan(2);
  },
};

export const SideRight = {
  name: 'side="right" + scrollToStep()',
  render: () => html`
    ${chartCss}
    <div class="scroll-box" style="height: 420px; overflow: auto; border: 1px solid var(--hui-border-secondary); border-radius: 8px;">
      <hui-scrolly class="story-scrolly" side="right" root=".scroll-box" breakpoint="0" no-animation
        style="--hui-scrolly-graphic-height: 420px; --hui-scrolly-step-min-height: 360px; --hui-scrolly-graphic-width: 1.4fr;">
        <div slot="sticky">${chart}</div>
        ${steps()}
      </hui-scrolly>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const scrolly = canvasElement.querySelector('hui-scrolly');
    await nextFrame();
    const base = scrolly.shadowRoot.querySelector('[part="base"]');
    await expect(base.classList.contains('scrolly--right')).toBe(true);
    await expect(scrolly.matches(':state(stacked)')).toBe(false);
    const graphic = scrolly.shadowRoot.querySelector('[part="graphic"]');
    const stepsCol = scrolly.shadowRoot.querySelector('[part="steps"]');
    await expect(graphic.getBoundingClientRect().left).toBeGreaterThan(stepsCol.getBoundingClientRect().left);
    scrolly.scrollToStep(2);
    await waitFor(() => expect(scrolly.step).toBe(2));
  },
};

export const Stacked = {
  name: 'Xếp chồng (khung hẹp)',
  render: () => html`
    ${chartCss}
    <div class="scroll-box" style="height: 480px; max-width: 380px; overflow: auto; border: 1px solid var(--hui-border-secondary); border-radius: 8px;">
      <hui-scrolly class="story-scrolly" root=".scroll-box" offset="0.7"
        style="--hui-scrolly-stacked-height: 220px; --hui-scrolly-step-min-height: 300px;">
        <div slot="sticky">${chart}</div>
        ${steps()}
      </hui-scrolly>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const scrolly = canvasElement.querySelector('hui-scrolly');
    await waitFor(() => expect(scrolly.matches(':state(stacked)')).toBe(true));
    const graphic = scrolly.shadowRoot.querySelector('[part="graphic"]');
    const stepsCol = scrolly.shadowRoot.querySelector('[part="steps"]');
    // Đồ họa ở trên các bước
    await expect(graphic.getBoundingClientRect().bottom).toBeLessThanOrEqual(stepsCol.getBoundingClientRect().top + 1);
  },
};

export const FullPage = {
  name: 'Toàn trang (cuộn cửa sổ)',
  render: () => html`
    ${chartCss}
    <p style="max-width: 640px;">Phiên bản cuộn theo cửa sổ: đồ họa cao 100vh, bước cao 80vh.</p>
    <hui-scrolly class="story-scrolly">
      <div slot="sticky">${chart}</div>
      ${steps()}
    </hui-scrolly>
    <p style="height: 40vh;">Phần sau câu chuyện.</p>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    ${chartCss}
    <style>
      hui-scrolly.brand {
        --hui-scrolly-graphic-bg: linear-gradient(160deg, var(--hui-primary-1), var(--hui-bg-container));
        --hui-scrolly-gap: 0px;
        --hui-scrolly-graphic-height: 400px;
        --hui-scrolly-step-min-height: 300px;
        --hui-scrolly-step-inactive-opacity: 0.15;
        --hui-scrolly-step-active-border: 6px solid var(--hui-success);
        --hui-scrolly-step-radius: 0;
      }
      hui-scrolly.brand::part(graphic) { border-radius: 16px; }
      hui-scrolly.brand hui-scrolly-step::part(base) { margin-inline: 24px; }
    </style>
    <div class="scroll-box" style="height: 400px; overflow: auto;">
      <hui-scrolly class="brand story-scrolly" root=".scroll-box" breakpoint="0">
        <div slot="sticky">${chart}</div>
        ${steps()}
      </hui-scrolly>
    </div>
  `,
};
