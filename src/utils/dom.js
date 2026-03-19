/**
 * DOM Utilities — Hàm tiện ích tạo & thao tác DOM elements
 * Dùng chung cho tất cả component trong thư viện
 */

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
  // Inject các token CSS variables vào :host
  style.textContent = `
    :host {
      --hui-primary: #6366f1;
      --hui-primary-hover: #818cf8;
      --hui-primary-active: #4f46e5;
      --hui-primary-light: rgba(99, 102, 241, 0.12);
      --hui-secondary: #64748b;
      --hui-secondary-hover: #94a3b8;
      --hui-secondary-active: #475569;
      --hui-success: #10b981;
      --hui-success-light: rgba(16, 185, 129, 0.12);
      --hui-warning: #f59e0b;
      --hui-warning-light: rgba(245, 158, 11, 0.12);
      --hui-danger: #ef4444;
      --hui-danger-light: rgba(239, 68, 68, 0.12);
      --hui-info: #3b82f6;
      --hui-info-light: rgba(59, 130, 246, 0.12);
      --hui-bg: #ffffff;
      --hui-bg-secondary: #f8fafc;
      --hui-bg-tertiary: #f1f5f9;
      --hui-surface: #ffffff;
      --hui-overlay: rgba(0, 0, 0, 0.5);
      --hui-text: #0f172a;
      --hui-text-secondary: #475569;
      --hui-text-muted: #94a3b8;
      --hui-text-inverse: #ffffff;
      --hui-border: #e2e8f0;
      --hui-border-hover: #cbd5e1;
      --hui-border-focus: var(--hui-primary);
      --hui-radius-sm: 0.375rem;
      --hui-radius: 0.5rem;
      --hui-radius-md: 0.625rem;
      --hui-radius-lg: 0.75rem;
      --hui-radius-xl: 1rem;
      --hui-radius-full: 9999px;
      --hui-space-xs: 0.25rem;
      --hui-space-sm: 0.5rem;
      --hui-space-md: 0.75rem;
      --hui-space-lg: 1rem;
      --hui-space-xl: 1.5rem;
      --hui-space-2xl: 2rem;
      --hui-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --hui-font-xs: 0.75rem;
      --hui-font-sm: 0.875rem;
      --hui-font-base: 1rem;
      --hui-font-lg: 1.125rem;
      --hui-font-xl: 1.25rem;
      --hui-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --hui-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
      --hui-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      --hui-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
      --hui-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
      --hui-transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
      --hui-transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
      --hui-z-dropdown: 100;
      --hui-z-modal: 300;
      --hui-z-tooltip: 400;
    }
  `;
  shadowRoot.prepend(style);
}
