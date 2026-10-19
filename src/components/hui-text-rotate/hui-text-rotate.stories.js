import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Atoms/HuiTextRotate',
  component: 'hui-text-rotate',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Text Rotate** — đổi lần lượt từ khoá ngay trong câu; bề rộng co giãn mượt nên chữ xung quanh không giật.

\`\`\`html
<h1>Xây giao diện <hui-text-rotate words="nhanh|đẹp|dễ tiếp cận"></hui-text-rotate> hơn</h1>
<hui-text-rotate words='["React","Vue","HTML thuần"]' effect="flip" interval="2000"></hui-text-rotate>
\`\`\`

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`words\` | — | JSON \`'["a","b"]'\`, chuỗi \`"a|b|c"\` hoặc mảng (gán bằng JS) |
| \`interval\` | 2500 | Thời gian giữa hai lần đổi (ms) |
| \`effect\` | \`slide\` | \`slide\` · \`fade\` · \`flip\` |
| \`duration\` | 500 | Thời lượng chuyển (ms) |
| \`paused\` | — | Tạm dừng tự đổi |
| \`no-animation\` | — | Đổi từ tức thì, không chuyển động |

**Thuộc tính JS:** \`index\`, \`currentWord\` (đọc) · **Phương thức:** \`next()\`

**Sự kiện:** \`hui-rotate\` {index, word}

**Part:** \`base\`, \`viewport\` (khung co giãn), \`word\`

**Biến CSS:** \`--hui-text-rotate-color\` (mặc định \`--hui-primary\`), \`--hui-text-rotate-weight\`, \`--hui-text-rotate-bg\`,
\`--hui-text-rotate-padding\`, \`--hui-text-rotate-radius\`

**A11y:** trình đọc màn hình nhận cả danh sách từ (bản sao ẩn), phần chuyển động \`aria-hidden\`.
Tự dừng khi ngoài màn hình. Giảm chuyển động / \`html[data-hui-no-animation]\` → đổi từ tức thì.
        `,
      },
    },
  },
  argTypes: {
    effect: { control: 'inline-radio', options: ['slide', 'fade', 'flip'] },
    interval: { control: 'number' },
    duration: { control: 'number' },
    paused: { control: 'boolean' },
  },
};

const headline = 'font: 700 32px/1.3 var(--hui-font-family); color: var(--hui-text); margin: 0;';

export const Default = {
  render: (args) => html`
    <h2 style=${headline}>
      Xây giao diện <hui-text-rotate words="nhanh|đẹp|dễ tiếp cận" effect=${args.effect}
        interval=${args.interval} duration=${args.duration} ?paused=${args.paused}></hui-text-rotate> hơn mỗi ngày
    </h2>
  `,
  args: { effect: 'slide', interval: 2000, duration: 500, paused: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-text-rotate');
    await expect(el.shadowRoot.querySelector('.sr-only').textContent).toBe('nhanh, đẹp, dễ tiếp cận');
    await expect(el.shadowRoot.querySelector('[part="viewport"]').getAttribute('aria-hidden')).toBe('true');
    await expect(el.currentWord).toBe('nhanh');
    await waitFor(() => expect(el.currentWord).toBe('đẹp'), { timeout: 4000 });
  },
};

/** Ba kiểu chuyển: slide · fade · flip */
export const Effects = {
  render: () => html`
    <div style="display: grid; gap: 12px; font: 600 22px var(--hui-font-family); color: var(--hui-text);">
      ${['slide', 'fade', 'flip'].map((fx) => html`
        <div>${fx}: Dùng với <hui-text-rotate effect=${fx} interval="1600" words='["React","Vue","Angular","HTML thuần"]'></hui-text-rotate> đều được.</div>`)}
    </div>
  `,
};

/** Bề rộng co giãn theo từ mới */
export const WidthAnimates = {
  render: () => html`
    <p style="font: 600 24px var(--hui-font-family); color: var(--hui-text);">
      [<hui-text-rotate id="w" paused words='["A","Một từ rất là dài"]' duration="200"></hui-text-rotate>]
    </p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#w');
    const vp = el.shadowRoot.querySelector('[part="viewport"]');
    const narrow = vp.getBoundingClientRect().width;
    el.next();
    await waitFor(() => expect(vp.querySelectorAll('.tr__word').length).toBe(1), { timeout: 2000 });
    await expect(vp.getBoundingClientRect().width).toBeGreaterThan(narrow * 3);
  },
};

/** Sự kiện + next() + paused + no-animation */
export const EventsAndApi = {
  render: () => html`
    <p style="font: 18px var(--hui-font-family); color: var(--hui-text)">
      Thủ công: <hui-text-rotate id="r" paused no-animation words="một|hai|ba"></hui-text-rotate>
    </p>
    <p id="log" style="font: 13px var(--hui-font-mono); color: var(--hui-text-secondary)">—</p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#r');
    const log = canvasElement.querySelector('#log');
    el.addEventListener('hui-rotate', (e) => { log.textContent = `${e.detail.index}:${e.detail.word}`; });
    el.next();
    await expect(log.textContent).toBe('1:hai');
    el.next();
    el.next();
    await expect(el.currentWord).toBe('một');
    await expect(el.shadowRoot.querySelectorAll('.tr__word').length).toBe(1);
    el.words = ['x', 'y'];
    await waitFor(() => expect(el.currentWord).toBe('x'));
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .tr-pill {
        --hui-text-rotate-color: var(--hui-text-light-solid);
        --hui-text-rotate-bg: var(--hui-primary);
        --hui-text-rotate-padding: 0 0.35em;
        --hui-text-rotate-radius: var(--hui-radius);
      }
      .tr-pill::part(word) { font-style: italic; }
    </style>
    <p style="font: 700 26px var(--hui-font-family); color: var(--hui-text)">
      Màu <hui-text-rotate class="tr-pill" effect="flip" words="tuỳ biến|qua biến CSS|và ::part"></hui-text-rotate> từ bên ngoài
    </p>
  `,
};
