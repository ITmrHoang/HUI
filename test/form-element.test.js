import { describe, it, expect, afterEach } from 'vitest';
import { HuiFormElement } from '../src/core/hui-form-element.js';
import { defineElement } from '../src/core/hui-element.js';
import { setLocale } from '../src/core/locale.js';

/** Control tối giản bọc 1 <input> native */
class XField extends HuiFormElement {
  render() {
    this.input = document.createElement('input');
    this.relayNativeEvents(this.input);
    return this.input;
  }
  validationAnchor() {
    return this.input;
  }
  updated(changed) {
    super.updated(changed);
    if (changed.has('value')) this.input.value = this.value ?? '';
  }
}
defineElement('x-field', XField);

afterEach(() => {
  document.body.innerHTML = '';
  setLocale('vi');
});

describe('HuiFormElement', () => {
  it('gửi giá trị trong FormData và reset về giá trị ban đầu', () => {
    document.body.innerHTML = '<form><x-field name="email" value="a@b.c"></x-field></form>';
    const form = document.querySelector('form');
    const field = document.querySelector('x-field');
    expect(new FormData(form).get('email')).toBe('a@b.c');

    field.value = 'changed';
    expect(new FormData(form).get('email')).toBe('changed');
    form.reset();
    expect(field.value).toBe('a@b.c');
  });

  it('required + minlength + pattern, thông điệp theo locale', () => {
    document.body.innerHTML = '<form><x-field name="n" required minlength="3"></x-field></form>';
    const field = document.querySelector('x-field');
    expect(field.checkValidity()).toBe(false);
    expect(field.validity.valueMissing).toBe(true);
    expect(field.validationMessage).toBe('Vui lòng nhập trường này');

    field.value = 'ab';
    expect(field.validity.tooShort).toBe(true);
    field.value = 'abc';
    expect(field.checkValidity()).toBe(true);

    field.pattern = '[0-9]+';
    expect(field.validity.patternMismatch).toBe(true);
  });

  it('đổi locale → thông điệp lỗi đổi theo', async () => {
    document.body.innerHTML = '<x-field required></x-field>';
    const field = document.querySelector('x-field');
    setLocale('en');
    await field.updateComplete;
    expect(field.validationMessage).toBe('Please fill out this field');
  });

  it(':state(user-invalid) chỉ bật sau khi người dùng tương tác', () => {
    document.body.innerHTML = '<x-field required></x-field>';
    const field = document.querySelector('x-field');
    expect(field.matches(':state(invalid)')).toBe(true);
    expect(field.matches(':state(user-invalid)')).toBe(false);
    field.input.dispatchEvent(new Event('change'));
    expect(field.matches(':state(user-invalid)')).toBe(true);
  });

  it('chuyển sự kiện input (đúng 1 lần) và change ra ngoài host', () => {
    document.body.innerHTML = '<x-field></x-field>';
    const field = document.querySelector('x-field');
    const got = [];
    field.addEventListener('input', (e) => got.push(['input', e.detail?.value]));
    field.addEventListener('change', (e) => got.push(['change', e.detail?.value]));
    field.input.value = 'hi';
    field.input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    field.input.dispatchEvent(new Event('change'));
    expect(got).toEqual([['input', 'hi'], ['change', 'hi']]);
  });

  it('<fieldset disabled> vô hiệu hóa control và bỏ qua validate', async () => {
    document.body.innerHTML = '<form><fieldset disabled><x-field required></x-field></fieldset></form>';
    const field = document.querySelector('x-field');
    await field.updateComplete;
    expect(field.isDisabled).toBe(true);
  });
});
