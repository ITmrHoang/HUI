import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-card/index.js';
import { ANIMATIONS } from '../../utils/animate.js';

export default {
  title: 'Molecules/HuiReveal',
  component: 'hui-reveal',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Reveal** — nội dung hiện dần khi cuộn tới. Dạng component của directive \`data-hui-animate\`
(dùng directive khi không muốn thêm thẻ bọc; dùng \`hui-reveal\` khi cần sự kiện / API).

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`effect\` | \`fade-up\` | ${Object.keys(ANIMATIONS).join(' · ')} |
| \`duration\` / \`delay\` | 600 / 0 | ms |
| \`stagger\` | 0 | > 0: các con hiện lần lượt cách nhau N ms |
| \`once\` | \`true\` | \`false\`: cuộn ra rồi vào lại thì chạy lại |
| \`threshold\` / \`offset\` | 0.15 / \`0px 0px -10% 0px\` | Khi nào coi là "đã cuộn tới" |
| \`inline\` | — | inline-block |
| \`no-animation\` | — | Hiện ngay, không hiệu ứng |

**Sự kiện:** \`hui-reveal\` {effect}, \`hui-hide\` · **Phương thức:** \`reveal()\`, \`hide()\` · **Part:** \`base\`

**Biến CSS:** \`--hui-reveal-hidden-opacity\` (mặc định 0)
        `,
      },
    },
  },
  argTypes: {
    effect: { control: 'select', options: Object.keys(ANIMATIONS) },
    stagger: { control: 'number' },
    duration: { control: 'number' },
  },
};

const box = (text) => html`<div style="padding: 24px; border-radius: 12px; background: var(--hui-primary-1); color: var(--hui-primary-7); font: 600 16px var(--hui-font-family); text-align: center;">${text}</div>`;

export const Default = {
  render: (args) => html`
    <hui-reveal effect=${args.effect} duration=${args.duration} stagger=${args.stagger}>
      ${box('Hiện dần khi cuộn tới')}
    </hui-reveal>
  `,
  args: { effect: 'fade-up', duration: 600, stagger: 0 },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-reveal');
    await waitFor(() => expect(el.hasAttribute('revealed')).toBe(true));
  },
};

/** Phần tử nằm dưới màn hình: chỉ hiện khi cuộn tới */
export const OnScroll = {
  render: () => html`
    <div class="scroll-box" style="height: 320px; overflow: auto; border: 1px dashed var(--hui-border); border-radius: 12px; padding: 16px;">
      <p style="font-family: var(--hui-font-family); color: var(--hui-text-secondary)">Cuộn xuống ↓</p>
      <div style="height: 500px"></div>
      ${Object.keys(ANIMATIONS).map((name) => html`
        <hui-reveal effect=${name} style="margin-bottom: 16px">${box(name)}</hui-reveal>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const first = canvasElement.querySelector('hui-reveal');
    await new Promise((r) => setTimeout(r, 200));
    await expect(first.hasAttribute('revealed')).toBe(false);
    first.scrollIntoView();
    await waitFor(() => expect(first.hasAttribute('revealed')).toBe(true));
  },
};

/** Các thẻ card hiện lần lượt */
export const Stagger = {
  render: () => html`
    <hui-reveal effect="zoom-in" stagger="120" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px;">
      ${[1, 2, 3, 4, 5, 6].map((n) => html`<hui-card title="Thẻ ${n}">Nội dung ${n}</hui-card>`)}
    </hui-reveal>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-reveal');
    await waitFor(() => expect(el.hasAttribute('revealed')).toBe(true));
    const delays = [...el.children].map((c) => c.getAnimations()[0]?.effect.getTiming().delay ?? null);
    // Môi trường test có thể bật giảm chuyển động → không có animation; nếu có thì phải so le 120ms
    if (delays[0] !== null) await expect(delays.slice(0, 3)).toEqual([0, 120, 240]);
  },
};

/** Sự kiện + API + no-animation */
export const EventsAndApi = {
  render: () => html`
    <hui-reveal id="r1" no-animation>${box('no-animation: hiện ngay')}</hui-reveal>
    <p id="log" style="font: 13px var(--hui-font-mono)">—</p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#r1');
    const log = canvasElement.querySelector('#log');
    el.addEventListener('hui-hide', () => { log.textContent = 'hui-hide'; });
    await waitFor(() => expect(el.revealed).toBe(true));
    el.hide();
    await expect(log.textContent).toBe('hui-hide');
    await expect(el.hasAttribute('revealed')).toBe(false);
    el.reveal();
    await expect(el.hasAttribute('revealed')).toBe(true);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-reveal.soft { --hui-reveal-hidden-opacity: 0.25; }
      hui-reveal.soft::part(base) { border-left: 4px solid var(--hui-primary); padding-left: 12px; }
    </style>
    <hui-reveal class="soft" effect="fade-right" duration="900">${box('Biến CSS + ::part(base)')}</hui-reveal>
  `,
};
