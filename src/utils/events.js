/**
 * Event Utilities — Hàm tiện ích quản lý sự kiện
 * Dùng chung cho tất cả component trong thư viện
 */

/**
 * Dispatch custom event từ element
 * @param {HTMLElement} element - Element phát sự kiện
 * @param {string} eventName - Tên sự kiện
 * @param {*} detail - Dữ liệu đính kèm
 * @param {Object} options - Tùy chọn (bubbles, composed, cancelable)
 * @returns {boolean} - true nếu event không bị preventDefault
 */
export function emitEvent(element, eventName, detail = null, options = {}) {
  const event = new CustomEvent(eventName, {
    detail,
    bubbles: options.bubbles ?? true,
    composed: options.composed ?? true, // Cho phép event xuyên qua Shadow DOM
    cancelable: options.cancelable ?? false,
  });
  return element.dispatchEvent(event);
}

/**
 * Debounce — Trì hoãn thực thi hàm
 * @param {Function} fn - Hàm cần debounce
 * @param {number} delay - Thời gian trì hoãn (ms)
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle — Giới hạn tần suất thực thi
 * @param {Function} fn - Hàm cần throttle
 * @param {number} limit - Khoảng cách tối thiểu giữa 2 lần gọi (ms)
 * @returns {Function}
 */
export function throttle(fn, limit = 100) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}
