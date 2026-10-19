/**
 * HUI Tabs — Thẻ chuyển nội dung (Ant Tabs + MUI Tabs)
 * <hui-tabs active-key="2"><hui-tab-panel key="1" label="Tab 1">...</hui-tab-panel></hui-tabs>
 * Thanh tab dựng trong Shadow DOM từ các <hui-tab-panel> con; panel vẫn ở light DOM (chỉ bật/tắt hidden).
 * Bàn phím theo WAI-ARIA APG Tabs (kích hoạt tự động). Parts / events / biến CSS: xem JSDoc của class.
 */

import styles from './hui-tabs.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/hui-icon.js';
import './hui-tab-panel.js';

const TYPES = ['line', 'card', 'editable-card'];
const PLACEMENTS = ['top', 'bottom', 'left', 'right'];
const SIZES = ['sm', 'md', 'lg'];
/** Attribute của panel ảnh hưởng tới thanh tab */
const PANEL_ATTRS = ['key', 'name', 'label', 'icon', 'disabled', 'closable'];

/** Chuỗi chưa có trong locale → dùng mặc định theo ngôn ngữ (xem báo cáo locale keys mới) */
const FALLBACK = {
  vi: { 'tabs.add': 'Thêm tab', 'tabs.remove': 'Đóng tab' },
  en: { 'tabs.add': 'Add tab', 'tabs.remove': 'Close tab' },
};
function tx(key) {
  const v = t(key);
  return v !== key ? v : FALLBACK[getLocaleName() === 'vi' ? 'vi' : 'en'][key] ?? key;
}

let uid = 0;

/**
 * Thanh tab + vùng nội dung. Mỗi tab là một <hui-tab-panel> con.
 *
 * @fires change - Đổi tab do người dùng (click / bàn phím) hoặc tab đang mở bị gỡ. detail: { key }
 * @fires hui-add - Bấm nút "+" (type="editable-card"). Người dùng tự thêm <hui-tab-panel>
 * @fires hui-close - Bấm ✕ hoặc phím Delete trên tab đóng được. detail: { key, panel } — người dùng tự gỡ panel
 * @slot - Các <hui-tab-panel>
 * @slot extra - Nội dung phụ bên phải (dưới) thanh tab
 * @csspart base - Khung ngoài cùng
 * @csspart nav - Thanh tab (gồm nút cuộn, nút thêm, extra)
 * @csspart nav-wrap - Vùng cuộn chứa các tab
 * @csspart tablist - Danh sách tab (role=tablist)
 * @csspart tab - Mỗi tab (thêm tab-active / tab-disabled theo trạng thái)
 * @csspart tab-icon - Icon của tab
 * @csspart tab-label - Nhãn của tab
 * @csspart close-button - Nút ✕ của tab
 * @csspart ink-bar - Thanh gạch chân trượt theo tab đang chọn (type="line")
 * @csspart scroll-button - Nút cuộn (thêm scroll-prev / scroll-next)
 * @csspart add-button - Nút "+" (editable-card)
 * @csspart extra - Khung slot extra
 * @csspart content - Vùng chứa panel
 * @cssprop --hui-tabs-color - Màu chữ tab
 * @cssprop --hui-tabs-hover-color - Màu chữ khi hover
 * @cssprop --hui-tabs-active-color - Màu chữ tab đang chọn
 * @cssprop --hui-tabs-ink-color - Màu thanh gạch chân
 * @cssprop --hui-tabs-ink-size - Độ dày thanh gạch chân (2px)
 * @cssprop --hui-tabs-border-color - Màu đường kẻ dưới thanh tab
 * @cssprop --hui-tabs-gap - Khoảng cách giữa các tab
 * @cssprop --hui-tabs-tab-padding - Padding mỗi tab
 * @cssprop --hui-tabs-font-size - Cỡ chữ tab
 * @cssprop --hui-tabs-card-bg - Nền tab (type card) chưa chọn
 * @cssprop --hui-tabs-card-active-bg - Nền tab (type card) đang chọn
 * @cssprop --hui-tabs-nav-margin - Khoảng cách thanh tab ↔ nội dung
 */
class HuiTabs extends HuiElement {
  static properties = {
    /** Key của tab đang mở; trống → tab đầu tiên không disabled */
    activeKey: { type: String },
    /** line | card | editable-card — editable-card: có nút ✕ trên tab và nút "+" thêm tab */
    type: { type: String, default: 'line' },
    /** top | bottom | left | right — vị trí thanh tab so với nội dung */
    placement: { type: String, default: 'top' },
    /** Căn giữa các tab (khi không tràn) */
    centered: { type: Boolean },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Ẩn nút "+" của editable-card */
    hideAdd: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    this._tabs = [];        // [{ key, panel, tab }]
    this._current = null;   // key đang mở thực tế
    this._syncQueued = false;
    this._inkReady = false;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this.requestUpdate('locale'); // lần updated() đầu cũng đặt chữ theo locale
    this._ink = createElement('span', { className: 'tabs__ink', part: 'ink-bar', 'aria-hidden': 'true' });
    this._list = createElement('div', { className: 'tabs__list', part: 'tablist', role: 'tablist' }, this._ink);
    this._list.addEventListener('keydown', (e) => this._onKeydown(e));
    this._list.addEventListener('click', (e) => this._onClick(e));

    this._wrap = createElement('div', { className: 'tabs__nav-wrap', part: 'nav-wrap' }, this._list);
    this._wrap.addEventListener('scroll', () => this._updateScroll(), { passive: true });

    const scrollBtn = (dir) => {
      const btn = createElement('button', {
        className: `tabs__scroll tabs__scroll--${dir}`,
        part: `scroll-button scroll-${dir}`,
        type: 'button',
        tabindex: '-1',
        'aria-hidden': 'true',
        hidden: true,
      }, createElement('hui-icon', { name: dir === 'prev' ? 'chevron-left' : 'chevron-right' }));
      btn.addEventListener('click', () => this._scrollBy(dir === 'prev' ? -1 : 1));
      return btn;
    };
    this._prev = scrollBtn('prev');
    this._next = scrollBtn('next');

    this._add = createElement('button', { className: 'tabs__add', part: 'add-button', type: 'button' },
      createElement('hui-icon', { name: 'plus' }));
    this._add.addEventListener('click', () => this.emit('hui-add'));

    const extraSlot = createElement('slot', { name: 'extra' });
    this._extra = createElement('div', { className: 'tabs__extra', part: 'extra', hidden: true }, extraSlot);
    extraSlot.addEventListener('slotchange', () => (this._extra.hidden = !extraSlot.assignedNodes().length));

    this._nav = createElement('div', { className: 'tabs__nav', part: 'nav' },
      this._prev, this._wrap, this._next, this._add, this._extra);

    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._scheduleSync());
    this._content = createElement('div', { className: 'tabs__content', part: 'content' }, this._slot);

    this._base = createElement('div', { className: 'tabs', part: 'base' }, this._nav, this._content);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    // Panel đổi label / key / disabled... hoặc nội dung slot="label" đổi → dựng lại thanh tab
    this._observer ||= new MutationObserver((records) => {
      if (records.some((r) => this._isRelevant(r))) this._scheduleSync();
    });
    this._observer.observe(this, {
      subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: PANEL_ATTRS,
    });
    this._resize ||= new ResizeObserver(() => this._layout());
    this._resize.observe(this._wrap);
    this._resize.observe(this._list);
    this._scheduleSync();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._resize?.disconnect();
  }

  updated(changed) {
    if (['type', 'placement', 'centered', 'size'].some((k) => changed.has(k))) this._syncClasses();
    if (changed.has('type') || changed.has('hideAdd') || changed.has('locale')) {
      this._add.hidden = this._type !== 'editable-card' || this.hideAdd;
      this._add.setAttribute('aria-label', tx('tabs.add'));
    }
    if (changed.has('placement')) {
      const vertical = this._vertical;
      this._list.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
      this._prev.firstChild.setAttribute('name', vertical ? 'chevron-up' : 'chevron-left');
      this._next.firstChild.setAttribute('name', vertical ? 'chevron-down' : 'chevron-right');
    }
    if (changed.has('type') || changed.has('locale')) {
      this._signature = null;
      this._sync();
    } else if (changed.has('activeKey')) this._applyActive();
    if (changed.has('placement') || changed.has('size') || changed.has('type')) this._layout();
  }

  // =====================================================
  // GETTERS
  // =====================================================

  get _type() {
    return TYPES.includes(this.type) ? this.type : 'line';
  }

  get _placement() {
    return PLACEMENTS.includes(this.placement) ? this.placement : 'top';
  }

  get _vertical() {
    return this._placement === 'left' || this._placement === 'right';
  }

  _panels() {
    return [...this.children].filter((el) => el.localName === 'hui-tab-panel');
  }

  _keyOf(panel, index) {
    return panel.getAttribute('key') ?? panel.getAttribute('name') ?? String(index);
  }

  _isClosable(panel) {
    const attr = panel.getAttribute('closable');
    if (attr === 'false') return false;
    return attr !== null || this._type === 'editable-card';
  }

  /** Bản ghi MutationObserver có liên quan tới thanh tab không (bỏ qua thay đổi trong nội dung panel) */
  _isRelevant(record) {
    const target = record.target;
    if (record.type === 'attributes') return target.parentElement === this && target.localName === 'hui-tab-panel';
    if (record.type === 'childList' && target === this) return true;
    const el = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
    const label = el?.closest('[slot="label"]');
    return Boolean(label && label.parentElement?.parentElement === this);
  }

  // =====================================================
  // DỰNG THANH TAB
  // =====================================================

  _syncClasses() {
    this._base.className = [
      'tabs',
      `tabs--${this._placement}`,
      `tabs--${this._type === 'line' ? 'line' : 'card'}`,
      this._type === 'editable-card' ? 'tabs--editable' : '',
      `tabs--${SIZES.includes(this.size) ? this.size : 'md'}`,
      this.centered ? 'tabs--centered' : '',
      this._vertical ? 'tabs--vertical' : 'tabs--horizontal',
    ].filter(Boolean).join(' ');
  }

  _scheduleSync() {
    if (this._syncQueued || !this._hasRendered) return;
    this._syncQueued = true;
    queueMicrotask(() => {
      this._syncQueued = false;
      this._sync();
    });
  }

  /** Dựng lại các tab từ panel con; giữ focus nếu tab đang focus vẫn còn */
  _sync() {
    if (!this._hasRendered) return;
    const panels = this._panels();
    // Không có gì đổi (slotchange / observer trùng lặp) → chỉ áp lại trạng thái chọn, giữ nguyên phần tử tab
    const signature = [this._type, ...panels.map((p, i) => [
      this._keyOf(p, i), p.getAttribute('label'), p.getAttribute('icon'), p.hasAttribute('disabled'), this._isClosable(p),
      [...p.children].find((el) => el.getAttribute('slot') === 'label')?.outerHTML,
    ].join('\u0001'))].join('\u0002');
    if (signature === this._signature && this._tabs.every((x, i) => x.panel === panels[i])) {
      this._applyActive();
      return;
    }
    this._signature = signature;

    const focusedKey = this.shadowRoot.activeElement?.dataset?.key;
    const oldKeys = this._tabs.map((x) => x.key);
    const oldIndex = oldKeys.indexOf(this._current);

    this._tabs = panels.map((panel, index) => {
      const key = this._keyOf(panel, index);
      return { key, panel, tab: this._createTab(panel, key, index) };
    });
    this._list.replaceChildren(...this._tabs.map((x) => x.tab), this._ink);

    // Tab đang mở bị gỡ → chọn tab kề bên (giống Ant) và báo change
    const removed = this._current !== null && !this._tabs.some((x) => x.key === this._current);
    if (removed && this._tabs.length) {
      const enabled = this._tabs.filter((x) => !x.panel.hasAttribute('disabled'));
      const pick = enabled.find((x) => this._tabs.indexOf(x) >= oldIndex) || enabled[enabled.length - 1];
      if (pick) {
        this._current = pick.key;
        this.activeKey = pick.key;
        this.emit('change', { key: pick.key });
      }
    }
    this._applyActive();

    if (focusedKey !== undefined) this._tabs.find((x) => x.key === focusedKey)?.tab.focus();
  }

  _createTab(panel, key, index) {
    const disabled = panel.hasAttribute('disabled');
    const tab = createElement('div', {
      className: 'tabs__tab',
      part: 'tab',
      role: 'tab',
      id: `tab-${index}`,
      tabindex: '-1',
      dataset: { key },
    });
    if (disabled) tab.setAttribute('aria-disabled', 'true');

    const icon = panel.getAttribute('icon');
    if (icon) tab.append(createElement('hui-icon', { className: 'tabs__icon', part: 'tab-icon', name: icon }));

    const label = createElement('span', { className: 'tabs__label', part: 'tab-label' });
    const slotted = [...panel.children].find((el) => el.getAttribute('slot') === 'label');
    if (slotted) {
      // Nút trong light DOM không thể hiện ở 2 nơi → sao chép nhãn HTML lên thanh tab
      const clone = slotted.cloneNode(true);
      clone.removeAttribute('slot');
      label.append(clone);
    } else {
      label.textContent = panel.getAttribute('label') ?? key;
    }
    tab.append(label);

    if (this._isClosable(panel)) {
      // Không dùng <button> (tab là phần tử tương tác, không lồng phần tử tương tác) — bàn phím dùng Delete
      const close = createElement('span', {
        className: 'tabs__close', part: 'close-button', 'aria-hidden': 'true', title: tx('tabs.remove'),
      }, createElement('hui-icon', { name: 'close' }));
      tab.append(close);
    }
    return tab;
  }

  /** Áp trạng thái chọn lên tab + panel (gọi được nhiều lần) */
  _applyActive() {
    if (!this._tabs.length) {
      this._current = null;
      this._updateInk();
      return;
    }
    const enabled = this._tabs.filter((x) => !x.panel.hasAttribute('disabled'));
    const wanted = this._tabs.find((x) => x.key === this.activeKey && !x.panel.hasAttribute('disabled'));
    const cur = wanted || enabled[0] || this._tabs[0];
    if (cur.key !== this._current) this._revealPending = true;
    this._current = cur.key;

    const reflection = 'ariaControlsElements' in Element.prototype;
    this._tabs.forEach(({ key, panel, tab }, i) => {
      const active = key === cur.key;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      tab.part.toggle('tab-active', active);
      tab.part.toggle('tab-disabled', panel.hasAttribute('disabled'));

      // Panel ở light DOM, tab ở shadow DOM → id tham chiếu chéo không được; dùng element reflection
      // cho aria-controls (tab → panel hợp lệ), còn panel đặt aria-label theo nhãn tab
      if (!panel.id) panel.id = `hui-tabs-${this._uid}-panel-${i}`;
      if (reflection) tab.ariaControlsElements = [panel];
      else tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-label', tab.textContent.trim() || key);
      if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '0');
      panel.hidden = !active;
    });
    this.setState('has-tabs', true);
    this._layout();
  }

  // =====================================================
  // INK BAR + CUỘN
  // =====================================================

  _activeTab() {
    return this._tabs.find((x) => x.key === this._current)?.tab;
  }

  _layout() {
    if (!this._hasRendered) return;
    // Tab vừa được chọn (kể cả active-key lúc đầu) → cuộn vào khung khi đã đo được layout
    // (đo tràn trước: nút cuộn hiện ra làm vùng tab hẹp lại)
    this._updateScroll();
    const tab = this._activeTab();
    if (this._revealPending && tab?.offsetParent) {
      this._revealPending = false;
      this._reveal(tab);
      this._updateScroll();
    }
    this._updateInk();
  }

  _updateInk() {
    const ink = this._ink;
    const tab = this._activeTab();
    if (!tab || this._type !== 'line' || !tab.offsetParent) {
      ink.style.opacity = '0';
      return;
    }
    ink.style.opacity = '';
    if (this._vertical) {
      ink.style.transform = `translateY(${tab.offsetTop}px)`;
      ink.style.height = `${tab.offsetHeight}px`;
      ink.style.width = '';
    } else {
      ink.style.transform = `translateX(${tab.offsetLeft}px)`;
      ink.style.width = `${tab.offsetWidth}px`;
      ink.style.height = '';
    }
    // Lần đầu đặt vị trí không chạy transition (tránh thanh trượt từ góc trái vào)
    if (!this._inkReady) {
      this._inkReady = true;
      requestAnimationFrame(() => ink.classList.add('tabs__ink--animated'));
    }
  }

  _updateScroll() {
    const w = this._wrap;
    const vertical = this._vertical;
    const size = vertical ? w.clientHeight : w.clientWidth;
    const full = vertical ? w.scrollHeight : w.scrollWidth;
    const pos = vertical ? w.scrollTop : w.scrollLeft;
    const overflow = full > size + 1;
    this._prev.hidden = !overflow;
    this._next.hidden = !overflow;
    this._prev.disabled = pos <= 0;
    this._next.disabled = pos + size >= full - 1;
    this.setState('overflow', overflow);
  }

  _scrollBy(dir) {
    const w = this._wrap;
    const amount = (this._vertical ? w.clientHeight : w.clientWidth) * 0.8 * dir;
    w.scrollBy(this._vertical ? { top: amount, behavior: 'smooth' } : { left: amount, behavior: 'smooth' });
  }

  /** Cuộn vùng tab (không cuộn cả trang như scrollIntoView) để tab nằm trọn trong khung */
  _reveal(tab) {
    const w = this._wrap;
    if (this._vertical) {
      if (tab.offsetTop < w.scrollTop) w.scrollTop = tab.offsetTop;
      else if (tab.offsetTop + tab.offsetHeight > w.scrollTop + w.clientHeight) w.scrollTop = tab.offsetTop + tab.offsetHeight - w.clientHeight;
    } else if (tab.offsetLeft < w.scrollLeft) {
      w.scrollLeft = tab.offsetLeft;
    } else if (tab.offsetLeft + tab.offsetWidth > w.scrollLeft + w.clientWidth) {
      w.scrollLeft = tab.offsetLeft + tab.offsetWidth - w.clientWidth;
    }
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  /** Chọn tab theo key (do người dùng) → phát change */
  _activate(key, focus = false) {
    const entry = this._tabs.find((x) => x.key === key);
    if (!entry || entry.panel.hasAttribute('disabled')) return;
    if (focus) entry.tab.focus();
    this._reveal(entry.tab);
    if (key === this._current) return;
    this.activeKey = key;
    this._applyActive();
    this.emit('change', { key });
  }

  _close(key) {
    const entry = this._tabs.find((x) => x.key === key);
    if (!entry || entry.panel.hasAttribute('disabled') || !this._isClosable(entry.panel)) return;
    this.emit('hui-close', { key, panel: entry.panel });
  }

  _onClick(e) {
    const tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    if (e.target.closest('.tabs__close')) {
      e.stopPropagation();
      this._close(tab.dataset.key);
      return;
    }
    this._activate(tab.dataset.key, true);
  }

  /** APG Tabs: mũi tên di chuyển + kích hoạt luôn (automatic activation), Home/End, Delete đóng tab */
  _onKeydown(e) {
    const tab = e.target.closest?.('[role="tab"]');
    if (!tab) return;
    const enabled = this._tabs.filter((x) => !x.panel.hasAttribute('disabled'));
    if (!enabled.length) return;
    const index = enabled.findIndex((x) => x.tab === tab);
    const prevKey = this._vertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = this._vertical ? 'ArrowDown' : 'ArrowRight';
    let target = null;

    switch (e.key) {
      case prevKey: target = enabled[(index - 1 + enabled.length) % enabled.length]; break;
      case nextKey: target = enabled[(index + 1) % enabled.length]; break;
      case 'Home': target = enabled[0]; break;
      case 'End': target = enabled[enabled.length - 1]; break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this._activate(tab.dataset.key, true);
        return;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this._close(tab.dataset.key);
        return;
      default:
        return;
    }
    e.preventDefault();
    if (target) this._activate(target.key, true);
  }
}

defineElement('hui-tabs', HuiTabs);

export default HuiTabs;
