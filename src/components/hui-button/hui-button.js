/**
 * HUI Button — Nút bấm đa năng (Web Component Vanilla JS)
 * Component này hoàn toàn tách biệt, bảo bọc CSS bên trong Shadow DOM.
 */

// Import file CSS dưới dạng chuỗi thô (raw string) nhờ Vite flag '?raw'
import styles from './hui-button.css?raw';

import { createElement, createStyle, injectTokens } from '../../utils/dom.js';
import { emitEvent } from '../../utils/events.js';

class HuiButton extends HTMLElement {
  /**
   * 1. observedAttributes:
   * Giống như props trong Vue. Trình duyệt sẽ lắng nghe sự thay đổi 
   * của các thuộc tính (attribute) HTML này để gọi hàm render lại.
   * Ví dụ: <hui-button loading></hui-button> -> Khi thêm/xóa 'loading', nó sẽ tự update.
   */
  static get observedAttributes() {
    return ['variant', 'size', 'disabled', 'loading', 'label', 'block'];
  }

  constructor() {
    super();
    // 2. Attach Shadow DOM ở chế độ mở (open). 
    // Chế độ 'open' giúp ta có thể dùng Javascript từ bên ngoài truy cập vào shadowRoot nếu thực sự cần thiết.
    this.attachShadow({ mode: 'open' });
    this._button = null; // Biến lưu trữ thẻ <button> thật bên trong
  }

  /**
   * 3. connectedCallback (Giống mounted() trong Vue):
   * Hàm này tự động chạy khi cái thẻ <hui-button> được chèn vào màn hình trang web thật.
   */
  connectedCallback() {
    // Tiêm các biến màu sắc('--hui-primary',...) vào
    injectTokens(this.shadowRoot);
    // Nhét phần CSS string từ file import vào thẻ <style> bên trong cái màng bọc Shadow DOM
    this.shadowRoot.appendChild(createStyle(styles));
    
    // Bắt đầu vẽ (render) nội dung DOM của nút
    this._render();
  }

  /**
   * 4. attributeChangedCallback (Giống watch(props) trong Vue):
   * Tự động chạy mỗi khi một attribute nằm trong mảng `observedAttributes` bị thay đổi.
   */
  attributeChangedCallback() {
    // Render lại nút bấm nếu nó đã tồn tại
    if (this._button) this._render();
  }

  /** 
   * 5. Hàm custom để vẽ cấu trúc HTML của component
   */
  _render() {
    // Xóa cái nút <button> HTML cũ trước khi vẽ lại cái mới (để tránh bị trùng lặp)
    if (this._button) this._button.remove();

    // Lấy giá trị của từng cục attribute hiện tại do người dùng truyền vào
    const variant = this.getAttribute('variant') || 'primary'; // Ví dụ: variant="danger"
    const size = this.getAttribute('size') || 'md';            // Ví dụ: size="sm"
    const loading = this.hasAttribute('loading');              // Biến boolean (true/false)
    const disabled = this.hasAttribute('disabled');

    // Nối chuỗi class
    const classes = [
      'hui-btn',
      `hui-btn--${variant}`,
      `hui-btn--${size}`,
      loading ? 'hui-btn--loading' : '',
    ].filter(Boolean).join(' '); // Dùng filter(Boolean) để loại bỏ các chuỗi rỗng

    // Tạo icon vòng tròn xoay nếu có thuộc tính loading
    const spinner = loading
      ? createElement('span', { className: 'hui-btn__spinner', 'aria-hidden': 'true' })
      : null;

    // 6. Slot (Khe cắm) (<slot></slot>)
    // Rất giống Vue <slot>. Nó là cánh cửa thần kỳ lấy cái text nội dung 
    // bên ngoài truyền vào. Ví dụ: <hui-button>Click Đi</hui-button>
    // Thì "Click Đi" sẽ rớt xuyên qua cánh cửa <slot> này để hiện bên trong.
    const slot = createElement('slot');

    // Tạo thành phần <button> html lõi xịn
    this._button = createElement('button', {
      className: classes,
      disabled: disabled || loading, // Đóng băng nếu bị vô hiệu hóa hoặc đang tải
      type: this.getAttribute('type') || 'button',
    }, ...[spinner, slot].filter(Boolean));

    // 7. Sinh sự kiện (Event Emitter - Giống $emit trong Vue)
    this._button.addEventListener('click', (e) => {
      if (!disabled && !loading) {
        // Ta bắn ra một sự kiện tên là 'hui-click' để người dùng ngoài HTML bắt được
        // Ví dụ trong Vue họ sẽ dùng: @hui-click="handleDosth"
        // Trong JS thuần họ sẽ dùng: document.querySelector('hui-button').addEventListener('hui-click', ...)
        emitEvent(this, 'hui-click', { originalEvent: e });
      }
    });

    // Cuối cùng: Nhét tất cả mọi thứ nãy giờ xây dựng vào trong cái bong bóng Shadow DOM
    this.shadowRoot.appendChild(this._button);
  }
}

// 8. customElements.define:
// Quy tắc bắt buộc của trình duyệt: tên thẻ mới PHẢI CÓ DẤU GẠCH NGANG (-) 
// để tránh trùng với thẻ hệ thống như <div>, <span> tương lai của W3C.
if (!customElements.get('hui-button')) {
  customElements.define('hui-button', HuiButton);
}

export default HuiButton;
