/**
 * Storybook Stories — HUI Slider
 */

import { html, nothing } from 'lit';
import { expect, userEvent } from 'storybook/test';
import './index.js';

const temperatureMarks = { 0: '0°C', 26: '26°C', 37: '37°C', 100: { label: '100°C', style: { color: 'var(--hui-danger)' } } };

/** Phát pointer event giả lập lên vùng control tại tỉ lệ `ratio` (0..1) của ray */
function pointerAt(el, type, ratio) {
  const rail = el.shadowRoot.querySelector('[part="rail"]');
  const control = el.shadowRoot.querySelector('[part="control"]');
  const rect = rail.getBoundingClientRect();
  control.dispatchEvent(new PointerEvent(type, {
    bubbles: true, composed: true, pointerId: 1, button: 0, isPrimary: true,
    clientX: rect.left + rect.width * ratio, clientY: rect.top + rect.height / 2,
  }));
}

export default {
  title: 'Components/HuiSlider',
  component: 'hui-slider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Slider** — Thanh trượt (Ant Slider + MUI Slider): 1 hoặc 2 tay nắm, mốc, chấm, dọc, bong bóng giá trị.
Tham gia \`<form>\` như \`<input type="range">\` (range gửi \`"a,b"\`).

\`\`\`html
<hui-slider label="Âm lượng" value="30"></hui-slider>
<hui-slider label="Khoảng giá" range value="20,80" step="5"></hui-slider>
<hui-slider marks='{"0":"0°C","37":"37°C","100":"100°C"}'></hui-slider>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | number \\| \`"a,b"\` | \`min\` / \`[min, max]\` | Giá trị ban đầu (range: \`"20,80"\` hoặc \`"[20,80]"\`) |
| \`min\` / \`max\` | number | \`0\` / \`100\` | Khoảng giá trị |
| \`step\` | number | \`1\` | Bước nhảy (giá trị luôn bám theo bước, giống input range) |
| \`range\` | boolean | \`false\` | Hai tay nắm, \`value\` là \`[a, b]\` |
| \`marks\` | JSON | — | Mốc: \`{ "0": "0°C", "100": { "label": "100°C", "style": {...} } }\` (bấm vào nhãn để nhảy tới) |
| \`dots\` | boolean | \`false\` | Chấm ở mỗi bước |
| \`vertical\` | boolean | \`false\` | Dọc (giá trị tăng từ dưới lên) |
| \`tooltip\` | string | \`auto\` | \`auto\` (hover/focus/kéo) \\| \`always\` \\| \`never\` |
| \`label\` | string | — | Nhãn phía trên + tên cho trình đọc màn hình |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`name\` / \`disabled\` / \`readonly\` | — | — | Như input native |

### Properties
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`value\` | \`number \\| [number, number]\` | Đã kẹp trong [min, max] và bám theo step |
| \`marks\` | \`Record<number, string \\| { label, style }>\` | Mốc |
| \`tooltipFormatter\` | \`(value) => string\` | Chữ trong bong bóng + \`aria-valuetext\` |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` | \`{ value }\` | Liên tục khi kéo / mỗi lần bấm phím |
| \`change\` | \`{ value }\` | Thả chuột (nếu giá trị đổi) / mỗi lần bấm phím |

### Slots
Không có.

### Parts
\`base\`, \`label\`, \`control\`, \`rail\`, \`track\`, \`thumb\` (\`thumb-start\`, \`thumb-end\`), \`tooltip\`, \`dot\` (\`dot-active\`), \`marks\`, \`mark\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-slider-rail-size\` | Độ dày ray |
| \`--hui-slider-rail-bg\` / \`--hui-slider-rail-hover-bg\` | Màu ray / khi hover |
| \`--hui-slider-track-bg\` | Màu đoạn đã chọn (cũng là viền tay nắm) |
| \`--hui-slider-thumb-size\` / \`--hui-slider-thumb-bg\` / \`--hui-slider-thumb-border-color\` | Tay nắm |
| \`--hui-slider-focus-ring\` | Vòng sáng khi focus / kéo |
| \`--hui-slider-tooltip-bg\` / \`--hui-slider-tooltip-color\` | Bong bóng giá trị |
| \`--hui-slider-dot-size\` / \`--hui-slider-mark-color\` | Chấm / nhãn mốc |
| \`--hui-slider-vertical-height\` | Chiều cao khi \`vertical\` |

### Bàn phím (WAI-ARIA APG Slider / Multi-thumb)
| Phím | Tác dụng |
|------|----------|
| \`→\` / \`↑\` | Tăng 1 bước |
| \`←\` / \`↓\` | Giảm 1 bước |
| \`PageUp\` / \`PageDown\` | Tăng / giảm 10 bước |
| \`Home\` / \`End\` | Về min / max (range: giới hạn bởi tay nắm còn lại) |
| \`Tab\` | Chuyển giữa 2 tay nắm (range) |

Mỗi tay nắm là \`role="slider"\` với \`aria-valuenow/min/max/text\`, \`aria-orientation\`.
        `,
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    range: { control: 'boolean' },
    dots: { control: 'boolean' },
    vertical: { control: 'boolean' },
    tooltip: { control: 'select', options: ['auto', 'always', 'never'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 420px; padding-top: 24px;">
      <hui-slider
        label=${args.label || ''}
        value=${args.value ?? nothing}
        min=${args.min ?? nothing}
        max=${args.max ?? nothing}
        step=${args.step ?? nothing}
        ?range=${args.range}
        ?dots=${args.dots}
        tooltip=${args.tooltip || 'auto'}
        size=${args.size || 'md'}
        ?disabled=${args.disabled}
      ></hui-slider>
    </div>
  `,
  args: { label: 'Âm lượng', value: 30, min: 0, max: 100, step: 1, range: false, dots: false, tooltip: 'auto', size: 'md', disabled: false },
};

/** Bàn phím — Arrow ±step, PageUp/PageDown ±10 bước, Home/End */
export const Keyboard = {
  render: () => html`
    <div style="max-width: 420px; padding-top: 24px;">
      <hui-slider id="sl-kb" label="Độ sáng" value="50" step="2"></hui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sl-kb');
    const thumb = el.shadowRoot.querySelector('[part~="thumb"]');
    const events = [];
    el.addEventListener('change', (e) => events.push(e.detail.value));

    await expect(thumb.getAttribute('role')).toBe('slider');
    await expect(thumb.getAttribute('aria-valuenow')).toBe('50');
    thumb.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(el.value).toBe(52);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(el.value).toBe(48);
    await userEvent.keyboard('{PageUp}');
    await expect(el.value).toBe(68);
    await userEvent.keyboard('{End}');
    await expect(el.value).toBe(100);
    await userEvent.keyboard('{ArrowRight}'); // đã ở max → không đổi, không phát change
    await userEvent.keyboard('{Home}');
    await expect(el.value).toBe(0);
    await expect(events).toEqual([52, 50, 48, 68, 100, 0]);
    await el.updateComplete;
    await expect(thumb.getAttribute('aria-valuenow')).toBe('0');
    thumb.blur();
  },
};

/** Range — hai tay nắm, không vượt qua nhau; FormData gửi "a,b" */
export const Range = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 32px; max-width: 420px; padding-top: 24px;">
      <hui-slider id="sl-range" label="Khoảng giá" range value="20,80" step="5"></hui-slider>
      <hui-slider label="Range + dots" range value="[2,6]" min="0" max="10" dots></hui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sl-range');
    const [start, end] = el.shadowRoot.querySelectorAll('[part~="thumb"]');
    await expect(el.value).toEqual([20, 80]);
    await expect(start.getAttribute('aria-valuemax')).toBe('80');
    await expect(end.getAttribute('aria-valuemin')).toBe('20');

    end.focus();
    await userEvent.keyboard('{Home}'); // tay cuối chỉ lùi tới tay đầu
    await expect(el.value).toEqual([20, 20]);
    start.focus();
    await userEvent.keyboard('{ArrowRight}'); // tay đầu không vượt tay cuối
    await expect(el.value).toEqual([20, 20]);
    await userEvent.keyboard('{ArrowLeft}');
    await expect(el.value).toEqual([15, 20]);
    start.blur();
  },
};

/** Kéo bằng chuột — input liên tục, change khi thả */
export const Drag = {
  render: () => html`
    <div style="max-width: 420px; padding-top: 24px;">
      <hui-slider id="sl-drag" label="Kéo tôi" value="0" step="10"></hui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sl-drag');
    let inputs = 0;
    let changed = null;
    el.addEventListener('input', () => { inputs++; });
    el.addEventListener('change', (e) => { changed = e.detail.value; });

    pointerAt(el, 'pointerdown', 0.3);
    await expect(el.value).toBe(30);
    pointerAt(el, 'pointermove', 0.62);
    await expect(el.value).toBe(60);
    await expect(changed).toBe(null); // chưa thả
    pointerAt(el, 'pointerup', 0.62);
    await expect(changed).toBe(60);
    await expect(inputs).toBe(2);
  },
};

/** Mốc + chấm — marks (property hoặc JSON attribute), bấm vào nhãn mốc để nhảy tới */
export const Marks = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 40px; max-width: 480px; padding-top: 24px;">
      <hui-slider label="Nhiệt độ" .marks=${temperatureMarks} value="37"></hui-slider>
      <hui-slider label="Mốc A–E qua JSON attribute, step=25, dots" marks='{"0":"A","25":"B","50":"C","75":"D","100":"E"}' step="25" value="50" dots></hui-slider>
      <hui-slider label="Range với mốc" range .marks=${temperatureMarks} value="26,37"></hui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelectorAll('hui-slider')[1];
    const marks = el.shadowRoot.querySelectorAll('[part="mark"]');
    await expect(marks.length).toBe(5);
    await expect(el.shadowRoot.querySelectorAll('[part~="dot-active"]').length).toBe(3);
  },
};

/** Tooltip — auto (hover/focus/kéo), always, never; tooltipFormatter */
export const Tooltip = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 40px; max-width: 420px; padding-top: 32px;">
      <hui-slider label="tooltip=always + formatter" tooltip="always" value="40" .tooltipFormatter=${(v) => `${v}%`}></hui-slider>
      <hui-slider label="tooltip=never" tooltip="never" value="60"></hui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-slider');
    const thumb = el.shadowRoot.querySelector('[part~="thumb"]');
    await expect(thumb.querySelector('[part="tooltip"]').textContent).toBe('40%');
    await expect(thumb.getAttribute('aria-valuetext')).toBe('40%');
  },
};

export const Vertical = {
  render: () => html`
    <div style="display: flex; gap: 48px; height: 220px; padding: 16px 48px;">
      <hui-slider vertical value="30" aria-label="Âm lượng"></hui-slider>
      <hui-slider vertical range value="20,70"></hui-slider>
      <hui-slider vertical .marks=${{ 0: '0', 50: '50', 100: '100' }} value="50"></hui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const thumb = canvasElement.querySelector('hui-slider').shadowRoot.querySelector('[part~="thumb"]');
    await expect(thumb.getAttribute('aria-orientation')).toBe('vertical');
  },
};

export const Sizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 420px; padding-top: 24px;">
      ${['sm', 'md', 'lg'].map((s) => html`<hui-slider size=${s} label=${`size=${s}`} value="40"></hui-slider>`)}
    </div>
  `,
};

export const States = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 24px; max-width: 420px; padding-top: 24px;">
      <hui-slider label="Disabled" disabled value="40"></hui-slider>
      <hui-slider label="Disabled range" disabled range value="20,60"></hui-slider>
      <hui-slider label="Readonly" readonly value="70"></hui-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-slider');
    const thumb = el.shadowRoot.querySelector('[part~="thumb"]');
    await expect(thumb.getAttribute('aria-disabled')).toBe('true');
    await expect(thumb.getAttribute('tabindex')).toBe('-1');
  },
};

/** Trong <form> — FormData (single "30", range "20,80"), reset */
export const InForm = {
  render: () => html`
    <form id="sl-form" style="display: flex; flex-direction: column; gap: 24px; max-width: 420px; padding-top: 24px;"
      @submit=${(e) => e.preventDefault()}>
      <hui-slider name="volume" label="Âm lượng" value="30"></hui-slider>
      <hui-slider name="price" label="Giá" range value="20,80"></hui-slider>
      <div style="display: flex; gap: 8px;">
        <button type="submit">Gửi</button>
        <button type="reset">Reset</button>
      </div>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#sl-form');
    const [volume, price] = form.querySelectorAll('hui-slider');
    let data = new FormData(form);
    await expect(data.get('volume')).toBe('30');
    await expect(data.get('price')).toBe('20,80');
    volume.value = 75;
    price.value = [10, 90];
    data = new FormData(form);
    await expect(data.get('volume')).toBe('75');
    await expect(data.get('price')).toBe('10,90');
    volume.value = 500; // kẹp về max
    await expect(volume.value).toBe(100);
    form.reset();
    await expect(volume.value).toBe(30);
    await expect(price.value).toEqual([20, 80]);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .sl-brand {
        --hui-slider-track-bg: var(--hui-success);
        --hui-slider-rail-size: 8px;
        --hui-slider-thumb-size: 22px;
        --hui-slider-focus-ring: 0 0 0 6px var(--hui-success-light);
      }
      hui-slider.square::part(thumb) { border-radius: 4px; }
      hui-slider.square::part(tooltip) { background: var(--hui-primary); }
      hui-slider.square::part(rail) { background: var(--hui-primary-2); }
    </style>
    <div style="display: flex; flex-direction: column; gap: 32px; max-width: 420px; padding-top: 32px;">
      <div class="sl-brand"><hui-slider label="Biến CSS trên thẻ cha" value="60"></hui-slider></div>
      <hui-slider class="square" label="::part(thumb | tooltip | rail)" value="40" tooltip="always"></hui-slider>
    </div>
  `,
};
