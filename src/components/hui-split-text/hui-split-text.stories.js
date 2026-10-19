import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import { ANIMATIONS } from '../../utils/animate.js';

export default {
  title: 'Atoms/HuiSplitText',
  component: 'hui-split-text',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Split Text** — tách chữ thành từng từ / ký tự, cho hiện lần lượt khi cuộn tới. Dùng chung danh sách hiệu ứng với \`data-hui-animate\`.

\`\`\`html
<h2><hui-split-text>Thiết kế đẹp, chạy nhanh</hui-split-text></h2>
<hui-split-text by="chars" effect="blur-in" stagger="30">Từng ký tự một</hui-split-text>
\`\`\`

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`by\` | \`words\` | \`words\` · \`chars\` (chỉ xuống dòng giữa các từ) |
| \`effect\` | \`fade-up\` | ${Object.keys(ANIMATIONS).join(' · ')} |
| \`stagger\` | 50 | Khoảng cách giữa hai mảnh (ms) |
| \`duration\` / \`delay\` | 500 / 0 | ms |
| \`once\` | \`true\` | \`false\`: cuộn ra rồi vào lại thì chạy lại |
| \`threshold\` | 0.2 | Tỉ lệ nhìn thấy trước khi chạy |
| \`no-animation\` | — | Hiện ngay |
| \`revealed\` | — | (chỉ đọc) Đã hiện |

**Thuộc tính JS:** \`pieces\` (các mảnh đang hiệu ứng) · **Phương thức:** \`reveal()\`, \`reset()\`

**Sự kiện:** \`hui-reveal\` {effect, count}

**Part:** \`base\`, \`word\`, \`char\` · **Biến CSS:** \`--hui-split-text-hidden-opacity\` (mặc định 0)

**A11y:** trình đọc màn hình đọc nguyên câu (bản sao ẩn); các mảnh tách ra \`aria-hidden\`.
Chỉ nhận chữ thuần (thẻ con bên trong được đọc thành chữ). Nội dung đổi (framework render lại) → tự tách lại.
Giảm chuyển động / \`html[data-hui-no-animation]\` → hiện ngay khi cuộn tới, không chuyển động.
        `,
      },
    },
  },
  argTypes: {
    by: { control: 'inline-radio', options: ['words', 'chars'] },
    effect: { control: 'select', options: Object.keys(ANIMATIONS) },
    stagger: { control: 'number' },
    duration: { control: 'number' },
  },
};

const headline = 'font: 800 36px/1.25 var(--hui-font-family); color: var(--hui-text); margin: 0;';

export const Default = {
  render: (args) => html`
    <h2 style=${headline}>
      <hui-split-text by=${args.by} effect=${args.effect} stagger=${args.stagger} duration=${args.duration}>Thiết kế đẹp, chạy nhanh, ai cũng dùng được</hui-split-text>
    </h2>
  `,
  args: { by: 'words', effect: 'fade-up', stagger: 60, duration: 500 },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-split-text');
    await expect(el.shadowRoot.querySelector('.sr-only').textContent).toBe('Thiết kế đẹp, chạy nhanh, ai cũng dùng được');
    await expect(el.shadowRoot.querySelector('[part="base"]').getAttribute('aria-hidden')).toBe('true');
    await expect(el.pieces.length).toBe(9);
    await waitFor(() => expect(el.hasAttribute('revealed')).toBe(true));
  },
};

/** Tách theo ký tự (ký tự có dấu tiếng Việt không bị cắt) */
export const Chars = {
  render: () => html`
    <h2 style=${headline}><hui-split-text by="chars" effect="blur-in" stagger="25">Tiếng Việt có dấu</hui-split-text></h2>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-split-text');
    await expect(el.pieces.map((p) => p.textContent).join('')).toBe('TiếngViệtcódấu');
    await expect(el.shadowRoot.querySelectorAll('[part="word"]').length).toBe(4);
    await waitFor(() => expect(el.revealed).toBe(true));
    const anims = el.pieces.map((p) => p.getAnimations()[0]?.effect.getTiming().delay ?? null);
    if (anims[0] !== null) await expect(anims.slice(0, 3)).toEqual([0, 25, 50]);
  },
};

/** Chạy khi cuộn tới */
export const OnScroll = {
  render: () => html`
    <div style="height: 280px; overflow: auto; border: 1px dashed var(--hui-border); border-radius: 12px; padding: 16px;">
      <p style="font-family: var(--hui-font-family); color: var(--hui-text-secondary)">Cuộn xuống ↓</p>
      <div style="height: 420px"></div>
      ${['fade-up', 'zoom-in', 'flip-up', 'slide-up'].map((fx) => html`
        <h3 style="font: 700 26px var(--hui-font-family); color: var(--hui-text)"><hui-split-text effect=${fx}>Hiệu ứng ${fx} cho từng từ</hui-split-text></h3>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const first = canvasElement.querySelector('hui-split-text');
    await new Promise((r) => setTimeout(r, 200));
    await expect(first.revealed).toBe(false);
    first.scrollIntoView();
    await waitFor(() => expect(first.revealed).toBe(true));
  },
};

/** Sự kiện + reset() + nội dung đổi thì tách lại */
export const EventsAndApi = {
  render: () => html`
    <p style="font: 600 20px var(--hui-font-family); color: var(--hui-text)"><hui-split-text id="s" no-animation>Ba từ thôi</hui-split-text></p>
    <p id="log" style="font: 13px var(--hui-font-mono); color: var(--hui-text-secondary)">—</p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#s');
    const log = canvasElement.querySelector('#log');
    el.addEventListener('hui-reveal', (e) => { log.textContent = `hui-reveal ${e.detail.count}`; });
    await waitFor(() => expect(el.revealed).toBe(true));
    el.reset();
    await expect(el.hasAttribute('revealed')).toBe(false);
    el.textContent = 'Nội dung mới năm từ';
    await waitFor(() => expect(el.pieces.length).toBe(5));
    el.reveal();
    await expect(log.textContent).toBe('hui-reveal 5');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .st-custom { --hui-split-text-hidden-opacity: 0.15; }
      .st-custom::part(word) { padding: 0 0.1em; border-bottom: 3px solid var(--hui-primary-3); }
    </style>
    <h2 style=${headline}><hui-split-text class="st-custom" effect="fade-right" stagger="120">Biến CSS và part word</hui-split-text></h2>
  `,
};
