import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApp, h, reactive, nextTick, withDirectives, vModelText } from 'vue';
import HuiVue, {
  isHuiElement, huiCompilerOptions, withHuiElements, resolveComponentFolder, loadHui,
  vHuiModel, modelAccessor, modelProp, castModelValue, HUI_READY,
} from '../src/integrations/vue.js';

/** Control tối giản: property value + phát input/change giống HuiFormElement */
class XModel extends HTMLElement {
  constructor() {
    super();
    this.value = '';
    this.checked = false;
  }
  type(v) {
    this.value = v;
    this.dispatchEvent(new CustomEvent('input', { bubbles: true, composed: true }));
  }
  commit(v) {
    this.value = v;
    this.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true }));
  }
}
customElements.define('x-model', XModel);

const binding = (value, arg, modifiers = {}) => ({ value, arg, modifiers });

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Vue — cấu hình compiler', () => {
  it('isHuiElement / huiCompilerOptions / withHuiElements', () => {
    expect(isHuiElement('hui-button')).toBe(true);
    expect(isHuiElement('my-button')).toBe(false);
    expect(huiCompilerOptions.isCustomElement('hui-x')).toBe(true);
    const merged = withHuiElements((tag) => tag === 'ion-button');
    expect(merged('ion-button')).toBe(true);
    expect(merged('hui-input')).toBe(true);
    expect(merged('div')).toBe(false);
    expect(withHuiElements()('x-y')).toBe(false);
  });

  it('resolveComponentFolder: thẻ con → thư mục chứa', () => {
    expect(resolveComponentFolder('hui-button')).toBe('hui-button');
    expect(resolveComponentFolder('button')).toBe('hui-button');
    expect(resolveComponentFolder('hui-radio-group')).toBe('hui-radio');
    expect(resolveComponentFolder('hui-avatar-group')).toBe('hui-avatar');
    expect(resolveComponentFolder('hui-input-number')).toBe('hui-input-number');
    expect(resolveComponentFolder('hui-demo')).toBe(null);
    expect(resolveComponentFolder('hui-khong-co')).toBe(null);
  });

  it('loadHui tải đúng component theo tên + loader tùy biến', async () => {
    const loader = vi.fn(() => Promise.resolve());
    await loadHui(['hui-tag', loader]);
    expect(customElements.get('hui-tag')).toBeTruthy();
    expect(loader).toHaveBeenCalledOnce();
    await expect(loadHui(false)).resolves.toBeUndefined();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await loadHui(['hui-khong-co']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('Vue — plugin install (app giả)', () => {
  const fakeApp = (config) => ({
    config,
    directive: vi.fn(),
    provide: vi.fn(),
  });

  it('đăng ký directive, gắn isCustomElement, cung cấp $huiReady', async () => {
    const prev = (tag) => tag === 'ion-x';
    const app = fakeApp({ compilerOptions: { isCustomElement: prev }, globalProperties: {} });
    await HuiVue.install(app, { components: false });
    expect(app.directive).toHaveBeenCalledWith('hui-model', vHuiModel);
    expect(app.config.compilerOptions.isCustomElement('hui-button')).toBe(true);
    expect(app.config.compilerOptions.isCustomElement('ion-x')).toBe(true);
    expect(app.config.compilerOptions.isCustomElement('div')).toBe(false);
    expect(app.config.globalProperties.$huiReady).toBeInstanceOf(Promise);
    expect(app.provide).toHaveBeenCalledWith(HUI_READY, app.config.globalProperties.$huiReady);
  });

  it('bản runtime-only (compilerOptions là getter cảnh báo) → không đụng tới; directive: false → không đăng ký', async () => {
    const config = { globalProperties: {} };
    const get = vi.fn(() => ({}));
    Object.defineProperty(config, 'compilerOptions', { get, set: vi.fn() });
    const app = fakeApp(config);
    await HuiVue.install(app, { components: false, directive: false });
    expect(get).not.toHaveBeenCalled();
    expect(app.directive).not.toHaveBeenCalled();
  });

  it('tên directive tùy chọn', async () => {
    const app = fakeApp({ globalProperties: {} });
    await HuiVue.install(app, { components: false, directive: 'model-x' });
    expect(app.directive).toHaveBeenCalledWith('model-x', vHuiModel);
  });
});

describe('Vue — v-hui-model (logic directive)', () => {
  it('modelAccessor: arg + object, tuple, ref, không hợp lệ', () => {
    const form = { email: 'a' };
    const a = modelAccessor(binding(form, 'email'));
    a.set('b');
    expect(form.email).toBe('b');
    const t = modelAccessor(binding([form, 'email']));
    expect(t.get()).toBe('b');
    const r = { __v_isRef: true, value: 1 };
    modelAccessor(binding(r)).set(2);
    expect(r.value).toBe(2);
    expect(modelAccessor(binding('plain'))).toBe(null);
  });

  it('modelProp + castModelValue', () => {
    const sw = document.createElement('hui-switch');
    const inp = document.createElement('hui-input');
    expect(modelProp(sw)).toBe('checked');
    expect(modelProp(inp)).toBe('value');
    expect(modelProp(inp, { checked: true })).toBe('checked');
    expect(modelProp(sw, { value: true })).toBe('value');
    expect(castModelValue(' 12 ', { trim: true })).toBe('12');
    expect(castModelValue('12', { number: true })).toBe(12);
    expect(castModelValue('abc', { number: true })).toBe('abc');
    expect(castModelValue(['a'], { trim: true, number: true })).toEqual(['a']);
  });

  it('hai chiều: model → el khi mounted/beforeUpdate, el → model khi input/change', () => {
    const el = document.createElement('x-model');
    document.body.append(el);
    const form = { name: 'An' };
    vHuiModel.created(el, binding(form, 'name'));
    vHuiModel.mounted(el, binding(form, 'name'));
    expect(el.value).toBe('An');

    el.type('Bình');
    expect(form.name).toBe('Bình');
    el.commit('Chi');
    expect(form.name).toBe('Chi');

    form.name = 'Dũng';
    vHuiModel.beforeUpdate(el, binding(form, 'name'));
    expect(el.value).toBe('Dũng');

    // Sự kiện nổi bọt từ thẻ con không làm đổi model
    const child = document.createElement('x-model');
    el.append(child);
    child.type('con');
    expect(form.name).toBe('Dũng');

    vHuiModel.unmounted(el);
    el.type('sau unmount');
    expect(form.name).toBe('Dũng');
  });

  it('.lazy chỉ nghe change; .number ép số; .checked đồng bộ checked', () => {
    const el = document.createElement('x-model');
    const form = { qty: 1, on: false };
    vHuiModel.created(el, binding(form, 'qty', { lazy: true, number: true }));
    vHuiModel.mounted(el, binding(form, 'qty', { lazy: true, number: true }));
    expect(el.value).toBe(1);
    el.type('5');
    expect(form.qty).toBe(1);
    el.commit('7');
    expect(form.qty).toBe(7);

    const box = document.createElement('x-model');
    vHuiModel.created(box, binding(form, 'on', { checked: true }));
    vHuiModel.mounted(box, binding(form, 'on', { checked: true }));
    expect(box.checked).toBe(false);
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    expect(form.on).toBe(true);
  });
});

describe('Vue thật (runtime) + component H-UI', () => {
  it('v-hui-model với hui-input và hui-switch', async () => {
    await loadHui(['hui-input', 'hui-switch']);
    const form = reactive({ email: 'a@b.c', on: true });
    const root = document.createElement('div');
    document.body.append(root);
    const app = createApp({
      render: () => h('div', [
        withDirectives(h('hui-input'), [[vHuiModel, form, 'email']]),
        withDirectives(h('hui-switch'), [[vHuiModel, form, 'on']]),
      ]),
    });
    app.mount(root);
    const input = root.querySelector('hui-input');
    const sw = root.querySelector('hui-switch');
    expect(input.value).toBe('a@b.c');
    expect(sw.checked).toBe(true);

    const inner = input.shadowRoot.querySelector('input');
    inner.value = 'x@y.z';
    inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    expect(form.email).toBe('x@y.z');

    sw.shadowRoot.querySelector('button').click();
    expect(form.on).toBe(false);

    form.email = 'moi@h.ui';
    await nextTick();
    expect(input.value).toBe('moi@h.ui');
    app.unmount();
  });

  it('v-model gốc của Vue (vModelText) chạy được với hui-input khi khai báo isCustomElement', async () => {
    await loadHui(['hui-input']);
    const state = reactive({ q: 'đầu' });
    const root = document.createElement('div');
    document.body.append(root);
    // Đây là mã Vue sinh ra cho <hui-input v-model="q"> khi isCustomElement khớp hui-*
    const app = createApp({
      render: () => withDirectives(
        h('hui-input', { 'onUpdate:modelValue': (v) => { state.q = v; } }),
        [[vModelText, state.q]],
      ),
    });
    app.mount(root);
    const input = root.querySelector('hui-input');
    expect(input.value).toBe('đầu');
    const inner = input.shadowRoot.querySelector('input');
    inner.value = 'sau';
    inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    expect(state.q).toBe('sau');
    app.unmount();
  });
});
