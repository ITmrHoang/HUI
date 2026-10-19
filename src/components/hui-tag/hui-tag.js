/**
 * HUI Tag — Nhãn / Chip nhỏ gọn (Web Component Vanilla JS)
 *
 * Kết hợp API của Ant Design Tag / CheckableTag + MUI Chip:
 * - color: các biến thể có sẵn (primary, success...) HOẶC bất kỳ mã màu CSS nào
 * - variant: soft (nền nhạt), filled (nền đặc), outlined (chỉ viền)
 * - size: sm / md / lg (20 / 24 / 32px — nhỏ hơn form control vì tag là phần tử phụ)
 * - shape: rounded, pill, square
 * - closable: nút × để xóa tag (hỗ trợ phím Backspace / Delete như MUI)
 * - clickable: tag hoạt động như một nút bấm
 * - checkable + checked: tag bật/tắt được (giống Ant CheckableTag)
 */

import styles from './hui-tag.css?raw';
import { createElement, createStyle, ensureTokens } from '../../utils/dom.js';
import { emitEvent } from '../../utils/events.js';

// Các màu có sẵn trong design tokens. Giá trị khác sẽ được coi là mã màu CSS tùy ý.
const PRESET_COLORS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];
const VARIANTS = ['soft', 'filled', 'outlined'];
const SIZES = ['sm', 'md', 'lg'];
const SHAPES = ['rounded', 'pill', 'square'];

const CLOSE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;

class HuiTag extends HTMLElement {
  static get observedAttributes() {
    return [
      'color', 'variant', 'size', 'shape', 'closable',
      'clickable', 'checkable', 'checked', 'disabled',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null;
    this._stylesInjected = false;

    // Lắng nghe click ngay trên host (thay vì trên wrapper bên trong) để bắt được cả:
    // - click chuột thật (event từ Shadow DOM nổi bọt lên host)
    // - this.click() gọi từ code hoặc từ phím Enter/Space
    this._onHostClick = this._onHostClick.bind(this);
    this.addEventListener('click', this._onHostClick);
  }

  // =====================================================
  // KẾT NỐI PROPERTIES THÔNG THƯỜNG (GET/SET)
  // =====================================================

  /** checked phản chiếu (reflect) trực tiếp attribute `checked` */
  get checked() {
    return this.hasAttribute('checked');
  }
  set checked(val) {
    this.toggleAttribute('checked', Boolean(val));
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }
  set disabled(val) {
    this.toggleAttribute('disabled', Boolean(val));
  }

  // =====================================================
  // LIFECYCLE CALLBACKS
  // =====================================================

  connectedCallback() {
    // Chỉ chèn style một lần, tránh nhân bản khi element bị gỡ ra rồi gắn lại
    if (!this._stylesInjected) {
      ensureTokens();
      this.shadowRoot.appendChild(createStyle(styles));
      this._stylesInjected = true;
    }
    if (!this._wrapper) this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (this._wrapper) this._render();
  }

  // =====================================================
  // PUBLIC METHODS
  // =====================================================

  /**
   * Đóng (xóa) tag.
   * Phát event `close` có thể hủy → nếu không bị preventDefault() thì tag tự ẩn bằng `hidden`.
   * @returns {boolean} true nếu tag đã thực sự bị ẩn
   */
  close(originalEvent = null) {
    if (this.disabled || this.hidden) return false;
    const allowed = emitEvent(this, 'close', { originalEvent }, { cancelable: true });
    if (!allowed) return false;
    this.hidden = true;
    return true;
  }

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /** Xử lý click trên host: chặn khi disabled, toggle khi checkable */
  _onHostClick(e) {
    if (this.disabled) {
      // Tag bị vô hiệu hóa: nuốt luôn event để listener bên ngoài không nhận được
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    if (this.hasAttribute('checkable')) {
      this.checked = !this.checked;
      emitEvent(this, 'change', { checked: this.checked });
    }
  }

  /** Xử lý bàn phím trên tag đang được focus */
  _onKeyDown(e) {
    if (this.disabled) return;
    const interactive = this.hasAttribute('clickable') || this.hasAttribute('checkable');

    // Enter / Space → mô phỏng click (giống <button> native)
    if (interactive && e.target === this._wrapper && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); // Space mặc định sẽ cuộn trang → chặn lại
      this.click();
      return;
    }

    // Backspace / Delete trên tag có nút đóng → xóa tag (hành vi của MUI Chip)
    if (this.hasAttribute('closable') && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      this.close(e);
    }
  }

  // =====================================================
  // SLOT HELPERS
  // =====================================================

  /** Kiểm tra Light DOM có phần tử gán vào slot `name` không */
  _hasSlotted(name) {
    return Array.from(this.children).some((el) => el.getAttribute('slot') === name);
  }

  /** Ẩn/hiện khung chứa icon & avatar tùy theo có nội dung hay không (tránh khoảng trống thừa do gap) */
  _updateSlotState() {
    if (!this._wrapper) return;
    this._wrapper.classList.toggle('hui-tag--has-icon', this._hasSlotted('icon'));
    this._wrapper.classList.toggle('hui-tag--has-avatar', this._hasSlotted('avatar'));
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  _render() {
    // Ghi nhớ focus trước khi xóa DOM cũ: khi toggle checked bằng bàn phím,
    // wrapper bị vẽ lại nên phải trả focus về wrapper mới, tránh mất vị trí focus.
    const hadFocus = this._wrapper && this.shadowRoot.activeElement === this._wrapper;
    if (this._wrapper) this._wrapper.remove();

    const colorAttr = (this.getAttribute('color') || '').trim();
    const variantAttr = this.getAttribute('variant');
    const variant = VARIANTS.includes(variantAttr) ? variantAttr : 'soft';
    const sizeAttr = this.getAttribute('size');
    const size = SIZES.includes(sizeAttr) ? sizeAttr : 'md';
    const shapeAttr = this.getAttribute('shape');
    const shape = SHAPES.includes(shapeAttr) ? shapeAttr : 'rounded';
    const closable = this.hasAttribute('closable');
    const clickable = this.hasAttribute('clickable');
    const checkable = this.hasAttribute('checkable');
    const checked = checkable && this.checked;
    const disabled = this.disabled;

    // Tag checkable không có màu → mặc định dùng primary khi được chọn (giống Ant CheckableTag)
    const color = colorAttr || (checkable ? 'primary' : '');

    const classes = [
      'hui-tag',
      `hui-tag--${variant}`,
      `hui-tag--${size}`,
      `hui-tag--${shape}`,
      color ? '' : 'hui-tag--default', // Không có màu → tông xám trung tính
      clickable ? 'hui-tag--clickable' : '',
      checkable ? 'hui-tag--checkable' : '',
      checked ? 'hui-tag--checked' : '',
      closable ? 'hui-tag--closable' : '',
      disabled ? 'hui-tag--disabled' : '',
    ].filter(Boolean).join(' ');

    // Vai trò accessibility: checkable → checkbox, clickable → button, còn lại là nhãn tĩnh
    const interactive = clickable || checkable;
    const attrs = { className: classes, part: 'base' };
    if (checkable) {
      attrs.role = 'checkbox';
      attrs['aria-checked'] = String(checked);
    } else if (clickable) {
      attrs.role = 'button';
    }
    if (interactive) {
      attrs.tabindex = disabled ? '-1' : '0';
      if (disabled) attrs['aria-disabled'] = 'true';
    }

    // Slots: avatar, icon (đầu tag) và label (slot mặc định)
    const avatarSlot = createElement('slot', { name: 'avatar' });
    const iconSlot = createElement('slot', { name: 'icon' });
    avatarSlot.addEventListener('slotchange', () => this._updateSlotState());
    iconSlot.addEventListener('slotchange', () => this._updateSlotState());

    const avatarEl = createElement('span', { className: 'hui-tag__avatar' }, avatarSlot);
    const iconEl = createElement('span', { className: 'hui-tag__icon' }, iconSlot);
    const labelEl = createElement('span', { className: 'hui-tag__label' }, createElement('slot'));

    // Nút đóng ×:
    // - Tag tương tác (clickable/checkable) đã focus được → nút × để tabindex=-1,
    //   người dùng bàn phím xóa bằng Backspace/Delete (tránh 2 điểm dừng Tab lồng nhau).
    // - Tag tĩnh → nút × chính là điểm focus duy nhất, dùng Enter/Space/Backspace/Delete.
    let closeBtn = null;
    if (closable) {
      closeBtn = createElement('button', {
        type: 'button',
        className: 'hui-tag__close',
        'aria-label': 'Xóa',
        tabindex: interactive || disabled ? '-1' : '0',
        disabled,
        onClick: (e) => {
          // Chặn nổi bọt: bấm × không được tính là click / toggle của tag
          e.stopPropagation();
          this.close(e);
        },
      });
      closeBtn.innerHTML = CLOSE_ICON;
    }

    this._wrapper = createElement('span', attrs,
      avatarEl, iconEl, labelEl, ...[closeBtn].filter(Boolean),
    );

    // Màu tùy ý: truyền qua CSS custom property nội bộ --_tag-color.
    // Màu preset → trỏ tới token; giá trị khác → dùng nguyên văn (vd: #f50, rgb(...), hotpink).
    if (color) {
      const cssColor = PRESET_COLORS.includes(color) ? `var(--hui-${color})` : color;
      this._wrapper.style.setProperty('--_tag-color', cssColor);
    }

    this._wrapper.addEventListener('keydown', (e) => this._onKeyDown(e));

    this.shadowRoot.appendChild(this._wrapper);
    this._updateSlotState();

    if (hadFocus && interactive && !disabled) this._wrapper.focus();
  }
}

if (!customElements.get('hui-tag')) {
  customElements.define('hui-tag', HuiTag);
}

export default HuiTag;
