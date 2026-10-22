/**
 * Storybook Stories — HUI Color Picker (chọn màu)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { parseColor, formatColor, contrastRatio, readableColor, rgbToHsv, hsvToRgb } from './index.js';

const q = (el, sel) => el.shadowRoot.querySelector(sel);
const deepActive = (el) => el.shadowRoot.activeElement;
const isOpen = (el) => q(el, '[part="trigger"]').getAttribute('aria-expanded') === 'true';
/** Ghi lại input/change để kiểm tra */
const record = (el) => {
  const log = { input: [], change: [] };
  el.addEventListener('input', (e) => log.input.push(e.detail.value));
  el.addEventListener('change', (e) => log.change.push(e.detail.value));
  return log;
};
const pointer = (target, type, x, y) => target.dispatchEvent(new PointerEvent(type, {
  clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 7, bubbles: true, composed: true,
}));

const PRESETS = [
  { label: 'Thương hiệu', colors: ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'] },
  { label: 'Trung tính', colors: [{ color: '#000000', label: 'Đen' }, '#595959', '#bfbfbf', { color: '#ffffff', label: 'Trắng' }, 'transparent'] },
];

export default {
  title: 'Molecules/HuiColorPicker',
  component: 'hui-color-picker',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Color Picker** — chọn màu (Ant ColorPicker), tham gia \`<form>\`. Nút (ô màu + chữ) mở bảng chọn ở top-layer,
hoặc \`inline\`. Vùng bão hòa/độ sáng kéo 2 chiều, thanh hue, thanh alpha (ô cờ), ô nhập HEX | RGB | HSB | HSL,
bảng màu có sẵn (\`presets\`, dùng \`hui-color-swatch\`), màu gần đây (trong bộ nhớ), nút EyeDropper (chỉ hiện khi trình duyệt hỗ trợ).

\`\`\`html
<hui-color-picker name="brand" value="#1677ff" show-text alpha clearable></hui-color-picker>
<script>
  picker.presets = [{ label: 'Thương hiệu', colors: ['#1677ff', '#52c41a'] }];
  picker.addEventListener('change', (e) => console.log(e.detail.value, e.detail.color));
</script>
\`\`\`

Tiện ích màu xuất kèm: \`parseColor\`, \`formatColor\`, \`rgbToHsv\`, \`hsvToRgb\`, \`rgbToHsl\`, \`hslToRgb\`, \`hslToHsv\`, \`hsvToHsl\`,
\`rgbToHex\`, \`luminance\`, \`contrastRatio\`, \`readableColor\`.

### Attributes / Properties
| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| \`value\` | string | \`''\` | Màu CSS bất kỳ (hex, rgb(), hsl(), tên màu…) — tự chuẩn hóa theo \`format\`. Rỗng = chưa chọn |
| \`format\` | \`hex \\| rgb \\| hsl\` | \`hex\` | Định dạng value; alpha < 1 → \`#rrggbbaa\` / \`rgba()\` / \`hsla()\` |
| \`input-format\` | \`hex \\| rgb \\| hsb \\| hsl\` | \`hex\` | Kiểu ô nhập ban đầu (người dùng đổi được) |
| \`alpha\` | boolean | — | Cho chỉnh độ trong suốt |
| \`inline\` | boolean | — | Bảng chọn tại chỗ, không nút / popup |
| \`open\` | boolean | — | Bảng chọn đang mở |
| \`show-text\` | boolean | — | Hiện mã màu trong nút |
| \`clearable\` | boolean | — | Nút "Xóa màu" |
| \`label\` | string | "Chọn màu" | Tên truy cập |
| \`placeholder\` | string | "Chưa chọn màu" | Chữ trong nút khi trống |
| \`presets\` | \`{label, colors}[] \\| string[]\` | \`[]\` | Bảng màu có sẵn; màu là chuỗi hoặc \`{ color, label }\` |
| \`recent-limit\` | number | \`8\` | Số màu gần đây (0 = ẩn) |
| \`recent-key\` | string | — | Các picker cùng key dùng chung màu gần đây |
| \`placement\` | string | \`bottom-start\` | Vị trí popup |
| \`no-eyedropper\` | boolean | — | Ẩn nút EyeDropper |
| \`size\` / \`status\` / \`name\` / \`disabled\` / \`readonly\` / \`required\` | — | — | Như các form control khác |
| \`no-animation\` | boolean | — | Tắt hiệu ứng popup |
| \`color\` (chỉ đọc) | \`{r,g,b,a} \\| null\` | — | Màu hiện tại |
| \`recentColors\` (chỉ đọc) | string[] | — | Màu gần đây |

Methods: \`show()\`, \`hide()\`, \`focus()\`, \`blur()\`.

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`input\` | \`{ value, color }\` | Đang kéo (gom theo frame) / mỗi lần màu đổi |
| \`change\` | \`{ value, color }\` | Thả chuột, phím, chốt ô nhập, chọn preset, EyeDropper, xóa |
| \`hui-open\` / \`hui-close\` | — | Mở / đóng bảng chọn |
| \`clear\` | — | Bấm "Xóa màu" |

### Parts
\`base\`, \`trigger\`, \`trigger-swatch\`, \`text\`, \`popup\`, \`panel\`, \`area\`, \`area-thumb\`, \`hue\`, \`alpha\`, \`slider-thumb\`, \`preview\`,
\`eyedropper\`, \`inputs\`, \`format-select\`, \`input\`, \`presets\`, \`preset-label\`, \`preset-swatch\`, \`clear\`

### CSS Variables
\`--hui-color-picker-panel-width | panel-bg | panel-shadow | panel-radius | area-height | area-radius | thumb-size | slider-height\`,
\`--hui-color-picker-trigger-radius | border-color | focus-shadow | checker\`

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Enter\` / \`Space\` / \`Alt+↓\` trên nút | Mở bảng chọn (focus vào vùng màu) |
| \`←\` \`→\` (vùng màu) | Độ bão hòa ±1% (Shift: ±10%) |
| \`↑\` \`↓\` / \`PageUp\` \`PageDown\` (vùng màu) | Độ sáng ±1% / ±10% |
| \`←\` \`→\` \`↑\` \`↓\` (hue / alpha) | ±1 (Shift / PageUp / PageDown: ±10); \`Home\` / \`End\`: min / max |
| \`↑\` \`↓\` trong ô số | ±1 (Shift: ±10) |
| \`Enter\` trong ô nhập | Chốt giá trị |
| \`Tab\` | Đi vòng trong bảng chọn |
| \`Esc\` | Đóng bảng, trả focus về nút |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-color-picker id="cp-d" value="#1677ff" show-text no-animation .presets=${PRESETS}></hui-color-picker>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cp-d');
    const trigger = q(el, '[part="trigger"]');
    const log = record(el);
    expect(el.value).toBe('#1677ff');
    expect(q(el, '[part="text"]').textContent).toBe('#1677ff');

    await userEvent.click(trigger);
    await waitFor(() => expect(isOpen(el)).toBe(true));
    const area = q(el, '[part="area"]');
    await waitFor(() => expect(deepActive(el)).toBe(area));
    expect(area.getAttribute('role')).toBe('slider');
    expect(area.getAttribute('aria-valuetext')).toMatch(/91%.*100%/);

    // ↓ giảm độ sáng 1% → value + input + change
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(log.change.length).toBe(1));
    expect(el.value).not.toBe('#1677ff');
    expect(log.input).toEqual(log.change);

    // Esc đóng, focus về nút
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
    await waitFor(() => expect(deepActive(el)).toBe(trigger));
  },
};

/** Tại chỗ + alpha + value dạng rgb */
export const InlineAlpha = {
  render: () => html`
    <hui-color-picker id="cp-a" inline alpha format="rgb" value="rgba(22, 119, 255, 0.5)" input-format="rgb"></hui-color-picker>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cp-a');
    const alpha = q(el, '[part="alpha"]');
    expect(alpha.hidden).toBe(false);
    expect(alpha.getAttribute('aria-valuenow')).toBe('50');
    expect(el.color).toEqual({ r: 22, g: 119, b: 255, a: 0.5 });

    alpha.focus();
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(el.value).toBe('rgb(22, 119, 255)'));
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(el.value).toBe('rgba(22, 119, 255, 0)'));
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await waitFor(() => expect(el.value).toBe('rgba(22, 119, 255, 0.1)'));
  },
};

/** Kéo vùng màu: input gom theo frame khi kéo, change đúng 1 lần khi thả */
export const DragArea = {
  render: () => html`
    <hui-color-picker id="cp-drag" inline value="#ff0000"></hui-color-picker>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cp-drag');
    const area = q(el, '[part="area"]');
    const log = record(el);
    const r = area.getBoundingClientRect();

    pointer(area, 'pointerdown', r.left + r.width / 2, r.top + r.height / 2);
    pointer(area, 'pointermove', r.left + r.width * 0.25, r.top + r.height * 0.25);
    await waitFor(() => expect(log.input.length).toBeGreaterThan(0));
    expect(log.change.length).toBe(0);
    pointer(area, 'pointermove', r.left - 50, r.top - 50); // ra ngoài → kẹp về góc trên trái (trắng)
    pointer(area, 'pointerup', r.left - 50, r.top - 50);
    await waitFor(() => expect(log.change).toEqual(['#ffffff']));
    expect(el.value).toBe('#ffffff');

    // Hue vẫn giữ (đỏ) dù màu là trắng: kéo xuống dưới phải → lại ra đỏ
    pointer(area, 'pointerdown', r.right + 10, r.top);
    pointer(area, 'pointerup', r.right + 10, r.top);
    await waitFor(() => expect(el.value).toBe('#ff0000'));
    expect(log.change).toEqual(['#ffffff', '#ff0000']);
  },
};

/** Ô nhập HEX / RGB / HSB / HSL + kiểm lỗi */
export const Inputs = {
  render: () => html`
    <hui-color-picker id="cp-i" inline alpha value="#00ff00"></hui-color-picker>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cp-i');
    const log = record(el);
    const hex = q(el, '[part="input"][data-key="hex"]');
    expect(hex.value).toBe('#00FF00');

    await userEvent.tripleClick(hex);
    await userEvent.keyboard('zzz{Enter}');
    expect(hex.getAttribute('aria-invalid')).toBe('true');
    expect(log.change.length).toBe(0);

    await userEvent.tripleClick(hex);
    await userEvent.keyboard('#ff000080{Enter}');
    await waitFor(() => expect(el.value).toBe('#ff000080'));
    expect(hex.hasAttribute('aria-invalid')).toBe(false);
    expect(q(el, '[part="input"][data-key="alpha"]').value).toBe('50');

    // Đổi sang HSL rồi sửa L
    const select = q(el, '[part="format-select"]');
    select.value = 'hsl';
    select.dispatchEvent(new Event('change'));
    await waitFor(() => expect(el.inputFormat).toBe('hsl'));
    const l = await waitFor(() => {
      const f = q(el, '[part="input"][data-key="l"]');
      expect(f).toBeTruthy();
      return f;
    });
    expect(l.value).toBe('50');
    await userEvent.tripleClick(l);
    await userEvent.keyboard('25{Enter}');
    await waitFor(() => expect(el.value).toBe('#80000080'));
    // ↑ trong ô số tăng 1
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(l.value).toBe('26'));
    expect(log.change.length).toBe(3);
  },
};

/** Presets (hui-color-swatch) + màu gần đây */
export const Presets = {
  render: () => html`
    <hui-color-picker id="cp-p" inline value="#1677ff" recent-limit="4" .presets=${PRESETS}></hui-color-picker>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cp-p');
    const log = record(el);
    const swatches = () => [...el.shadowRoot.querySelectorAll('[part="preset-swatch"]')];
    await waitFor(() => expect(swatches().length).toBe(11));
    expect(swatches()[0].selected).toBe(true);

    const green = swatches()[1];
    await userEvent.click(green.shadowRoot.querySelector('button'));
    await waitFor(() => expect(el.value).toBe('#52c41a'));
    expect(log.change).toEqual(['#52c41a']);
    expect(green.selected).toBe(true);
    expect(swatches()[0].selected).toBe(false);

    // Màu gần đây xuất hiện thành nhóm cuối
    await waitFor(() => expect(el.recentColors).toEqual(['#52c41a']));
    const labels = [...el.shadowRoot.querySelectorAll('[part="preset-label"]')].map((n) => n.textContent);
    expect(labels).toContain('Màu gần đây');
  },
};

/** Xóa màu + trạng thái trống */
export const Clearable = {
  render: () => html`
    <hui-color-picker id="cp-c" value="tomato" show-text clearable no-animation></hui-color-picker>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cp-c');
    // Tên màu CSS được chuẩn hóa sang hex
    await waitFor(() => expect(el.value).toBe('#ff6347'));
    const events = [];
    el.addEventListener('clear', () => events.push('clear'));
    el.addEventListener('change', (e) => events.push(`change:${e.detail.value}`));
    await userEvent.click(q(el, '[part="trigger"]'));
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await userEvent.click(q(el, '[part="clear"]'));
    expect(el.value).toBe('');
    expect(el.color).toBe(null);
    expect(events).toEqual(['clear', 'change:']);
    expect(q(el, '[part="text"]').textContent).toBe('Chưa chọn màu');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(isOpen(el)).toBe(false));
  },
};

export const Formats = {
  render: () => html`
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
      <hui-color-picker value="#722ed1" show-text></hui-color-picker>
      <hui-color-picker value="#722ed1" format="rgb" show-text></hui-color-picker>
      <hui-color-picker value="#722ed180" format="hsl" alpha show-text></hui-color-picker>
      <hui-color-picker placeholder="Chọn màu nền" show-text></hui-color-picker>
    </div>
  `,
};

export const Sizes = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:center">
      <hui-color-picker size="sm" value="#fa8c16" show-text></hui-color-picker>
      <hui-color-picker size="md" value="#fa8c16" show-text></hui-color-picker>
      <hui-color-picker size="lg" value="#fa8c16" show-text></hui-color-picker>
    </div>
  `,
};

export const States = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
      <hui-color-picker id="cp-dis" value="#13c2c2" disabled show-text></hui-color-picker>
      <hui-color-picker value="#13c2c2" status="error" show-text></hui-color-picker>
      <hui-color-picker value="#13c2c2" status="warning" show-text></hui-color-picker>
      <hui-color-picker value="#13c2c2" inline disabled></hui-color-picker>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cp-dis');
    expect(q(el, '[part="trigger"]').disabled).toBe(true);
    el.open = true;
    await waitFor(() => expect(el.open).toBe(false));
  },
};

/** Tham gia <form>: FormData, reset, required */
export const InForm = {
  render: () => html`
    <form id="cp-form">
      <hui-color-picker id="cp-f" name="brand" value="#1677ff" show-text required></hui-color-picker>
      <button type="reset">Reset</button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#cp-form');
    const el = canvasElement.querySelector('#cp-f');
    expect(new FormData(form).get('brand')).toBe('#1677ff');
    el.value = 'rgb(255, 0, 0)';
    expect(new FormData(form).get('brand')).toBe('rgb(255, 0, 0)');
    await waitFor(() => expect(el.value).toBe('#ff0000'));
    expect(new FormData(form).get('brand')).toBe('#ff0000');
    el.value = '';
    expect(el.checkValidity()).toBe(false);
    form.reset();
    await waitFor(() => expect(el.value).toBe('#1677ff'));
    expect(el.checkValidity()).toBe(true);
  },
};

/** Tiện ích màu thuần */
export const ColorHelpers = {
  render: () => html`
    <div id="cp-h" style="display:flex;gap:8px">
      ${['#1677ff', '#faad14', '#000000', '#ffffff'].map((bg) => html`
        <span style="padding:8px 12px;border-radius:6px;background:${bg};color:${readableColor(bg)};border:1px solid var(--hui-border)">
          ${bg} · ${contrastRatio(bg, readableColor(bg))}:1
        </span>`)}
    </div>
  `,
  play: async () => {
    expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('1677ff80')).toEqual({ r: 22, g: 119, b: 255, a: 0.502 });
    expect(parseColor('rgb(10 20 30 / 50%)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(formatColor('hsl(0, 100%, 50%)')).toBe('#ff0000');
    expect(formatColor('hsla(120, 100%, 25%, 0.5)', 'rgb')).toBe('rgba(0, 128, 0, 0.5)');
    expect(formatColor('hsb(240, 100%, 100%)', 'hsl')).toBe('hsl(240, 100%, 50%)');
    expect(formatColor('rebeccapurple')).toBe('#663399');
    expect(formatColor('transparent', 'rgb')).toBe('rgba(0, 0, 0, 0)');
    expect(parseColor('not-a-color')).toBe(null);
    const hsv = rgbToHsv({ r: 22, g: 119, b: 255 });
    const back = hsvToRgb(hsv);
    expect([Math.round(back.r), Math.round(back.g), Math.round(back.b)]).toEqual([22, 119, 255]);
    expect(contrastRatio('#000', '#fff')).toBe(21);
    expect(readableColor('#faad14')).toBe('#000000');
    expect(readableColor('#1f1f1f')).toBe('#ffffff');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cp-custom {
        --hui-color-picker-panel-width: 300px;
        --hui-color-picker-area-height: 200px;
        --hui-color-picker-area-radius: 12px;
        --hui-color-picker-thumb-size: 18px;
        --hui-color-picker-slider-height: 14px;
        --hui-color-picker-panel-radius: 16px;
        --hui-color-picker-trigger-radius: 999px;
      }
      .cp-custom::part(trigger-swatch) { border-radius: 999px; }
      .cp-custom::part(panel) { border: 2px solid var(--hui-primary); }
      .cp-custom::part(preset-swatch) { --hui-color-swatch-size: 24px; }
    </style>
    <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
      <hui-color-picker class="cp-custom" value="#eb2f96" show-text .presets=${PRESETS}></hui-color-picker>
      <hui-color-picker class="cp-custom" inline value="#eb2f96" .presets=${PRESETS}></hui-color-picker>
    </div>
  `,
};
