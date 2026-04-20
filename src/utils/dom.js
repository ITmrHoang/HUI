/**
 * DOM Utilities — Hàm tiện ích tạo & thao tác DOM elements
 * Dùng chung cho tất cả component trong thư viện
 */
import rawTokens from '../styles/tokens.css?raw';

/**
 * Tạo element với attributes và children
 * @param {string} tag - Tên tag (div, button, span...)
 * @param {Object} attrs - Object chứa attributes (class, id, style...)
 * @param  {...(Node|string)} children - Các child nodes hoặc text
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  // Gán attributes
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      // Hỗ trợ style dạng object
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Gán event listener (onClick, onInput...)
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      // Hỗ trợ data-* attributes
      Object.assign(el.dataset, value);
    } else if (typeof value === 'boolean') {
      // Boolean attributes (disabled, hidden...)
      if (value) el.setAttribute(key, '');
      else el.removeAttribute(key);
    } else {
      el.setAttribute(key, value);
    }
  }

  // Thêm children
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}

/**
 * Tạo style element từ CSS string
 * @param {string} css - CSS rules
 * @returns {HTMLStyleElement}
 */
export function createStyle(css) {
  const style = document.createElement('style');
  style.textContent = css;
  return style;
}

/**
 * Inject design tokens vào shadow root nếu chưa có
 * @param {ShadowRoot} shadowRoot
 */
export function injectTokens(shadowRoot) {
  if (shadowRoot.querySelector('[data-hui-tokens]')) return;

  const style = document.createElement('style');
  style.setAttribute('data-hui-tokens', '');
  
  // Thay thế :root của external tokens CSS thành :host để áp dụng đúng phạm vi Shadow DOM
  style.textContent = rawTokens.replace(/:root/g, ':host');
  
  shadowRoot.prepend(style);
}
