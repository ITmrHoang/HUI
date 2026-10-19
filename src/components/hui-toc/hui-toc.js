/**
 * HUI Toc — Mục lục tự sinh (Molecule): quét heading trong `target`, dựng danh sách lồng nhau, tự gắn id
 * (slug tiếng Việt bỏ dấu), scroll-spy tô mục đang đọc (IntersectionObserver), cuộn mượt có bù `offset`
 * cho header dính, thanh chỉ báo trượt theo mục đang chọn.
 */

import styles from './hui-toc.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';

const FALLBACK = { 'toc.title': { vi: 'Mục lục', en: 'On this page' } };

function msg(key) {
  const v = t(key);
  if (v !== key) return v;
  return FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
}

/** "Giới thiệu Đà Nẵng!" → "gioi-thieu-da-nang" (bỏ dấu tiếng Việt, đ → d) */
export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Phần tử cuộn gần nhất (null = cuộn cả trang) */
function scrollParent(el) {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (/(auto|scroll|overlay)/.test(overflowY) && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

let uid = 0;

/**
 * Mục lục. Mục đang đọc: link có aria-current="true" + part link-active.
 *
 * @fires hui-change - Mục đang đọc đổi (scroll-spy). detail: { id, heading }
 * @fires hui-navigate - Bấm một mục (cancelable — preventDefault để tự cuộn). detail: { id, heading }
 * @csspart base - Thẻ <nav>
 * @csspart title - Tiêu đề "Mục lục"
 * @csspart list - Mỗi danh sách <ol> (kèm list-nested cho cấp con)
 * @csspart item - Mỗi <li>
 * @csspart link - Mỗi liên kết; mục đang đọc thêm link-active
 * @csspart indicator - Thanh chỉ báo trượt theo mục đang đọc
 * @cssprop --hui-toc-font-size - Cỡ chữ
 * @cssprop --hui-toc-color - Màu link
 * @cssprop --hui-toc-hover-color - Màu link khi hover
 * @cssprop --hui-toc-active-color - Màu link đang đọc
 * @cssprop --hui-toc-active-bg - Nền link đang đọc
 * @cssprop --hui-toc-track-color - Màu đường ray bên trái
 * @cssprop --hui-toc-indicator-color - Màu thanh chỉ báo
 * @cssprop --hui-toc-indicator-width - Độ dày thanh chỉ báo
 * @cssprop --hui-toc-indent - Thụt lề mỗi cấp
 * @cssprop --hui-toc-title-color - Màu tiêu đề
 * @cssprop --hui-toc-sticky-top - Khoảng cách mép trên khi sticky
 * @cssprop --hui-toc-max-height - Chiều cao tối đa khi sticky (mặc định 100vh - 2 × sticky-top)
 */
class HuiToc extends HuiElement {
  static localized = true;

  static properties = {
    /** CSS selector vùng nội dung chứa heading (bỏ trống = cả trang) */
    target: { type: String },
    /** Các cấp heading đưa vào mục lục, vd "h2,h3" */
    headings: { type: String, default: 'h2,h3' },
    /** Bù trừ (px) khi cuộn tới heading và khi xác định mục đang đọc — bằng chiều cao header dính */
    offset: { type: Number, default: 0 },
    /** Dính khi cuộn (position: sticky), tự cuộn trong nếu dài */
    sticky: { type: Boolean },
    /** Tiêu đề trên mục lục (mặc định "Mục lục") */
    label: { type: String },
    /** Ẩn tiêu đề (vẫn dùng làm aria-label) */
    noTitle: { type: Boolean },
    /** Không ghi #id lên thanh địa chỉ khi bấm */
    noHash: { type: Boolean },
    /** Tắt cuộn mượt và hiệu ứng thanh chỉ báo */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._entries = [];   // [{ id, heading, link, level }]
    this._activeId = null;
    this._io = null;
    this._mo = null;
    this._rebuildTimer = null;
    this._titleId = `hui-toc-title-${++uid}`;
  }

  /** Id heading đang đọc */
  get activeId() {
    return this._activeId;
  }

  /** Danh sách heading đang có trong mục lục */
  get entries() {
    return this._entries.map(({ id, heading, level }) => ({ id, heading, level, text: heading.textContent.trim() }));
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback(); // lần đầu: updated() đã gọi refresh()
    this.listen(window, 'scroll', () => this._onScroll(), { passive: true, capture: true });
    this.listen(window, 'resize', () => this._onScroll(), { passive: true });
    // Nội dung render sau mục lục (thứ tự HTML, framework) → thử lại khi trang tải xong
    if (document.readyState === 'loading') this.listen(document, 'DOMContentLoaded', () => this.refresh(), { once: true });
    if (reconnect) this.refresh();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._io?.disconnect();
    this._mo?.disconnect();
    this._io = null;
    this._mo = null;
    clearTimeout(this._rebuildTimer);
    cancelAnimationFrame(this._raf);
  }

  render() {
    this._title = createElement('p', { className: 'toc__title', part: 'title', id: this._titleId });
    this._indicator = createElement('span', { className: 'toc__indicator', part: 'indicator', 'aria-hidden': 'true' });
    this._listWrap = createElement('div', { className: 'toc__body' }, this._indicator);
    this._nav = createElement('nav', { className: 'toc', part: 'base' }, this._title, this._listWrap);
    this._nav.addEventListener('click', (e) => this._onClick(e));
    return this._nav;
  }

  updated(changed) {
    if (changed.has('label') || changed.has('locale') || changed.has('noTitle')) {
      const text = this.label || msg('toc.title');
      this._title.textContent = text;
      this._title.hidden = this.noTitle;
      if (this.noTitle) {
        this._nav.removeAttribute('aria-labelledby');
        this._nav.setAttribute('aria-label', text);
      } else {
        this._nav.removeAttribute('aria-label');
        this._nav.setAttribute('aria-labelledby', this._titleId);
      }
    }
    if (changed.has('noAnimation')) this._nav.classList.toggle('toc--static', this.noAnimation);
    if (changed.has('target') || changed.has('headings')) this.refresh();
    else if (changed.has('offset')) this._observe();
  }

  /** Quét lại heading và dựng lại mục lục (gọi khi nội dung đổi mà MutationObserver không bắt được) */
  refresh() {
    if (!this._hasRendered) return;
    this._build();
    this._watchContent();
  }

  _root() {
    if (!this.target) return document.body;
    const scope = this.getRootNode();
    try {
      return scope.querySelector?.(this.target) || document.querySelector(this.target);
    } catch {
      return null;
    }
  }

  _selector() {
    const list = String(this.headings || 'h2,h3').split(/[\s,]+/).filter((h) => /^h[1-6]$/i.test(h));
    return (list.length ? list : ['h2', 'h3']).join(',');
  }

  _build() {
    const root = this._root();
    const headings = root
      ? [...root.querySelectorAll(this._selector())].filter((h) => !h.hasAttribute('data-toc-ignore') && h.textContent.trim())
      : [];
    const used = new Set();
    this._entries = headings.map((heading) => {
      // Gắn id còn thiếu: slug tiếng Việt, trùng thì thêm -2, -3…
      if (!heading.id) {
        const base = slugify(heading.textContent) || 'muc';
        let id = base;
        for (let n = 2; used.has(id) || (document.getElementById(id) && document.getElementById(id) !== heading); n++) id = `${base}-${n}`;
        heading.id = id;
      }
      used.add(heading.id);
      return { id: heading.id, heading, level: Number(heading.tagName[1]), link: null };
    });

    // Dựng danh sách lồng theo cấp: cấp sâu hơn → <ol> con trong <li> trước đó
    const minLevel = Math.min(...this._entries.map((e) => e.level), 6);
    const rootList = createElement('ol', { className: 'toc__list', part: 'list' });
    const stack = [{ level: minLevel, list: rootList, lastItem: null }];
    for (const entry of this._entries) {
      const link = createElement('a', { className: 'toc__link', part: 'link', href: `#${entry.id}`, 'data-id': entry.id },
        entry.heading.dataset.tocLabel || entry.heading.textContent.trim());
      entry.link = link;
      const li = createElement('li', { className: 'toc__item', part: 'item' }, link);
      while (stack.length > 1 && entry.level < stack[stack.length - 1].level) stack.pop();
      let top = stack[stack.length - 1];
      if (entry.level > top.level && top.lastItem) {
        const sub = createElement('ol', { className: 'toc__list toc__list--nested', part: 'list list-nested' });
        top.lastItem.append(sub);
        top = { level: entry.level, list: sub, lastItem: null };
        stack.push(top);
      }
      top.list.append(li);
      top.lastItem = li;
    }
    this._listWrap.replaceChildren(this._indicator, rootList);
    this._nav.hidden = this._entries.length === 0;
    this._activeId = null;
    this._observe();
    this._updateActive();
  }

  /** Nội dung đích thay đổi (thêm/bớt heading) → dựng lại (gom 100ms) */
  _watchContent() {
    this._mo?.disconnect();
    const root = this._root();
    if (!root || typeof MutationObserver !== 'function') return;
    this._mo = new MutationObserver((records) => {
      // Bỏ qua thay đổi do chính mục lục gắn id
      if (records.every((r) => r.type === 'attributes')) return;
      clearTimeout(this._rebuildTimer);
      this._rebuildTimer = setTimeout(() => this._build(), 100);
    });
    this._mo.observe(root, { childList: true, subtree: true, characterData: true });
  }

  /** IntersectionObserver: heading đi qua vạch đọc (dưới mép trên + offset) → tính lại mục đang đọc */
  _observe() {
    this._io?.disconnect();
    if (typeof IntersectionObserver !== 'function' || !this._entries.length) return;
    const top = Math.max(0, Number(this.offset) || 0);
    this._io = new IntersectionObserver(() => this._updateActive(), {
      rootMargin: `-${top}px 0px -55% 0px`,
      threshold: [0, 1],
    });
    this._entries.forEach((e) => this._io.observe(e.heading));
  }

  _onScroll() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this._updateActive();
    });
  }

  /** Mục đang đọc = heading cuối cùng đã đi qua vạch đọc; cuộn chạm đáy trang → mục cuối */
  _updateActive() {
    if (!this._entries.length) return;
    const line = (Number(this.offset) || 0) + Math.min(120, window.innerHeight * 0.25);
    let active = null;
    for (const e of this._entries) {
      if (e.heading.getBoundingClientRect().top - line <= 1) active = e;
      else break;
    }
    const doc = document.scrollingElement || document.documentElement;
    const atBottom = doc.scrollHeight > doc.clientHeight && Math.ceil(window.scrollY + window.innerHeight) >= doc.scrollHeight - 2;
    if (atBottom) {
      const last = this._entries[this._entries.length - 1];
      if (last.heading.getBoundingClientRect().top < window.innerHeight) active = last;
    }
    this._setActive(active || null);
  }

  _setActive(entry) {
    const id = entry?.id ?? null;
    if (id === this._activeId) {
      this._moveIndicator(entry);
      return;
    }
    this._activeId = id;
    for (const e of this._entries) {
      const on = e === entry;
      e.link.classList.toggle('toc__link--active', on);
      e.link.setAttribute('part', on ? 'link link-active' : 'link');
      if (on) e.link.setAttribute('aria-current', 'true');
      else e.link.removeAttribute('aria-current');
    }
    this._moveIndicator(entry);
    if (entry) {
      this.emit('hui-change', { id, heading: entry.heading });
      // Mục lục dài (sticky) → giữ mục đang đọc trong tầm nhìn của chính mục lục
      if (this.sticky && this._nav.scrollHeight > this._nav.clientHeight) {
        const linkTop = entry.link.offsetTop;
        if (linkTop < this._nav.scrollTop || linkTop > this._nav.scrollTop + this._nav.clientHeight - 32) {
          this._nav.scrollTop = linkTop - this._nav.clientHeight / 2;
        }
      }
    }
  }

  _moveIndicator(entry) {
    const ind = this._indicator;
    if (!entry || !entry.link.isConnected) {
      ind.style.opacity = '0';
      return;
    }
    const wrap = this._listWrap.getBoundingClientRect();
    const r = entry.link.getBoundingClientRect();
    ind.style.opacity = '1';
    ind.style.transform = `translateY(${r.top - wrap.top}px)`;
    ind.style.height = `${r.height}px`;
  }

  _onClick(e) {
    const link = e.target.closest?.('a[data-id]');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    const entry = this._entries.find((x) => x.id === link.dataset.id);
    if (!entry) return;
    e.preventDefault();
    if (!this.emit('hui-navigate', { id: entry.id, heading: entry.heading }, { cancelable: true })) return;
    this.scrollToHeading(entry.id);
  }

  /** Cuộn tới heading theo id (bù offset), đặt focus vào heading cho trình đọc màn hình */
  scrollToHeading(id) {
    const entry = this._entries.find((x) => x.id === id);
    if (!entry) return;
    const { heading } = entry;
    const smooth = !this.noAnimation && !prefersReducedMotion();
    const offset = Number(this.offset) || 0;
    const parent = scrollParent(heading);
    if (parent) {
      const top = heading.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop - offset;
      parent.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    } else {
      const top = heading.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    }
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    if (!this.noHash) {
      try {
        history.replaceState(history.state, '', `#${encodeURIComponent(id)}`);
      } catch { /* iframe sandbox */ }
    }
    this._setActive(entry);
  }
}

defineElement('hui-toc', HuiToc);

export default HuiToc;
