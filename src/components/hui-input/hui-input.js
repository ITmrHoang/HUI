/**
 * HUI Input — Ô nhập liệu đa năng (Web Component Vanilla JS)
 * Component này hoàn toàn tách biệt, bảo bọc CSS bên trong Shadow DOM.
 *
 * Hỗ trợ:
 * - Icon trái/phải qua attribute `icon-left`, `icon-right` (emoji, text, ký tự Unicode)
 * - Slot `prefix` / `suffix` cho nội dung phức tạp (HTML tùy ý) từ bên ngoài
 * - Nút xóa nhanh (clearable) tự ẩn/hiện theo giá trị input
 */

// Import file CSS dưới dạng chuỗi thô nhờ Vite flag '?raw'
import styles from './hui-input.css?raw';

import { createElement, createStyle, injectTokens } from '../../utils/dom.js';
import { emitEvent, debounce } from '../../utils/events.js';

class HuiInput extends HTMLElement {
  /**
   * 1. observedAttributes:
   * Liệt kê các danh sách thuộc tính (property in HTML attribute) mà UI Component cần phản ứng lập tức khi thay đổi.
   */
  static get observedAttributes() {
    return ['type', 'label', 'label-position', 'placeholder', 'value', 'size', 'disabled',
            'required', 'error', 'success', 'hint', 'clearable', 'name',
            'icon-left', 'icon-right'];
  }

  constructor() {
    super();
    // 2. Attach Shadow DOM (open). Bọc lại các logic thẻ HTML thật và style cách ly vào đây.
    this.attachShadow({ mode: 'open' });
    this._input = null;   // Trỏ tới thẻ <input> vật lý ẩn chứa bên trong
    this._wrapper = null; // Trỏ tới div container ngoài cùng
    this._clearBtn = null; // Trỏ tới nút clear (✕)

    // Biện pháp tránh kích âm lượng ảo (Debounce) dùng cho chức năng search.
    // Nếu họ gõ nhanh quá, nó sẽ chờ 300ms tịt ngừng gõ rồi mới phát đi sự kiện.
    this._debouncedEmit = debounce((value) => {
      emitEvent(this, 'hui-search', { value });
    }, 300);
  }

  /**
   * 3. connectedCallback (Móc xích vòng đời hệ thống - DOM Inserted)
   * Tự động chạy khi custom element thả vào cây DOM. Phục vụ khởi tạo màn hình.
   */
  connectedCallback() {
    // Ép (Inject) các biến số màu sắc / layout vào Root Node
    injectTokens(this.shadowRoot);
    // Ghim mã CSS đọc từ file trên cùng thả vào trong hệ quản lý đổ bóng Shadow DOM
    this.shadowRoot.appendChild(createStyle(styles));
    
    // Gọi lệnh dựng giao diện bên trong
    this._render();
  }

  /**
   * 4. attributeChangedCallback 
   * Sinh ra tự động nếu mã HTML bị sửa chữ ở thuộc tính bên kia, component ta sẽ bắt lệnh và làm lại giao diện (Render)
   */
  attributeChangedCallback() {
    // Render luôn cho nóng nếu màn ngoài khung wrapper đã được phác thảo
    if (this._wrapper) this._render();
  }

  /** 
   * Tính năng truy xuất nhanh value cho lập trình viên (e.g. `document.querySelector('hui-input').value`)
   */
  get value() {
    return this._input?.value || '';
  }

  /** Gán giá trị input từ mã JS */
  set value(val) {
    if (this._input) this._input.value = val;
  }

  /** 
   * 5. Hàm xây dựng vẽ nên hình hài ảo cho Web Element
   */
  _render() {
    // Đập bỏ phần tử bọc tổng cũ đi xây mới lại theo chuẩn Reactivity thủ công.
    if (this._wrapper) this._wrapper.remove();

    // Lấy thông số (Prop value) cấp cho các thành phần con
    const type = this.getAttribute('type') || 'text';
    const label = this.getAttribute('label');
    let labelPos = this.getAttribute('label-position') || 'top';
    if (labelPos === 'above') labelPos = 'top'; // alias
    if (labelPos === 'left') labelPos = 'inline'; // alias
    
    const placeholder = this.getAttribute('placeholder') || '';
    const value = this.getAttribute('value') || '';
    const size = this.getAttribute('size') || 'md';
    const disabled = this.hasAttribute('disabled');
    const required = this.hasAttribute('required');
    const error = this.getAttribute('error');
    const success = this.getAttribute('success');
    const hint = this.getAttribute('hint');
    const clearable = this.hasAttribute('clearable');
    const name = this.getAttribute('name') || '';
    const iconLeft = this.getAttribute('icon-left');    // Icon bên trái (emoji/text)
    const iconRight = this.getAttribute('icon-right');  // Icon bên phải (emoji/text)

    // Tạo cái nhãn thẻ Label nếu thuộc tính label được đưa vào
    const labelEl = label
      ? createElement('label', {
          className: `hui-input__label${required ? ' hui-input__label--required' : ''}`,
        }, label)
      : null;

    // Dịch ô nhập văn bản chính
    this._input = createElement('input', {
      className: `hui-input__field hui-input__field--${size}`,
      type,
      placeholder,
      value,
      disabled,
      name,
    });

    // 6. Quản lý hệ sinh thái event (Event Emitters/Subscribers)
    // - Lắng nghe sự kiện gõ chữ 'input' trực tiếp trên thẻ <input> sâu phía lòng mề.
    this._input.addEventListener('input', (e) => {
      // Bắn event ra ngoài lớp vỏ <hui-input> cho khách hàng nghe lỏm để xử lý.
      emitEvent(this, 'input', { value: e.target.value });

      // Nếu type là 'search', bắn thêm sự kiện hoãn binh debounce.
      if (type === 'search') this._debouncedEmit(e.target.value);

      // Cập nhật hiện trạng wrapper có giá trị hay không để giữ floating label luôn bay lên
      if (this._wrapper) {
        if (e.target.value.length > 0) {
          this._wrapper.classList.add('hui-input-wrapper--has-value');
        } else {
          this._wrapper.classList.remove('hui-input-wrapper--has-value');
        }
      }

      // Cập nhật hiển thị nút clear theo giá trị hiện tại (chỉ hiện khi có text)
      this._updateClearVisibility();
    });

    // Bắn event 'change' khi user thoát khỏi input
    this._input.addEventListener('change', (e) => {
      emitEvent(this, 'change', { value: e.target.value });
    });

    // ---- PHẦN TRÁI: Icon attribute HOẶC Slot prefix ----
    // Ưu tiên 1: Nếu có attribute icon-left → render icon trực tiếp (đơn giản, nhanh gọn)
    // Ưu tiên 2: Nếu không có icon-left → dùng slot prefix cho nội dung HTML phức tạp từ bên ngoài
    const leftEl = iconLeft
      ? createElement('span', { className: 'hui-input__icon hui-input__icon--left' }, iconLeft)
      : createElement('span', { className: 'hui-input__prefix' },
          createElement('slot', { name: 'prefix' }));

    // ---- PHẦN PHẢI: Icon attribute HOẶC Slot suffix ----
    const rightEl = iconRight
      ? createElement('span', { className: 'hui-input__icon hui-input__icon--right' }, iconRight)
      : createElement('span', { className: 'hui-input__suffix' },
          createElement('slot', { name: 'suffix' }));

    // Nút làm sạch Clear (✕) — chỉ hiện khi clearable=true VÀ input có giá trị
    const hasValue = value.length > 0;
    this._clearBtn = clearable
      ? createElement('button', {
          className: `hui-input__clear${hasValue ? '' : ' hui-input__clear--hidden'}`,
          type: 'button',
          'aria-label': 'Clear',
          onClick: () => {
            this._input.value = '';
            // Nút clear bị bấm -> mất value -> gỡ class để label rớt xuống
            if (this._wrapper) {
              this._wrapper.classList.remove('hui-input-wrapper--has-value');
            }
            emitEvent(this, 'input', { value: '' });
            emitEvent(this, 'clear');
            this._input.focus(); // Tập trung lại con trỏ chuột vào vùng type chữ
            this._updateClearVisibility();
          },
        }, '✕')
      : null;

    // Bố trí giao diện tổng mảng
    const containerClass = [
      'hui-input__container',
      `hui-input__container--${size}`, // Ép size vào container ngoài cùng
      error ? 'hui-input__container--error' : '',
      success ? 'hui-input__container--success' : '',
    ].filter(Boolean).join(' ');

    const containerChildren = [leftEl, this._input, ...[this._clearBtn, rightEl].filter(Boolean)];
    if (labelPos === 'inside' && labelEl) {
      // Chèn label vào container nếu dùng kiểu floating (inside)
      containerChildren.unshift(labelEl);
    }

    const container = createElement('div', { className: containerClass }, ...containerChildren);

    // Nơi đổ bộ câu tin thông báo phía dưới: lỗi đỏ, xanh lá, hay gợi ý xám
    const message = error || success || hint;
    const messageEl = message
      ? createElement('span', {
          className: `hui-input__message hui-input__message--${error ? 'error' : success ? 'success' : 'hint'}`,
        }, message)
      : null;

    // Hàn gắn liên hợp tất cả phụ kiện thành một thân hình duy nhất
    const wrapperClasses = [
      'hui-input-wrapper',
      `hui-input-wrapper--label-${labelPos}`,
      hasValue ? 'hui-input-wrapper--has-value' : '',
      label ? 'hui-input-wrapper--has-label' : '',
      error ? 'hui-input-wrapper--has-error' : ''
    ].filter(Boolean).join(' ');
    
    // Xử lý bộ khung tùy thuộc vào loại label-position
    let wrapperChildren = [];
    if (labelPos === 'inline') {
      const rightGroup = createElement('div', { className: 'hui-input__right-group' }, ...[container, messageEl].filter(Boolean));
      wrapperChildren = [labelEl, rightGroup];
    } else if (labelPos === 'inside') {
      wrapperChildren = [container, messageEl];
    } else {
      wrapperChildren = [labelEl, container, messageEl];
    }

    this._wrapper = createElement('div', { className: wrapperClasses },
      ...wrapperChildren.filter(Boolean));

    // Nhét cơ thể hoàn thiện vào bên trong Shadow DOM cho trình duyệt vẽ hình
    this.shadowRoot.appendChild(this._wrapper);
  }

  /**
   * Cập nhật hiển thị nút clear — chỉ hiện khi input có giá trị, ẩn khi trống.
   * Dùng class toggle thay vì re-render toàn bộ component (hiệu năng cao hơn).
   */
  _updateClearVisibility() {
    const hasText = this._input && this._input.value.length > 0;
    
    // Cập nhật class has-value trên wrapper để label biết khi nào cần đẩy lên
    if (this._wrapper) {
      this._wrapper.classList.toggle('hui-input-wrapper--has-value', hasText);
    }

    if (!this._clearBtn) return;
    this._clearBtn.classList.toggle('hui-input__clear--hidden', !hasText);
  }
}

// Chốt hệ thống chuẩn thư viện chung
if (!customElements.get('hui-input')) {
  customElements.define('hui-input', HuiInput);
}

export default HuiInput;
