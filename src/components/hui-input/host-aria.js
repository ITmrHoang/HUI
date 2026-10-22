/**
 * Chuyển aria-label / aria-labelledby / aria-describedby đặt trên host (custom element) xuống control
 * thật trong shadow DOM. id trong aria-labelledby / -describedby nằm ở light DOM nên không tham chiếu
 * xuyên shadow root được → đọc chữ của các phần tử đó rồi gán aria-label / aria-description cho control.
 * Dùng chung cho hui-input và hui-select.
 */

/** Các attribute trên host cần theo dõi (thêm vào observedAttributes) */
export const HOST_ARIA_ATTRS = ['aria-label', 'aria-labelledby', 'aria-describedby'];

/** Chữ của các phần tử theo danh sách id (tìm trong cùng root với host) */
function textOfIds(host, ids) {
  const root = host.getRootNode();
  return (ids || '').split(/\s+/).filter(Boolean)
    .map((id) => (root.getElementById ? root.getElementById(id) : document.getElementById(id)))
    .filter(Boolean)
    .map((el) => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

/** Tên lấy từ host: aria-labelledby thắng aria-label (đúng thứ tự tính tên của ARIA); '' nếu không có */
export function hostAriaName(host) {
  return textOfIds(host, host.getAttribute('aria-labelledby')) || (host.getAttribute('aria-label') || '').trim();
}

/** Mô tả lấy từ aria-describedby của host; '' nếu không có */
export function hostAriaDescription(host) {
  return textOfIds(host, host.getAttribute('aria-describedby'));
}

/** Gán / gỡ attribute theo giá trị (rỗng → gỡ) */
export function setOrRemove(el, attr, value) {
  if (value) el.setAttribute(attr, value);
  else el.removeAttribute(attr);
}
