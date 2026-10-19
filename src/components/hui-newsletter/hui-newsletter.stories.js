/**
 * Storybook Stories — HUI Newsletter (đăng ký nhận tin)
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

const emailInput = (el) => el.shadowRoot.querySelector('hui-input').shadowRoot.querySelector('input');
const huiInput = (el) => el.shadowRoot.querySelector('hui-input');
const button = (el) => el.shadowRoot.querySelector('hui-button');
const checkbox = (el) => el.shadowRoot.querySelector('hui-checkbox');
const clickButton = (el) => button(el).shadowRoot.querySelector('button').click();

/** subscribe giả lập (không gọi mạng thật) */
const fakeSubscribe = (ms = 300) => ({ email }) => new Promise((resolve, reject) => {
  setTimeout(() => (email.startsWith('fail') ? reject(new Error('Email này đã đăng ký trước đó')) : resolve({ id: 42 })), ms);
});

export default {
  title: 'Molecules/HuiNewsletter',
  component: 'hui-newsletter',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Newsletter** — Khối đăng ký nhận tin: ô email (\`hui-input\`) + nút (\`hui-button\`) + ô đồng ý (\`hui-checkbox\`, tùy chọn).
Validate (trống / sai định dạng / chưa đồng ý) → phát \`hui-subscribe\` → gọi hàm \`subscribe\` async do bạn cung cấp →
**loading** (nút xoay) → **success** (dấu ✓ tự vẽ nét + lời cảm ơn) hoặc **error** (dòng lỗi \`role="alert"\`, sửa email là xóa lỗi).
Component **không tự gọi mạng**.

\`\`\`html
<hui-newsletter consent="Tôi đồng ý nhận email khuyến mãi">
  <h3>Nhận ưu đãi mỗi tuần</h3>
</hui-newsletter>
<script>
  el.subscribe = async ({ email, consent }) => {
    const res = await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email, consent }) });
    if (!res.ok) throw new Error('Không đăng ký được');
  };
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`layout\` | \`inline\` \\| \`stacked\` | \`inline\` | Ô + nút cùng hàng (tự xuống dòng khi hẹp) / xếp dọc, nút rộng hết |
| \`placeholder\` | string | "Nhập email của bạn" | Chữ gợi ý |
| \`button-text\` | string | "Đăng ký" | Chữ trên nút |
| \`success-text\` | string | "Đăng ký thành công!…" | Chữ thành công (slot \`success\` ưu tiên) |
| \`consent\` | string | — | Có → hiện checkbox với chữ này, bắt buộc tick |
| \`label\` | string | — | Nhãn hiển thị (bỏ trống: nhãn ẩn "Địa chỉ email") |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Kích thước ô + nút |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng vẽ ✓ |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`subscribe\` | \`async ({ email, consent }) => any\` — throw / reject = lỗi (\`error.message\` được hiển thị). Không gán → thành công ngay sau \`hui-subscribe\` |
| \`state\` | \`idle\` \\| \`loading\` \\| \`success\` \\| \`error\` (chỉ đọc) |
| \`submit()\` | Validate + đăng ký, trả về \`Promise<boolean>\` |
| \`reset()\` | Về trạng thái ban đầu |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-subscribe\` | \`{ email, consent }\` | Email hợp lệ, trước khi gọi \`subscribe\`. **cancelable** — \`preventDefault()\` để tự xử lý |
| \`hui-success\` | \`{ email, result }\` | Thành công (\`result\` = giá trị \`subscribe\` trả về) |
| \`hui-error\` | \`{ email, error }\` | \`subscribe\` báo lỗi |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Nội dung giới thiệu phía trên (tiêu đề, mô tả) |
| \`success\` | Nội dung thay chữ thành công |

### Parts
\`base\`, \`form\`, \`label\`, \`row\`, \`input\` (hui-input), \`button\` (hui-button), \`consent\` (hui-checkbox), \`error\`,
\`success\`, \`success-icon\`, \`success-text\`. Custom state: \`:state(idle | loading | success | error)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-newsletter-gap\` | Khoảng cách các phần tử |
| \`--hui-newsletter-button-min-width\` | Rộng tối thiểu nút (inline) |
| \`--hui-newsletter-error-color\` | Dòng lỗi gửi |
| \`--hui-newsletter-success-color\` / \`--hui-newsletter-success-icon-size\` | Dấu ✓ |

Ô / nút / checkbox bên trong vẫn nhận biến của chính chúng (\`--hui-input-*\`, \`--hui-button-*\`, \`--hui-checkbox-*\`).

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Enter\` (trong ô email) | Đăng ký |
| \`Tab\` | Ô email → nút → ô đồng ý |

Thành công: khung kết quả \`role="status"\` nhận focus (nếu focus đang ở trong component) để trình đọc màn hình đọc lời cảm ơn.
        `,
      },
    },
  },
  argTypes: {
    layout: { control: 'select', options: ['inline', 'stacked'] },
    placeholder: { control: 'text' },
    buttonText: { control: 'text' },
    successText: { control: 'text' },
    consent: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
};

export const Default = {
  args: { layout: 'inline', placeholder: '', buttonText: '', successText: '', consent: '', size: 'md', disabled: false },
  render: (args) => html`
    <div style="max-width: 480px;">
      <hui-newsletter
        id="nl-default"
        layout=${args.layout}
        placeholder=${args.placeholder}
        button-text=${args.buttonText}
        success-text=${args.successText}
        consent=${args.consent}
        size=${args.size}
        ?disabled=${args.disabled}
        .subscribe=${fakeSubscribe(400)}
      >
        <h3 style="margin: 0; font-size: 18px;">Nhận ưu đãi mỗi tuần</h3>
        <p style="margin: 0; color: var(--hui-text-secondary); font-size: 14px;">Không spam. Hủy đăng ký bất kỳ lúc nào.</p>
      </hui-newsletter>
    </div>
  `,
};

/** Validate: trống → sai định dạng → gõ lại thì xóa lỗi; Enter để gửi */
export const Validation = {
  render: () => html`<div style="max-width: 480px;"><hui-newsletter id="nl-valid"></hui-newsletter></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#nl-valid');
    let subscribed = null;
    el.addEventListener('hui-subscribe', (e) => { subscribed = e.detail; });
    await waitFor(() => expect(emailInput(el).getAttribute('aria-label')).toBe('Địa chỉ email'));

    clickButton(el);
    await waitFor(() => expect(huiInput(el).error).toBe('Vui lòng nhập email'));
    await expect(subscribed).toBe(null);

    const input = emailInput(el);
    await userEvent.type(input, 'abc');
    await expect(huiInput(el).error).toBe(''); // gõ là xóa lỗi
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(huiInput(el).error).toBe('Email không hợp lệ'));

    await userEvent.type(input, '@hui.dev');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(el.state).toBe('success')); // không có subscribe → thành công ngay
    await expect(subscribed).toEqual({ email: 'abc@hui.dev', consent: false });
    await expect(el.matches(':state(success)')).toBe(true);
    await expect(el.shadowRoot.querySelector('[part="success"]').hidden).toBe(false);
    await expect(el.shadowRoot.querySelector('[part="form"]').hidden).toBe(true);
    el.reset();
    await expect(el.state).toBe('idle');
  },
};

/** subscribe giả lập: loading → success (✓ vẽ nét) / error (email bắt đầu bằng "fail") */
export const AsyncSubscribe = {
  render: () => html`
    <div style="max-width: 480px; display: flex; flex-direction: column; gap: 24px;">
      <hui-newsletter id="nl-ok" success-text="Cảm ơn! Mã giảm giá 10% đã được gửi tới email của bạn."></hui-newsletter>
      <hui-newsletter id="nl-fail"></hui-newsletter>
      <p style="margin: 0; font-size: 13px; color: var(--hui-text-secondary);">Gõ email bắt đầu bằng <code>fail</code> để thấy trạng thái lỗi.</p>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ok = canvasElement.querySelector('#nl-ok');
    const fail = canvasElement.querySelector('#nl-fail');
    const calls = [];
    ok.subscribe = async (payload) => {
      calls.push(payload);
      await new Promise((r) => setTimeout(r, 80));
      return { id: 7 };
    };
    fail.subscribe = fakeSubscribe(60);

    let success = null;
    ok.addEventListener('hui-success', (e) => { success = e.detail; });
    huiInput(ok).value = 'me@hui.dev';
    const pending = ok.submit();
    await expect(ok.state).toBe('loading');
    await expect(button(ok).loading).toBe(true);
    await expect(await pending).toBe(true);
    await expect(success).toEqual({ email: 'me@hui.dev', result: { id: 7 } });
    await expect(calls).toEqual([{ email: 'me@hui.dev', consent: false }]);
    await expect(ok.shadowRoot.querySelector('[part="success-text"]').textContent).toContain('Mã giảm giá 10%');

    let error = null;
    fail.addEventListener('hui-error', (e) => { error = e.detail.error; });
    huiInput(fail).value = 'fail@hui.dev';
    await expect(await fail.submit()).toBe(false);
    await expect(fail.state).toBe('error');
    await expect(error.message).toBe('Email này đã đăng ký trước đó');
    const alert = fail.shadowRoot.querySelector('[part="error"]');
    await expect(alert.getAttribute('role')).toBe('alert');
    await expect(alert.textContent).toBe('Email này đã đăng ký trước đó');
    await expect(button(fail).loading).toBe(false);
    // Sửa email → hết lỗi
    await userEvent.type(emailInput(fail), 'x');
    await expect(fail.state).toBe('idle');
    await expect(alert.textContent).toBe('');
    emailInput(fail).blur();
  },
};

/** Ô đồng ý bắt buộc + preventDefault hui-subscribe để tự xử lý */
export const ConsentAndCancel = {
  render: () => html`
    <div style="max-width: 480px;">
      <hui-newsletter id="nl-consent" layout="stacked" label="Email nhận tin"
        consent="Tôi đồng ý nhận email khuyến mãi từ cửa hàng"></hui-newsletter>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#nl-consent');
    let subscribeCalled = false;
    el.subscribe = async () => { subscribeCalled = true; };
    huiInput(el).value = 'me@hui.dev';
    await expect(await el.submit()).toBe(false);
    await expect(checkbox(el).error).toBe('Vui lòng đồng ý để tiếp tục');

    checkbox(el).shadowRoot.querySelector('input').click();
    await expect(checkbox(el).checked).toBe(true);
    await expect(checkbox(el).error).toBe('');

    const stop = (e) => e.preventDefault();
    el.addEventListener('hui-subscribe', stop, { once: true });
    await expect(await el.submit()).toBe(false);
    await expect(subscribeCalled).toBe(false);
    await expect(el.state).toBe('idle');

    await expect(await el.submit()).toBe(true);
    await expect(subscribeCalled).toBe(true);
  },
};

export const LayoutsAndSizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 24px; max-width: 520px;">
      <hui-newsletter size="sm" button-text="Theo dõi"></hui-newsletter>
      <hui-newsletter size="lg" placeholder="email@congty.vn"></hui-newsletter>
      <hui-newsletter layout="stacked" label="Email"></hui-newsletter>
      <hui-newsletter disabled></hui-newsletter>
    </div>
  `,
};

/** Slot success: nội dung thành công tùy biến */
export const CustomSuccess = {
  render: () => html`
    <div style="max-width: 480px;">
      <hui-newsletter id="nl-slot">
        <span slot="success">🎉 Chào mừng bạn! <a href="#" style="color: var(--hui-primary);">Xem ưu đãi</a></span>
      </hui-newsletter>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#nl-slot');
    huiInput(el).value = 'me@hui.dev';
    await el.submit();
    await expect(el.state).toBe('success');
  },
};

/** Override từ ngoài: biến CSS + ::part + biến của control con */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .nl-brand {
        --hui-newsletter-gap: 12px;
        --hui-newsletter-button-min-width: 9rem;
        --hui-newsletter-success-color: var(--hui-primary);
        --hui-newsletter-success-icon-size: 64px;
        --hui-input-radius: 999px;
        --hui-button-radius: 999px;
      }
      hui-newsletter.nl-brand::part(base) {
        padding: 20px;
        border-radius: var(--hui-radius-lg);
        background: var(--hui-primary-1);
      }
      hui-newsletter.nl-brand::part(error) { font-weight: 600; }
    </style>
    <div style="max-width: 520px;">
      <hui-newsletter id="nl-brand" class="nl-brand" no-animation>
        <strong>Bản tin HUI</strong>
      </hui-newsletter>
    </div>
  `,
};
