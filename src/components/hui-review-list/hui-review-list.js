/**
 * HUI Review List — Danh sách đánh giá sản phẩm (Organism): khối tổng hợp (hui-rating-summary, bấm thanh để lọc theo sao),
 * sắp xếp (mới nhất / điểm cao / điểm thấp / hữu ích), phân trang hoặc "Xem thêm", ảnh đính kèm mở hui-lightbox,
 * nút "Hữu ích (12)" cập nhật lạc quan. Dữ liệu qua DataController (data / src / fetchFn + skeleton / empty / error).
 */

import styles from './hui-review-list.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { DataController } from '../../core/data-controller.js';
import { t, getLocaleName } from '../../core/locale.js';
import { toDate } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import { lightbox } from '../hui-lightbox/lightbox-api.js';
import '../hui-icon/index.js';
import '../hui-avatar/index.js';
import '../hui-time/index.js';
import '../hui-button/index.js';
import '../hui-pagination/index.js';
import '../hui-rate/index.js';
import '../hui-skeleton/index.js';
import '../hui-empty/index.js';
import '../hui-result/index.js';

const SORTS = ['newest', 'highest', 'lowest', 'helpful'];
const PAGING = ['pagination', 'load-more', 'none'];

const FALLBACK = {
  vi: {
    'reviewList.label': 'Đánh giá của khách hàng',
    'reviewList.sort': 'Sắp xếp',
    'reviewList.newest': 'Mới nhất',
    'reviewList.highest': 'Điểm cao nhất',
    'reviewList.lowest': 'Điểm thấp nhất',
    'reviewList.helpful': 'Hữu ích nhất',
    'reviewList.count': '{count} đánh giá',
    'reviewList.countFiltered': '{count} đánh giá {stars} sao',
    'reviewList.clearFilter': 'Bỏ lọc',
    'reviewList.verified': 'Đã mua hàng',
    'reviewList.helpfulButton': 'Hữu ích ({count})',
    'reviewList.helpfulEmpty': 'Hữu ích',
    'reviewList.image': 'Xem ảnh {index}/{count} của {author}',
    'reviewList.images': 'Ảnh đính kèm',
    'reviewList.loadMore': 'Xem thêm đánh giá',
    'reviewList.noResults': 'Chưa có đánh giá {stars} sao',
    'reviewList.anonymous': 'Khách hàng',
  },
  en: {
    'reviewList.label': 'Customer reviews',
    'reviewList.sort': 'Sort by',
    'reviewList.newest': 'Newest',
    'reviewList.highest': 'Highest rating',
    'reviewList.lowest': 'Lowest rating',
    'reviewList.helpful': 'Most helpful',
    'reviewList.count': '{count} reviews',
    'reviewList.countFiltered': '{count} {stars}-star reviews',
    'reviewList.clearFilter': 'Clear filter',
    'reviewList.verified': 'Verified purchase',
    'reviewList.helpfulButton': 'Helpful ({count})',
    'reviewList.helpfulEmpty': 'Helpful',
    'reviewList.image': 'View photo {index}/{count} from {author}',
    'reviewList.images': 'Attached photos',
    'reviewList.loadMore': 'Show more reviews',
    'reviewList.noResults': 'No {stars}-star reviews yet',
    'reviewList.anonymous': 'Customer',
  },
};

function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const timeOf = (r) => toDate(r?.date)?.getTime() ?? 0;

/** Ảnh đính kèm: chuỗi URL hoặc { src, thumb, alt, caption } */
function normalizeImage(img, i, author) {
  if (typeof img === 'string') return { src: img, thumb: img, alt: `${author} — ${i + 1}` };
  return { ...img, thumb: img.thumb || img.src, alt: img.alt ?? `${author} — ${i + 1}` };
}

let uid = 0;

/**
 * Danh sách đánh giá. Mỗi mục: { id, author: { name, avatar }, rating, date, title, content, images[], helpful, verified }.
 *
 * @fires hui-helpful - Bấm "Hữu ích" (số đếm đổi ngay). Cancelable: preventDefault() để hoàn tác. detail: { review, helpful, count }
 * @fires hui-filter - Đổi bộ lọc số sao (bấm thanh tổng hợp / "Bỏ lọc"). detail: { stars } — null khi bỏ lọc
 * @fires hui-sort-change - Đổi cách sắp xếp. detail: { sort }
 * @fires hui-page-change - Đổi trang / xem thêm. detail: { page, pageSize }
 * @fires hui-load - (DataController) tải xong src / fetchFn. detail: { data, total }
 * @fires hui-error - (DataController) tải lỗi. detail: { error }
 * @csspart base - Khung ngoài
 * @csspart summary - <hui-rating-summary> (chỉnh sâu hơn bằng biến CSS --hui-rating-summary-*)
 * @csspart toolbar - Hàng đếm kết quả + sắp xếp
 * @csspart count - Chữ "128 đánh giá"
 * @csspart clear - Nút "Bỏ lọc"
 * @csspart sort - Ô chọn sắp xếp (<select>)
 * @csspart state - Vùng loading / empty / error
 * @csspart list - Danh sách đánh giá
 * @csspart review - Một đánh giá
 * @csspart avatar - Avatar người viết
 * @csspart author - Tên người viết
 * @csspart verified - Nhãn "Đã mua hàng"
 * @csspart rating - <hui-rating-display> của đánh giá
 * @csspart date - <hui-time> ngày viết
 * @csspart title - Tiêu đề đánh giá
 * @csspart content - Nội dung
 * @csspart images - Hàng ảnh đính kèm
 * @csspart thumb - Nút ảnh thu nhỏ
 * @csspart helpful - Nút "Hữu ích"; thêm helpful-active khi đã bấm
 * @csspart empty - Dòng "Chưa có đánh giá N sao" khi lọc không ra kết quả
 * @csspart footer - Vùng phân trang / xem thêm
 * @csspart pagination - <hui-pagination>
 * @csspart load-more - Nút "Xem thêm đánh giá"
 * @cssprop --hui-review-list-gap - Khoảng cách giữa các đánh giá (mặc định --hui-space-lg)
 * @cssprop --hui-review-list-divider - Màu đường kẻ giữa các đánh giá
 * @cssprop --hui-review-list-thumb-size - Cạnh ảnh thu nhỏ (mặc định 64px)
 * @cssprop --hui-review-list-thumb-radius - Bo góc ảnh thu nhỏ
 * @cssprop --hui-review-list-verified-color - Màu dấu ✓ của nhãn "Đã mua hàng" (mặc định --hui-success)
 * @cssprop --hui-review-list-helpful-active-color - Màu nút "Hữu ích" đã bấm (mặc định --hui-primary)
 */
class HuiReviewList extends DataController(HuiElement) {
  static localized = true;

  static properties = {
    /** newest | highest | lowest | helpful — cách sắp xếp */
    sort: { type: String, default: 'newest' },
    /** Lọc theo số sao (1–5); bỏ trống = tất cả */
    filterStars: { type: Number },
    /** pagination | load-more | none — cách chia trang */
    paging: { type: String, default: 'pagination' },
    /** Số đánh giá mỗi trang / mỗi lần xem thêm */
    pageSize: { type: Number, default: 5 },
    /** Trang hiện tại (bắt đầu từ 1) */
    page: { type: Number, default: 1 },
    /** Số mức sao */
    count: { type: Number, default: 5 },
    /** Số liệu tổng hợp { average, total, distribution } từ server — bỏ trống = tự tính từ data */
    summary: { type: Object, attribute: false },
    /** Ẩn khối tổng hợp */
    noSummary: { type: Boolean },
    /** Ẩn ô sắp xếp */
    noSort: { type: Boolean },
    /** Nhãn ARIA của vùng (mặc định "Đánh giá của khách hàng") */
    label: { type: String },
    /** Tắt hiệu ứng */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._uid = ++uid;
    /** id đánh giá → +1 khi người dùng đã bấm Hữu ích */
    this._voted = new Set();
  }

  render() {
    this._summaryEl = createElement('hui-rating-summary', { className: 'rl__summary', part: 'summary' });
    this._summaryEl.addEventListener('hui-filter', (e) => {
      e.stopPropagation();
      this._setFilter(e.detail?.stars ?? null);
    });

    this._countEl = createElement('span', { className: 'rl__count', part: 'count', role: 'status' });
    this._clearBtn = createElement('button', { type: 'button', className: 'rl__clear', part: 'clear', hidden: true });
    this._clearBtn.addEventListener('click', () => this._setFilter(null));
    this._sortSelect = createElement('select', { className: 'rl__sort', part: 'sort', id: `rl${this._uid}-sort` });
    this._sortSelect.addEventListener('change', () => {
      this.sort = this._sortSelect.value;
      this.page = 1;
      this.emit('hui-sort-change', { sort: this.sort });
    });
    this._sortLabel = createElement('label', { className: 'rl__sort-label', for: `rl${this._uid}-sort` });
    this._sortWrap = createElement('span', { className: 'rl__sort-wrap' }, this._sortLabel, this._sortSelect);
    this._toolbar = createElement('div', { className: 'rl__toolbar', part: 'toolbar' },
      createElement('span', { className: 'rl__count-wrap' }, this._countEl, this._clearBtn), this._sortWrap);

    this._state = createElement('div', { className: 'rl__state', part: 'state', hidden: true });
    this._list = createElement('ol', { className: 'rl__list', part: 'list', role: 'list' });

    this._pagination = createElement('hui-pagination', { part: 'pagination', 'hide-on-single-page': '' });
    this._pagination.addEventListener('change', (e) => {
      e.stopPropagation();
      this._goTo(e.detail.current, true);
    });
    this._loadMoreBtn = createElement('hui-button', { part: 'load-more', variant: 'outline' });
    this._loadMoreBtn.addEventListener('click', () => this._goTo((this.page || 1) + 1, false));
    this._footer = createElement('div', { className: 'rl__footer', part: 'footer', hidden: true }, this._pagination, this._loadMoreBtn);

    this._list.addEventListener('click', (e) => this._onListClick(e));

    this._base = createElement('section', { className: 'rl', part: 'base' },
      this._summaryEl, this._toolbar, this._state, this._list, this._footer);
    return this._base;
  }

  updated(changed) {
    super.updated(changed);
    if (changed.has('label') || changed.has('locale')) this._base.setAttribute('aria-label', this.label || tx('reviewList.label'));
    if (changed.has('locale') || changed.has('sort')) this._renderSortOptions();
    this._sortWrap.hidden = this.noSort;

    this.renderStateView(this._state, { skeletonRows: 4 });
    const ready = this.dataState === 'ready';
    this._summaryEl.hidden = this.noSummary || !(ready || this.summary);
    this._toolbar.hidden = !ready;

    if (['data', 'summary', 'count', 'filterStars', 'dataState'].some((k) => changed.has(k))) this._syncSummary();
    this._renderList();
  }

  // =====================================================
  // DỮ LIỆU
  // =====================================================

  get _reviews() {
    return Array.isArray(this.data) ? this.data.filter((r) => r && typeof r === 'object') : [];
  }

  /** Số sao (làm tròn, kẹp 1..count) của một đánh giá */
  _starsOf(r) {
    const n = Math.max(1, Math.floor(this.count) || 5);
    return Math.min(Math.max(Math.round(num(r.rating)), 1), n);
  }

  _keyOf(r, i) {
    return r.id ?? `#${i}`;
  }

  /** Đánh giá sau lọc + sắp xếp (chưa cắt trang) */
  get filtered() {
    const stars = Number.isFinite(this.filterStars) && this.filterStars > 0 ? this.filterStars : null;
    const list = this._reviews.map((r, i) => ({ r, i }))
      .filter(({ r }) => stars === null || this._starsOf(r) === stars);
    const sort = SORTS.includes(this.sort) ? this.sort : 'newest';
    const byDate = (a, b) => timeOf(b.r) - timeOf(a.r);
    const cmp = {
      newest: byDate,
      highest: (a, b) => num(b.r.rating) - num(a.r.rating) || byDate(a, b),
      lowest: (a, b) => num(a.r.rating) - num(b.r.rating) || byDate(a, b),
      helpful: (a, b) => this._helpfulCount(b.r, b.i) - this._helpfulCount(a.r, a.i) || byDate(a, b),
    }[sort];
    return list.sort(cmp);
  }

  _helpfulCount(r, i) {
    return Math.max(0, num(r.helpful)) + (this._voted.has(this._keyOf(r, i)) ? 1 : 0);
  }

  get _paging() {
    return PAGING.includes(this.paging) ? this.paging : 'pagination';
  }

  _syncSummary() {
    const el = this._summaryEl;
    el.count = this.count;
    el.active = Number.isFinite(this.filterStars) && this.filterStars > 0 ? this.filterStars : null;
    if (this.summary) {
      el.data = this.summary;
      return;
    }
    const distribution = {};
    for (const r of this._reviews) {
      const s = this._starsOf(r);
      distribution[s] = (distribution[s] || 0) + 1;
    }
    const list = this._reviews;
    const average = list.length ? list.reduce((sum, r) => sum + num(r.rating), 0) / list.length : 0;
    el.data = { average, total: list.length, distribution };
  }

  _setFilter(stars) {
    const next = Number.isFinite(stars) && stars > 0 ? stars : null;
    if ((this.filterStars ?? null) === next) {
      this._summaryEl.active = next;
      return;
    }
    this.filterStars = next;
    this.page = 1;
    this.emit('hui-filter', { stars: next });
  }

  _goTo(page, scroll) {
    const pageSize = Math.max(1, Math.floor(this.pageSize) || 5);
    const max = Math.max(1, Math.ceil(this.filtered.length / pageSize));
    const next = Math.min(Math.max(1, page), max);
    if (next === this.page) return;
    this.page = next;
    this.emit('hui-page-change', { page: next, pageSize });
    if (scroll) {
      const smooth = !this.noAnimation && !animationsDisabled();
      this._toolbar.scrollIntoView?.({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
    }
  }

  // =====================================================
  // DỰNG GIAO DIỆN
  // =====================================================

  _renderSortOptions() {
    this._sortLabel.textContent = tx('reviewList.sort');
    const current = SORTS.includes(this.sort) ? this.sort : 'newest';
    this._sortSelect.replaceChildren(...SORTS.map((s) => createElement('option', { value: s }, tx(`reviewList.${s}`))));
    this._sortSelect.value = current;
  }

  _renderList() {
    const ready = this.dataState === 'ready';
    this._list.hidden = !ready;
    this._footer.hidden = !ready;
    if (!ready) {
      this._list.replaceChildren();
      return;
    }

    const all = this.filtered;
    const pageSize = Math.max(1, Math.floor(this.pageSize) || 5);
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    const page = Math.min(Math.max(1, Math.floor(this.page) || 1), pages);
    const mode = this._paging;
    const shown = mode === 'none' ? all
      : mode === 'load-more' ? all.slice(0, page * pageSize)
        : all.slice((page - 1) * pageSize, page * pageSize);

    const stars = Number.isFinite(this.filterStars) && this.filterStars > 0 ? this.filterStars : null;
    this._countEl.textContent = stars
      ? tx('reviewList.countFiltered', { count: all.length, stars })
      : tx('reviewList.count', { count: all.length });
    this._clearBtn.hidden = stars === null;
    this._clearBtn.textContent = tx('reviewList.clearFilter');

    if (!shown.length) {
      this._list.replaceChildren(createElement('li', { className: 'rl__empty', part: 'empty' },
        tx('reviewList.noResults', { stars: stars ?? '' })));
    } else {
      this._list.replaceChildren(...shown.map(({ r, i }) => this._renderReview(r, i)));
    }

    // Footer
    this._pagination.hidden = mode !== 'pagination';
    this._pagination.total = all.length;
    this._pagination.pageSize = pageSize;
    this._pagination.current = page;
    this._loadMoreBtn.hidden = !(mode === 'load-more' && page < pages);
    this._loadMoreBtn.textContent = tx('reviewList.loadMore');
    this._footer.hidden = mode === 'none' || pages <= 1;
  }

  _renderReview(r, i) {
    const key = this._keyOf(r, i);
    const idBase = `rl${this._uid}-${i}`;
    const author = r.author && typeof r.author === 'object' ? r.author : { name: r.author };
    const name = author.name || tx('reviewList.anonymous');

    const avatar = createElement('hui-avatar', { part: 'avatar', 'aria-hidden': 'true', name });
    if (author.avatar) avatar.setAttribute('src', author.avatar);

    const who = createElement('div', { className: 'rl__who' },
      createElement('span', { className: 'rl__author', part: 'author', id: `${idBase}-author` }, name));
    if (r.verified) {
      who.append(createElement('span', { className: 'rl__verified', part: 'verified' },
        createElement('hui-icon', { name: 'check', 'aria-hidden': 'true' }), tx('reviewList.verified')));
    }
    const meta = createElement('div', { className: 'rl__meta' },
      createElement('hui-rating-display', { part: 'rating', size: 'sm', value: String(num(r.rating)), count: String(this.count || 5) }));
    if (r.date) meta.append(createElement('hui-time', { part: 'date', className: 'rl__date', datetime: String(r.date), format: 'date' }));

    const head = createElement('header', { className: 'rl__head' }, avatar, createElement('div', { className: 'rl__head-main' }, who, meta));
    const article = createElement('article', { className: 'rl__review', 'aria-labelledby': `${idBase}-author` }, head);

    if (r.title) article.append(createElement('div', { className: 'rl__title', part: 'title' }, String(r.title)));
    if (r.content) article.append(createElement('p', { className: 'rl__content', part: 'content' }, String(r.content)));

    const images = Array.isArray(r.images) ? r.images.map((img, k) => normalizeImage(img, k, name)) : [];
    if (images.length) {
      const row = createElement('ul', { className: 'rl__images', part: 'images', role: 'list', 'aria-label': tx('reviewList.images') });
      images.forEach((img, k) => {
        const btn = createElement('button', {
          type: 'button',
          className: 'rl__thumb',
          part: 'thumb',
          'data-review': String(i),
          'data-image': String(k),
          'aria-label': tx('reviewList.image', { index: k + 1, count: images.length, author: name }),
        }, createElement('img', { src: img.thumb, alt: '', loading: 'lazy', decoding: 'async' }));
        row.append(createElement('li', {}, btn));
      });
      article.append(row);
    }

    const voted = this._voted.has(key);
    const count = this._helpfulCount(r, i);
    const helpful = createElement('button', {
      type: 'button',
      className: `rl__helpful${voted ? ' rl__helpful--active' : ''}${voted && this._popKey === key ? ' rl__helpful--pop' : ''}`,
      part: voted ? 'helpful helpful-active' : 'helpful',
      'aria-pressed': String(voted),
      'data-review': String(i),
      'data-helpful': '',
    }, createElement('hui-icon', { name: 'thumbs-up', 'aria-hidden': 'true' }),
    createElement('span', {}, count > 0 ? tx('reviewList.helpfulButton', { count }) : tx('reviewList.helpfulEmpty')));
    article.append(createElement('footer', { className: 'rl__actions' }, helpful));

    return createElement('li', { className: 'rl__item', part: 'review', 'data-key': String(key) }, article);
  }

  _onListClick(e) {
    const btn = e.target.closest?.('button[data-review]');
    if (!btn) return;
    const i = Number(btn.dataset.review);
    const r = this._reviews[i];
    if (!r) return;

    if (btn.hasAttribute('data-helpful')) {
      this._toggleHelpful(r, i);
      return;
    }
    if (btn.dataset.image !== undefined) {
      const author = r.author?.name || r.author || tx('reviewList.anonymous');
      const items = (r.images || []).map((img, k) => {
        const n = normalizeImage(img, k, author);
        return { src: n.src, alt: n.alt, caption: n.caption };
      });
      lightbox.open(items, Number(btn.dataset.image), { origin: btn.querySelector('img'), noDownload: true });
    }
  }

  _toggleHelpful(r, i) {
    const key = this._keyOf(r, i);
    const on = !this._voted.has(key);
    // Lạc quan: đổi ngay, hoàn tác nếu bên ngoài preventDefault()
    if (on) this._voted.add(key);
    else this._voted.delete(key);
    const ok = this.emit('hui-helpful', { review: r, helpful: on, count: this._helpfulCount(r, i) }, { cancelable: true });
    if (!ok) {
      if (on) this._voted.delete(key);
      else this._voted.add(key);
    }
    this._popKey = key; // chỉ nút vừa bấm "nảy"
    this._renderList();
    this._popKey = undefined;
    // Giữ focus trên nút vừa bấm sau khi dựng lại
    this._list.querySelector(`li[data-key="${CSS.escape(String(key))}"] [data-helpful]`)?.focus();
  }

  /** Các khóa (id) đánh giá người dùng đã bấm "Hữu ích" — chỉ đọc */
  get votedKeys() {
    return [...this._voted];
  }
}

defineElement('hui-review-list', HuiReviewList);

export default HuiReviewList;
