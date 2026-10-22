/**
 * @itmrhoang/h-ui/vue — plugin Vue 3 cho H-UI.
 *   app.use(HuiVue)                                → tải toàn bộ component + đăng ký directive v-hui-model
 *   app.use(HuiVue, { components: ['hui-button'] }) → chỉ tải các component liệt kê
 * Không import gì từ 'vue' lúc chạy (Vue là peer tùy chọn) — chỉ làm việc với đối tượng app được truyền vào.
 */

/** Thẻ của H-UI (dùng cho compilerOptions.isCustomElement) */
export const isHuiElement = (tag) => typeof tag === 'string' && tag.startsWith('hui-');

/**
 * Cấu hình compiler cho @vitejs/plugin-vue / Nuxt:
 *   vue({ template: { compilerOptions: huiCompilerOptions } })
 */
export const huiCompilerOptions = Object.freeze({ isCustomElement: isHuiElement });

/** Gộp với isCustomElement sẵn có của dự án (nếu có) */
export function withHuiElements(prev) {
  return (tag) => isHuiElement(tag) || Boolean(prev?.(tag));
}

// =====================================================
// TẢI COMPONENT
// =====================================================

// Mỗi thư mục component là 1 entry riêng → import động trỏ thẳng tới file lẻ (hui-button.esm.js)
const loaders = import.meta.glob(['../components/*/index.js', '!../components/hui-demo/index.js']);
const folderLoaders = new Map(
  Object.entries(loaders).map(([path, load]) => [path.split('/').at(-2), load]),
);

/** 'hui-radio-group' → thư mục 'hui-radio' (cắt dần phần đuôi tới khi gặp thư mục có thật) */
export function resolveComponentFolder(tag) {
  let name = String(tag).trim().toLowerCase();
  if (!name.startsWith('hui-')) name = `hui-${name}`;
  while (name.includes('-')) {
    if (folderLoaders.has(name)) return name;
    name = name.slice(0, name.lastIndexOf('-'));
  }
  return null;
}

/**
 * Tải (đăng ký) component.
 * @param {'all' | false | Array<string | (() => Promise<unknown>)>} components
 *   'all' = toàn bộ thư viện; false = không tải gì (bạn tự import); mảng = tên thẻ / tên đường dẫn lẻ
 *   ('hui-button', 'hui-radio-group'…) hoặc hàm loader (() => import('@itmrhoang/h-ui/hui-button')).
 * @returns {Promise<void>}
 */
export function loadHui(components = 'all') {
  if (components === false || components == null) return Promise.resolve();
  if (components === 'all') return import('../index.js').then(() => undefined);
  const list = Array.isArray(components) ? components : [components];
  const jobs = list.map((item) => {
    if (typeof item === 'function') return item();
    const folder = resolveComponentFolder(item);
    if (!folder) {
      console.warn(`[h-ui] Không tìm thấy component "${item}"`);
      return null;
    }
    return folderLoaders.get(folder)();
  });
  return Promise.all(jobs).then(() => undefined);
}

// =====================================================
// DIRECTIVE v-hui-model
// =====================================================

/** Component dùng `checked` (boolean) thay vì `value` */
const CHECKED_TAGS = new Set(['hui-checkbox', 'hui-switch', 'hui-radio']);
const state = new WeakMap();

const isRef = (v) => Boolean(v && typeof v === 'object' && v.__v_isRef === true);

/**
 * Chuẩn hóa binding thành { get, set }:
 *   v-hui-model:email="form"      → form.email (form là reactive)
 *   v-hui-model="[form, 'email']" → form.email
 *   v-hui-model="someRef"         → someRef.value (chỉ khi ref KHÔNG bị template tự unwrap)
 */
export function modelAccessor(binding) {
  const { value, arg } = binding;
  if (Array.isArray(value) && value.length === 2 && value[0] && typeof value[0] === 'object') {
    const [obj, key] = value;
    return { get: () => obj[key], set: (v) => { obj[key] = v; } };
  }
  if (arg && value && typeof value === 'object') {
    return { get: () => value[arg], set: (v) => { value[arg] = v; } };
  }
  if (isRef(value)) return { get: () => value.value, set: (v) => { value.value = v; } };
  return null;
}

/** Property của element được đồng bộ: modifier .checked / .value hoặc tự nhận theo tên thẻ */
export function modelProp(el, modifiers = {}) {
  if (modifiers.checked) return 'checked';
  if (modifiers.value) return 'value';
  return CHECKED_TAGS.has(el.localName) ? 'checked' : 'value';
}

/** Ép kiểu theo modifier .trim / .number (giống v-model của Vue) */
export function castModelValue(v, modifiers = {}) {
  let out = v;
  if (modifiers.trim && typeof out === 'string') out = out.trim();
  if (modifiers.number && typeof out === 'string' && out.trim() !== '') {
    const n = Number(out);
    if (!Number.isNaN(n)) out = n;
  }
  return out;
}

function writeToElement(el, s) {
  const acc = modelAccessor(s.binding);
  if (!acc) return;
  const next = acc.get();
  const current = el[s.prop];
  // So sánh sau khi ép kiểu: '5' trong ô nhập và 5 trong model là một
  if (Object.is(castModelValue(current, s.binding.modifiers), next)) return;
  el[s.prop] = s.prop === 'checked' ? Boolean(next) : (next ?? '');
}

/**
 * Directive hai chiều cho component form của H-UI.
 * Model → element: gán property `value` (hoặc `checked`).
 * Element → model: nghe `input` + `change` (modifier .lazy: chỉ `change`).
 * Sự kiện nổi bọt từ thẻ con trong light DOM (e.target khác el) bị bỏ qua.
 */
export const vHuiModel = {
  created(el, binding) {
    const s = { binding, prop: modelProp(el, binding.modifiers) };
    s.handler = (e) => {
      if (e.target !== el) return;
      if (e.type === 'input' && s.binding.modifiers?.lazy) return;
      const acc = modelAccessor(s.binding);
      if (!acc) return;
      acc.set(castModelValue(el[s.prop], s.binding.modifiers));
    };
    el.addEventListener('input', s.handler);
    el.addEventListener('change', s.handler);
    state.set(el, s);
  },
  mounted(el, binding) {
    const s = state.get(el);
    if (!s) return;
    s.binding = binding;
    writeToElement(el, s);
    // Template chỉ đọc `form` (không đọc form.email) → đổi form.email không làm component render lại.
    // Theo dõi riêng bằng $watch của instance (không cần import 'vue').
    const inst = binding.instance;
    if (inst && typeof inst.$watch === 'function') {
      s.unwatch = inst.$watch(() => modelAccessor(s.binding)?.get(), () => writeToElement(el, s));
    }
  },
  beforeUpdate(el, binding) {
    const s = state.get(el);
    if (!s) return;
    s.binding = binding;
    s.prop = modelProp(el, binding.modifiers);
    writeToElement(el, s);
  },
  unmounted(el) {
    const s = state.get(el);
    if (!s) return;
    el.removeEventListener('input', s.handler);
    el.removeEventListener('change', s.handler);
    s.unwatch?.();
    state.delete(el);
  },
};

// =====================================================
// PLUGIN
// =====================================================

/** inject(HUI_READY) → Promise khi component đã tải xong */
export const HUI_READY = 'hui:ready';

/**
 * Gắn isCustomElement cho template biên dịch lúc chạy (bản Vue "full build").
 * Bản runtime-only (dev) bọc compilerOptions bằng getter cảnh báo → bỏ qua để không in cảnh báo;
 * khi đó phải cấu hình ở bước build (huiCompilerOptions).
 */
function patchRuntimeCompiler(app) {
  const config = app?.config;
  if (!config) return false;
  const desc = Object.getOwnPropertyDescriptor(config, 'compilerOptions');
  if (!desc || desc.get || !desc.value || typeof desc.value !== 'object') return false;
  desc.value.isCustomElement = withHuiElements(desc.value.isCustomElement);
  return true;
}

/**
 * @param {import('vue').App} app
 * @param {{ components?: 'all' | false | Array<string | (() => Promise<unknown>)>, directive?: string | false }} [options]
 */
function install(app, options = {}) {
  const { components = 'all', directive = 'hui-model' } = options;
  patchRuntimeCompiler(app);
  if (directive) app.directive(directive, vHuiModel);
  const ready = loadHui(components);
  if (app.config?.globalProperties) app.config.globalProperties.$huiReady = ready;
  if (typeof app.provide === 'function') app.provide(HUI_READY, ready);
  return ready;
}

export const HuiVue = { install };
export default HuiVue;
