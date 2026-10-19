/**
 * Storybook Stories — HUI Contact Form (form liên hệ dựng sẵn)
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

const sr = (el) => el.shadowRoot;
const item = (el, name) => sr(el).querySelector(`hui-form-item[name="${name}"]`);
const control = (el, name) => item(el, name)?.control;
const innerInput = (ctrl) => ctrl.shadowRoot.querySelector('input, textarea');
const submitBtn = (el) => sr(el).querySelector('[part="submit"]');
const clickSubmit = (el) => submitBtn(el).shadowRoot.querySelector('button').click();

const SUBJECTS = ['Báo giá', 'Hỗ trợ kỹ thuật', 'Hợp tác', { label: 'Khác', value: 'other' }];
const VALID = { name: 'Nguyễn Văn A', email: 'a@hui.dev', phone: '+84912345678', message: 'Xin chào, tôi cần tư vấn.' };

export default {
  title: 'Organisms/HuiContactForm',
  component: 'hui-contact-form',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Contact Form** — Form liên hệ dựng sẵn, ghép từ \`hui-form\` + \`hui-form-item\` + \`hui-input\` / \`hui-phone-input\` /
\`hui-select\` / \`hui-textarea\` / \`hui-checkbox\`. Validate theo luật → \`hui-submit\` (cancelable) → gửi bằng
\`submitHandler\` (async) **hoặc** \`fetch\` JSON tới \`action\` → màn hình thành công (\`hui-result\` + nút "Gửi tin khác")
hoặc thông báo lỗi (\`hui-alert\`), nút gửi hiện loading trong lúc chờ.

\`\`\`html
<hui-contact-form action="/api/contact" fields="name,email,phone,subject,message,consent"
  subjects='["Báo giá","Hỗ trợ","Hợp tác"]'>
  <h2>Liên hệ với chúng tôi</h2>
</hui-contact-form>
<script>
  el.submitHandler = async (values) => api.sendContact(values); // ưu tiên hơn action
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`fields\` | string | \`name,email,phone,message\` | Field theo thứ tự: \`name\`, \`email\`, \`phone\`, \`subject\`, \`message\`, \`consent\` |
| \`required-fields\` | string | \`name,email,message\` | Field bắt buộc (\`consent\` luôn bắt buộc) |
| \`subjects\` | JSON array | — | Có → \`subject\` là \`hui-select\` (chuỗi hoặc \`{ label, value }\`), không → ô nhập |
| \`action\` | string | — | URL nhận JSON (\`Content-Type: application/json\`) |
| \`method\` | string | \`POST\` | \`POST\` \\| \`PUT\` \\| \`PATCH\` \\| \`GET\` (GET: query string) |
| \`headers\` | JSON object | — | Header thêm khi gửi tới \`action\` |
| \`labels\` / \`placeholders\` | JSON object | — | Ghi đè nhãn / placeholder theo tên field |
| \`consent-text\` | string | "Tôi đồng ý…" | Chữ ô đồng ý |
| \`phone-country\` | string | \`VN\` | Quốc gia mặc định của \`phone\` |
| \`message-maxlength\` | number | — | Giới hạn ký tự nội dung (hiện bộ đếm) |
| \`submit-text\` / \`reset-text\` | string | "Gửi liên hệ" / "Gửi tin khác" | Chữ nút |
| \`success-title\` / \`success-text\` | string | "Đã gửi thành công!" / … | Màn hình thành công |
| \`layout\` | \`vertical\` \\| \`horizontal\` | \`vertical\` | Bố cục nhãn |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Kích thước control |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa toàn bộ |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng màn hình thành công |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`submitHandler\` | \`async (values) => any\` — throw = lỗi. Ưu tiên hơn \`action\`. Không có cả hai → thành công ngay sau \`hui-submit\` |
| \`state\` | \`idle\` \\| \`loading\` \\| \`success\` \\| \`error\` (chỉ đọc) |
| \`submit()\` | Validate + gửi → \`Promise<boolean>\` |
| \`reset(focusFirst?)\` | Về form trống |
| \`getValues()\` / \`setValues(obj)\` | Đọc / gán giá trị (\`phone\` dạng E.164, \`consent\` true/false) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-submit\` | \`{ values }\` | Form hợp lệ, trước khi gửi. **cancelable** — \`preventDefault()\` để không gửi |
| \`hui-success\` | \`{ values, result }\` | Gửi xong (\`result\` = giá trị trả về / JSON phản hồi) |
| \`hui-error\` | \`{ values, error }\` | submitHandler throw / HTTP không 2xx (\`error.status\`) / lỗi mạng |
| \`hui-values-change\` | \`{ changed, values }\` | (từ \`hui-form\` bên trong) người dùng đổi 1 field |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Nội dung phía trên form |
| \`success\` | Nội dung thêm trong màn hình thành công |

### Parts
\`base\`, \`form\`, \`field\` + \`field-<tên>\`, \`control\` + \`control-<tên>\`, \`alert\`, \`actions\`, \`submit\`, \`success\`, \`reset\`.
Custom state: \`:state(idle | loading | success | error)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-contact-form-gap\` | Khoảng cách giữa các field |
| \`--hui-contact-form-max-width\` | Bề rộng tối đa |
| \`--hui-contact-form-columns\` | Số cột cho field ngắn (name/email/phone/subject); màn hình < 560px luôn 1 cột |

Control con vẫn nhận biến riêng (\`--hui-input-*\`, \`--hui-form-label-*\`, \`--hui-button-*\`…).

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Lần lượt các field → nút gửi |
| \`Enter\` (ô một dòng) | Gửi form (như form native) |
| — | Gửi lỗi validate → focus field lỗi đầu tiên; thành công → focus màn hình kết quả |
        `,
      },
    },
  },
  argTypes: {
    fields: { control: 'text' },
    layout: { control: 'select', options: ['vertical', 'horizontal'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
};

export const Default = {
  args: { fields: 'name,email,phone,message', layout: 'vertical', size: 'md', disabled: false },
  render: (args) => html`
    <div style="max-width: 560px;">
      <hui-contact-form
        fields=${args.fields}
        layout=${args.layout}
        size=${args.size}
        ?disabled=${args.disabled}
        .submitHandler=${() => new Promise((r) => setTimeout(r, 800))}
      >
        <h2 style="margin: 0 0 4px; font-size: 22px;">Liên hệ với chúng tôi</h2>
        <p style="margin: 0; color: var(--hui-text-secondary);">Để lại lời nhắn, chúng tôi phản hồi trong 24 giờ.</p>
      </hui-contact-form>
    </div>
  `,
};

/** Validate: trống → lỗi các field bắt buộc; email sai; phone sai độ dài */
export const Validation = {
  render: () => html`<div style="max-width: 560px;"><hui-contact-form id="cf-valid"></hui-contact-form></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cf-valid');
    await waitFor(() => expect(control(el, 'phone')).toBeTruthy());
    let submitted = null;
    el.addEventListener('hui-submit', (e) => { submitted = e.detail.values; });

    await expect(await el.submit()).toBe(false);
    await expect(item(el, 'name').errorMessage).toBe('Vui lòng nhập trường này');
    await expect(item(el, 'email').errorMessage).toBe('Vui lòng nhập trường này');
    await expect(item(el, 'message').errorMessage).toBe('Vui lòng nhập trường này');
    await expect(item(el, 'phone').errorMessage).toBe(''); // phone không bắt buộc
    await expect(submitted).toBe(null);

    el.setValues({ ...VALID, email: 'sai-email', phone: '0912' });
    await expect(await el.submit()).toBe(false);
    await expect(item(el, 'email').errorMessage).toBe('Email không hợp lệ');
    await expect(item(el, 'phone').errorMessage).toBe('Số điện thoại không hợp lệ');

    // Gõ thật vào ô email → lỗi tự cập nhật
    const email = innerInput(control(el, 'email'));
    await userEvent.type(email, 'a@hui.dev', { initialSelectionStart: 0, initialSelectionEnd: email.value.length });
    await waitFor(() => expect(item(el, 'email').errorMessage).toBe(''));
    email.blur();

    control(el, 'phone').value = '0912345678';
    await expect(await el.submit()).toBe(true); // không submitHandler / action → thành công ngay
    await expect(submitted).toEqual({ ...VALID, email: 'a@hui.dev' });
    await expect(el.state).toBe('success');
  },
};

/** submitHandler giả lập: loading → thành công → "Gửi tin khác"; lỗi → hui-alert */
export const SubmitHandler = {
  render: () => html`
    <div style="max-width: 560px;">
      <hui-contact-form id="cf-handler" fields="name,email,subject,message,consent" .subjects=${SUBJECTS}
        message-maxlength="500"></hui-contact-form>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cf-handler');
    await waitFor(() => expect(control(el, 'subject')).toBeTruthy());
    await expect(control(el, 'subject').localName).toBe('hui-select');
    await expect(control(el, 'message').showCount).toBe(true);

    let fail = true;
    const calls = [];
    el.submitHandler = async (values) => {
      calls.push(values);
      await new Promise((r) => setTimeout(r, 60));
      if (fail) throw new Error('Máy chủ đang bận');
      return { ticket: 'HUI-001' };
    };
    const errors = [];
    const successes = [];
    el.addEventListener('hui-error', (e) => errors.push(e.detail.error.message));
    el.addEventListener('hui-success', (e) => successes.push(e.detail.result));

    el.setValues({ name: 'A', email: 'a@hui.dev', subject: 'other', message: 'Hi' });
    // Chưa tick đồng ý → lỗi
    await expect(await el.submit()).toBe(false);
    await expect(item(el, 'consent').errorMessage).toBe('Vui lòng đồng ý để tiếp tục');

    el.setValues({ consent: true });
    const pending = el.submit();
    await waitFor(() => expect(el.state).toBe('loading'));
    await expect(submitBtn(el).loading).toBe(true);
    await expect(await pending).toBe(false);
    await expect(el.state).toBe('error');
    await expect(errors).toEqual(['Máy chủ đang bận']);
    const alert = sr(el).querySelector('[part="alert"]');
    await expect(alert.hidden).toBe(false);
    await expect(alert.description).toBe('Máy chủ đang bận');
    await expect(submitBtn(el).loading).toBe(false);
    await expect(el.getValues().message).toBe('Hi'); // giữ dữ liệu khi lỗi

    fail = false;
    await expect(await el.submit()).toBe(true);
    await expect(successes).toEqual([{ ticket: 'HUI-001' }]);
    await expect(calls.at(-1)).toEqual({ name: 'A', email: 'a@hui.dev', subject: 'other', message: 'Hi', consent: true });
    const result = sr(el).querySelector('[part="success"]');
    await expect(result.hidden).toBe(false);
    await expect(sr(el).querySelector('[part="form"]').hidden).toBe(true);

    // "Gửi tin khác" → form trống
    sr(el).querySelector('[part="reset"]').shadowRoot.querySelector('button').click();
    await expect(el.state).toBe('idle');
    await expect(el.getValues().name).toBe('');
    await expect(result.hidden).toBe(true);
  },
};

/** action: POST JSON qua fetch (fetch được giả lập trong test, không gọi mạng thật) */
export const ActionFetch = {
  render: () => html`
    <div style="max-width: 560px;">
      <hui-contact-form id="cf-action" action="/api/contact" fields="name,email,message"
        .headers=${{ 'X-Token': 'demo' }}></hui-contact-form>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cf-action');
    await waitFor(() => expect(control(el, 'message')).toBeTruthy());
    const original = window.fetch;
    const requests = [];
    let status = 500;
    window.fetch = async (url, init) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ ok: status === 200 }), { status, headers: { 'Content-Type': 'application/json' } });
    };
    try {
      el.setValues({ name: 'B', email: 'b@hui.dev', message: 'Hello' });
      let error = null;
      el.addEventListener('hui-error', (e) => { error = e.detail.error; }, { once: true });
      await expect(await el.submit()).toBe(false);
      await expect(error.status).toBe(500);

      status = 200;
      let result = null;
      el.addEventListener('hui-success', (e) => { result = e.detail.result; }, { once: true });
      await expect(await el.submit()).toBe(true);
      await expect(result).toEqual({ ok: true });
      const last = requests.at(-1);
      await expect(last.url).toBe('/api/contact');
      await expect(last.init.method).toBe('POST');
      await expect(last.init.headers['Content-Type']).toBe('application/json');
      await expect(last.init.headers['X-Token']).toBe('demo');
      await expect(JSON.parse(last.init.body)).toEqual({ name: 'B', email: 'b@hui.dev', message: 'Hello' });
    } finally {
      window.fetch = original;
    }
  },
};

/** hui-submit cancelable: preventDefault → không gửi */
export const CancelSubmit = {
  render: () => html`
    <div style="max-width: 560px;">
      <hui-contact-form id="cf-cancel" fields="name,email" @hui-submit=${(e) => e.preventDefault()}></hui-contact-form>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cf-cancel');
    await waitFor(() => expect(control(el, 'email')).toBeTruthy());
    let called = false;
    el.submitHandler = async () => { called = true; };
    el.setValues({ name: 'C', email: 'c@hui.dev' });
    clickSubmit(el);
    await new Promise((r) => setTimeout(r, 50));
    await expect(called).toBe(false);
    await expect(el.state).toBe('idle');
  },
};

/** Bố cục ngang + 2 cột cho field ngắn + nhãn tùy chỉnh */
export const LayoutAndLabels = {
  render: () => html`
    <style>.cf-2col { --hui-contact-form-columns: 2; }</style>
    <div style="display: flex; flex-direction: column; gap: 40px; max-width: 720px;">
      <hui-contact-form class="cf-2col" fields="name,email,phone,subject,message"
        .labels=${{ name: 'Tên của bạn', subject: 'Bạn quan tâm' }}
        .placeholders=${{ message: 'Mô tả ngắn yêu cầu của bạn...' }}
        submit-text="Gửi yêu cầu"></hui-contact-form>
      <hui-contact-form layout="horizontal" size="sm" fields="name,email,message" required-fields="email"></hui-contact-form>
    </div>
  `,
};

/** Override từ ngoài: biến CSS + ::part + :state() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cf-brand {
        --hui-contact-form-gap: 12px;
        --hui-contact-form-max-width: 520px;
        --hui-input-radius: 12px;
        --hui-form-label-color: var(--hui-primary);
      }
      hui-contact-form.cf-brand::part(base) {
        padding: 24px;
        border-radius: var(--hui-radius-lg);
        background: var(--hui-bg-container);
        box-shadow: var(--hui-shadow-md);
      }
      hui-contact-form.cf-brand::part(submit) { width: 100%; }
      hui-contact-form.cf-brand::part(field-message) { margin-top: 8px; }
      hui-contact-form.cf-brand:state(success)::part(base) { background: var(--hui-success-1); }
    </style>
    <hui-contact-form class="cf-brand" fields="name,email,message" .submitHandler=${() => new Promise((r) => setTimeout(r, 500))}>
      <strong style="font-size: 18px;">Góp ý cho HUI</strong>
    </hui-contact-form>
  `,
};
