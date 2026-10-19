/**
 * HUI Infinite Scroll — đặt ở cuối danh sách, cuộn tới thì tải thêm (Molecule, A3.6).
 *   <ul id="list">…</ul>
 *   <hui-infinite-scroll threshold="300"></hui-infinite-scroll>
 *
 * Hai cách dùng:
 *  1. Sự kiện: nghe `hui-load-more`, tự bật `loading` khi tải, tắt khi xong; hết dữ liệu → has-more="false".
 *  2. Hàm: `el.loadMore = async () => { …; return còn_nữa }` — component tự bật/tắt loading, bắt lỗi
 *     (hiện nút Thử lại), trả về `false` = hết dữ liệu.
 * Tải xong mà mốc vẫn còn trong vùng nhìn thấy (danh sách chưa đủ dài) → tự tải tiếp.
 */

import styles from './hui-infinite-scroll.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-spinner/hui-spinner.js';
import '../hui-button/hui-button.js';

/** Chuỗi dự phòng khi locale.js chưa có key infiniteScroll.* */
const FALLBACK = {
  vi: {
    'infiniteScroll.loading': 'Đang tải thêm...',
    'infiniteScroll.end': 'Hết dữ liệu',
    'infiniteScroll.error': 'Không tải được dữ liệu',
    'infiniteScroll.retry': 'Thử lại',
  },
  en: {
    'infiniteScroll.loading': 'Loading more...',
    'infiniteScroll.end': 'No more data',
    'infiniteScroll.error': 'Failed to load',
    'infiniteScroll.retry': 'Retry',
  },
};

function tx(key) {
  const v = t(key);
  if (v !== key) return v;
  return (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

/**
 * @fires hui-load-more - Mốc đi vào vùng nhìn thấy, cần tải thêm. cancelable (preventDefault → không gọi loadMore). detail: { retry }
 * @fires hui-error - Hàm loadMore ném lỗi. detail: { error }
 * @slot loading - Thay giao diện đang tải (mặc định hui-spinner + chữ)
 * @slot end - Thay giao diện hết dữ liệu (mặc định chữ "Hết dữ liệu")
 * @slot error - Thay chữ báo lỗi (nút Thử lại vẫn giữ)
 * @csspart base - Khung ngoài (role="status")
 * @csspart loading - Vùng đang tải
 * @csspart spinner - hui-spinner
 * @csspart end - Vùng hết dữ liệu
 * @csspart error - Vùng báo lỗi
 * @csspart retry - Nút Thử lại (hui-button)
 * @cssprop --hui-infinite-scroll-padding - Đệm khung (mặc định --hui-space-lg)
 * @cssprop --hui-infinite-scroll-color - Màu chữ trạng thái (mặc định --hui-text-tertiary)
 * @cssprop --hui-infinite-scroll-font-size - Cỡ chữ trạng thái (mặc định --hui-font-sm)
 * @cssprop --hui-infinite-scroll-error-color - Màu chữ lỗi (mặc định --hui-danger)
 */
class HuiInfiniteScroll extends HuiElement {
  static properties = {
    /** Đang tải (tự bật khi dùng loadMore; dùng sự kiện thì tự bật/tắt) */
    loading: { type: Boolean },
    /** true | false — "false": hết dữ liệu → ngừng theo dõi, hiện chữ kết thúc */
    hasMore: { type: String, default: 'true' },
    /** Hiện trạng thái lỗi + nút Thử lại (tự bật khi loadMore ném lỗi) */
    error: { type: Boolean },
    /** Khoảng cách (px) trước khi tới mốc thì bắt đầu tải (rootMargin) */
    threshold: { type: Number, default: 200 },
    /** CSS selector của khung cuộn chứa danh sách (tìm trong tổ tiên trước, rồi cả trang); bỏ trống = cửa sổ */
    root: { type: String },
    /** Tạm ngừng theo dõi */
    disabled: { type: Boolean },
    /** Hàm tải trang kế: async () => boolean | void (false = hết dữ liệu) */
    loadMore: { type: Object, attribute: false },
    /** Chữ khi hết dữ liệu (mặc định theo locale) */
    endText: { type: String },
    /** Chữ khi đang tải (mặc định theo locale) */
    loadingText: { type: String },
    /** Chữ khi lỗi (mặc định theo locale) */
    errorText: { type: String },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._intersecting = false;
    this._busy = false;
  }

  render() {
    // Spinner chỉ để nhìn — chữ bên cạnh đã đọc trạng thái (role="status")
    this._spinner = createElement('hui-spinner', { part: 'spinner', size: 'sm', 'aria-hidden': 'true' });
    this._loadingText = createElement('span', { className: 'infinite__text' });
    this._loadingBox = createElement('div', { className: 'infinite__loading', part: 'loading', hidden: true },
      createElement('slot', { name: 'loading' }, this._spinner, this._loadingText));

    this._endText = createElement('span', { className: 'infinite__text' });
    this._endBox = createElement('div', { className: 'infinite__end', part: 'end', hidden: true },
      createElement('slot', { name: 'end' }, this._endText));

    this._errorText = createElement('span', { className: 'infinite__text' });
    this._retryBtn = createElement('hui-button', { part: 'retry', size: 'sm', variant: 'outline' });
    this._retryBtn.addEventListener('click', () => this.retry());
    this._errorBox = createElement('div', { className: 'infinite__error', part: 'error', hidden: true },
      createElement('slot', { name: 'error' }, this._errorText), this._retryBtn);

    this._base = createElement('div', { className: 'infinite', part: 'base', role: 'status', 'aria-live': 'polite' },
      this._loadingBox, this._errorBox, this._endBox);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._observe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._io?.disconnect();
    this._io = null;
  }

  updated(changed) {
    if (changed.has('locale') || ['endText', 'loadingText', 'errorText'].some((k) => changed.has(k))) {
      this._loadingText.textContent = this.loadingText || tx('infiniteScroll.loading');
      this._endText.textContent = this.endText || tx('infiniteScroll.end');
      this._errorText.textContent = this.errorText || tx('infiniteScroll.error');
      this._retryBtn.textContent = tx('infiniteScroll.retry');
    }
    if (['loading', 'hasMore', 'error'].some((k) => changed.has(k))) {
      const ended = !this._hasMoreFlag;
      this._loadingBox.hidden = !this.loading;
      this._errorBox.hidden = this.loading || !this.error;
      this._endBox.hidden = this.loading || this.error || !ended;
      this.toggleAttribute('aria-busy', this.loading);
      this.setState('loading', this.loading);
      this.setState('ended', ended);
      this.setState('error', this.error);
    }
    if (changed.has('root') || changed.has('threshold')) {
      if (this.isConnected && this._hasRendered && this._io) this._observe();
    }
    // Vừa tải xong / có thêm dữ liệu / bật lại → kiểm tra mốc còn trong vùng nhìn thấy không
    const settled = (changed.has('loading') && changed.get('loading') === true && !this.loading)
      || (changed.has('hasMore') && changed.get('hasMore') !== undefined)
      || (changed.has('disabled') && changed.get('disabled') === true)
      || (changed.has('error') && changed.get('error') === true && !this.error);
    if (settled && this._io) this.refresh();
  }

  // =====================================================
  // API
  // =====================================================

  /** Kiểm tra lại vị trí mốc (gọi sau khi tự đổi danh sách mà mốc vẫn đang hiện) */
  refresh() {
    if (!this._io) return;
    // unobserve + observe → IntersectionObserver báo lại trạng thái hiện tại
    requestAnimationFrame(() => {
      if (!this._io) return;
      this._io.unobserve(this);
      this._io.observe(this);
    });
  }

  /** Xóa lỗi và tải lại ngay */
  retry() {
    this.error = false;
    this._trigger(true);
  }

  // =====================================================
  // NỘI BỘ
  // =====================================================

  get _hasMoreFlag() {
    return String(this.hasMore) !== 'false';
  }

  _resolveRoot() {
    if (!this.root) return null;
    try {
      return this.closest(this.root) || this.getRootNode().querySelector?.(this.root) || document.querySelector(this.root);
    } catch {
      return null;
    }
  }

  _observe() {
    this._io?.disconnect();
    this._io = null;
    if (typeof IntersectionObserver !== 'function') return;
    const px = Math.max(0, Number(this.threshold) || 0);
    this._io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      this._intersecting = entry.isIntersecting;
      if (entry.isIntersecting) this._trigger(false);
    }, { root: this._resolveRoot(), rootMargin: `${px}px ${px}px ${px}px ${px}px`, threshold: 0 });
    this._io.observe(this);
  }

  async _trigger(isRetry) {
    if (this.loading || this._busy || this.error || this.disabled || !this._hasMoreFlag) return;
    const proceed = this.emit('hui-load-more', { retry: isRetry }, { cancelable: true });
    if (!proceed || typeof this.loadMore !== 'function') return;

    this._busy = true;
    this.loading = true;
    try {
      const result = await this.loadMore();
      if (result === false) this.hasMore = 'false';
    } catch (error) {
      this.error = true;
      this.emit('hui-error', { error });
    } finally {
      this._busy = false;
      this.loading = false;
    }
  }
}

defineElement('hui-infinite-scroll', HuiInfiniteScroll);

export default HuiInfiniteScroll;
