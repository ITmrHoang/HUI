/**
 * Storybook Stories — HUI Rate (chấm sao nhập liệu)
 */

import { html, nothing } from 'lit';
import { expect, userEvent } from 'storybook/test';
import './index.js';

const TIPS = ['Tệ', 'Tạm', 'Ổn', 'Tốt', 'Tuyệt vời'];

const starsOf = (el) => el.shadowRoot.querySelector('[part="stars"]');
const starAt = (el, i) => el.shadowRoot.querySelectorAll('[part~="star"]')[i];

/** Phát sự kiện chuột giả lập tại sao thứ `index` (0-based), `ratio` = vị trí ngang trong sao (0..1) */
function fire(el, type, index, ratio = 0.75) {
  const r = starAt(el, index).getBoundingClientRect();
  const Ctor = type.startsWith('pointer') ? PointerEvent : MouseEvent;
  starsOf(el).dispatchEvent(new Ctor(type, {
    bubbles: true, composed: true, button: 0, pointerId: 1, isPrimary: true,
    clientX: r.left + r.width * ratio, clientY: r.top + r.height / 2,
  }));
}

export default {
  title: 'Atoms/HuiRate',
  component: 'hui-rate',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Rate** — Chấm sao nhập liệu (Ant Rate + MUI Rating). Hover để xem trước, nửa sao, bấm lại để xóa,
tooltip theo từng sao, ký hiệu tùy chỉnh. Tham gia \`<form>\` như input native (\`required\`, reset).
Hiệu ứng bật sẵn: sao phóng to khi hover, "nảy" khi chọn, sáng lần lượt khi giá trị đổi bằng code.

\`\`\`html
<hui-rate name="rating" value="3"></hui-rate>
<hui-rate allow-half value="2.5" tooltips='["Tệ","Tạm","Ổn","Tốt","Tuyệt vời"]'></hui-rate>
<hui-rate icon="heart" color="danger" count="10"></hui-rate>
<hui-rate><span slot="character">A</span></hui-rate>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | number | \`0\` | Số sao (0 = chưa chọn). Attribute = giá trị ban đầu khi reset form |
| \`count\` | number | \`5\` | Số sao |
| \`allow-half\` | boolean | \`false\` | Chọn nửa sao (bước 0.5) |
| \`allow-clear\` | \`'true'\` \\| \`'false'\` | \`'true'\` | Bấm lại đúng giá trị hiện tại để xóa về 0 |
| \`color\` | string | warning | \`primary\` \\| \`success\` \\| \`warning\` \\| \`danger\` \\| \`info\` hoặc màu CSS |
| \`icon\` | string | — | Tên icon hui-icon (vd \`heart\`), vẽ tô đặc |
| \`character\` | string | — | Ký tự thay sao (slot \`character\` ưu tiên hơn) |
| \`tooltips\` | JSON array | — | Chữ cho từng sao, hiện khi hover / focus bàn phím |
| \`label\` | string | "Đánh giá" | Tên cho trình đọc màn hình |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` (bỏ trống = theo \`hui-form\`) |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |
| \`name\` / \`required\` / \`disabled\` / \`readonly\` | — | — | Như input native |

### Properties
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`value\` | \`number\` | Luôn trong [0, count], bám bước 1 / 0.5 |
| \`tooltips\` | \`string[]\` | Chữ cho từng sao |
| \`validity\` / \`validationMessage\` / \`checkValidity()\` | — | Form API (thiếu sao khi \`required\` → "Vui lòng chọn số sao") |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hover-change\` | \`{ value }\` | Rê chuột đổi mức xem trước; rời vùng sao → \`value: null\` |
| \`input\` | \`{ value }\` | Người dùng chọn (click / bàn phím) |
| \`change\` | \`{ value }\` | Phát cùng lúc với \`input\` |

### Slots
| Slot | Mô tả |
|------|-------|
| \`character\` | Ký hiệu tùy chỉnh — được nhân bản cho mọi sao |

### Parts
\`base\`, \`stars\` (phần tử \`role="slider"\`), \`star\` (+ \`star-full\` \\| \`star-half\` \\| \`star-zero\`), \`tooltip\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-rate-size\` / \`--hui-rate-gap\` | Cạnh mỗi sao / khoảng cách |
| \`--hui-rate-color\` / \`--hui-rate-inactive-color\` | Màu sao đã / chưa chọn |
| \`--hui-rate-hover-scale\` | Tỉ lệ phóng to khi hover (1.15) |
| \`--hui-rate-focus-outline\` | Viền focus bàn phím |
| \`--hui-rate-tooltip-bg\` / \`--hui-rate-tooltip-color\` | Bong bóng tooltips |

### Bàn phím (WAI-ARIA APG Slider)
| Phím | Tác dụng |
|------|----------|
| \`→\` / \`↑\` | Tăng 1 bước (1 sao, hoặc 0.5 khi \`allow-half\`) |
| \`←\` / \`↓\` | Giảm 1 bước |
| \`Home\` / \`End\` | Về 0 / \`count\` |

Thanh sao là một phần tử \`role="slider"\` duy nhất: \`aria-valuemin=0\`, \`aria-valuemax=count\`, \`aria-valuenow\`,
\`aria-valuetext\` ("Tốt, 4 trên 5 sao"). Hiệu ứng tự tắt khi \`no-animation\`, \`<html data-hui-no-animation>\`
hoặc hệ điều hành bật giảm chuyển động.
        `,
      },
    },
  },
  argTypes: {
    value: { control: { type: 'number', min: 0, max: 10, step: 0.5 } },
    count: { control: 'number' },
    allowHalf: { control: 'boolean' },
    allowClear: { control: 'select', options: ['true', 'false'] },
    color: { control: 'text' },
    icon: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    noAnimation: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-rate
      value=${args.value ?? nothing}
      count=${args.count ?? nothing}
      ?allow-half=${args.allowHalf}
      allow-clear=${args.allowClear || 'true'}
      color=${args.color || nothing}
      icon=${args.icon || nothing}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      ?no-animation=${args.noAnimation}
      .tooltips=${TIPS}
    ></hui-rate>
  `,
  args: { value: 3, count: 5, allowHalf: false, allowClear: 'true', color: '', icon: '', size: 'md', disabled: false, readonly: false, noAnimation: false },
};

/** Bàn phím — Arrow ±1, Home/End; aria-valuenow / aria-valuetext đi theo */
export const Keyboard = {
  render: () => html`<hui-rate id="rt-kb" value="3" label="Chất lượng"></hui-rate>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rt-kb');
    const slider = starsOf(el);
    const events = [];
    el.addEventListener('change', (e) => events.push(e.detail.value));

    await expect(slider.getAttribute('role')).toBe('slider');
    await expect(slider.getAttribute('aria-valuemin')).toBe('0');
    await expect(slider.getAttribute('aria-valuemax')).toBe('5');
    await expect(slider.getAttribute('aria-valuenow')).toBe('3');
    await expect(slider.getAttribute('aria-label')).toBe('Chất lượng');

    el.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(el.value).toBe(4);
    await el.updateComplete;
    await expect(slider.getAttribute('aria-valuenow')).toBe('4');
    await expect(slider.getAttribute('aria-valuetext')).toBe('4 trên 5 sao');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}'); // lần 2 đã ở max → không đổi
    await expect(el.value).toBe(5);
    await userEvent.keyboard('{ArrowDown}');
    await expect(el.value).toBe(4);
    await userEvent.keyboard('{Home}');
    await expect(el.value).toBe(0);
    await userEvent.keyboard('{ArrowLeft}'); // đã ở 0 → không đổi
    await userEvent.keyboard('{End}');
    await expect(el.value).toBe(5);
    await expect(events).toEqual([4, 5, 4, 0, 5]);
    el.blur();
  },
};

/** Nửa sao — bàn phím bước 0.5, bấm nửa trái của sao = .5 */
export const HalfStar = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-rate id="rt-half" allow-half value="0"></hui-rate>
      <hui-rate allow-half value="3.5" size="lg"></hui-rate>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rt-half');
    el.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(el.value).toBe(0.5);
    await el.updateComplete;
    await expect(starsOf(el).getAttribute('aria-valuenow')).toBe('0.5');
    await expect(starsOf(el).getAttribute('aria-valuetext')).toBe('0,5 trên 5 sao');
    el.blur();

    fire(el, 'click', 2, 0.25); // nửa trái sao thứ 3
    await expect(el.value).toBe(2.5);
    await el.updateComplete;
    await expect(starAt(el, 2).getAttribute('part')).toBe('star star-half');
    await expect(starAt(el, 1).getAttribute('part')).toBe('star star-full');
    fire(el, 'click', 2, 0.8); // nửa phải → 3
    await expect(el.value).toBe(3);

    el.value = 4.3; // bám bước 0.5
    await expect(el.value).toBe(4.5);
  },
};

/** Bấm lại đúng giá trị để xóa (allow-clear mặc định bật); allow-clear="false" thì giữ nguyên */
export const ClearOnReclick = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-rate id="rt-clear"></hui-rate>
      <hui-rate id="rt-noclear" allow-clear="false" value="3"></hui-rate>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rt-clear');
    const inputs = [];
    el.addEventListener('input', (e) => inputs.push(e.detail.value));
    fire(el, 'click', 2);
    await expect(el.value).toBe(3);
    fire(el, 'click', 2);
    await expect(el.value).toBe(0);
    await expect(inputs).toEqual([3, 0]);
    await el.updateComplete;
    await expect(starAt(el, 0).getAttribute('part')).toBe('star star-zero'); // không tô lại dưới con trỏ

    const keep = canvasElement.querySelector('#rt-noclear');
    fire(keep, 'click', 2);
    await expect(keep.value).toBe(3);
  },
};

/** Hover xem trước + tooltips; rời chuột trả lại giá trị thật */
export const Tooltips = {
  render: () => html`
    <div style="padding-top: 32px;">
      <hui-rate id="rt-tip" value="2" .tooltips=${TIPS}></hui-rate>
      <p style="margin: 8px 0 0; font-size: 13px; color: var(--hui-text-secondary);">
        Attribute JSON: <code>tooltips='["Tệ","Tạm","Ổn","Tốt","Tuyệt vời"]'</code>
      </p>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rt-tip');
    const hovers = [];
    el.addEventListener('hover-change', (e) => hovers.push(e.detail.value));
    const tip = el.shadowRoot.querySelector('[part="tooltip"]');

    fire(el, 'pointermove', 3);
    await expect(hovers).toEqual([4]);
    await expect(el.value).toBe(2); // chỉ xem trước
    await expect(starAt(el, 3).getAttribute('part')).toBe('star star-full');
    await expect(tip.textContent).toBe('Tốt');
    await expect(el.shadowRoot.querySelector('[part="base"]').classList.contains('hui-rate--tip')).toBe(true);

    starsOf(el).dispatchEvent(new PointerEvent('pointerleave'));
    await expect(hovers).toEqual([4, null]);
    await expect(starAt(el, 3).getAttribute('part')).toBe('star star-zero');
    await expect(starsOf(el).getAttribute('aria-valuetext')).toBe('Tạm, 2 trên 5 sao');
  },
};

/** Ký hiệu tùy chỉnh — icon hui-icon, attribute character, slot character */
export const CustomCharacter = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-rate icon="heart" color="danger" value="3" label="Yêu thích"></hui-rate>
      <hui-rate character="A" allow-half value="2.5" size="lg"></hui-rate>
      <hui-rate count="10" value="6" color="primary"><span slot="character">●</span></hui-rate>
      <hui-rate value="4"><span slot="character">😀</span></hui-rate>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [heart, letter, dots] = canvasElement.querySelectorAll('hui-rate');
    await expect(heart.shadowRoot.querySelector('svg path').getAttribute('d')).toContain('19.5');
    await expect(letter.shadowRoot.querySelector('.hui-rate__symbol').textContent).toBe('A');
    await expect(dots.shadowRoot.querySelectorAll('[part~="star"]').length).toBe(10);
    await expect(dots.shadowRoot.querySelector('.hui-rate__symbol').textContent).toBe('●');
  },
};

export const Sizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${['sm', 'md', 'lg'].map((s) => html`<hui-rate size=${s} value="3" label=${`size ${s}`}></hui-rate>`)}
    </div>
  `,
};

/** Disabled / readonly — không đổi được; readonly vẫn focus được và gửi form */
export const States = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <hui-rate id="rt-dis" disabled value="3" label="Disabled"></hui-rate>
      <hui-rate id="rt-ro" readonly value="4" label="Readonly"></hui-rate>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dis = canvasElement.querySelector('#rt-dis');
    await expect(starsOf(dis).getAttribute('tabindex')).toBe('-1');
    await expect(starsOf(dis).getAttribute('aria-disabled')).toBe('true');

    const ro = canvasElement.querySelector('#rt-ro');
    await expect(starsOf(ro).getAttribute('aria-readonly')).toBe('true');
    ro.focus();
    await userEvent.keyboard('{ArrowRight}');
    fire(ro, 'click', 0);
    await expect(ro.value).toBe(4);
    ro.blur();
  },
};

/** Trong <form> — FormData, required, reset */
export const InForm = {
  render: () => html`
    <form id="rt-form" style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;"
      @submit=${(e) => e.preventDefault()}>
      <label>Chất lượng sản phẩm <hui-rate name="quality" required label="Chất lượng sản phẩm"></hui-rate></label>
      <label>Giao hàng <hui-rate name="delivery" value="4" allow-half label="Giao hàng"></hui-rate></label>
      <div style="display: flex; gap: 8px;">
        <button type="submit">Gửi</button>
        <button type="reset">Reset</button>
      </div>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#rt-form');
    const [quality, delivery] = form.querySelectorAll('hui-rate');

    let data = new FormData(form);
    await expect(data.get('quality')).toBe(null); // 0 = không gửi
    await expect(data.get('delivery')).toBe('4');
    await expect(quality.checkValidity()).toBe(false);
    await expect(quality.validity.valueMissing).toBe(true);
    await expect(quality.validationMessage).toBe('Vui lòng chọn số sao');
    await expect(form.checkValidity()).toBe(false);

    quality.value = 5;
    delivery.value = 2.5;
    data = new FormData(form);
    await expect(data.get('quality')).toBe('5');
    await expect(data.get('delivery')).toBe('2.5');
    await expect(quality.checkValidity()).toBe(true);

    form.reset();
    await expect(quality.value).toBe(0);
    await expect(delivery.value).toBe(4);
  },
};

/** Hiệu ứng — đổi giá trị bằng code thì sao sáng lần lượt; no-animation tắt hết */
export const Animation = {
  render: () => {
    const set = (e, v) => { e.target.closest('div').parentElement.querySelectorAll('hui-rate').forEach((r) => { r.value = v; }); };
    return html`
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; gap: 8px;">
          <button @click=${(e) => set(e, 0)}>value = 0</button>
          <button @click=${(e) => set(e, 5)}>value = 5</button>
          <button @click=${(e) => set(e, 3)}>value = 3</button>
        </div>
        <div><hui-rate value="2" label="Có hiệu ứng" size="lg"></hui-rate> mặc định</div>
        <div><hui-rate value="2" label="Không hiệu ứng" size="lg" no-animation></hui-rate> no-animation</div>
      </div>
    `;
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .rt-brand {
        --hui-rate-color: var(--hui-success);
        --hui-rate-inactive-color: var(--hui-success-light);
        --hui-rate-size: 2rem;
        --hui-rate-gap: 2px;
        --hui-rate-hover-scale: 1.3;
      }
      hui-rate.boxed::part(star) { padding: 4px; border-radius: 6px; background: var(--hui-fill-tertiary); }
      hui-rate.boxed::part(star-full) { background: var(--hui-warning-light); }
      hui-rate.boxed::part(tooltip) { background: var(--hui-primary); }
    </style>
    <div style="display: flex; flex-direction: column; gap: 16px; padding-top: 32px;">
      <div class="rt-brand"><hui-rate value="3" label="Biến CSS trên thẻ cha"></hui-rate></div>
      <hui-rate class="boxed" value="2" .tooltips=${TIPS} label="::part(star | star-full | tooltip)"></hui-rate>
    </div>
  `,
};
