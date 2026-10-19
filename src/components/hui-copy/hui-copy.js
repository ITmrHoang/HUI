/**
 * HUI Copy — Nút sao chép (Atom): chép `value` hoặc chữ của phần tử `target` vào clipboard,
 * icon copy → check trong 2 giây kèm bong bóng "Đã sao chép". Dựng trên <hui-button> (variant/size giống hệt).
 */

import styles from './hui-copy.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-button/hui-button.js';

/**
 * Ghi chuỗi vào clipboard. Clipboard API bị chặn (http, iframe không cấp quyền...) → fallback execCommand.
 * @returns {Promise<boolean>} true nếu sao chép thành công
 */
export async function copyText(text) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    const active = document.activeElement;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch { /* trình duyệt không hỗ trợ */ }
    ta.remove();
    active?.focus?.({ preventScroll: true });
    return ok;
  }
}

/** Chữ của phần tử đích: ô nhập → value; còn lại → chữ hiển thị */
function textOf(el) {
  if (!el) return '';
  if ('value' in el && typeof el.value === 'string' && /^(INPUT|TEXTAREA|SELECT|OUTPUT)$/.test(el.tagName)) return el.value;
  return (el.innerText ?? el.textContent ?? '').trim();
}

/**
 * Nút sao chép. Không có nội dung slot → nút chỉ có icon (aria-label "Sao chép").
 *
 * @fires hui-copy - Sao chép thành công. detail: { value }
 * @fires hui-copy-error - Không ghi được clipboard. detail: { value }
 * @slot - Nội dung chữ của nút (bỏ trống = chỉ icon)
 * @csspart button - <hui-button> bên trong
 * @csspart button-base - Thẻ <button> thật (part base của hui-button)
 * @csspart icon - Icon copy / check
 * @csspart tooltip - Bong bóng "Đã sao chép"
 * @cssprop --hui-copy-success-color - Màu icon/chữ khi đã sao chép
 * @cssprop --hui-copy-tooltip-bg - Nền bong bóng
 * @cssprop --hui-copy-tooltip-color - Chữ bong bóng
 */
class HuiCopy extends HuiElement {
  static localized = true;

  static properties = {
    /** Chuỗi cần sao chép (ưu tiên hơn target) */
    value: { type: String },
    /** CSS selector phần tử lấy chữ để sao chép (input/textarea → value), tìm trong cùng root rồi tới document */
    target: { type: String },
    /** primary | secondary | outline | dashed | ghost | text | link | danger — như hui-button */
    variant: { type: String, default: 'ghost' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** default | round | circle — nút chỉ icon tự dùng circle khi để default */
    shape: { type: String, default: 'default' },
    /** Nhãn cho trình đọc màn hình (mặc định "Sao chép") */
    label: { type: String },
    /** Chữ bong bóng sau khi chép (mặc định "Đã sao chép") */
    copiedLabel: { type: String },
    /** Thời gian giữ trạng thái đã chép (ms) */
    duration: { type: Number, default: 2000 },
    disabled: { type: Boolean },
    /** Không hiện bong bóng (vẫn thông báo cho trình đọc màn hình) */
    noTooltip: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._copied = false;
    this._timer = null;
  }

  /** Đang ở trạng thái "đã sao chép" */
  get copied() {
    return this._copied;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncContent());
    this._btn = createElement('hui-button', {
      part: 'button',
      exportparts: 'base: button-base, label: button-label, icon',
      icon: 'copy',
    });
    // Slot nằm ngoài hui-button khi trống (nếu không hui-button tưởng có chữ → icon lệch tâm)
    this._holder = createElement('span', { hidden: true }, this._slot);
    this._btn.addEventListener('click', () => {
      if (!this.disabled) this.copy();
    });
    // click native vẫn nổi bọt ra host; hui-click của nút nội bộ thì chặn (sự kiện công khai là hui-copy)
    this._btn.addEventListener('hui-click', (e) => e.stopPropagation());
    this._tip = createElement('span', { className: 'copy__tip', part: 'tooltip', role: 'status' });
    return [this._btn, this._tip, this._holder];
  }

  updated(changed) {
    const b = this._btn;
    if (changed.has('variant')) b.setAttribute('variant', this.variant);
    if (changed.has('size')) b.setAttribute('size', this.size);
    if (changed.has('disabled')) b.toggleAttribute('disabled', this.disabled);
    if (['label', 'locale', 'shape'].some((k) => changed.has(k))) this._syncContent();
    if (changed.has('noTooltip')) this._tip.classList.toggle('copy__tip--sr', this.noTooltip);
  }

  /** Chuỗi sẽ được sao chép */
  get textToCopy() {
    if (this.value !== null && this.value !== undefined) return String(this.value);
    if (!this.target) return '';
    const root = this.getRootNode();
    let el = null;
    try {
      el = root?.querySelector?.(this.target) || document.querySelector(this.target);
    } catch { /* selector sai */ }
    return textOf(el);
  }

  /** Sao chép; trả về true nếu thành công */
  async copy() {
    if (this.disabled) return false;
    const value = this.textToCopy;
    const ok = await copyText(value);
    if (!ok) {
      this.emit('hui-copy-error', { value });
      return false;
    }
    this._setCopied(true);
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._setCopied(false), Math.max(0, Number(this.duration) || 2000));
    this.emit('hui-copy', { value });
    return true;
  }

  _setCopied(on) {
    this._copied = on;
    this._btn.setAttribute('icon', on ? 'check' : 'copy');
    this._btn.classList.toggle('copy--done', on);
    this._tip.textContent = on ? (this.copiedLabel || t('common.copied')) : '';
    this._tip.classList.toggle('copy__tip--show', on);
    this.setState('copied', on);
  }

  /** Nút chỉ icon → shape circle + aria-label; có chữ → giữ shape người dùng */
  _syncContent() {
    const hasText = this._slot.assignedNodes({ flatten: true })
      .some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    const iconOnly = !hasText;
    const home = iconOnly ? this._holder : this._btn;
    if (this._slot.parentNode !== home) home.append(this._slot);
    this._btn.setAttribute('shape', iconOnly && this.shape === 'default' ? 'circle' : this.shape);
    if (iconOnly) this._btn.setAttribute('aria-label', this.label || t('common.copy'));
    else this._btn.removeAttribute('aria-label');
    // hui-button chỉ chép aria-label vào <button> thật khi cập nhật → ép một lượt
    this._btn.requestUpdate?.();
  }
}

defineElement('hui-copy', HuiCopy);

export default HuiCopy;
