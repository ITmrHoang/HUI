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
 * Gắn design tokens vào document đúng MỘT lần (dùng chung cho mọi component).
 *
 * Vì sao không chép tokens vào từng shadow root nữa?
 * - Custom properties (--hui-*) tự kế thừa xuyên qua ranh giới Shadow DOM,
 *   nên chỉ cần khai báo ở document là component nào cũng đọc được.
 * - Nếu khai báo lại trên :host thì giá trị đó CHẶN giá trị kế thừa từ ngoài vào
 *   → `:root { --hui-primary: red }` hay `html[data-theme="dark"]` không có tác dụng.
 * - Mỗi instance mang 1 bản CSS tokens → tốn bộ nhớ vô ích.
 *
 * Thẻ <style> được chèn ở ĐẦU <head> để đứng trước mọi CSS của người dùng; kết hợp
 * selector :where(...) (độ ưu tiên 0) trong tokens.css → override nào của người dùng cũng thắng.
 * Gọi hàm này trong connectedCallback của từng component để vẫn chạy khi import lẻ
 * (import 'hui-lib/hui-button') mà không cần import bundle tổng.
 */
let tokensReady = false;

export function ensureTokens() {
  if (tokensReady || typeof document === 'undefined') return; // Đã gắn rồi / không có DOM (SSR)
  // Kiểm tra DOM phòng khi trang tải 2 bản HUI (mỗi bản có biến tokensReady riêng)
  if (document.querySelector('style[data-hui-tokens]')) {
    tokensReady = true;
    return;
  }
  tokensReady = true;

  const style = document.createElement('style');
  style.setAttribute('data-hui-tokens', '');
  style.textContent = rawTokens;

  const head = document.head || document.documentElement;
  head.prepend(style);
}
