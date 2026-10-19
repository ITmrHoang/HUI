/**
 * HuiElement — Lớp nền cho mọi component HUI (zero-dependency)
 * - static properties : tự sinh observedAttributes + getter/setter, đồng bộ attribute ↔ property
 * - render()          : dựng DOM một lần; updated(changed): cập nhật từng phần (gom theo microtask)
 * - static styles     : biên dịch 1 lần thành CSSStyleSheet, dùng chung mọi instance
 * - static formAssociated = true : tham gia <form> qua ElementInternals
 * Giải thích chi tiết + ví dụ: src/components/hui-demo/
 */

import { createStyle, ensureTokens } from '../utils/dom.js';
import { emitEvent } from '../utils/events.js';

// =====================================================
// STYLE: biên dịch CSS string → CSSStyleSheet và cache lại
// =====================================================

/** Trình duyệt có hỗ trợ adoptedStyleSheets (Constructable Stylesheets) hay không */
const supportsAdoptedSheets =
  typeof ShadowRoot !== 'undefined' &&
  'adoptedStyleSheets' in ShadowRoot.prototype &&
  typeof CSSStyleSheet !== 'undefined' &&
  'replaceSync' in CSSStyleSheet.prototype;

/** Cache theo nội dung CSS: cùng 1 chuỗi CSS → cùng 1 CSSStyleSheet cho mọi instance */
const sheetCache = new Map();

function getSheet(cssText) {
  let sheet = sheetCache.get(cssText);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    sheetCache.set(cssText, sheet);
  }
  return sheet;
}

// =====================================================
// CHUYỂN ĐỔI ATTRIBUTE (luôn là chuỗi) ↔ PROPERTY (đúng kiểu)
// =====================================================

/** 'iconPosition' → 'icon-position' */
const toKebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Đọc giá trị attribute (chuỗi hoặc null) → giá trị property đúng kiểu */
function fromAttribute(value, type) {
  switch (type) {
    case Boolean:
      // Boolean attribute chuẩn HTML: có mặt là true (kể cả disabled=""), vắng mặt là false
      return value !== null;
    case Number:
      return value === null || value === '' ? null : Number(value);
    case Object:
    case Array:
      if (value === null) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    default:
      return value;
  }
}

/** Giá trị property → chuỗi attribute (null = xóa attribute) */
function toAttribute(value, type) {
  if (type === Boolean) return value ? '' : null;
  if (value === null || value === undefined) return null;
  if (type === Object || type === Array) return JSON.stringify(value);
  return String(value);
}

// =====================================================
// BASE CLASS
// =====================================================

export class HuiElement extends HTMLElement {
  /**
   * Khai báo property của component. Mỗi mục:
   * - type     : String | Number | Boolean | Object | Array (mặc định String)
   * - default  : giá trị mặc định khi attribute vắng mặt
   * - attribute: tên attribute (mặc định = tên property dạng kebab-case); false = không gắn attribute
   * - reflect  : property đổi thì ghi ngược ra attribute (mặc định true, trừ Object/Array)
   * @type {Record<string, {type?: Function, default?: any, attribute?: string|false, reflect?: boolean}>}
   */
  static properties = {};

  /** CSS của component: chuỗi hoặc mảng chuỗi (import file .css bằng '?raw') */
  static styles = '';

  /** Đặt true ở lớp con để tham gia <form> qua ElementInternals */
  static formAssociated = false;

  /** true = component dùng chuỗi locale (t()) → tự updated(changed.has('locale')) khi đổi ngôn ngữ */
  static localized = false;

  /**
   * Chuẩn hóa `static properties` của lớp hiện tại (kể cả kế thừa từ lớp cha) — tính 1 lần rồi cache.
   * @returns {Map<string, {type: Function, default: any, attribute: string|false, reflect: boolean}>}
   */
  static _getPropertyMap() {
    if (Object.prototype.hasOwnProperty.call(this, '_propertyMap')) return this._propertyMap;

    const parent = Object.getPrototypeOf(this);
    const map = new Map(parent._getPropertyMap ? parent._getPropertyMap() : []);

    for (const [name, opts] of Object.entries(this.properties || {})) {
      const type = opts.type || String;
      map.set(name, {
        type,
        default: opts.default ?? (type === Boolean ? false : null),
        attribute: opts.attribute === false ? false : opts.attribute || toKebab(name),
        reflect: opts.reflect ?? !(type === Object || type === Array),
      });
    }
    this._propertyMap = map;
    return map;
  }

  /**
   * Trình duyệt đọc getter này khi customElements.define() chạy → biết attribute nào cần theo dõi.
   * Đồng thời là lúc ta sinh getter/setter cho từng property lên prototype.
   */
  static get observedAttributes() {
    const map = this._getPropertyMap();
    this._attributeToProp = new Map();

    for (const [name, opts] of map) {
      if (opts.attribute) this._attributeToProp.set(opts.attribute, name);

      // Lớp con tự viết getter/setter riêng thì không ghi đè
      if (!Object.prototype.hasOwnProperty.call(this.prototype, name)) {
        Object.defineProperty(this.prototype, name, {
          configurable: true,
          enumerable: true,
          get() {
            return this._getProp(name);
          },
          set(value) {
            this._setProp(name, value);
          },
        });
      }
    }
    return [...this._attributeToProp.keys()];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    /** Giá trị thực của các property */
    this._props = {};
    /** Các property đã đổi chờ cập nhật: Map<tên, giá trị cũ> */
    this._changed = new Map();
    this._updatePending = false;
    this._hasRendered = false;
    /** Cờ chống vòng lặp: property → setAttribute → attributeChangedCallback → property ... */
    this._reflecting = false;
    /** Bị vô hiệu hóa bởi <fieldset disabled> cha (chỉ với form-associated) */
    this._formDisabled = false;
    /** Gỡ toàn bộ listener toàn cục (document/window) khi element bị tháo khỏi trang */
    this._abort = null;

    // Khởi tạo giá trị mặc định
    for (const [name, opts] of this.constructor._getPropertyMap()) {
      this._props[name] = opts.default;
    }

    // ElementInternals: custom state (:state()) cho mọi component; tính năng form chỉ bật khi formAssociated
    this._internals = typeof this.attachInternals === 'function' ? this.attachInternals() : null;
  }

  // =====================================================
  // PROPERTY ↔ ATTRIBUTE
  // =====================================================

  _getProp(name) {
    return this._props[name];
  }

  _setProp(name, value) {
    const opts = this.constructor._getPropertyMap().get(name);
    const oldValue = this._props[name];
    // null/undefined → quay về mặc định (vd: xóa variant → 'primary')
    const next = value === null || value === undefined ? opts.default : value;
    if (Object.is(oldValue, next)) return;

    this._props[name] = next;

    // Ghi ngược ra attribute để CSS :host([...]) và DevTools thấy đúng trạng thái
    if (opts.reflect && opts.attribute) {
      const attrValue = toAttribute(next, opts.type);
      this._reflecting = true;
      if (attrValue === null) this.removeAttribute(opts.attribute);
      else if (this.getAttribute(opts.attribute) !== attrValue) this.setAttribute(opts.attribute, attrValue);
      this._reflecting = false;
    }

    this.requestUpdate(name, oldValue);
  }

  attributeChangedCallback(attrName, oldVal, newVal) {
    if (this._reflecting || oldVal === newVal) return;
    const name = this.constructor._attributeToProp.get(attrName);
    if (!name) return;

    const opts = this.constructor._getPropertyMap().get(name);
    const oldValue = this._props[name];
    const parsed = fromAttribute(newVal, opts.type);
    const next = parsed === null || parsed === undefined ? opts.default : parsed;
    if (Object.is(oldValue, next)) return;

    this._props[name] = next;
    this.requestUpdate(name, oldValue);
  }

  /**
   * Property được gán TRƯỚC khi component được define (vd: framework gán `el.variant = 'x'`
   * trước khi file JS load xong) sẽ nằm trên chính instance, che mất setter của prototype.
   * Gỡ ra rồi gán lại để đi qua setter.
   */
  _upgradeProperties() {
    for (const name of this.constructor._getPropertyMap().keys()) {
      if (Object.prototype.hasOwnProperty.call(this, name)) {
        const value = this[name];
        delete this[name];
        this[name] = value;
      }
    }
  }

  // =====================================================
  // CHU KỲ CẬP NHẬT
  // =====================================================

  /**
   * Đánh dấu property đã đổi và hẹn cập nhật ở microtask kế tiếp.
   * Đổi 5 property liên tiếp → updated() chỉ chạy 1 lần.
   * Gọi không tham số để ép cập nhật lại (vd: khi dữ liệu nội bộ thay đổi).
   */
  requestUpdate(name, oldValue) {
    if (name !== undefined && !this._changed.has(name)) this._changed.set(name, oldValue);
    if (this._updatePending || !this._hasRendered) return;
    this._updatePending = true;
    queueMicrotask(() => this._performUpdate());
  }

  _performUpdate() {
    this._updatePending = false;
    if (!this._hasRendered) return;
    const changed = this._changed;
    this._changed = new Map();
    this.updated(changed);
  }

  /** Promise resolve sau khi lần cập nhật đang chờ đã chạy xong (tiện cho test) */
  get updateComplete() {
    return new Promise((resolve) => queueMicrotask(resolve));
  }

  connectedCallback() {
    this._abort = new AbortController();
    if (this.constructor.localized) {
      this.listen(document, 'hui-locale-change', () => this.requestUpdate('locale'));
    }

    if (!this._hasRendered) {
      this._upgradeProperties();
      this._applyStyles();

      const content = this.render();
      if (content) {
        for (const node of Array.isArray(content) ? content : [content]) {
          if (node) this.shadowRoot.appendChild(node);
        }
      }
      this._hasRendered = true;

      // Lần đầu: coi như MỌI property đều vừa đổi → updated() đồng bộ toàn bộ giao diện
      const all = new Map();
      for (const name of this.constructor._getPropertyMap().keys()) all.set(name, undefined);
      // Component dùng chuỗi locale cũng cần vẽ chữ ở lần đầu (không chỉ khi đổi ngôn ngữ)
      if (this.constructor.localized) all.set('locale', undefined);
      this._changed.forEach((v, k) => all.set(k, v));
      this._changed = new Map();
      this.updated(all);
      this.firstUpdated();
    }
  }

  disconnectedCallback() {
    // Tự gỡ mọi listener đăng ký bằng this.listen() → tránh rò rỉ bộ nhớ
    this._abort?.abort();
    this._abort = null;
  }

  _applyStyles() {
    // Tokens gắn 1 lần vào <head> (biến CSS tự kế thừa xuyên Shadow DOM) — xem ensureTokens()
    ensureTokens();

    const list = [].concat(this.constructor.styles || []).filter(Boolean);
    if (!list.length) return;

    if (supportsAdoptedSheets) {
      this.shadowRoot.adoptedStyleSheets = [
        ...this.shadowRoot.adoptedStyleSheets,
        ...list.map(getSheet),
      ];
    } else {
      // Trình duyệt cũ: chèn thẻ <style> như cách cũ
      for (const css of list) this.shadowRoot.appendChild(createStyle(css));
    }
  }

  // =====================================================
  // HOOKS — lớp con ghi đè
  // =====================================================

  /** Dựng khung DOM một lần. Trả về Node, mảng Node, hoặc null. */
  render() {
    return null;
  }

  /**
   * Chạy sau mỗi lần property đổi (và một lần ngay sau render() với toàn bộ property).
   * @param {Map<string, any>} changed - tên property → giá trị CŨ
   */
  updated(changed) {} // eslint-disable-line no-unused-vars

  /** Chạy một lần sau lần updated() đầu tiên — DOM đã sẵn sàng */
  firstUpdated() {}

  // =====================================================
  // TIỆN ÍCH
  // =====================================================

  /**
   * Bật/tắt custom state → CSS bên ngoài bắt được bằng `hui-xxx:state(name)`.
   * Trình duyệt chưa hỗ trợ CustomStateSet thì bỏ qua (không lỗi).
   */
  setState(name, on) {
    const states = this._internals?.states;
    if (!states) return;
    try {
      if (on) states.add(name);
      else states.delete(name);
    } catch {
      // Chrome < 125 chỉ nhận cú pháp cũ '--name'
      try {
        if (on) states.add(`--${name}`);
        else states.delete(`--${name}`);
      } catch { /* không hỗ trợ */ }
    }
  }

  /** Phát sự kiện (bubbles + composed để xuyên qua Shadow DOM) */
  emit(name, detail = null, options = {}) {
    return emitEvent(this, name, detail, options);
  }

  /**
   * Gắn listener lên đối tượng bên ngoài (document, window...) — tự gỡ khi element bị tháo.
   * Gọi trong connectedCallback() (sau super.connectedCallback()).
   */
  listen(target, type, handler, options = {}) {
    target.addEventListener(type, handler, { ...options, signal: this._abort?.signal });
  }

  // =====================================================
  // FORM API (chỉ có tác dụng khi static formAssociated = true)
  // =====================================================

  /** Truy cập form API của ElementInternals — chỉ hợp lệ khi formAssociated, nếu không trả null */
  get _formInternals() {
    return this.constructor.formAssociated ? this._internals : null;
  }

  get form() { return this._formInternals?.form ?? null; }
  get validity() { return this._formInternals?.validity; }
  get validationMessage() { return this._formInternals?.validationMessage ?? ''; }
  get willValidate() { return this._formInternals?.willValidate ?? false; }
  checkValidity() { return this._formInternals ? this._formInternals.checkValidity() : true; }
  reportValidity() { return this._formInternals ? this._formInternals.reportValidity() : true; }

  /** Ghi giá trị gửi lên form (null = không gửi) */
  setFormValue(value, state) {
    this._formInternals?.setFormValue(value, state);
  }

  /** <fieldset disabled> bao ngoài bật/tắt → cập nhật lại giao diện */
  formDisabledCallback(disabled) {
    this._formDisabled = disabled;
    this.requestUpdate('disabled', this._props.disabled);
  }

  /** Bị vô hiệu hóa bởi chính attribute `disabled` hoặc bởi <fieldset disabled> cha */
  get isDisabled() {
    return Boolean(this._props.disabled) || this._formDisabled;
  }
}

/**
 * Đăng ký custom element an toàn (không lỗi khi file bị import 2 lần)
 * @param {string} tag
 * @param {CustomElementConstructor} ctor
 */
export function defineElement(tag, ctor) {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
  return ctor;
}

export default HuiElement;
