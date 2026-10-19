/**
 * DataController — mixin cho component hiển thị dữ liệu (card-grid, data-view, list, faq, table…).
 *
 *   class HuiCardGrid extends DataController(HuiElement) { … }
 *
 * Ba cách đưa dữ liệu vào (chọn 1):
 *   el.data = [...]                                    ← có sẵn mảng
 *   <hui-x src="/api/products" data-path="data.items"> ← tự fetch JSON (GET, kèm params thành query)
 *   el.fetchFn = async (params, { signal }) => [...]   ← tự viết hàm lấy dữ liệu (axios, GraphQL…)
 *
 * Tự quản lý trạng thái `dataState`: 'idle' | 'loading' | 'error' | 'empty' | 'ready'
 *   + :state(loading | error | empty | ready) cho CSS, + renderStateView() vẽ sẵn giao diện mặc định.
 * Đổi `params` (trang, từ khóa, bộ lọc…) → tự tải lại; request cũ bị hủy (AbortController),
 * `debounce` (ms) để gõ tìm kiếm không bắn request liên tục.
 * Sự kiện: hui-load {data, total}, hui-error {error}.
 */

import { t } from './locale.js';

const STATES = ['loading', 'error', 'empty', 'ready'];

/** Đọc "data.items" trong object trả về */
const pick = (obj, path) => (path ? path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj) : obj);

export const DataController = (Base) => class extends Base {
  static properties = {
    /** Mảng dữ liệu hiển thị (gán trực tiếp, hoặc được điền sau khi tải từ src / fetchFn) */
    data: { type: Array, default: null },
    /** URL trả về JSON — tự fetch khi gắn vào trang hoặc khi params đổi */
    src: { type: String },
    /** Đường dẫn tới mảng trong JSON trả về, vd "data.items" */
    dataPath: { type: String },
    /** Đường dẫn tới tổng số bản ghi (cho phân trang), vd "data.total" */
    totalPath: { type: String },
    /** Tham số truy vấn (trang, từ khóa, lọc…) — đổi là tải lại */
    params: { type: Object, default: null },
    /** Hàm tự lấy dữ liệu: async (params, { signal }) => Array | { data, total } */
    fetchFn: { type: Object, attribute: false },
    /** Biến đổi dữ liệu sau khi tải: (raw) => Array */
    transform: { type: Object, attribute: false },
    /** Trì hoãn tải lại khi params đổi liên tục (ms) */
    debounce: { type: Number, default: 0 },
    /** Ép hiển thị trạng thái đang tải */
    loading: { type: Boolean },
    /** Chữ khi không có dữ liệu (mặc định theo locale) */
    emptyText: { type: String },
  };

  constructor() {
    super();
    /** 'idle' | 'loading' | 'error' | 'empty' | 'ready' */
    this.dataState = 'idle';
    this.dataError = null;
    this.dataTotal = null;
    this._dataAbort = null;
    this._dataTimer = 0;
    this._dataSeq = 0;
  }

  updated(changed) {
    if (changed.has('src') || changed.has('params') || changed.has('fetchFn') || changed.has('dataPath')) {
      if (this.src || this.fetchFn) this._scheduleLoad(changed.has('params') && this._hasLoadedOnce);
    }
    if (changed.has('data') || changed.has('loading')) this._syncDataState();
    super.updated?.(changed);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this._dataAbort?.abort();
    clearTimeout(this._dataTimer);
  }

  /** Tải lại ngay (vd: nút "Thử lại") — trả Promise khi xong */
  reload() {
    clearTimeout(this._dataTimer);
    return this._load();
  }

  _scheduleLoad(useDebounce) {
    clearTimeout(this._dataTimer);
    if (useDebounce && this.debounce > 0) {
      this._dataTimer = setTimeout(() => this._load(), this.debounce);
    } else {
      // Gom thay đổi cùng lúc (src + params gán liên tiếp) về 1 request
      this._dataTimer = setTimeout(() => this._load(), 0);
    }
  }

  async _load() {
    this._dataAbort?.abort();
    const abort = new AbortController();
    this._dataAbort = abort;
    const seq = ++this._dataSeq;
    this._setDataState('loading');

    try {
      let raw;
      if (this.fetchFn) {
        raw = await this.fetchFn(this.params || {}, { signal: abort.signal });
      } else {
        const url = new URL(this.src, document.baseURI);
        for (const [k, v] of Object.entries(this.params || {})) {
          if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
        }
        const res = await fetch(url, { signal: abort.signal, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        raw = await res.json();
      }
      if (seq !== this._dataSeq) return; // đã có request mới hơn → bỏ kết quả cũ

      // Hỗ trợ cả kiểu trả về { data, total } của fetchFn
      const isEnvelope = raw && !Array.isArray(raw) && !this.dataPath && Array.isArray(raw.data);
      let list = isEnvelope ? raw.data : pick(raw, this.dataPath);
      this.dataTotal = isEnvelope ? raw.total ?? null : this.totalPath ? pick(raw, this.totalPath) : null;
      if (this.transform) list = this.transform(list, raw);
      this.dataError = null;
      this._hasLoadedOnce = true;
      this.data = Array.isArray(list) ? list : list == null ? [] : [list];
      this._syncDataState();
      this.emit('hui-load', { data: this.data, total: this.dataTotal });
    } catch (error) {
      if (abort.signal.aborted || seq !== this._dataSeq) return;
      this.dataError = error;
      this._setDataState('error');
      this.emit('hui-error', { error });
    }
  }

  _syncDataState() {
    if (this.loading) return this._setDataState('loading');
    if (this.dataState === 'error' && this.data === null) return undefined;
    if (this.data === null || this.data === undefined) {
      return this._setDataState(this.src || this.fetchFn ? 'loading' : 'idle');
    }
    return this._setDataState(this.data.length ? 'ready' : 'empty');
  }

  _setDataState(state) {
    if (this.dataState === state) return;
    this.dataState = state;
    for (const s of STATES) this.setState(s, s === state);
    this.toggleAttribute('aria-busy', state === 'loading');
    this.requestUpdate('dataState');
  }

  /**
   * Vẽ giao diện mặc định cho trạng thái loading / empty / error vào `container`
   * (trả về false khi đang 'ready' để component tự vẽ dữ liệu).
   * Component nào muốn giao diện riêng thì cung cấp slot `loading` / `empty` / `error` và bỏ qua hàm này.
   */
  renderStateView(container, { skeletonRows = 3 } = {}) {
    const state = this.dataState;
    if (state === 'ready' || state === 'idle') {
      container.replaceChildren();
      container.hidden = true;
      return false;
    }
    container.hidden = false;
    const make = (tag, fallbackText) => {
      if (customElements.get(tag)) return document.createElement(tag);
      const div = document.createElement('div');
      div.textContent = fallbackText;
      return div;
    };

    if (state === 'loading') {
      const el = make('hui-skeleton', t('common.loading'));
      el.setAttribute('active', '');
      el.setAttribute('rows', String(skeletonRows));
      container.replaceChildren(el);
    } else if (state === 'empty') {
      const el = make('hui-empty', this.emptyText || t('empty.description'));
      if (this.emptyText) el.setAttribute('description', this.emptyText);
      container.replaceChildren(el);
    } else if (state === 'error') {
      const el = make('hui-result', String(this.dataError?.message || 'Error'));
      el.setAttribute('status', 'error');
      el.setAttribute('title', t('data.errorTitle'));
      el.setAttribute('sub-title', String(this.dataError?.message || ''));
      const retry = make('hui-button', t('data.retry'));
      retry.textContent = t('data.retry');
      retry.setAttribute('slot', 'extra');
      retry.addEventListener('click', () => this.reload());
      el.append(retry);
      container.replaceChildren(el);
    }
    return true;
  }
};

export default DataController;
