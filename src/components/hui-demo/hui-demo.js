/**
 * HUI Demo — Khóa thực hành về Custom Element, Pseudo-classes và Pseudo-elements
 */

import styles from './hui-demo.css?raw';
import { createElement, createStyle } from '../../utils/dom.js';

class HuiDemo extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.appendChild(createStyle(styles));
    
    // 1. Ô chứa chính - Hé cửa ::part để cho phép lập trình viên bên ngoài đè CSS
    const container = createElement('div', { 
      className: 'box-container',
      part: 'container' // -> Nhờ chữ part này, ở ngoài file index.html họ gõ `hui-demo::part(container) { ... }` được.
    }, 
      createElement('h2', {}, 'Ví dụ về Shadow DOM & Pseudo-elements')
    );

    // 2. Ô Box dùng để thử hover, active, before, after
    const box = createElement('div', { className: 'box' }, 'Rê chuột vào tôi (:hover) hoặc click giữ (:active)');

    // 3. Khối Slot để thử ::slotted
    const slotArea = createElement('div', { style: 'margin-top: 20px;' }, 
      createElement('p', {}, 'Dưới đây là nội dung ngoài truyền qua Slot (Được style lại qua ::slotted):'),
      createElement('slot') // Cánh cửa
    );

    const input = createElement('input', { type: 'text', placeholder: 'Click focus vào đây để test focus-within' });
    container.appendChild(box);
    container.appendChild(input);
    
    this.shadowRoot.appendChild(container);
    this.shadowRoot.appendChild(slotArea);
  }
}

if (!customElements.get('hui-demo')) {
  customElements.define('hui-demo', HuiDemo);
}

export default HuiDemo;
