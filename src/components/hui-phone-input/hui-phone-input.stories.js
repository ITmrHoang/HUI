/**
 * Storybook Stories — HUI Phone Input (số điện thoại quốc tế)
 */

import { html, nothing } from 'lit';
import { expect, userEvent } from 'storybook/test';
import './index.js';

const field = (el) => el.shadowRoot.querySelector('[part="input"]');
const select = (el) => el.shadowRoot.querySelector('[part="country-select"]');

/** Chọn quốc gia trên <select> native (giống người dùng chọn) */
function pickCountry(el, code) {
  const s = select(el);
  s.value = code;
  s.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  s.dispatchEvent(new Event('change', { bubbles: true }));
}

export default {
  title: 'Molecules/HuiPhoneInput',
  component: 'hui-phone-input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Phone Input** — Ô nhập số điện thoại quốc tế: chọn quốc gia (cờ + mã vùng) + số trong nước tự định dạng
theo quốc gia, bỏ số 0 đầu, kiểm tra độ dài. Giá trị (và dữ liệu gửi form) ở dạng **E.164**: \`+84912345678\`.
Bộ chọn quốc gia là \`<select>\` native trong suốt phủ lên vùng cờ → bàn phím, trình đọc màn hình và
danh sách chọn của hệ điều hành (di động) đều chuẩn.

\`\`\`html
<hui-phone-input name="phone" required></hui-phone-input>
<hui-phone-input value="+12015550123"></hui-phone-input>          <!-- tự chọn US -->
<hui-phone-input country="JP" lock-country></hui-phone-input>
<script>
  el.countries = ['VN', 'US', 'JP'];                                // rút gọn danh sách
  el.countries = [{ code: 'LA', dial: '856', name: 'Lào', min: 8, max: 10, groups: [2, 3, 3] }];
</script>
\`\`\`

| Quốc gia | Ví dụ hiển thị | E.164 |
|----------|----------------|-------|
| VN (3-3-4, bỏ 0 đầu) | \`912 345 678\` | \`+84912345678\` |
| US / CA | \`(201) 555-0123\` | \`+12015550123\` |
| JP / KR | \`90 1234 5678\` | \`+819012345678\` |
| FR | \`6 12 34 56 78\` | \`+33612345678\` |

Dựng sẵn: VN, US, CA, JP, KR, CN, TW, HK, TH, SG, MY, ID, PH, IN, AU, GB, FR, DE (export \`PHONE_COUNTRIES\`).

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | string | \`''\` | Số E.164 (gán số trong nước \`0912…\` cũng được). Attribute = giá trị ban đầu khi reset |
| \`country\` | string | \`VN\` | Mã ISO quốc gia đang chọn — đổi khi đã có số thì giữ số, đổi mã vùng |
| \`countries\` | JSON array | dựng sẵn | Mảng mã ISO hoặc mục \`{ code, dial, name, min, max, groups, trunk, example, format }\` |
| \`label\` | string | — | Nhãn phía trên |
| \`placeholder\` | string | số mẫu | Mặc định: số mẫu của quốc gia (vd \`912 345 678\`) |
| \`error\` / \`hint\` | string | — | Dòng lỗi (viền đỏ) / gợi ý |
| \`lock-country\` | boolean | \`false\` | Khóa bộ chọn quốc gia |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Bỏ trống = theo \`hui-form\` |
| \`status\` | \`''\` \\| \`error\` \\| \`warning\` | — | Viền màu |
| \`name\` / \`required\` / \`disabled\` / \`readonly\` | — | — | Như input native |

### Properties
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`value\` | \`string\` | E.164 (\`''\` khi chưa nhập) |
| \`national\` | \`string\` (chỉ đọc) | Chữ số trong nước, không mã vùng / số 0 đầu |
| \`countryInfo\` | \`object\` (chỉ đọc) | Mục quốc gia đang chọn |
| \`countries\` | \`Array\` | Ghi đè danh sách |
| \`checkValidity()\` / \`validationMessage\` | — | Sai độ dài theo quốc gia → "Số điện thoại không hợp lệ" |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` | \`{ value, country, national }\` | Gõ số / đổi quốc gia |
| \`change\` | \`{ value, country, national }\` | Rời ô số với giá trị đã đổi / đổi quốc gia |

### Parts
\`base\`, \`label\`, \`control\`, \`country\`, \`flag\`, \`dial\`, \`country-select\`, \`input\`, \`message\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-phone-input-height\` / \`--hui-phone-input-radius\` | Chiều cao / bo góc |
| \`--hui-phone-input-bg\` / \`--hui-phone-input-color\` / \`--hui-phone-input-font-size\` | Nền / chữ / cỡ chữ |
| \`--hui-phone-input-border-color\` / \`--hui-phone-input-hover-border-color\` | Viền / viền hover |
| \`--hui-phone-input-focus-border-color\` / \`--hui-phone-input-focus-shadow\` | Viền + vòng sáng khi focus |
| \`--hui-phone-input-country-bg\` | Nền vùng chọn quốc gia |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Bộ chọn quốc gia → ô số |
| \`↑\` / \`↓\` / gõ chữ cái (trên bộ chọn) | Đổi quốc gia (hành vi \`<select>\` native) |
| \`Backspace\` cạnh dấu cách / ngoặc / gạch | Xóa luôn chữ số đứng trước |
| Dán \`+81 90-1234-5678\` | Tự đổi quốc gia theo mã vùng |
        `,
      },
    },
  },
  argTypes: {
    country: { control: 'select', options: ['VN', 'US', 'JP', 'KR', 'CN', 'TH', 'SG', 'GB', 'FR', 'DE'] },
    label: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    lockCountry: { control: 'boolean' },
  },
};

export const Default = {
  args: { country: 'VN', label: 'Số điện thoại', size: 'md', required: false, disabled: false, lockCountry: false },
  render: (args) => html`
    <div style="max-width: 360px;">
      <hui-phone-input
        id="phone-default"
        country=${args.country}
        label=${args.label || nothing}
        size=${args.size}
        ?required=${args.required}
        ?disabled=${args.disabled}
        ?lock-country=${args.lockCountry}
        hint="Chúng tôi chỉ dùng số này để liên hệ đơn hàng"
      ></hui-phone-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#phone-default');
    const inputs = [];
    el.addEventListener('input', (e) => inputs.push(e.detail));
    const f = field(el);
    await expect(f.type).toBe('tel');
    await expect(f.placeholder).toBe('912 345 678');
    await expect(select(el).getAttribute('aria-label')).toBe('Quốc gia / vùng');

    // Gõ số có 0 đầu → bỏ 0, định dạng 3-3-3, value E.164
    await userEvent.type(f, '0912345678');
    await expect(f.value).toBe('912 345 678');
    await expect(el.value).toBe('+84912345678');
    await expect(el.national).toBe('912345678');
    await expect(inputs.at(-1)).toEqual({ value: '+84912345678', country: 'VN', national: '912345678' });
    await expect(el.checkValidity()).toBe(true);

    // Backspace cạnh dấu cách xóa luôn chữ số trước nó
    f.setSelectionRange(8, 8); // sau "912 345 "
    await userEvent.keyboard('{Backspace}');
    await expect(f.value).toBe('912 346 78');
    await expect(el.value).toBe('+8491234678');
    f.blur();
  },
};

/** Đổi quốc gia: giữ số trong nước, đổi mã vùng + định dạng; US dạng (XXX) XXX-XXXX */
export const Countries = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 360px;">
      <hui-phone-input id="phone-switch" label="Đổi quốc gia"></hui-phone-input>
      <hui-phone-input id="phone-us" label="Gán E.164 → tự chọn US" value="+12015550123"></hui-phone-input>
      <hui-phone-input label="Pháp" country="FR" value="0612345678"></hui-phone-input>
      <hui-phone-input label="Nhật (khóa quốc gia)" country="JP" lock-country value="09012345678"></hui-phone-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const us = canvasElement.querySelector('#phone-us');
    await us.updateComplete;
    await expect(us.country).toBe('US');
    await expect(field(us).value).toBe('(201) 555-0123');
    await expect(us.value).toBe('+12015550123');

    const el = canvasElement.querySelector('#phone-switch');
    const changes = [];
    el.addEventListener('change', (e) => changes.push(e.detail.value));
    el.value = '0987654321';
    await el.updateComplete;
    await expect(el.value).toBe('+84987654321');
    await expect(field(el).value).toBe('987 654 321');

    pickCountry(el, 'TH');
    await expect(el.country).toBe('TH');
    await expect(el.value).toBe('+66987654321');
    await expect(changes).toEqual(['+66987654321']);
    await el.updateComplete;
    await expect(field(el).value).toBe('98 765 4321');
    await expect(el.shadowRoot.querySelector('[part="dial"]').textContent).toBe('+66');

    // Đổi country bằng code: giữ số, đổi mã vùng
    el.country = 'SG';
    await el.updateComplete;
    await expect(el.value).toBe('+6598765432'); // SG tối đa 8 chữ số → cắt
  },
};

/** Dán số quốc tế → tự đổi quốc gia theo mã vùng */
export const PasteInternational = {
  render: () => html`<div style="max-width: 360px;"><hui-phone-input id="phone-paste" label="Dán số"></hui-phone-input></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#phone-paste');
    const f = field(el);
    f.focus();
    f.value = '+81 90-1234-5678';
    f.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await expect(el.country).toBe('JP');
    await expect(el.value).toBe('+819012345678');
    await expect(f.value).toBe('90 1234 5678');
    f.blur();
  },
};

/** Validate: required + độ dài theo quốc gia; gửi form dạng E.164 */
export const Validation = {
  render: () => html`
    <form id="phone-form" style="max-width: 360px;">
      <hui-phone-input id="phone-req" name="phone" label="Bắt buộc" required></hui-phone-input>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#phone-form');
    const el = canvasElement.querySelector('#phone-req');
    await expect(el.checkValidity()).toBe(false);
    await expect(el.validity.valueMissing).toBe(true);
    el.value = '0912345';
    await expect(el.checkValidity()).toBe(false);
    await expect(el.validationMessage).toBe('Số điện thoại không hợp lệ');
    el.value = '+84 912 345 678';
    await expect(el.checkValidity()).toBe(true);
    await expect(new FormData(form).get('phone')).toBe('+84912345678');
    el.markInteracted();
    el.value = '12';
    await expect(el.matches(':state(user-invalid)')).toBe(true);
    form.reset();
    await expect(el.value).toBe('');
    await expect(el.country).toBe('VN');
  },
};

/** Danh sách quốc gia tùy chỉnh (mã ISO hoặc mục riêng) */
export const CustomCountries = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 360px;">
      <hui-phone-input id="phone-short" label="Chỉ VN / US / JP" .countries=${['VN', 'US', 'JP']}></hui-phone-input>
      <hui-phone-input id="phone-la" label="Mục riêng (Lào)" country="LA"
        .countries=${[{ code: 'LA', dial: '856', name: { vi: 'Lào', en: 'Laos' }, min: 8, max: 10, groups: [2, 3, 3], trunk: '0', example: '2023123456' }, 'VN']}></hui-phone-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const short = canvasElement.querySelector('#phone-short');
    await expect(select(short).options.length).toBe(3);
    const la = canvasElement.querySelector('#phone-la');
    la.value = '02023123456';
    await la.updateComplete;
    await expect(la.value).toBe('+8562023123456');
    await expect(field(la).value).toBe('20 231 23456');
  },
};

export const SizesAndStates = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 360px;">
      <hui-phone-input size="sm" label="size=sm" value="+84912345678"></hui-phone-input>
      <hui-phone-input size="lg" label="size=lg" value="+84912345678"></hui-phone-input>
      <hui-phone-input label="error" value="+8491" error="Số điện thoại không hợp lệ"></hui-phone-input>
      <hui-phone-input label="warning" status="warning" value="+84912345678"></hui-phone-input>
      <hui-phone-input id="phone-disabled" label="disabled" disabled value="+84912345678"></hui-phone-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#phone-disabled');
    await expect(field(el).disabled).toBe(true);
    await expect(select(el).disabled).toBe(true);
  },
};

/** Override từ ngoài: biến CSS + ::part(country | flag | dial | input) */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .phone-brand {
        --hui-phone-input-height: 48px;
        --hui-phone-input-radius: 999px;
        --hui-phone-input-country-bg: var(--hui-primary-1);
        --hui-phone-input-focus-border-color: var(--hui-success);
        --hui-phone-input-focus-shadow: 0 0 0 4px var(--hui-success-light);
        --hui-phone-input-font-size: var(--hui-font-base);
      }
      hui-phone-input.pill::part(dial) { font-weight: 600; color: var(--hui-primary); }
      hui-phone-input.pill::part(country) { border-right-color: transparent; }
      hui-phone-input.pill::part(input) { letter-spacing: 0.06em; }
    </style>
    <div class="phone-brand" style="max-width: 380px;">
      <hui-phone-input class="pill" value="+84912345678"></hui-phone-input>
    </div>
  `,
};
