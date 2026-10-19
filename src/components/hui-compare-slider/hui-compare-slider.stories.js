import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { svgImage } from '../hui-image/story-images.js';

const BEFORE = svgImage({ w: 1200, h: 700, hue: 220, label: 'Trước' });
const AFTER = svgImage({ w: 1200, h: 700, hue: 30, label: 'Sau' });

const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);

export default {
  title: 'Molecules/HuiCompareSlider',
  component: 'hui-compare-slider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Compare Slider** — so sánh ảnh trước / sau bằng thanh kéo. Ảnh "sau" nằm dưới, ảnh "trước" phủ lên và bị cắt bằng \`clip-path\`.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`position\` | \`50\` | Vị trí đường chia, 0–100 (% phần "trước") |
| \`orientation\` | \`horizontal\` | \`horizontal\` (trái / phải) \\| \`vertical\` (trên / dưới) |
| \`before-src\` / \`after-src\` | — | Ảnh (hoặc dùng slot \`before\` / \`after\`) |
| \`before-alt\` / \`after-alt\` | — | Mô tả ảnh |
| \`before-label\` / \`after-label\` | — | Nhãn góc ảnh (bỏ trống = không hiện) |
| \`ratio\` | — | Tỉ lệ khung; bỏ trống = theo nội dung "sau" |
| \`step\` | \`1\` | Bước phím mũi tên |
| \`hover\` | — | Đường chia chạy theo chuột khi rê (không cần nhấn giữ) |
| \`label\` | locale | Nhãn ARIA của tay nắm |
| \`disabled\` | — | Không cho kéo / bấm phím |

**Events:** \`input\` {position} (liên tục) · \`change\` {position} (thả chuột / bấm phím)

**Slots:** \`before\`, \`after\`, \`handle\` · **Parts:** base, before, after, divider, handle, label, label-before, label-after · **States:** \`:state(start)\`, \`:state(end)\`

**CSS:** \`--hui-compare-slider-divider-width\`, \`-divider-color\`, \`-handle-size\`, \`-handle-bg\`, \`-handle-color\`, \`-radius\`, \`-label-bg\`, \`-label-color\`, \`-focus-color\`

**Bàn phím (tay nắm \`role="slider"\`):** ← / ↓ giảm, → / ↑ tăng theo \`step\` · PageDown / PageUp ±10 · Home = 0 · End = 100. Bấm / kéo bất kỳ đâu trên ảnh để đặt vị trí.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-compare-slider style="max-width: 720px" before-src=${BEFORE} after-src=${AFTER} before-alt="Ảnh trước khi chỉnh" after-alt="Ảnh sau khi chỉnh"
      before-label="Trước" after-label="Sau"></hui-compare-slider>
  `,
  play: async ({ canvasElement }) => {
    const cs = canvasElement.querySelector('hui-compare-slider');
    const handle = part(cs, 'handle');
    const inputs = [];
    const changes = [];
    cs.addEventListener('input', (e) => inputs.push(e.detail.position));
    cs.addEventListener('change', (e) => changes.push(e.detail.position));

    await expect(handle.getAttribute('role')).toBe('slider');
    await expect(handle.getAttribute('aria-valuenow')).toBe('50');
    await expect(handle.getAttribute('aria-valuemin')).toBe('0');
    await expect(handle.getAttribute('aria-valuemax')).toBe('100');
    await expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    await expect(part(cs, 'label-before').textContent).toBe('Trước');

    handle.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(cs.position).toBe(51);
    await expect(handle.getAttribute('aria-valuenow')).toBe('51');
    await userEvent.keyboard('{PageDown}');
    await expect(cs.position).toBe(41);
    await userEvent.keyboard('{End}');
    await expect(cs.position).toBe(100);
    await expect(cs.matches(':state(end)')).toBe(true);
    await userEvent.keyboard('{Home}');
    await expect(cs.position).toBe(0);
    await expect(inputs).toEqual([51, 41, 100, 0]);
    await expect(changes).toEqual([51, 41, 100, 0]);

    // Kéo bằng con trỏ: bấm ở 25% bề rộng
    const base = part(cs, 'base');
    const r = base.getBoundingClientRect();
    const fire = (type, x) => base.dispatchEvent(new PointerEvent(type, {
      bubbles: true, composed: true, cancelable: true, pointerId: 3, pointerType: 'mouse', button: 0, clientX: x, clientY: r.top + r.height / 2,
    }));
    fire('pointerdown', r.left + r.width * 0.25);
    await expect(Math.round(cs.position)).toBe(25);
    fire('pointermove', r.left + r.width * 0.6);
    await expect(Math.round(cs.position)).toBe(60);
    fire('pointerup', r.left + r.width * 0.6);
    await expect(Math.round(changes.at(-1))).toBe(60);

    // Ảnh "trước" bị cắt đúng vị trí
    cs.position = 30;
    await cs.updateComplete;
    await expect(getComputedStyle(part(cs, 'before')).clipPath).toContain('70%');
    await waitFor(() => expect(Math.abs(part(cs, 'divider').getBoundingClientRect().left + 1 - (r.left + r.width * 0.3))).toBeLessThan(3));
  },
};

export const VerticalWithSlots = {
  render: () => html`
    <hui-compare-slider style="max-width: 520px" orientation="vertical" position="35" ratio="4/3" before-label="Bản phác" after-label="Hoàn thiện" step="5">
      <img slot="before" src=${BEFORE} alt="Bản phác thảo">
      <img slot="after" src=${AFTER} alt="Bản hoàn thiện">
    </hui-compare-slider>
  `,
  play: async ({ canvasElement }) => {
    const cs = canvasElement.querySelector('hui-compare-slider');
    const handle = part(cs, 'handle');
    await expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    handle.focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(cs.position).toBe(40);
    await expect(getComputedStyle(part(cs, 'before')).clipPath).toContain('60%');
    const r = part(cs, 'base').getBoundingClientRect();
    await expect(Math.abs(r.width / r.height - 4 / 3)).toBeLessThan(0.02);
  },
};

export const HoverAndDisabled = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px">
      <hui-compare-slider id="hover" hover before-src=${BEFORE} after-src=${AFTER} before-label="hover"></hui-compare-slider>
      <hui-compare-slider id="disabled" disabled position="70" before-src=${BEFORE} after-src=${AFTER} before-label="disabled"></hui-compare-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const hover = canvasElement.querySelector('#hover');
    const base = part(hover, 'base');
    const r = base.getBoundingClientRect();
    base.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, composed: true, pointerType: 'mouse', clientX: r.left + r.width * 0.8, clientY: r.top + 10 }));
    await expect(Math.round(hover.position)).toBe(80);

    const disabled = canvasElement.querySelector('#disabled');
    const handle = part(disabled, 'handle');
    await expect(handle.getAttribute('aria-disabled')).toBe('true');
    await expect(handle.getAttribute('tabindex')).toBe('-1');
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await expect(disabled.position).toBe(70);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-compare-slider.brand {
        --hui-compare-slider-divider-width: 4px;
        --hui-compare-slider-divider-color: var(--hui-primary);
        --hui-compare-slider-handle-size: 52px;
        --hui-compare-slider-handle-bg: var(--hui-primary);
        --hui-compare-slider-handle-color: var(--hui-text-light-solid);
        --hui-compare-slider-label-bg: var(--hui-primary);
        --hui-compare-slider-radius: 0;
      }
      hui-compare-slider.brand::part(label) { text-transform: uppercase; letter-spacing: 0.08em; }
    </style>
    <hui-compare-slider class="brand" style="max-width: 720px" before-src=${BEFORE} after-src=${AFTER} before-label="Before" after-label="After">
      <span slot="handle" style="font-weight: 700; font-size: 12px">⇔</span>
    </hui-compare-slider>
  `,
};
