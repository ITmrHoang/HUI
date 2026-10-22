/**
 * HUI Sortable — Sắp xếp phần tử con bằng kéo thả (Molecule).
 * Chuột / cảm ứng: kéo item (hoặc tay nắm `handle`), chỗ trống + FLIP cho item xung quanh, tự cuộn sát mép.
 * Bàn phím: Space nhấc → mũi tên di chuyển → Space/Enter thả, Esc hủy; trình đọc màn hình được thông báo từng bước.
 * Nhiều danh sách cùng `group` kéo qua lại được.
 */

import styles from './hui-sortable.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import {
  registerContainer, beginPointerDrag, startKeyboardSort, isInteractiveTarget, isSorting,
  announce, itemLabel, place,
} from './sort-engine.js';

const FALLBACK = {
  'sortable.instructions': { vi: 'Nhấn Space để nhấc lên và sắp xếp lại', en: 'Press Space to pick up and reorder' },
  'sortable.grabbed': {
    vi: 'Đã nhấc {label}, vị trí {index}/{count}. Dùng phím mũi tên để di chuyển, Space để thả, Esc để hủy.',
    en: 'Picked up {label}, position {index} of {count}. Use the arrow keys to move, Space to drop, Escape to cancel.',
  },
  'sortable.moved': { vi: '{label}: vị trí {index}/{count}', en: '{label}: position {index} of {count}' },
  'sortable.movedList': { vi: '{label}: chuyển sang {list}, vị trí {index}/{count}', en: '{label}: moved to {list}, position {index} of {count}' },
  'sortable.dropped': { vi: 'Đã thả {label} tại vị trí {index}/{count}', en: 'Dropped {label} at position {index} of {count}' },
  'sortable.cancelled': { vi: 'Đã hủy, {label} trở về vị trí {index}', en: 'Cancelled, {label} returned to position {index}' },
  'sortable.edge': { vi: 'Không còn danh sách nào ở hướng này', en: 'No more lists in this direction' },
  'sortable.list': { vi: 'danh sách khác', en: 'another list' },
};

/** t() có fallback vi/en khi locale chưa có key */
export const msg = (key, vars) => {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
};

const SKIP_TAGS = new Set(['TEMPLATE', 'SCRIPT', 'STYLE', 'LINK']);

/**
 * Danh sách sắp xếp được. Item = phần tử con trực tiếp (lọc thêm bằng `item-selector`).
 *
 * @fires hui-sort-start - Bắt đầu kéo (chuột hoặc bàn phím). detail: { item, index }
 * @fires hui-sort - Thả ở vị trí mới (phát trên danh sách đích). detail: { oldIndex, newIndex, item, from, to }. Cancelable: preventDefault() → item trở về chỗ cũ
 * @fires hui-sort-cancel - Hủy kéo (Esc). detail: { item, index }
 * @slot - Các item cần sắp xếp
 * @csspart announcer - Live region (ẩn) đọc thông báo cho trình đọc màn hình
 * @cssprop --hui-sortable-gap - Khoảng cách giữa các item
 * @cssprop --hui-sortable-placeholder-opacity - Độ mờ của chỗ trống khi đang kéo
 * @cssprop --hui-sortable-placeholder-outline - Viền của chỗ trống (mặc định 2px dashed màu primary)
 * @cssprop --hui-sortable-grabbed-outline - Viền item đang được nhấc bằng bàn phím
 * @cssprop --hui-sortable-focus-color - Màu viền focus của item
 */
class HuiSortable extends HuiElement {
  static localized = true;

  static properties = {
    /** vertical | horizontal | grid — bố cục và trục di chuyển bằng phím mũi tên */
    direction: { type: String, default: 'vertical' },
    /** CSS selector tay nắm bên trong item; có → chỉ kéo được khi nắm vào đây */
    handle: { type: String },
    /** Tên nhóm: các hui-sortable cùng group kéo item qua lại được */
    group: { type: String },
    /** CSS selector lọc phần tử con nào là item (mặc định mọi phần tử con) */
    itemSelector: { type: String },
    /** Tắt kéo thả (chuột + bàn phím) */
    disabled: { type: Boolean },
    /** Thời gian giữ trên màn hình cảm ứng trước khi kéo (ms) khi không có `handle` */
    delay: { type: Number, default: 200 },
    /** Tên danh sách cho trình đọc màn hình (aria-label), cũng dùng khi thông báo chuyển danh sách */
    label: { type: String },
    /** Tắt animation FLIP / ghost đáp xuống */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._container = {
      el: this,
      host: this,
      getGroup: () => this.group || null,
      axis: () => (this.direction === 'horizontal' ? 'x' : this.direction === 'grid' ? 'grid' : 'y'),
      getItems: () => this.sortItems,
      insert: (item, before) => {
        if (before) return place(this, item, before);
        const items = this.sortItems.filter((i) => i !== item);
        const last = items[items.length - 1];
        return place(this, item, last ? last.nextSibling : null);
      },
      accepts: () => !this.disabled,
      animated: () => !this.noAnimation,
      label: () => this.label || this.getAttribute('aria-label') || msg('sortable.list'),
    };
  }

  /** Các item hiện tại theo thứ tự hiển thị */
  get sortItems() {
    const sel = this.itemSelector;
    return [...this.children].filter((el) => {
      if (SKIP_TAGS.has(el.tagName) || el.hasAttribute('data-hui-sort-ghost')) return false;
      if (!sel) return true;
      try { return el.matches(sel); } catch { return true; }
    });
  }

  /** Giá trị `data-id` (hoặc id) của các item theo thứ tự — tiện lưu thứ tự */
  toArray() {
    return this.sortItems.map((el, i) => el.dataset.id ?? (el.id || String(i)));
  }

  /** Di chuyển item ở `from` tới `to` bằng code (có FLIP, không phát sự kiện) */
  moveItem(from, to) {
    const items = this.sortItems;
    const item = items[from];
    if (!item) return;
    const others = items.filter((i) => i !== item);
    this._container.insert(item, others[Math.max(0, Math.min(others.length, to))] || null);
    this._syncItems();
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncItems());
    this._live = createElement('div', { className: 'sr-only', part: 'announcer', role: 'status', 'aria-live': 'assertive', 'aria-atomic': 'true' });

    this.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.addEventListener('keydown', (e) => this._onKeyDown(e));
    return [this._slot, this._live];
  }

  connectedCallback() {
    super.connectedCallback();
    this._unregister = registerContainer(this._container);
    if (!this.hasAttribute('role')) this.setAttribute('role', 'list');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unregister?.();
    this._kbd?.cancel();
  }

  updated(changed) {
    if (changed.has('label')) {
      if (this.label) this.setAttribute('aria-label', this.label);
    }
    if (changed.has('disabled')) this.setState('disabled', this.disabled);
    if (['handle', 'itemSelector', 'disabled', 'locale'].some((k) => changed.has(k))) this._syncItems();
  }

  /** Gắn thuộc tính a11y cho item: focus được, role listitem, gợi ý phím; tay nắm: touch-action none */
  _syncItems() {
    if (!this._hasRendered) return;
    const hint = msg('sortable.instructions');
    for (const el of this.sortItems) {
      if (!el.hasAttribute('role') && el.tagName !== 'LI') el.setAttribute('role', 'listitem');
      if (this.disabled) {
        if (el.dataset.huiSortTab) {
          el.removeAttribute('tabindex');
          delete el.dataset.huiSortTab;
        }
        el.removeAttribute('aria-description');
        continue;
      }
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
        el.dataset.huiSortTab = '';
      }
      el.setAttribute('aria-description', hint);
      if (this.handle) {
        el.querySelectorAll(this.handle).forEach((h) => {
          if (!h.style.touchAction) h.style.touchAction = 'none';
          if (!h.style.cursor) h.style.cursor = 'grab';
        });
      }
    }
    this.toggleAttribute('data-handle', Boolean(this.handle));
  }

  _itemFromPath(path) {
    const items = this.sortItems;
    return path.find((n) => items.includes(n)) || null;
  }

  _onPointerDown(e) {
    if (this.disabled || e.button !== 0 || isSorting()) return;
    const path = e.composedPath();
    const item = this._itemFromPath(path);
    if (!item) return;
    if (this.handle) {
      const onHandle = path.some((n) => n instanceof Element && item.contains(n) && n.matches(this.handle));
      if (!onHandle) return;
    } else if (isInteractiveTarget(path, item)) {
      return;
    }
    beginPointerDrag(e, {
      container: this._container,
      item,
      delay: e.pointerType === 'touch' && !this.handle ? Math.max(0, this.delay ?? 200) : 0,
      onStart: ({ oldIndex }) => {
        this.setState('dragging', true);
        this.emit('hui-sort-start', { item, index: oldIndex });
      },
      onCancel: ({ oldIndex }) => {
        this.setState('dragging', false);
        this.emit('hui-sort-cancel', { item, index: oldIndex });
      },
      onDrop: (result, revert) => {
        this.setState('dragging', false);
        if (this._commit(result, revert)) {
          const items = result.to.getItems();
          announce(this._live, msg('sortable.dropped', { label: itemLabel(item), index: items.indexOf(item) + 1, count: items.length }));
        }
      },
    });
  }

  _onKeyDown(e) {
    if (this.disabled || e.key !== ' ' || isSorting() || e.repeat) return;
    const path = e.composedPath();
    const target = path[0];
    const item = this._itemFromPath(path);
    if (!item) return;
    // Chỉ nhấc khi focus đang ở chính item (hoặc tay nắm) — không cướp phím Space của input bên trong
    const onHandle = this.handle && target instanceof Element && item.contains(target) && target.matches(this.handle);
    if (target !== item && !onHandle) return;
    e.preventDefault();
    e.stopPropagation();
    if (onHandle) item.focus();
    this.setState('dragging', true);
    this.emit('hui-sort-start', { item, index: this.sortItems.indexOf(item) });
    this._kbd = startKeyboardSort({
      container: this._container,
      item,
      onAnnounce: (kind, info) => announce(this._live, msg(`sortable.${kind}`, info)),
      onCancel: ({ oldIndex }) => {
        this._kbd = null;
        this.setState('dragging', false);
        this.emit('hui-sort-cancel', { item, index: oldIndex });
      },
      onDrop: (result, revert) => {
        this._kbd = null;
        this.setState('dragging', false);
        this._commit(result, revert);
      },
    });
  }

  /** Phát hui-sort trên danh sách đích; bị chặn → trả item về chỗ cũ. Trả về true nếu giữ thay đổi */
  _commit({ item, from, to, oldIndex, newIndex }, revert) {
    if (from === to && oldIndex === newIndex) return true;
    const detail = { oldIndex, newIndex, item, from: from.host, to: to.host };
    const ok = to.host.emit('hui-sort', detail, { cancelable: true });
    if (!ok) {
      revert();
      return false;
    }
    return true;
  }
}

defineElement('hui-sortable', HuiSortable);

export default HuiSortable;
