/**
 * Tải động thẻ con mà organism chỉ cần ở một số chế độ / tùy chọn (phân trang, ô tìm, sắp xếp, trạng thái lỗi…)
 * → import lẻ organism không kéo theo mọi component con. Dùng chung cho hui-data-view, hui-card-grid, hui-faq,
 * hui-kpi-row, hui-review-list, hui-contact-form, hui-media-card.
 *
 * import() luôn trỏ tới index.js (entry của component) — entry đã là 1 file riêng trong dist nên bundler
 * không phải dựng namespace giả trong chunk dùng chung (kéo theo runtime helper nằm ở chunk khác).
 * LOADERS chỉ chứa component của nhóm core (bản CDN gộp mọi import() vào cùng file); thẻ khác truyền loader riêng.
 */

const LOADERS = {
  'hui-avatar': () => import('../hui-avatar/index.js'),
  'hui-button': () => import('../hui-button/index.js'),
  'hui-checkbox': () => import('../hui-checkbox/index.js'),
  'hui-empty': () => import('../hui-empty/index.js'),
  'hui-input': () => import('../hui-input/index.js'),
  'hui-pagination': () => import('../hui-pagination/index.js'),
  'hui-progress': () => import('../hui-progress/index.js'),
  'hui-result': () => import('../hui-result/index.js'),
  'hui-select': () => import('../hui-select/index.js'),
  'hui-skeleton': () => import('../hui-skeleton/index.js'),
  'hui-tabs': () => import('../hui-tabs/index.js'),
  'hui-tag': () => import('../hui-tag/index.js'),
  'hui-time': () => import('../hui-time/index.js'),
};

const pending = new Map();

/**
 * Bảo đảm thẻ đã được định nghĩa (tải lần đầu cần tới). Promise xong khi thẻ đã đăng ký; không bao giờ reject.
 * @param {string} tag
 * @param {() => Promise<unknown>} [load] - import() riêng cho thẻ không có trong LOADERS
 */
export function ensureElement(tag, load = LOADERS[tag]) {
  if (customElements.get(tag) || !load) return Promise.resolve();
  if (!pending.has(tag)) {
    pending.set(tag, load()
      .then(() => customElements.whenDefined(tag))
      .catch((err) => {
        pending.delete(tag); // lỗi mạng → lần sau thử lại
        console.error(`[h-ui] Không tải được <${tag}>`, err);
      }));
  }
  return pending.get(tag);
}

/** Tải nhiều thẻ; Promise xong khi tất cả đã đăng ký */
export const ensureElements = (tags) => Promise.all(tags.map((tag) => ensureElement(tag)));

/** Thẻ mà DataController.renderStateView() dùng cho từng trạng thái */
const STATE_TAGS = { loading: ['hui-skeleton'], empty: ['hui-empty'], error: ['hui-result', 'hui-button'] };

/**
 * renderStateView() chỉ dùng thẻ ĐÃ định nghĩa (chưa có → chữ dự phòng) → vẽ ngay, đồng thời tải thẻ của
 * trạng thái hiện tại rồi vẽ lại nếu component vẫn ở trạng thái đó và vùng trạng thái còn hiển thị.
 */
export function renderLazyStateView(host, container, options) {
  const state = host.dataState;
  const missing = (STATE_TAGS[state] || []).filter((tag) => !customElements.get(tag));
  if (missing.length) {
    ensureElements(missing).then(() => {
      if (host.dataState === state && !container.hidden && host.isConnected) host.renderStateView(container, options);
    });
  }
  return host.renderStateView(container, options);
}
