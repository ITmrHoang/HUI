/**
 * HUI Timeline Feed — Luồng hoạt động từ dữ liệu (Organism): avatar + "Ai đó đã làm gì với cái gì" + thời gian
 * tương đối (hui-time), nhóm theo ngày ("Hôm nay", "Hôm qua", ngày cụ thể).
 * Dữ liệu qua DataController (data / src / fetchFn + skeleton / empty / error), khuôn tùy biến bằng <template> con.
 */

import styles from './hui-timeline-feed.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { DataController } from '../../core/data-controller.js';
import { renderTemplate, delegateActions } from '../../core/template.js';
import { t, getLocaleName } from '../../core/locale.js';
import { toDate, formatDate } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { runAnimation, animationsDisabled } from '../../utils/animate.js';
import '../hui-avatar/index.js';
import '../hui-icon/index.js';
import '../hui-time/index.js';
import '../hui-button/index.js';
import '../hui-skeleton/index.js';
import '../hui-empty/index.js';
import '../hui-result/index.js';

const COLOR_TOKENS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];
const DAY = 24 * 3600 * 1000;

const FALLBACK = {
  vi: {
    'timelineFeed.label': 'Hoạt động gần đây',
    'timelineFeed.today': 'Hôm nay',
    'timelineFeed.yesterday': 'Hôm qua',
    'timelineFeed.loadMore': 'Xem thêm hoạt động',
    'timelineFeed.loading': 'Đang tải thêm...',
  },
  en: {
    'timelineFeed.label': 'Recent activity',
    'timelineFeed.today': 'Today',
    'timelineFeed.yesterday': 'Yesterday',
    'timelineFeed.loadMore': 'Load more activity',
    'timelineFeed.loading': 'Loading more...',
  },
};

function tx(key) {
  const v = t(key);
  if (v !== key) return v;
  return (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

/** Mốc 0h của ngày chứa `d` (giờ địa phương) */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Nhãn nhóm ngày: "Hôm nay" / "Hôm qua" / "Thứ Hai, 12 tháng 10" (khác năm → kèm năm)
 * @param {Date} date
 * @param {Date} now
 */
export function dayLabel(date, now = new Date()) {
  const diff = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (diff === 0) return tx('timelineFeed.today');
  if (diff === 1) return tx('timelineFeed.yesterday');
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  if (date.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return formatDate(date, opts);
}

let uid = 0;

/**
 * Luồng hoạt động. Mỗi mục: { id, user: { name, avatar }, action, target, href, time (ISO), icon, color, content }.
 *
 * @fires hui-load-more - Bấm "Xem thêm" (has-more). detail: { count } — số mục đang có
 * @fires hui-action - (template) bấm phần tử có data-action. detail: { action, item, index, originalEvent }
 * @fires hui-load - (DataController) tải xong src / fetchFn. detail: { data, total }
 * @fires hui-error - (DataController) tải lỗi. detail: { error }
 * @slot - Một <template> con làm khuôn cho phần thân mỗi mục (data-bind="user.name"…)
 * @csspart base - Khung ngoài
 * @csspart state - Vùng loading / empty / error
 * @csspart group - Một nhóm ngày
 * @csspart group-label - Tiêu đề nhóm ngày
 * @csspart list - Danh sách mục của nhóm
 * @csspart item - Một mục
 * @csspart avatar - <hui-avatar> người thực hiện
 * @csspart icon - Huy hiệu icon góc avatar
 * @csspart text - Câu mô tả hoạt động
 * @csspart user - Tên người thực hiện
 * @csspart target - Đối tượng (link khi có href)
 * @csspart time - <hui-time>
 * @csspart content - Nội dung trích dẫn (bình luận…)
 * @csspart footer - Vùng nút "Xem thêm"
 * @csspart load-more - Nút "Xem thêm" (<hui-button>)
 * @cssprop --hui-timeline-feed-line-color - Màu đường nối giữa các avatar
 * @cssprop --hui-timeline-feed-gap - Khoảng cách giữa các mục (mặc định --hui-space-lg)
 * @cssprop --hui-timeline-feed-avatar-size - Cỡ avatar (mặc định 32px)
 * @cssprop --hui-timeline-feed-group-color - Màu tiêu đề nhóm ngày
 * @cssprop --hui-timeline-feed-group-bg - Nền tiêu đề nhóm (khi sticky-header)
 * @cssprop --hui-timeline-feed-content-bg - Nền khối nội dung trích dẫn
 * @cssprop --hui-timeline-feed-icon-color - Màu huy hiệu icon (attribute color của mục ưu tiên hơn)
 */
class HuiTimelineFeed extends DataController(HuiElement) {
  static localized = true;

  static properties = {
    /** day | none — nhóm theo ngày hay một danh sách liền */
    groupBy: { type: String, default: 'day' },
    /** desc | asc | none — sắp xếp theo `time` (none = giữ thứ tự dữ liệu) */
    order: { type: String, default: 'desc' },
    /** relative | date | datetime | time — định dạng thời gian của từng mục (hui-time) */
    timeFormat: { type: String, default: 'relative' },
    /** Thời điểm "bây giờ" để tính Hôm nay / Hôm qua (mặc định thời gian thật) — tiện cho test/SSR */
    now: { type: String },
    /** Tiêu đề nhóm ngày dính khi cuộn */
    stickyHeader: { type: Boolean },
    /** Cấp heading của tiêu đề nhóm (aria-level) */
    headingLevel: { type: Number, default: 3 },
    /** Còn dữ liệu → hiện nút "Xem thêm" (phát hui-load-more) */
    hasMore: { type: Boolean },
    /** Đang tải thêm (nút xoay); tự tắt khi `data` đổi */
    loadingMore: { type: Boolean },
    /** Hàm tự dựng phần thân mục: (item, index) => Node — thay cho <template> */
    renderItem: { type: Object, attribute: false },
    /** Nhãn ARIA của vùng (mặc định "Hoạt động gần đây") */
    label: { type: String },
    /** Tắt hiệu ứng hiện lần lượt của mục mới */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._uid = ++uid;
    this._seen = new Set();
    this._actionsOff = null;
  }

  render() {
    this._state = createElement('div', { className: 'tf__state', part: 'state', hidden: true });
    this._groups = createElement('div', { className: 'tf__groups' });
    this._loadMoreBtn = createElement('hui-button', { part: 'load-more', variant: 'outline', size: 'sm' });
    this._loadMoreBtn.addEventListener('click', () => this._onLoadMore());
    this._footer = createElement('div', { className: 'tf__footer', part: 'footer', hidden: true }, this._loadMoreBtn);
    this._templateSlot = createElement('slot');
    this._templateSlot.addEventListener('slotchange', () => this.requestUpdate('template'));
    this._base = createElement('section', { className: 'tf', part: 'base' },
      this._state, this._groups, this._footer, createElement('div', { hidden: true }, this._templateSlot));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._actionsOff = delegateActions(this, this._groups);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._actionsOff?.();
    this._actionsOff = null;
  }

  updated(changed) {
    if (changed.has('data')) this.loadingMore = false;
    super.updated(changed);
    if (changed.has('label') || changed.has('locale')) this._base.setAttribute('aria-label', this.label || tx('timelineFeed.label'));
    this._base.classList.toggle('tf--sticky', this.stickyHeader);

    if (['data', 'groupBy', 'order', 'timeFormat', 'now', 'renderItem', 'template', 'locale', 'headingLevel', 'dataState']
      .some((k) => changed.has(k))) this._renderList();

    this.renderStateView(this._state, { skeletonRows: 4 });
    this._state.classList.toggle('tf__state--busy', this.dataState === 'loading');
    this._syncFooter();
  }

  /** Mục đã sắp xếp (theo order) */
  get entries() {
    const list = Array.isArray(this.data) ? [...this.data] : [];
    if (this.order === 'none') return list;
    const dir = this.order === 'asc' ? 1 : -1;
    return list.sort((a, b) => ((toDate(a?.time)?.getTime() ?? 0) - (toDate(b?.time)?.getTime() ?? 0)) * dir);
  }

  get _template() {
    return this._templateSlot?.assignedElements().find((el) => el.localName === 'template') || null;
  }

  _onLoadMore() {
    if (this.loadingMore) return;
    this.loadingMore = true;
    this.emit('hui-load-more', { count: Array.isArray(this.data) ? this.data.length : 0 });
  }

  _syncFooter() {
    const ready = this.dataState === 'ready';
    this._footer.hidden = !(ready && this.hasMore);
    this._loadMoreBtn.toggleAttribute('loading', this.loadingMore);
    this._loadMoreBtn.textContent = this.loadingMore ? tx('timelineFeed.loading') : tx('timelineFeed.loadMore');
  }

  // =====================================================
  // DỰNG DANH SÁCH
  // =====================================================

  _renderList() {
    if (this.dataState !== 'ready') {
      this._groups.replaceChildren();
      this._groups.hidden = true;
      return;
    }
    this._groups.hidden = false;
    const now = toDate(this.now) || new Date();
    const groups = [];
    let current = null;
    this.entries.forEach((item, index) => {
      const date = toDate(item?.time);
      const key = this.groupBy === 'none' ? 'all' : date ? String(startOfDay(date)) : 'unknown';
      if (!current || current.key !== key) {
        current = { key, label: this.groupBy === 'none' ? '' : date ? dayLabel(date, now) : '', items: [] };
        groups.push(current);
      }
      current.items.push({ item, index });
    });

    const fresh = [];
    const level = Math.min(Math.max(Math.floor(this.headingLevel || 3), 1), 6);
    const nodes = groups.map((g, gi) => {
      const headingId = `tf${this._uid}-g${gi}`;
      const list = createElement('ol', { className: 'tf__list', part: 'list', role: 'list' });
      for (const { item, index } of g.items) {
        const li = this._renderEntry(item, index);
        const key = item?.id ?? `${index}|${item?.time}`;
        if (!this._seen.has(key)) {
          this._seen.add(key);
          fresh.push(li);
        }
        list.append(li);
      }
      const section = createElement('section', { className: 'tf__group', part: 'group' });
      if (g.label) {
        section.append(createElement('div', {
          className: 'tf__group-label', part: 'group-label', role: 'heading', 'aria-level': String(level), id: headingId,
        }, g.label));
        section.setAttribute('aria-labelledby', headingId);
      }
      section.append(list);
      return section;
    });
    this._groups.replaceChildren(...nodes);

    // Lần đầu không chạy hiệu ứng (đã có skeleton); chỉ mục mới (tải thêm / realtime) mới trượt vào
    if (this._renderedOnce && fresh.length && !this.noAnimation && !animationsDisabled()) {
      runAnimation(fresh.slice(0, 10), 'fade-up', { duration: 400, stagger: 50 });
    }
    this._renderedOnce = true;
  }

  _renderEntry(item, index) {
    const li = createElement('li', { className: 'tf__item', part: 'item' });
    const user = item?.user || {};
    const color = item?.color ? (COLOR_TOKENS.includes(item.color) ? `var(--hui-${item.color})` : item.color) : '';
    if (color) li.style.setProperty('--_tf-icon-color', color);

    // Cỡ avatar lấy từ --hui-timeline-feed-avatar-size (không đặt attribute size)
    const avatar = createElement('hui-avatar', { part: 'avatar' });
    if (user.avatar) avatar.setAttribute('src', user.avatar);
    if (user.name) avatar.setAttribute('name', user.name);
    const aside = createElement('div', { className: 'tf__aside', 'aria-hidden': 'true' }, avatar);
    if (item?.icon) {
      aside.append(createElement('span', { className: 'tf__icon', part: 'icon' }, createElement('hui-icon', { name: item.icon })));
    }

    let main;
    const tpl = this._template;
    if (this.renderItem) {
      main = this.renderItem(item, index);
    } else if (tpl) {
      main = renderTemplate(tpl, item, index);
    }
    if (!(main instanceof Node)) main = this._defaultBody(item);

    li.append(aside, createElement('div', { className: 'tf__main' }, main));
    return li;
  }

  _defaultBody(item) {
    const user = item?.user || {};
    const text = createElement('p', { className: 'tf__text', part: 'text' });
    if (user.name) text.append(createElement('strong', { className: 'tf__user', part: 'user' }, user.name));
    if (item?.action) text.append(` ${item.action}`);
    if (item?.target) {
      const target = item.href
        ? createElement('a', { className: 'tf__target', part: 'target', href: item.href }, String(item.target))
        : createElement('strong', { className: 'tf__target', part: 'target' }, String(item.target));
      text.append(' ', target);
    }
    const frag = document.createDocumentFragment();
    frag.append(text);
    if (item?.time) {
      frag.append(createElement('hui-time', { className: 'tf__time', part: 'time', datetime: String(item.time), format: this.timeFormat || 'relative' }));
    }
    if (item?.content) frag.append(createElement('div', { className: 'tf__content', part: 'content' }, String(item.content)));
    const wrap = createElement('div', { className: 'tf__body' });
    wrap.append(frag);
    return wrap;
  }
}

defineElement('hui-timeline-feed', HuiTimelineFeed);

export default HuiTimelineFeed;
