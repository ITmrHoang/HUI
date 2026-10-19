/**
 * HUI Alert — Hộp thông báo trạng thái (Ant Alert + MUI Alert)
 * severity (MUI) / type (Ant): info | success | warning | error · variant: standard | filled | outlined
 * Parts: base, icon, content, title, description, action, close
 * Slots: (mặc định) mô tả, title, icon, action · Events: close (cancelable), after-close
 * Biến CSS: xem đầu hui-alert.css.
 */

import styles from './hui-alert.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { collapse } from '../../utils/motion.js';
import '../hui-icon/hui-icon.js';

const SEVERITIES = ['info', 'success', 'warning', 'error'];
const VARIANTS = ['standard', 'filled', 'outlined'];
const SIZES = ['sm', 'md', 'lg'];

/** Slot có nội dung thật (bỏ qua text chỉ toàn khoảng trắng) */
const hasNodes = (slot) => slot.assignedNodes().some(
  (n) => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * @fires close - Bắt đầu đóng. Cancelable: preventDefault() để giữ alert lại
 * @fires after-close - Đã đóng xong (host được gắn `hidden`)
 * @slot - Nội dung mô tả (ưu tiên hơn attribute description)
 * @slot title - Tiêu đề tùy biến (ưu tiên hơn attribute title)
 * @slot icon - Icon thay cho icon mặc định theo severity
 * @slot action - Vùng hành động bên phải
 * @csspart base - Khung alert
 * @csspart icon - Vùng icon
 * @csspart content - Vùng chứa tiêu đề + mô tả
 * @csspart title - Tiêu đề
 * @csspart description - Mô tả
 * @csspart action - Vùng hành động
 * @csspart close - Nút đóng
 * @cssprop --hui-alert-padding - Padding (ghi đè size)
 * @cssprop --hui-alert-font-size - Cỡ chữ (ghi đè size)
 * @cssprop --hui-alert-gap - Khoảng cách giữa các vùng
 * @cssprop --hui-alert-radius - Bo góc
 * @cssprop --hui-alert-bg - Màu nền
 * @cssprop --hui-alert-color - Màu chữ
 * @cssprop --hui-alert-border-color - Màu viền
 * @cssprop --hui-alert-icon-color - Màu icon
 * @cssprop --hui-alert-icon-size - Kích thước icon
 * @cssprop --hui-alert-title-font-weight - Độ đậm tiêu đề
 */
class HuiAlert extends HuiElement {
  static properties = {
    /** info | success | warning | error (đọc ra giá trị thực tế, đã tính alias type) */
    severity: { type: String },
    /** Alias của severity (Ant). severity được ưu tiên */
    type: { type: String },
    /** standard | filled | outlined */
    variant: { type: String, default: 'standard' },
    /** Tiêu đề (hoặc slot="title") */
    title: { type: String },
    /** Mô tả (slot mặc định thay thế attribute này) */
    description: { type: String },
    /** Ẩn icon */
    hideIcon: { type: Boolean },
    /** Hiện nút đóng */
    closable: { type: Boolean },
    /** Chữ thay cho icon × ở nút đóng */
    closeText: { type: String },
    /** Dải ngang đầu trang: không bo góc, không viền 2 bên */
    banner: { type: Boolean },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
  };

  static styles = styles;

  static localized = true;

  /** Severity thực tế: severity → type → 'info' */
  get severity() {
    const val = this._props.severity || this._props.type;
    return SEVERITIES.includes(val) ? val : 'info';
  }

  set severity(val) {
    this._setProp('severity', val);
  }

  /**
   * Đóng alert (giống bấm ×): phát `close` (có thể hủy) → thu gọn chiều cao → gắn `hidden` → `after-close`.
   */
  async close() {
    if (this._closing || this.hidden) return;
    if (!this.emit('close', null, { cancelable: true })) return;

    this._closing = true;
    // Thu gọn chính host (không padding/viền) → chiều cao về 0 mượt
    await collapse(this, false);
    this._closing = false;
    this.hidden = true;
    this.getAnimations?.().forEach((a) => a.cancel());
    this.emit('after-close');
  }

  render() {
    this._icon = createElement('hui-icon');
    this._iconWrap = createElement('div', { className: 'icon', part: 'icon' },
      createElement('slot', { name: 'icon' }, this._icon));

    this._titleText = document.createTextNode('');
    this._descText = document.createTextNode('');
    this._titleSlot = createElement('slot', { name: 'title' }, this._titleText);
    this._descSlot = createElement('slot', {}, this._descText);
    this._actionSlot = createElement('slot', { name: 'action' });
    for (const slot of [this._titleSlot, this._descSlot, this._actionSlot]) {
      slot.addEventListener('slotchange', () => this._syncSlots());
    }

    const content = createElement('div', { className: 'content', part: 'content' },
      createElement('div', { className: 'title', part: 'title' }, this._titleSlot),
      createElement('div', { className: 'description', part: 'description' }, this._descSlot));
    const action = createElement('div', { className: 'action', part: 'action' }, this._actionSlot);

    this._closeIcon = createElement('hui-icon', { name: 'close' });
    this._closeLabel = createElement('span');
    this._closeBtn = createElement('button', { type: 'button', className: 'close', part: 'close' },
      this._closeIcon, this._closeLabel);
    this._closeBtn.addEventListener('click', () => this.close());

    this._base = createElement('div', { part: 'base' }, this._iconWrap, content, action, this._closeBtn);
    return this._base;
  }

  updated(changed) {
    const severity = this.severity;

    if (['severity', 'type', 'variant', 'size'].some((k) => changed.has(k))) {
      const variant = VARIANTS.includes(this.variant) ? this.variant : 'standard';
      const size = SIZES.includes(this.size) ? this.size : 'md';
      for (const c of [...this._base.classList]) {
        if (/^alert--(info|success|warning|error|standard|filled|outlined|sm|md|lg)$/.test(c)) this._base.classList.remove(c);
      }
      this._base.classList.add('alert', `alert--${severity}`, `alert--${variant}`, `alert--${size}`);
      this._icon.setAttribute('name', severity);
      // alert: đọc ngay (lỗi/cảnh báo) · status: đọc lịch sự, không ngắt lời
      this._base.setAttribute('role', severity === 'error' || severity === 'warning' ? 'alert' : 'status');
    }

    if (changed.has('title')) this._titleText.data = this.title || '';
    if (changed.has('description')) this._descText.data = this.description || '';
    if (changed.has('hideIcon')) this._iconWrap.hidden = this.hideIcon;
    if (changed.has('closable')) this._closeBtn.hidden = !this.closable;

    if (changed.has('closeText') || changed.has('locale')) {
      const text = this.closeText;
      this._closeLabel.textContent = text || '';
      this._closeLabel.hidden = !text;
      this._closeIcon.hidden = Boolean(text);
      this._closeBtn.classList.toggle('close--text', Boolean(text));
      this._closeBtn.setAttribute('aria-label', text || t('common.close'));
    }

    if (changed.has('title') || changed.has('description')) this._syncSlots();
  }

  /** Bật class has-* để ẩn khối trống (title, mô tả, action) */
  _syncSlots() {
    const b = this._base;
    b.classList.toggle('alert--has-title', Boolean(this.title) || hasNodes(this._titleSlot));
    b.classList.toggle('alert--has-description', Boolean(this.description) || hasNodes(this._descSlot));
    b.classList.toggle('alert--has-action', hasNodes(this._actionSlot));
  }
}

defineElement('hui-alert', HuiAlert);

export default HuiAlert;
