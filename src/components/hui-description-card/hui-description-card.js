/**
 * HUI Description Card — Thẻ chi tiết một bản ghi (Organism): `data` (object) + `fields` khai báo kiểu hiển thị
 * (text / number / currency / date / tag / avatar / link / boolean / badge…) → định dạng sẵn qua core/format.js.
 * Bố cục nhãn/giá trị dùng <hui-descriptions> (cột responsive, span), thêm khung thẻ có tiêu đề / extra / actions.
 */

import styles from './hui-description-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { format } from '../../core/format.js';
import { getPath } from '../../core/template.js';
import { createElement } from '../../utils/dom.js';
import '../hui-descriptions/index.js';
import '../hui-tag/index.js';
import '../hui-avatar/index.js';
import '../hui-icon/index.js';
import '../hui-copy/index.js';
import '../hui-skeleton/index.js';
import '../hui-dot/index.js';

const TYPES = ['text', 'number', 'currency', 'percent', 'date', 'datetime', 'relative', 'tag', 'avatar', 'link', 'email', 'phone', 'boolean', 'badge'];

const FALLBACK = {
  vi: { 'descriptionCard.yes': 'Có', 'descriptionCard.no': 'Không', 'descriptionCard.copy': 'Sao chép {label}' },
  en: { 'descriptionCard.yes': 'Yes', 'descriptionCard.no': 'No', 'descriptionCard.copy': 'Copy {label}' },
};

function tx(key) {
  const v = t(key);
  if (v !== key) return v;
  return (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

const isBlank = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/** "{id}" trong chuỗi mẫu → giá trị của bản ghi (dùng cho href) */
const fillTemplate = (tpl, data) => String(tpl).replace(/\{([\w.$]+)\}/g, (m, p) => {
  const v = getPath(data, p);
  return v === undefined || v === null ? '' : encodeURIComponent(String(v));
});

/** Chỉ cho phép link http(s) / mailto / tel / tương đối (chặn javascript:) */
const safeHref = (href) => (/^\s*javascript:/i.test(String(href)) ? '#' : String(href));

const hasNodes = (slot) => slot.assignedNodes({ flatten: true })
  .some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim() !== '');

/**
 * Thẻ chi tiết bản ghi.
 * fields: [{ key, label, type, format, span, copyable, color, colors, status, href, target, render, emptyText }]
 *   - key: đường dẫn "a.b" trong data · type: text | number | currency | percent | date | datetime | relative | tag | avatar | link | email | phone | boolean | badge
 *   - format: tham số định dạng (number: số lẻ "2"; currency: "USD"; date: short | medium | long | full)
 *   - colors / status: map giá trị → màu tag / trạng thái badge (success | processing | error | warning | default…)
 *   - render(value, data) => Node | string: tự dựng giá trị
 *
 * @fires hui-copy - Sao chép giá trị một trường (nổi bọt từ hui-copy). detail: { value }
 * @slot title - Tiêu đề tùy biến (thay attribute heading)
 * @slot extra - Góc phải tiêu đề (vd: nút Sửa, tag trạng thái)
 * @slot actions - Hàng nút ở chân thẻ
 * @slot field-<key> - Thay phần giá trị của trường `key` (vd slot="field-email")
 * @csspart base - Khung thẻ
 * @csspart header - Hàng tiêu đề + extra
 * @csspart title - Tiêu đề
 * @csspart extra - Vùng extra
 * @csspart body - Thân thẻ
 * @csspart descriptions - <hui-descriptions> bên trong
 * @csspart value - Mỗi giá trị đã định dạng
 * @csspart empty-value - Giá trị rỗng ("—")
 * @csspart copy - Nút sao chép (<hui-copy>)
 * @csspart footer - Chân thẻ (slot actions)
 * @cssprop --hui-description-card-bg - Nền thẻ
 * @cssprop --hui-description-card-border - Viền thẻ
 * @cssprop --hui-description-card-radius - Bo góc
 * @cssprop --hui-description-card-shadow - Đổ bóng
 * @cssprop --hui-description-card-padding - Khoảng đệm
 * @cssprop --hui-description-card-title-size - Cỡ chữ tiêu đề
 * @cssprop --hui-description-card-empty-color - Màu chữ giá trị rỗng
 */
class HuiDescriptionCard extends HuiElement {
  static localized = true;

  static properties = {
    /** Bản ghi cần hiển thị (object) */
    data: { type: Object },
    /** Khai báo trường [{ key, label, type, format, span, copyable … }] — bỏ trống = mọi khóa của data dạng text */
    fields: { type: Array },
    /** Tiêu đề thẻ (hoặc slot="title") */
    heading: { type: String },
    /** Số cột: số ("2") hoặc theo breakpoint ("xs:1,sm:2,lg:3") — mặc định xs 1 · sm 2 · md+ 3 */
    column: { type: String },
    /** horizontal | vertical — vertical: nhãn nằm trên giá trị */
    layout: { type: String, default: 'horizontal' },
    /** Kẻ ô dạng bảng */
    bordered: { type: Boolean },
    /** sm | md | lg — khoảng đệm */
    size: { type: String, default: 'md' },
    /** Chữ cho giá trị rỗng */
    emptyText: { type: String, default: '—' },
    /** Mọi trường có nút sao chép (từng trường: field.copyable) */
    copyable: { type: Boolean },
    /** Đang tải → skeleton */
    loading: { type: Boolean },
    /** Bỏ khung thẻ (chỉ còn danh sách mô tả) */
    flat: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._titleText = document.createTextNode('');
    this._titleSlot = createElement('slot', { name: 'title' }, this._titleText);
    this._extraSlot = createElement('slot', { name: 'extra' });
    this._actionsSlot = createElement('slot', { name: 'actions' });
    this._title = createElement('div', { className: 'dc__title', part: 'title', id: 'dc-title', role: 'heading', 'aria-level': '3' }, this._titleSlot);
    this._extra = createElement('div', { className: 'dc__extra', part: 'extra' }, this._extraSlot);
    this._header = createElement('div', { className: 'dc__header', part: 'header' }, this._title, this._extra);
    this._desc = createElement('hui-descriptions', { part: 'descriptions', exportparts: 'view, header: descriptions-header' });
    this._skeleton = createElement('hui-skeleton', { active: '', rows: '4', hidden: true });
    this._body = createElement('div', { className: 'dc__body', part: 'body' }, this._skeleton, this._desc);
    this._footer = createElement('div', { className: 'dc__footer', part: 'footer' }, this._actionsSlot);
    this._base = createElement('section', { className: 'dc', part: 'base' }, this._header, this._body, this._footer);

    for (const slot of [this._titleSlot, this._extraSlot, this._actionsSlot]) slot.addEventListener('slotchange', () => this._syncChrome());
    return this._base;
  }

  updated(changed) {
    if (changed.has('heading')) this._titleText.data = this.heading || '';
    const d = this._desc;
    if (changed.has('column')) {
      if (this.column) d.setAttribute('column', this.column);
      else d.removeAttribute('column');
    }
    if (changed.has('layout')) d.setAttribute('layout', this.layout === 'vertical' ? 'vertical' : 'horizontal');
    if (changed.has('bordered')) d.toggleAttribute('bordered', this.bordered);
    if (changed.has('size')) d.setAttribute('size', this.size || 'md');
    this._base.classList.toggle('dc--flat', this.flat);
    this._skeleton.hidden = !this.loading;
    d.hidden = this.loading;
    this.toggleAttribute('aria-busy', this.loading);

    if (['data', 'fields', 'emptyText', 'copyable', 'locale'].some((k) => changed.has(k))) this._renderFields();
    this._syncChrome();
  }

  /** Trường hiệu lực (fields, hoặc tự sinh từ khóa của data) */
  get _fields() {
    if (Array.isArray(this.fields) && this.fields.length) return this.fields.filter((f) => f && f.key !== undefined);
    const data = this.data && typeof this.data === 'object' ? this.data : {};
    return Object.keys(data).map((key) => ({ key, label: key }));
  }

  _syncChrome() {
    if (!this._title) return;
    const hasTitle = Boolean(this.heading) || hasNodes(this._titleSlot);
    this._title.hidden = !hasTitle;
    this._extra.hidden = !hasNodes(this._extraSlot);
    this._header.hidden = this._title.hidden && this._extra.hidden;
    this._footer.hidden = !hasNodes(this._actionsSlot);
    if (hasTitle) this._base.setAttribute('aria-labelledby', 'dc-title');
    else this._base.removeAttribute('aria-labelledby');
  }

  _renderFields() {
    const data = this.data && typeof this.data === 'object' ? this.data : {};
    const items = this._fields.map((field) => {
      const item = createElement('hui-descriptions-item', { label: field.label ?? String(field.key) });
      if (field.span !== undefined && field.span !== null) item.setAttribute('span', String(field.span));
      // slot="field-<key>" của người dùng → chuyển tiếp vào ô giá trị
      const override = createElement('slot', { name: `field-${field.key}` });
      const value = getPath(data, String(field.key));
      override.append(this._renderValue(field, value, data));
      item.append(override);
      return item;
    });
    this._desc.replaceChildren(...items);
  }

  /** Dựng phần giá trị theo kiểu */
  _renderValue(field, value, data) {
    const empty = field.emptyText ?? this.emptyText ?? '—';
    const wrap = createElement('span', { className: 'dc__value', part: 'value' });
    let content = null;
    let copyValue = null;

    if (typeof field.render === 'function') {
      const out = field.render(value, data);
      content = out instanceof Node ? out : out === null || out === undefined ? null : document.createTextNode(String(out));
    } else if (!isBlank(value) || field.type === 'boolean') {
      ({ content, copyValue } = this._byType(field, value, data));
    }

    if (!content) {
      wrap.classList.add('dc__value--empty');
      wrap.setAttribute('part', 'value empty-value');
      wrap.textContent = empty;
      return wrap;
    }
    wrap.append(content);
    const copyable = field.copyable ?? this.copyable;
    const text = copyValue ?? (isBlank(value) ? '' : typeof value === 'object' ? '' : String(value));
    if (copyable && text) {
      wrap.append(createElement('hui-copy', {
        className: 'dc__copy', part: 'copy', value: text, size: 'sm', variant: 'text', label: tx('descriptionCard.copy').replace('{label}', String(field.label ?? field.key)),
      }));
    }
    return wrap;
  }

  _byType(field, value, data) {
    const type = TYPES.includes(field.type) ? field.type : 'text';
    const fmt = field.format;
    const text = (s) => document.createTextNode(String(s));
    switch (type) {
      case 'number': {
        const s = format(value, fmt !== undefined ? `number:${fmt}` : 'number');
        return { content: text(s), copyValue: String(value) };
      }
      case 'currency': return { content: text(format(value, `currency:${fmt || 'VND'}`)), copyValue: String(value) };
      case 'percent': return { content: text(format(value, fmt !== undefined ? `percent:${fmt}` : 'percent')), copyValue: String(value) };
      case 'date': return { content: text(format(value, `date:${fmt || 'medium'}`)) };
      case 'datetime': return { content: text(format(value, 'datetime')) };
      case 'relative': {
        const el = createElement('hui-time', { datetime: String(value), format: 'relative' });
        return { content: el };
      }
      case 'tag': {
        const list = Array.isArray(value) ? value : [value];
        const frag = createElement('span', { className: 'dc__tags' });
        for (const v of list) {
          const label = typeof v === 'object' && v ? v.label ?? v.value : v;
          const key = typeof v === 'object' && v ? v.value ?? v.label : v;
          const color = (typeof v === 'object' && v?.color) || field.colors?.[key] || field.color;
          const tag = createElement('hui-tag', { size: 'sm' }, String(label));
          if (color) tag.setAttribute('color', color);
          frag.append(tag);
        }
        return { content: frag, copyValue: list.map((v) => (typeof v === 'object' && v ? v.label ?? v.value : v)).join(', ') };
      }
      case 'badge': {
        const key = typeof value === 'object' && value ? value.value ?? value.label : value;
        const label = typeof value === 'object' && value ? value.label ?? value.value : field.labels?.[key] ?? value;
        const status = (typeof value === 'object' && value?.status) || field.status?.[key] || 'default';
        const dot = createElement('hui-dot', { status, label: String(label) });
        const color = field.colors?.[key];
        if (color) dot.setAttribute('color', color);
        return { content: dot, copyValue: String(label) };
      }
      case 'avatar': {
        const obj = typeof value === 'object' && value ? value : { name: String(value) };
        const name = obj.name ?? obj.label ?? '';
        const avatar = createElement('hui-avatar', { size: 'sm', 'aria-hidden': 'true' });
        if (obj.avatar || obj.src) avatar.setAttribute('src', obj.avatar || obj.src);
        if (name) avatar.setAttribute('name', name);
        const box = createElement('span', { className: 'dc__avatar' }, avatar, createElement('span', {}, name));
        return { content: box, copyValue: name };
      }
      case 'link':
      case 'email':
      case 'phone': {
        const obj = typeof value === 'object' && value ? value : { label: String(value), href: String(value) };
        const label = obj.label ?? obj.href;
        let href = field.href ? fillTemplate(field.href, data) : obj.href ?? label;
        if (type === 'email' && !/^mailto:/i.test(href)) href = `mailto:${href}`;
        if (type === 'phone' && !/^tel:/i.test(href)) href = `tel:${String(href).replace(/[^\d+]/g, '')}`;
        const a = createElement('a', { className: 'dc__link', href: safeHref(href) }, String(label));
        const target = field.target ?? (type === 'link' && /^https?:/i.test(href) ? '_blank' : null);
        if (target) {
          a.setAttribute('target', target);
          if (target === '_blank') a.setAttribute('rel', 'noopener noreferrer');
        }
        return { content: a, copyValue: String(label) };
      }
      case 'boolean': {
        const on = Boolean(value) && value !== 'false' && value !== 0;
        const box = createElement('span', { className: `dc__bool dc__bool--${on ? 'yes' : 'no'}` },
          createElement('hui-icon', { name: on ? 'check' : 'close', 'aria-hidden': 'true' }),
          createElement('span', {}, field.labels?.[String(on)] ?? tx(on ? 'descriptionCard.yes' : 'descriptionCard.no')));
        return { content: box };
      }
      default: {
        const s = fmt ? format(value, fmt) : typeof value === 'object' ? JSON.stringify(value) : String(value);
        return { content: text(s), copyValue: s };
      }
    }
  }
}

defineElement('hui-description-card', HuiDescriptionCard);

export default HuiDescriptionCard;
