/**
 * Storybook Stories — HUI Form + Form Item
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-input/index.js';
import '../hui-select/index.js';
import '../hui-checkbox/index.js';
import '../hui-checkbox-group/index.js';
import '../hui-radio/index.js';
import '../hui-button/index.js';

const COUNTRIES = [
  { label: 'Việt Nam', value: 'VN' },
  { label: 'Nhật Bản', value: 'JP' },
  { label: 'Hàn Quốc', value: 'KR' },
];
const GENDERS = [
  { label: 'Nam', value: 'male' },
  { label: 'Nữ', value: 'female' },
  { label: 'Khác', value: 'other' },
];
const HOBBIES = ['Đọc sách', 'Thể thao', 'Âm nhạc', 'Du lịch'];

/** Validator: xác nhận mật khẩu phải khớp (async — giả lập kiểm tra chậm) */
const confirmRules = [{
  validator: async (value, values) => {
    await new Promise((r) => setTimeout(r, 20));
    if (value && value !== values.password) throw new Error('Mật khẩu xác nhận không khớp');
  },
}];
const agreeRules = [{ required: true, message: 'Bạn cần đồng ý điều khoản để tiếp tục' }];

/** In kết quả ra <pre> bên dưới form */
const show = (e, label) => {
  const out = e.currentTarget.parentElement.querySelector('.form-output');
  if (out) out.textContent = `${label}: ${JSON.stringify(e.detail.values ?? e.detail.errors?.map((x) => x.name), null, 2)}`;
};

/** Gõ chữ vào hui-input như người dùng (input event của thẻ native bên trong) */
const typeInto = (huiInput, text) => {
  const inner = huiInput.shadowRoot.querySelector('input');
  inner.value = text;
  inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};
const clickHui = (btn) => btn.shadowRoot.querySelector('button').click();

export default {
  title: 'Components/HuiForm',
  component: 'hui-form',
  subcomponents: { HuiFormItem: 'hui-form-item' },
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Form** — Bố cục + validate theo luật + submit cho các control HUI (Ant Form). Không tạo \`<form>\` native:
\`hui-form\` gom mọi control (kế thừa \`HuiFormElement\`) bên trong, \`hui-form-item\` gắn nhãn + luật + dòng lỗi cho từng control.

\`\`\`html
<hui-form id="f" layout="horizontal" label-width="120">
  <hui-form-item label="Email" name="email" required type="email">
    <hui-input></hui-input>
  </hui-form-item>
  <hui-form-item label="Xác nhận" name="confirm" dependencies="password" id="confirm">
    <hui-input type="password"></hui-input>
  </hui-form-item>
  <hui-button type="submit">Gửi</hui-button>
</hui-form>
<script>
  confirm.rules = [{ validator: async (v, values) => { if (v !== values.password) throw new Error('Không khớp'); } }];
  f.addEventListener('hui-submit', (e) => api.save(e.detail.values));
  const { valid, values, errors } = await f.validate();
</script>
\`\`\`

### Attributes — hui-form
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`layout\` | \`vertical \\| horizontal \\| inline\` | \`vertical\` | Nhãn trên / nhãn trái / các item cùng 1 dòng |
| \`label-width\` | string | \`120px\` | Rộng cột nhãn khi horizontal (số = px) |
| \`label-align\` | \`left \\| right\` | \`right\` | Canh chữ nhãn khi horizontal |
| \`size\` | \`sm \\| md \\| lg\` | — | Kích thước mọi control (control tự đặt size thì giữ) |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa mọi control + hui-button bên trong |
| \`required-mark\` | \`true \\| false \\| optional\` | \`true\` | Dấu * / ẩn / hiện "(không bắt buộc)" cho field không bắt buộc |
| \`scroll-to-first-error\` | boolean | \`false\` | Submit lỗi → cuộn + focus field lỗi đầu tiên |

### Attributes — hui-form-item
| Attribute | Type | Mô tả |
|-----------|------|-------|
| \`label\` | string | Nhãn (gắn làm nhãn trợ năng cho control) |
| \`name\` | string | Tên field — chọn control có name trùng (không có thì control đầu tiên); control chưa có name được gán |
| \`help\` | string | Gợi ý dưới control (bị thay bằng lỗi khi sai) |
| \`extra\` | string | Nội dung phụ dưới cùng (hoặc slot \`extra\`) |
| \`tooltip\` | string | Icon ⓘ + tooltip cạnh nhãn |
| \`required\` | boolean | Bắt buộc (checkbox/switch: phải bật) |
| \`type\` | \`email \\| url \\| number\` | Kiểm định dạng |
| \`min\` / \`max\` | number | Số: giá trị · chuỗi: độ dài · mảng: số mục |
| \`minlength\` / \`maxlength\` | number | Độ dài |
| \`pattern\` | string | RegExp khớp toàn chuỗi |
| \`message\` | string | Thông báo thay cho mặc định (cho các luật attribute) |
| \`status\` | \`'' \\| success \\| warning \\| error \\| validating\` | Ép trạng thái hiển thị |
| \`dependencies\` | string | Field khác (cách dấu phẩy) đổi → validate lại item này |

### Properties / Methods
| API | Mô tả |
|-----|-------|
| \`item.rules\` | \`[{ required, type, min, max, len, minlength, maxlength, pattern, validator: async (value, values) => void, message }]\` — validator ném \`Error(msg)\` (hoặc reject / trả chuỗi) = lỗi |
| \`form.validate()\` | \`Promise<{ valid, values, errors: [{ name, message, element }] }>\` |
| \`form.validateFields(names)\` | Như validate() nhưng chỉ các field trong \`names\` |
| \`form.reset()\` | Về giá trị ban đầu (attribute \`value\` / \`checked\`), xóa lỗi |
| \`form.getValues()\` / \`form.setValues(obj)\` | Đọc / gán giá trị theo name (checkbox/switch: true/false) |
| \`form.scrollToError()\` | Cuộn + focus field lỗi đầu tiên |
| \`form.submit()\` | Validate rồi phát \`hui-submit\` / \`hui-submit-failed\` |
| \`item.validate()\` / \`item.reset()\` / \`item.errorMessage\` / \`item.control\` | Theo từng item |

Thứ tự luật: luật của item (attribute → \`rules\`) rồi tới ràng buộc riêng của control (\`required\`, \`minlength\`... đặt trên control).
Lỗi được ghi vào control bằng \`setCustomValidity()\` → \`control.checkValidity()\`, \`:state(user-invalid)\` đều phản ánh đúng.
Validate lại khi giá trị đổi (ô chữ: sau lần \`change\` đầu tiên thì validate theo từng phím).

### Events (hui-form)
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-submit\` | \`{ values }\` | Submit và mọi field hợp lệ |
| \`hui-submit-failed\` | \`{ errors, values }\` | Submit nhưng có lỗi |
| \`hui-values-change\` | \`{ changed, values }\` | Người dùng đổi giá trị 1 field |
Submit: \`<hui-button type="submit">\` bên trong, \`Enter\` trong ô nhập 1 dòng, hoặc \`form.submit()\`. \`<hui-button type="reset">\` = \`form.reset()\`.

### Slots · Parts · States
- **hui-form**: slot mặc định · part \`base\`
- **hui-form-item**: slot mặc định (control), \`extra\` · parts \`base\`, \`label\`, \`label-text\`, \`required-mark\`, \`optional\`,
  \`tooltip\`, \`control\`, \`help\`, \`extra\` · states \`:state(error)\`, \`:state(warning)\`, \`:state(success)\`, \`:state(validating)\`

### Trợ năng / bàn phím
Dòng lỗi/gợi ý được nối vào phần tử focus của control bằng \`aria-describedby\` (element reference) và \`aria-live="polite"\`;
nhãn item thành \`aria-label\` của control (khi control không tự có nhãn). \`Enter\` trong ô nhập = submit. Tooltip ⓘ focus được bằng Tab.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-form-item-margin-bottom\` | Khoảng cách giữa các dòng |
| \`--hui-form-label-width\` | Rộng cột nhãn (horizontal) |
| \`--hui-form-label-color\` / \`--hui-form-label-font-size\` | Chữ nhãn |
| \`--hui-form-required-color\` | Dấu * |
| \`--hui-form-help-font-size\` / \`--hui-form-help-color\` | Dòng gợi ý / extra |
| \`--hui-form-error-color\` / \`--hui-form-warning-color\` | Dòng lỗi / cảnh báo |
| \`--hui-form-inline-gap\` | Khoảng cách item ở layout inline |
        `,
      },
    },
  },

  argTypes: {
    layout: { control: 'inline-radio', options: ['vertical', 'horizontal', 'inline'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    'required-mark': { control: 'inline-radio', options: ['true', 'false', 'optional'] },
    disabled: { control: 'boolean' },
  },
};

/** Form đăng ký đầy đủ: input, password + xác nhận (validator async), select, radio, checkbox-group, checkbox đồng ý */
const registerForm = (args = {}) => html`
  <div style="max-width: ${args.layout === 'horizontal' ? 640 : 420}px;">
    <hui-form
      id="register-form"
      layout=${args.layout || 'vertical'}
      label-width="150"
      size=${args.size || ''}
      required-mark=${args['required-mark'] || 'true'}
      ?disabled=${args.disabled}
      scroll-to-first-error
      @hui-submit=${(e) => show(e, 'hui-submit')}
      @hui-submit-failed=${(e) => show(e, 'hui-submit-failed (lỗi)')}
    >
      <hui-form-item label="Tên đăng nhập" name="username" required minlength="3" maxlength="20" pattern="[a-zA-Z0-9_]+"
        tooltip="3–20 ký tự: chữ, số, gạch dưới">
        <hui-input placeholder="vd: hoang_dev"></hui-input>
      </hui-form-item>
      <hui-form-item label="Email" name="email" required type="email">
        <hui-input type="email" placeholder="ban@example.com"></hui-input>
      </hui-form-item>
      <hui-form-item label="Mật khẩu" name="password" required minlength="6" help="Ít nhất 6 ký tự">
        <hui-input type="password"></hui-input>
      </hui-form-item>
      <hui-form-item label="Xác nhận mật khẩu" name="confirm" required dependencies="password" .rules=${confirmRules}>
        <hui-input type="password"></hui-input>
      </hui-form-item>
      <hui-form-item label="Quốc gia" name="country" required>
        <hui-select .options=${COUNTRIES} placeholder="Chọn quốc gia"></hui-select>
      </hui-form-item>
      <hui-form-item label="Giới tính" name="gender" required>
        <hui-radio-group .options=${GENDERS}></hui-radio-group>
      </hui-form-item>
      <hui-form-item label="Sở thích" name="hobbies" max="3" extra="Chọn tối đa 3">
        <hui-checkbox-group .options=${HOBBIES}></hui-checkbox-group>
      </hui-form-item>
      <hui-form-item name="agree" .rules=${agreeRules}>
        <hui-checkbox>Tôi đồng ý với điều khoản sử dụng</hui-checkbox>
      </hui-form-item>
      <hui-form-item>
        <div style="display: flex; gap: 8px;">
          <hui-button type="submit">Đăng ký</hui-button>
          <hui-button type="reset" variant="outline">Đặt lại</hui-button>
        </div>
      </hui-form-item>
    </hui-form>
    <pre class="form-output" style="font-size: 12px; color: var(--hui-text-secondary); white-space: pre-wrap;"></pre>
  </div>
`;

export const Register = {
  args: { layout: 'vertical', size: 'md', 'required-mark': 'true', disabled: false },
  render: (args) => registerForm(args),
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#register-form');
    const item = (name) => form.querySelector(`hui-form-item[name="${name}"]`);
    await waitFor(() => expect(item('gender').control).toBeTruthy());
    form.scrollToFirstError = false; // tránh cuộn trang trong test

    // 1. Form trống → lỗi ở mọi field bắt buộc
    let result = await form.validate();
    await expect(result.valid).toBe(false);
    await expect(result.errors.map((e) => e.name)).toEqual(['username', 'email', 'password', 'confirm', 'country', 'gender', 'agree']);
    await expect(item('username').errorMessage).toBe('Vui lòng nhập trường này');
    await expect(item('country').errorMessage).toBe('Vui lòng chọn một giá trị');
    await expect(item('agree').errorMessage).toBe('Bạn cần đồng ý điều khoản để tiếp tục');
    const username = item('username').control;
    await expect(username.checkValidity()).toBe(false);
    await expect(username.status).toBe('error');
    await expect(username.matches(':state(user-invalid)')).toBe(true);
    await expect(item('username').matches(':state(error)')).toBe(true);
    const feedback = item('username').querySelector('[slot="feedback"]');
    await expect(feedback.textContent).toBe('Vui lòng nhập trường này');
    const anchor = username.validationAnchor();
    if ('ariaDescribedByElements' in anchor) {
      await waitFor(() => expect(anchor.ariaDescribedByElements?.[0]).toBe(feedback));
    }

    // 2. Gán giá trị: email sai định dạng, xác nhận không khớp, chọn quá 3 sở thích
    form.setValues({
      username: 'hoang_dev', email: 'sai-email', password: 'secret1', confirm: 'khac',
      country: 'VN', gender: 'female', hobbies: HOBBIES, agree: true,
    });
    result = await form.validate();
    await expect(result.errors.map((e) => `${e.name}: ${e.message}`)).toEqual([
      'email: Email không hợp lệ',
      'confirm: Mật khẩu xác nhận không khớp',
      'hobbies: Chọn tối đa 3 mục',
    ]);
    await expect(item('username').errorMessage).toBe('');
    await expect(username.status).toBe('');

    // 3. Người dùng gõ lại xác nhận → hui-values-change + tự validate lại (đã chạm)
    const changes = [];
    form.addEventListener('hui-values-change', (e) => changes.push(e.detail.changed));
    typeInto(item('confirm').control, 'secret1');
    await expect(changes).toEqual([{ confirm: 'secret1' }]);
    await waitFor(() => expect(item('confirm').errorMessage).toBe(''));
    // Đổi mật khẩu → field phụ thuộc (confirm) validate lại
    typeInto(item('password').control, 'secret2');
    await waitFor(() => expect(item('confirm').errorMessage).toBe('Mật khẩu xác nhận không khớp'));
    typeInto(item('password').control, 'secret1');
    await waitFor(() => expect(item('confirm').errorMessage).toBe(''));

    // 4. Submit bằng hui-button type="submit" → hui-submit với values
    form.setValues({ email: 'hoang@example.com', hobbies: ['Đọc sách'] });
    let submitted = null;
    let failed = 0;
    form.addEventListener('hui-submit', (e) => { submitted = e.detail.values; });
    form.addEventListener('hui-submit-failed', () => { failed += 1; });
    clickHui(form.querySelector('hui-button[type="submit"]'));
    await waitFor(() => expect(submitted).toBeTruthy());
    await expect(failed).toBe(0);
    await expect(submitted).toEqual({
      username: 'hoang_dev', email: 'hoang@example.com', password: 'secret1', confirm: 'secret1',
      country: 'VN', gender: 'female', hobbies: ['Đọc sách'], agree: true,
    });

    // 5. validateFields chỉ 1 field; reset bằng nút → về rỗng, hết lỗi
    form.setValues({ email: 'x' });
    result = await form.validateFields(['email']);
    await expect(result.errors.map((e) => e.name)).toEqual(['email']);
    clickHui(form.querySelector('hui-button[type="reset"]'));
    await expect(form.getValues().username).toBe('');
    await expect(form.getValues().agree).toBe(false);
    await expect(item('email').errorMessage).toBe('');
    await expect(item('email').control.checkValidity()).toBe(true);
  },
};

/** layout="horizontal": nhãn bên trái, rộng label-width, canh theo label-align */
export const Horizontal = {
  render: () => html`
    <hui-form layout="horizontal" label-width="140" style="max-width: 600px;">
      <hui-form-item label="Họ tên" name="name" required>
        <hui-input placeholder="Nguyễn Văn A"></hui-input>
      </hui-form-item>
      <hui-form-item label="Website" name="site" type="url" help="Bắt đầu bằng https://">
        <hui-input></hui-input>
      </hui-form-item>
      <hui-form-item label="Tuổi" name="age" type="number" min="18" max="99" tooltip="Từ 18 đến 99">
        <hui-input type="number"></hui-input>
      </hui-form-item>
      <hui-form-item label="Gói" name="plan">
        <hui-radio-group option-type="button" button-style="solid" value="pro" .options=${['free', 'pro', 'team']}></hui-radio-group>
      </hui-form-item>
      <hui-form-item>
        <hui-button type="submit">Lưu</hui-button>
      </hui-form-item>
    </hui-form>
    <hui-form layout="horizontal" label-align="left" label-width="8rem" required-mark="optional" style="max-width: 600px; margin-top: 24px;">
      <hui-form-item label="Nhãn trái" name="a" required><hui-input></hui-input></hui-form-item>
      <hui-form-item label="Ghi chú" name="b"><hui-input></hui-input></hui-form-item>
    </hui-form>
  `,
};

/** layout="inline": các item nằm trên 1 dòng (thanh lọc / tìm kiếm) */
export const Inline = {
  render: () => html`
    <hui-form id="inline-form" layout="inline" @hui-submit=${(e) => show(e, 'Tìm')}>
      <hui-form-item label="Từ khóa" name="q" required>
        <hui-input placeholder="Tìm..."></hui-input>
      </hui-form-item>
      <hui-form-item label="Trạng thái" name="status">
        <hui-select style="width: 160px;" value="all" .options=${[{ label: 'Tất cả', value: 'all' }, { label: 'Đang mở', value: 'open' }]}></hui-select>
      </hui-form-item>
      <hui-form-item>
        <hui-button type="submit">Tìm</hui-button>
      </hui-form-item>
    </hui-form>
    <pre class="form-output" style="font-size: 12px;"></pre>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#inline-form');
    const q = form.querySelector('hui-input');
    await waitFor(() => expect(form.querySelector('hui-form-item').getAttribute('data-layout')).toBe('inline'));
    let failed = null;
    let submitted = null;
    form.addEventListener('hui-submit-failed', (e) => { failed = e.detail.errors; });
    form.addEventListener('hui-submit', (e) => { submitted = e.detail.values; });
    // Enter trong ô nhập = submit
    const inner = q.shadowRoot.querySelector('input');
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true }));
    await waitFor(() => expect(failed?.map((e) => e.name)).toEqual(['q']));
    typeInto(q, 'hui');
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true }));
    await waitFor(() => expect(submitted).toEqual({ q: 'hui', status: 'all' }));
  },
};

/** size + disabled cho cả form; required-mark="false" ẩn dấu * */
export const SizeAndDisabled = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">
      <hui-form size="sm" required-mark="false">
        <hui-form-item label="size=sm, required-mark=false" name="a" required><hui-input></hui-input></hui-form-item>
        <hui-form-item label="Select" name="b"><hui-select .options=${COUNTRIES}></hui-select></hui-form-item>
        <hui-form-item name="c"><hui-radio-group .options=${GENDERS} value="male"></hui-radio-group></hui-form-item>
      </hui-form>
      <hui-form size="lg">
        <hui-form-item label="size=lg" name="a" required><hui-input></hui-input></hui-form-item>
        <hui-form-item label="Select" name="b"><hui-select .options=${COUNTRIES}></hui-select></hui-form-item>
        <hui-form-item name="c"><hui-radio-group .options=${GENDERS} value="male"></hui-radio-group></hui-form-item>
      </hui-form>
      <hui-form id="disabled-form" disabled>
        <hui-form-item label="disabled" name="a"><hui-input value="Không sửa được"></hui-input></hui-form-item>
        <hui-form-item label="Select" name="b"><hui-select .options=${COUNTRIES} value="JP"></hui-select></hui-form-item>
        <hui-form-item name="c"><hui-checkbox disabled>Tự disabled (giữ nguyên khi bật lại form)</hui-checkbox></hui-form-item>
        <hui-form-item><hui-button>Nút</hui-button></hui-form-item>
      </hui-form>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#disabled-form');
    const input = form.querySelector('hui-input');
    const own = form.querySelector('hui-checkbox');
    await waitFor(() => expect(input.disabled).toBe(true));
    await expect(form.querySelector('hui-button').disabled).toBe(true);
    form.disabled = false;
    await waitFor(() => expect(input.disabled).toBe(false));
    await expect(own.disabled).toBe(true); // control tự disabled không bị bật lên
    form.disabled = true;
  },
};

/** Override từ ngoài: biến CSS trên hui-form (áp cho mọi item) + ::part() + :state() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-form.compact {
        --hui-form-item-margin-bottom: 12px;
        --hui-form-label-color: var(--hui-primary);
        --hui-form-label-font-size: var(--hui-font-xs);
        --hui-form-required-color: var(--hui-warning);
        --hui-form-error-color: var(--hui-warning);
      }
      hui-form.compact hui-form-item::part(label-text) { text-transform: uppercase; letter-spacing: 0.04em; }
      hui-form.compact hui-form-item:state(error)::part(base) {
        padding: 8px;
        border-radius: var(--hui-radius);
        background: var(--hui-warning-1);
      }
    </style>
    <hui-form class="compact" id="custom-form" style="max-width: 360px;">
      <hui-form-item label="Mã giảm giá" name="code" required pattern="[A-Z]{3}[0-9]{2}" message="Định dạng: 3 chữ hoa + 2 số (vd ABC12)">
        <hui-input></hui-input>
      </hui-form-item>
      <hui-form-item label="Ghi chú" name="note" extra="Slot extra / attribute extra">
        <hui-input></hui-input>
      </hui-form-item>
      <hui-button type="submit">Áp dụng</hui-button>
    </hui-form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#custom-form');
    form.setValues({ code: 'abc' });
    const { errors } = await form.validate();
    await expect(errors[0].message).toBe('Định dạng: 3 chữ hoa + 2 số (vd ABC12)');
    form.setValues({ code: 'ABC12' });
    await expect((await form.validate()).valid).toBe(true);
  },
};
