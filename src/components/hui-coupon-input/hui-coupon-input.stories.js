/**
 * Storybook Stories — HUI Coupon Input (nhập mã giảm giá)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { setLocale } from '../../core/locale.js';
import './index.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);

/** Giả lập API kiểm tra mã — không gọi mạng */
const CODES = { SALE50K: { discount: 50000 }, FREESHIP: { discount: 'Miễn phí vận chuyển' }, GIAM10: { discount: '−10%' } };
const mockValidate = async (code) => {
  await wait(500);
  const hit = CODES[code];
  return hit ? { valid: true, discount: hit.discount } : { valid: false, message: `Mã "${code}" không tồn tại hoặc đã hết hạn` };
};

export default {
  title: 'Molecules/HuiCouponInput',
  component: 'hui-coupon-input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Coupon Input** — ô nhập mã giảm giá + nút "Áp dụng". Gán hàm async \`validate\` để kiểm tra mã:
\`idle → loading → applied\` (chip mã + nút gỡ + mức giảm) hoặc \`error\` (rung + thông báo).
Tham gia form: \`value\` = mã đã áp dụng. Thử các mã: \`SALE50K\`, \`FREESHIP\`, \`GIAM10\`.

\`\`\`html
<hui-coupon-input name="coupon"></hui-coupon-input>
<script>
  el.validate = async (code) => {
    const r = await api.checkCoupon(code);
    return { valid: r.ok, discount: r.amount, message: r.message };
  };
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | string | \`''\` | Mã đã áp dụng (attribute = mã áp sẵn) |
| \`discount\` | string \\| number | — | Mức giảm hiển thị — số → "−50.000 ₫", chuỗi giữ nguyên |
| \`currency\` | string | \`VND\` | Tiền tệ khi discount là số |
| \`placeholder\` / \`button-text\` | string | locale | Chữ gợi ý / chữ nút |
| \`preserve-case\` | boolean | — | Không tự viết hoa mã |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Kích thước |
| \`no-animation\` | boolean | — | Tắt rung khi lỗi |
| \`name\` / \`disabled\` / \`readonly\` | — | — | Như control native |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`validate\` | \`async (code) => ({ valid, discount, message }) \\| boolean\` — ném lỗi = lỗi (message của Error được hiển thị) |
| \`couponState\` | \`idle\` \\| \`loading\` \\| \`applied\` \\| \`error\` (chỉ đọc) |
| \`apply(code?)\` | Áp dụng mã trong ô (hoặc \`code\`) → \`Promise<boolean>\` |
| \`removeCode()\` | Gỡ mã đang áp dụng |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-apply\` | \`{ code, discount, message, result }\` | Mã hợp lệ |
| \`hui-error\` | \`{ code, message, error }\` | Mã sai / bỏ trống / validate ném lỗi |
| \`hui-remove\` | \`{ code }\` | Gỡ mã |
| \`change\` | \`{ value }\` | value (mã đã áp dụng) đổi |

### Parts
\`base\`, \`field\`, \`input\`, \`apply\` (hui-button), \`applied\`, \`tag\`, \`code\`, \`remove\`, \`discount\`, \`message\`.
States: \`:state(idle|loading|applied|error)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-coupon-input-height\` / \`--hui-coupon-input-radius\` / \`--hui-coupon-input-bg\` | Ô nhập |
| \`--hui-coupon-input-border-color\` / \`--hui-coupon-input-focus-border-color\` | Viền |
| \`--hui-coupon-input-gap\` | Khoảng cách ô ↔ nút |
| \`--hui-coupon-input-tag-bg\` / \`--hui-coupon-input-tag-color\` | Chip mã |
| \`--hui-coupon-input-discount-color\` / \`--hui-coupon-input-error-color\` | Mức giảm / lỗi |

### Bàn phím
\`Enter\` trong ô = áp dụng (không submit form). Áp dụng xong focus chuyển sang nút gỡ (×), gỡ xong focus về ô nhập.
Thông báo lỗi dùng \`role="alert"\`, thành công \`role="status"\`.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`<div style="max-width:360px"><hui-coupon-input .validate=${mockValidate}></hui-coupon-input></div>`,
};

export const States = {
  render: () => html`
    <div style="display:grid;gap:16px;max-width:360px">
      <hui-coupon-input></hui-coupon-input>
      <hui-coupon-input value="SALE50K" discount="50000"></hui-coupon-input>
      <hui-coupon-input size="sm" .validate=${mockValidate}></hui-coupon-input>
      <hui-coupon-input disabled></hui-coupon-input>
    </div>
  `,
};

/** Mã hợp lệ: loading → applied, chip + "−50.000 ₫", gỡ mã */
export const ApplyValid = {
  render: () => html`<div style="max-width:360px"><hui-coupon-input id="cp-ok" name="coupon"></hui-coupon-input></div>`,
  play: async ({ canvasElement }) => {
    setLocale('vi');
    const cp = canvasElement.querySelector('#cp-ok');
    await cp.updateComplete;
    let release;
    cp.validate = (code) => new Promise((r) => { release = () => r({ valid: true, discount: 50000, code }); });
    const applied = [];
    cp.addEventListener('hui-apply', (e) => applied.push(e.detail));
    const input = part(cp, 'input');
    input.focus();
    await userEvent.keyboard('sale50k{Enter}');
    await waitFor(() => expect(cp.couponState).toBe('loading'));
    expect(part(cp, 'apply').loading).toBe(true);
    release();
    await waitFor(() => expect(cp.couponState).toBe('applied'));
    expect(cp.value).toBe('SALE50K');
    expect(applied[0].discount).toBe(50000);
    await cp.updateComplete;
    expect(part(cp, 'code').textContent).toBe('SALE50K');
    expect(part(cp, 'discount').textContent).toMatch(/−50\.000/);
    expect(part(cp, 'field').hidden).toBe(true);

    const removed = [];
    cp.addEventListener('hui-remove', (e) => removed.push(e.detail.code));
    await userEvent.click(part(cp, 'remove'));
    await cp.updateComplete;
    expect(cp.value).toBe('');
    expect(removed).toEqual(['SALE50K']);
    expect(part(cp, 'field').hidden).toBe(false);
  },
};

/** Mã sai → error + thông báo role=alert; bỏ trống → error; validate ném lỗi → hiện message */
export const ApplyInvalid = {
  render: () => html`<div style="max-width:360px"><hui-coupon-input id="cp-bad" no-animation></hui-coupon-input></div>`,
  play: async ({ canvasElement }) => {
    const cp = canvasElement.querySelector('#cp-bad');
    await cp.updateComplete;
    cp.validate = async () => ({ valid: false, message: 'Mã đã hết hạn' });
    const errors = [];
    cp.addEventListener('hui-error', (e) => errors.push(e.detail.message));

    await cp.apply('');
    await cp.updateComplete;
    expect(cp.couponState).toBe('error');

    await cp.apply('old2020');
    await cp.updateComplete;
    const message = part(cp, 'message');
    expect(message.textContent).toBe('Mã đã hết hạn');
    expect(message.getAttribute('role')).toBe('alert');
    expect(part(cp, 'input').hasAttribute('aria-invalid')).toBe(true);

    cp.validate = async () => { throw new Error('Mất kết nối'); };
    await cp.apply('X');
    await cp.updateComplete;
    expect(part(cp, 'message').textContent).toBe('Mất kết nối');
    expect(errors.length).toBe(3);
    expect(cp.value).toBe('');
  },
};

/** Gửi form: value = mã đã áp dụng */
export const InForm = {
  render: () => html`<form id="cp-f"><hui-coupon-input name="coupon"></hui-coupon-input></form>`,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#cp-f');
    const cp = form.querySelector('hui-coupon-input');
    await cp.updateComplete;
    expect(new FormData(form).get('coupon')).toBeNull();
    await cp.apply('giam10'); // không có validate → áp dụng luôn
    expect(new FormData(form).get('coupon')).toBe('GIAM10');
    form.reset();
    expect(cp.value).toBe('');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cp-custom {
        --hui-coupon-input-radius: 999px;
        --hui-coupon-input-gap: 0;
        --hui-coupon-input-tag-bg: var(--hui-warning-light);
        --hui-coupon-input-tag-color: var(--hui-warning);
      }
      .cp-custom::part(input) { border-radius: 999px 0 0 999px; }
      .cp-custom::part(apply) { --hui-button-radius: 0 999px 999px 0; }
    </style>
    <div style="max-width:360px"><hui-coupon-input class="cp-custom" .validate=${mockValidate}></hui-coupon-input></div>
  `,
};
