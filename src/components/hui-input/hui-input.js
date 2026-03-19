/**
 * HUI Input — Ô nhập liệu đa năng (Web Component Vanilla JS)
 * Component này hoàn toàn tách biệt, bảo bọc CSS bên trong Shadow DOM.
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
    return ['type', 'label', 'placeholder', 'value', 'size', 'disabled',
            'required', 'error', 'success', 'hint', 'clearable', 'name'];
  }

  constructor() {
    super();
    // 2. Attach Shadow DOM (open). Bọc lại các logic thẻ HTML thật và style cách ly vào đây.
    this.attachShadow({ mode: 'open' });
    this._input = null;   // Trỏ tới thẻ <input> vật lý ẩn chứa bên trong 
    this._wrapper = null; // Trỏ tới div container ngoài cùng

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
      emitEvent(this, 'hui-input', { value: e.target.value });
      
      // Nếu type là 'search', bắn thêm sự kiện hoãn binh debounce.
      if (type === 'search') this._debouncedEmit(e.target.value);
    });

    // Bắn event 'change' khi user thoát khỏi input
    this._input.addEventListener('change', (e) => {
      emitEvent(this, 'hui-change', { value: e.target.value });
    });

    // Phụ trợ: Nút làm sạch Clear (X) - nếu user kích hoạt
    const clearBtn = clearable
      ? createElement('button', {
          className: 'hui-input__clear',
          type: 'button',
          'aria-label': 'Clear',
          onClick: () => {
            this._input.value = '';
            emitEvent(this, 'hui-input', { value: '' });
            emitEvent(this, 'hui-clear');
            this._input.focus(); // Tập trung lại con trỏ chuột vào vùng type chữ
          },
        }, '✕')
      : null;

    // Phụ trợ: Ngăn Slot trống cho đoạn Icon / Kí tự Tiền tố (prefix) / Hậu tố (suffix)
    // Hướng dẫn người dùng xài: <hui-input><span slot="prefix">@</span></hui-input>
    const prefix = createElement('span', { className: 'hui-input__prefix' },
      createElement('slot', { name: 'prefix' }));
    const suffix = createElement('span', { className: 'hui-input__suffix' },
      createElement('slot', { name: 'suffix' }));

    // Bố trí giao diện tổng mảng
    const containerClass = [
      'hui-input__container',
      error ? 'hui-input__container--error' : '',
      success ? 'hui-input__container--success' : '',
    ].filter(Boolean).join(' ');

    const container = createElement('div', { className: containerClass },
      prefix, this._input, ...[clearBtn, suffix].filter(Boolean));

    // Nơi đổ bộ câu tin thông báo phía đít: lỗi đỏ, mướt xanh, hay gợi ý đen
    const message = error || success || hint;
    const messageEl = message
      ? createElement('span', {
          className: `hui-input__message hui-input__message--${error ? 'error' : success ? 'success' : 'hint'}`,
        }, message)
      : null;

    // Hàn gắn liên hợp tất cả phụ kiện thành một thân hình duy nhất
    this._wrapper = createElement('div', { className: 'hui-input-wrapper' },
      ...[labelEl, container, messageEl].filter(Boolean));

    // Nhét cơ thể hoàn thiện vào bên trong cái Bóng đêm (Shadow DOM) cho trình duyệt vẽ hình
    this.shadowRoot.appendChild(this._wrapper);
  }
}

// Chốt hệ thống chuẩn thư viện chung
if (!customElements.get('hui-input')) {
  customElements.define('hui-input', HuiInput);
}

export default HuiInput;
