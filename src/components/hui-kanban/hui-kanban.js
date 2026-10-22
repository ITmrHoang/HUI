/**
 * HUI Kanban — Bảng Kanban (Organism): `columns` + `items`, kéo thả thẻ trong / giữa các cột
 * (chuột, cảm ứng, bàn phím — dùng chung lõi với hui-sortable), đếm thẻ, cảnh báo vượt giới hạn WIP,
 * cuộn ngang trên màn hình hẹp.
 * Thẻ render vào light DOM (mỗi cột một slot) → CSS của trang áp dụng được cho <template> tự viết;
 * thẻ mặc định dùng class .hui-kanban-card (stylesheet nhẹ gắn vào root chứa bảng, specificity 0 nhờ :where()).
 */

import styles from './hui-kanban.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { renderTemplate, updateTemplateNode, delegateActions } from '../../core/template.js';
import { Repeater } from '../../core/repeat.js';
import { createElement } from '../../utils/dom.js';
import {
  registerContainer, beginPointerDrag, startKeyboardSort, isInteractiveTarget, isSorting,
  announce, itemLabel, place,
} from '../hui-sortable/sort-engine.js';
import '../hui-icon/hui-icon.js';
import '../hui-tag/hui-tag.js';
import '../hui-avatar/hui-avatar.js';

const FALLBACK = {
  'kanban.label': { vi: 'Bảng Kanban', en: 'Kanban board' },
  'kanban.count': { vi: '{count} thẻ', en: '{count} cards' },
  'kanban.countLimit': { vi: '{count} trên giới hạn {limit} thẻ', en: '{count} of {limit} cards limit' },
  'kanban.over': { vi: 'vượt giới hạn WIP', en: 'over WIP limit' },
  'kanban.empty': { vi: 'Chưa có thẻ', en: 'No cards' },
  'kanban.instructions': { vi: 'Nhấn Space để nhấc thẻ, Enter để mở', en: 'Press Space to pick up the card, Enter to open' },
  'kanban.grabbed': {
    vi: 'Đã nhấc thẻ {label} ở cột {list}, vị trí {index}/{count}. Mũi tên lên xuống để di chuyển trong cột, trái phải để chuyển cột, Space để thả, Esc để hủy.',
    en: 'Picked up card {label} in column {list}, position {index} of {count}. Use up and down to move within the column, left and right to change column, Space to drop, Escape to cancel.',
  },
  'kanban.moved': { vi: '{label}: vị trí {index}/{count}', en: '{label}: position {index} of {count}' },
  'kanban.movedList': { vi: '{label}: sang cột {list}, vị trí {index}/{count}', en: '{label}: moved to column {list}, position {index} of {count}' },
  'kanban.dropped': { vi: 'Đã thả thẻ {label} vào cột {list}, vị trí {index}/{count}', en: 'Dropped card {label} in column {list}, position {index} of {count}' },
  'kanban.cancelled': { vi: 'Đã hủy, thẻ {label} trở về vị trí cũ', en: 'Cancelled, card {label} returned to its original position' },
  'kanban.edge': { vi: 'Không còn cột nào ở hướng này', en: 'No more columns in this direction' },
};
const msg = (key, vars) => {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
};

const TOKEN_COLORS = new Set(['primary', 'secondary', 'success', 'warning', 'danger', 'info']);
const colorValue = (c) => (!c ? '' : TOKEN_COLORS.has(c) ? `var(--hui-${c})` : String(c));

// =====================================================
// STYLE CHO THẺ MẶC ĐỊNH (light DOM)
// =====================================================

const LIGHT_CSS = `
:where(.hui-kanban-card) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
  padding: var(--hui-kanban-card-padding, 10px 12px);
  border: 1px solid var(--hui-kanban-card-border-color, var(--hui-border-secondary));
  border-radius: var(--hui-kanban-card-radius, var(--hui-radius-md));
  background: var(--hui-kanban-card-bg, var(--hui-bg-container));
  box-shadow: var(--hui-kanban-card-shadow, var(--hui-shadow-sm));
  color: var(--hui-text);
  font-family: var(--hui-font-family);
  font-size: var(--hui-font-sm);
  line-height: 1.45;
}
:where(.hui-kanban-card__title) { font-weight: var(--hui-font-weight-semibold, 600); overflow-wrap: anywhere; }
:where(.hui-kanban-card__desc) {
  margin: 0;
  color: var(--hui-text-secondary);
  font-size: var(--hui-font-xs);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
:where(.hui-kanban-card__footer) { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
:where(.hui-kanban-card__tags) { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
:where(.hui-kanban-card__avatar) { margin-left: auto; flex-shrink: 0; }
`;

let lightSheet = null;

/** Gắn stylesheet thẻ mặc định vào Document / ShadowRoot chứa bảng (1 lần cho mỗi root) */
function adoptLightStyles(root) {
  if (!root) return;
  if ('adoptedStyleSheets' in root && typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
    if (!lightSheet) {
      lightSheet = new CSSStyleSheet();
      lightSheet.replaceSync(LIGHT_CSS);
    }
    if (!root.adoptedStyleSheets.includes(lightSheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, lightSheet];
    return;
  }
  const host = root === document ? document.head : root;
  if (!host.querySelector?.('style[data-hui-kanban]')) host.append(createElement('style', { 'data-hui-kanban': '' }, LIGHT_CSS));
}

/** Dựng nội dung thẻ mặc định: tiêu đề, mô tả, tags (hui-tag), avatar (hui-avatar) */
function fillDefaultCard(el, item) {
  const parts = [createElement('div', { className: 'hui-kanban-card__title' }, String(item.title ?? item.id ?? ''))];
  if (item.description) parts.push(createElement('p', { className: 'hui-kanban-card__desc' }, String(item.description)));
  const tags = (Array.isArray(item.tags) ? item.tags : item.tags ? [item.tags] : []).map((tag) => {
    const o = tag !== null && typeof tag === 'object' ? tag : { label: tag };
    const el2 = createElement('hui-tag', { size: 'sm' }, String(o.label ?? ''));
    if (o.color) el2.setAttribute('color', o.color);
    return el2;
  });
  let avatar = null;
  if (item.avatar) {
    const a = typeof item.avatar === 'object' ? item.avatar : /^(https?:|data:|blob:|\/|\.)/.test(item.avatar) ? { src: item.avatar } : { name: item.avatar };
    avatar = createElement('hui-avatar', { className: 'hui-kanban-card__avatar', size: 'sm' });
    if (a.src) avatar.setAttribute('src', a.src);
    if (a.name) avatar.setAttribute('name', a.name);
    avatar.setAttribute('alt', a.alt || a.name || '');
  }
  if (tags.length || avatar) {
    parts.push(createElement('div', { className: 'hui-kanban-card__footer' },
      tags.length ? createElement('div', { className: 'hui-kanban-card__tags' }, ...tags) : null, avatar));
  }
  el.replaceChildren(...parts);
}

let uid = 0;

/**
 * Bảng Kanban.
 *
 * @fires hui-change - Thả thẻ ở vị trí mới. detail: { item, from, to, index, oldIndex, items }. Cancelable: preventDefault() → thẻ trở về chỗ cũ, `items` giữ nguyên
 * @fires hui-drag-start - Bắt đầu kéo thẻ. detail: { item, column }
 * @fires hui-item-click - Bấm / Enter vào thẻ. detail: { item, originalEvent }
 * @fires hui-action - (template) bấm phần tử có data-action. detail: { action, item, index, originalEvent }
 * @slot - Một <template> làm khuôn thẻ (data-bind…); thẻ do component tự đặt vào slot của từng cột
 * @slot footer-{columnId} - Nội dung chân cột (vd nút "Thêm thẻ")
 * @csspart board - Vùng cuộn ngang chứa các cột
 * @csspart column - Một cột (thêm part column-over khi vượt giới hạn)
 * @csspart column-over - Cột vượt giới hạn WIP
 * @csspart column-header - Đầu cột
 * @csspart column-dot - Chấm màu của cột
 * @csspart column-title - Tên cột
 * @csspart column-count - Số thẻ (count/limit)
 * @csspart column-body - Vùng chứa thẻ (vùng thả)
 * @csspart column-empty - Chữ khi cột trống
 * @csspart column-footer - Chân cột
 * @cssprop --hui-kanban-gap - Khoảng cách giữa các cột
 * @cssprop --hui-kanban-column-width - Bề rộng cột (tối thiểu)
 * @cssprop --hui-kanban-column-max-width - Bề rộng cột tối đa
 * @cssprop --hui-kanban-column-bg - Nền cột
 * @cssprop --hui-kanban-column-radius - Bo góc cột
 * @cssprop --hui-kanban-column-max-height - Chiều cao tối đa vùng thẻ (cuộn dọc khi vượt)
 * @cssprop --hui-kanban-card-gap - Khoảng cách giữa các thẻ
 * @cssprop --hui-kanban-over-color - Màu cảnh báo vượt giới hạn
 * @cssprop --hui-kanban-card-bg - Nền thẻ mặc định
 * @cssprop --hui-kanban-card-border-color - Viền thẻ mặc định
 * @cssprop --hui-kanban-card-radius - Bo góc thẻ mặc định
 * @cssprop --hui-kanban-card-shadow - Bóng thẻ mặc định
 * @cssprop --hui-kanban-card-padding - Padding thẻ mặc định
 * @cssprop --hui-kanban-focus-color - Màu viền focus của thẻ
 */
class HuiKanban extends HuiElement {
  static localized = true;

  static properties = {
    /** Các cột: [{ id, title, color, limit }] — color: primary | success | warning | danger | info | secondary hoặc màu CSS */
    columns: { type: Array, default: null },
    /** Các thẻ: [{ id, column, title, description, tags, avatar }] — thứ tự trong mảng = thứ tự trong cột */
    items: { type: Array, default: null },
    /** Hàm tự dựng thẻ: (item, index) => Element — thay cho <template> / thẻ mặc định */
    renderItem: { type: Object, attribute: false },
    /** Không cho thả thêm vào cột đã đủ `limit` (mặc định chỉ cảnh báo) */
    enforceLimit: { type: Boolean },
    /** Tắt kéo thả */
    disabled: { type: Boolean },
    /** Chữ khi cột trống */
    emptyText: { type: String },
    /** Tên bảng cho trình đọc màn hình */
    label: { type: String },
    /** Thời gian giữ trên cảm ứng trước khi kéo (ms) */
    delay: { type: Number, default: 200 },
    /** Tắt animation FLIP / thẻ nghiêng khi kéo */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._uid = ++uid;
    this._groupKey = `hui-kanban-${this._uid}`;
    this._slotSeq = 0;
    /** id cột → { col, section, slot, container, … } */
    this._cols = new Map();
    /** node thẻ → item */
    this._nodeItem = new WeakMap();
    this._repeater = null;
    this._template = null;
  }

  /** Thẻ (Element) của item theo id */
  cardOf(id) {
    return this._repeater?.nodes.get(id) || null;
  }

  render() {
    this._board = createElement('div', { className: 'board', part: 'board', role: 'group' });
    this._live = createElement('div', { className: 'sr-only', role: 'status', 'aria-live': 'assertive', 'aria-atomic': 'true' });
    // Slot mặc định ẩn: chứa <template> và nội dung không thuộc cột nào
    this._rest = createElement('div', { hidden: true }, createElement('slot'));

    this.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.addEventListener('keydown', (e) => this._onKeyDown(e));
    this.addEventListener('click', (e) => {
      const card = this._cardFromPath(e.composedPath());
      if (!card || isInteractiveTarget(e.composedPath(), card)) return;
      this.emit('hui-item-click', { item: this._nodeItem.get(card), originalEvent: e });
    });
    return [this._board, this._rest, this._live];
  }

  connectedCallback() {
    super.connectedCallback();
    adoptLightStyles(this.getRootNode());
    for (const c of this._cols.values()) c.unregister = registerContainer(c.container);
    if (!this._offActions) this._offActions = delegateActions(this, this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const c of this._cols.values()) c.unregister?.();
    this._kbd?.cancel();
    this._offActions?.();
    this._offActions = null;
  }

  updated(changed) {
    if (changed.has('label') || changed.has('locale')) this._board.setAttribute('aria-label', this.label || msg('kanban.label'));
    if (changed.has('columns') || changed.has('locale') || changed.has('emptyText')) this._renderColumns();
    if (['items', 'columns', 'renderItem', 'locale'].some((k) => changed.has(k))) this._renderItems();
    if (changed.has('disabled')) this.setState('disabled', this.disabled);
  }

  // =====================================================
  // CỘT
  // =====================================================

  _columnList() {
    return (Array.isArray(this.columns) ? this.columns : []).filter((c) => c && c.id !== undefined && c.id !== null);
  }

  _renderColumns() {
    const list = this._columnList();
    const keep = new Set(list.map((c) => String(c.id)));
    for (const [id, c] of this._cols) {
      if (!keep.has(id)) {
        c.unregister?.();
        c.section.remove();
        this._cols.delete(id);
      }
    }
    list.forEach((col) => {
      const id = String(col.id);
      let c = this._cols.get(id);
      if (!c) {
        c = this._buildColumn(id);
        this._cols.set(id, c);
        if (this.isConnected) c.unregister = registerContainer(c.container);
      }
      c.col = col;
      c.title.textContent = String(col.title ?? id);
      const color = colorValue(col.color);
      if (color) c.section.style.setProperty('--_kb-color', color);
      else c.section.style.removeProperty('--_kb-color');
      c.empty.textContent = this.emptyText || msg('kanban.empty');
      this._board.append(c.section); // giữ đúng thứ tự cột
    });
    this._syncCounts();
  }

  _buildColumn(id) {
    const n = ++this._slotSeq;
    const slotName = `hui-kb-${this._uid}-${n}`;
    const titleId = `${slotName}-title`;
    const slot = createElement('slot', { name: slotName });
    const title = createElement('h3', { className: 'title', part: 'column-title', id: titleId });
    const count = createElement('span', { className: 'count', part: 'column-count' });
    const warn = createElement('hui-icon', { className: 'warn', name: 'warning', 'aria-hidden': 'true', hidden: true });
    const header = createElement('div', { className: 'header', part: 'column-header' },
      createElement('span', { className: 'dot', part: 'column-dot', 'aria-hidden': 'true' }), title, warn, count);
    const empty = createElement('div', { className: 'empty', part: 'column-empty', 'aria-hidden': 'true' });
    const body = createElement('div', { className: 'body', part: 'column-body', role: 'list', 'aria-labelledby': titleId }, slot, empty);
    const footer = createElement('div', { className: 'footer', part: 'column-footer' }, createElement('slot', { name: `footer-${id}` }));
    const section = createElement('section', { className: 'column', part: 'column', role: 'group', 'aria-labelledby': titleId, 'data-column': id },
      header, body, footer);
    slot.addEventListener('slotchange', () => this._syncCounts());

    const rec = { id, slotName, slot, section, title, count, warn, empty, body, col: null };
    rec.container = {
      el: section,
      host: this,
      colId: id,
      getGroup: () => this._groupKey,
      axis: () => 'y',
      getItems: () => slot.assignedElements(),
      insert: (item, before) => {
        if (item.getAttribute('slot') !== slotName) item.setAttribute('slot', slotName);
        if (before) return place(this, item, before);
        const items = slot.assignedElements().filter((i) => i !== item);
        const last = items[items.length - 1];
        return place(this, item, last ? last.nextSibling : null);
      },
      accepts: (item, from) => {
        if (this.disabled) return false;
        const limit = Number(rec.col?.limit) || 0;
        if (!this.enforceLimit || !limit || from === rec.container) return true;
        return slot.assignedElements().filter((i) => i !== item).length < limit;
      },
      animated: () => !this.noAnimation,
      label: () => String(rec.col?.title ?? id),
    };
    return rec;
  }

  /** Cập nhật số thẻ / cảnh báo WIP / chữ cột trống theo DOM hiện tại (cả trong lúc kéo) */
  _syncCounts() {
    for (const c of this._cols.values()) {
      const n = c.slot.assignedElements().length;
      const limit = Number(c.col?.limit) || 0;
      const over = limit > 0 && n > limit;
      const full = limit > 0 && n >= limit;
      c.count.textContent = limit ? `${n}/${limit}` : String(n);
      c.count.setAttribute('aria-label', (limit ? msg('kanban.countLimit', { count: n, limit }) : msg('kanban.count', { count: n }))
        + (over ? `, ${msg('kanban.over')}` : ''));
      c.section.classList.toggle('column--over', over);
      c.section.classList.toggle('column--full', full);
      c.section.setAttribute('part', over ? 'column column-over' : 'column');
      c.warn.hidden = !over;
      c.empty.hidden = n > 0;
    }
  }

  // =====================================================
  // THẺ
  // =====================================================

  _createCard(item, i) {
    let node;
    if (typeof this.renderItem === 'function') node = this.renderItem(item, i);
    else if (this._template) node = renderTemplate(this._template, item, i);
    else {
      node = createElement('div', { className: 'hui-kanban-card' });
      fillDefaultCard(node, item);
      node._huiDefaultCard = true;
    }
    this._decorate(node, item);
    return node;
  }

  _updateCard(node, item, i) {
    if (node._huiDefaultCard) fillDefaultCard(node, item);
    else if (this._template && !this.renderItem) updateTemplateNode(node, item, i);
    this._decorate(node, item);
  }

  _decorate(node, item) {
    this._nodeItem.set(node, item);
    const c = this._cols.get(String(item.column));
    if (c && node.getAttribute('slot') !== c.slotName) node.setAttribute('slot', c.slotName);
    if (!node.hasAttribute('role')) node.setAttribute('role', 'listitem');
    if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
    node.dataset.id = String(item.id);
    if (!node.hasAttribute('aria-label') && item.title) node.dataset.sortLabel = String(item.title);
    node.setAttribute('aria-description', msg('kanban.instructions'));
  }

  _renderItems() {
    if (!this._repeater) {
      this._template = this.querySelector(':scope > template');
      this._repeater = new Repeater(this, {
        key: (item) => item?.id,
        create: (item, i) => this._createCard(item, i),
        update: (node, item, i) => this._updateCard(node, item, i),
      });
    }
    const items = (Array.isArray(this.items) ? this.items : []).filter((it) => it && this._cols.has(String(it.column)));
    // Repeater sắp lại DOM bằng insertBefore → thẻ đang focus có thể mất focus, trả lại sau khi render
    const root = this.getRootNode();
    const focused = root?.activeElement && this._nodeItem.has(root.activeElement) ? root.activeElement : null;
    this._repeater.render(items);
    if (focused?.isConnected && root.activeElement !== focused) focused.focus({ preventScroll: true });
    this._syncCounts();
  }

  _cardFromPath(path) {
    return path.find((n) => n instanceof Element && n.parentNode === this && this._nodeItem.has(n)) || null;
  }

  _containerOf(card) {
    const slot = card.getAttribute('slot');
    for (const c of this._cols.values()) if (c.slotName === slot) return c.container;
    return null;
  }

  // =====================================================
  // KÉO THẢ
  // =====================================================

  _onPointerDown(e) {
    if (this.disabled || e.button !== 0 || isSorting()) return;
    const path = e.composedPath();
    const card = this._cardFromPath(path);
    if (!card || isInteractiveTarget(path, card)) return;
    const container = this._containerOf(card);
    if (!container) return;
    beginPointerDrag(e, {
      container,
      item: card,
      tilt: this.noAnimation ? 0 : 2,
      delay: e.pointerType === 'touch' ? Math.max(0, this.delay ?? 200) : 0,
      onStart: () => {
        this.setState('dragging', true);
        this.emit('hui-drag-start', { item: this._nodeItem.get(card), column: container.colId });
      },
      onMove: () => this._syncCounts(),
      onCancel: () => {
        this.setState('dragging', false);
        this._syncCounts();
      },
      onDrop: (result, revert) => {
        this.setState('dragging', false);
        if (this._commit(result, revert)) {
          const items = result.to.getItems();
          announce(this._live, msg('kanban.dropped', {
            label: itemLabel(card), list: result.to.label(), index: items.indexOf(card) + 1, count: items.length,
          }));
        }
      },
    });
  }

  _onKeyDown(e) {
    if (isSorting()) return;
    const path = e.composedPath();
    const card = this._cardFromPath(path);
    if (!card || path[0] !== card) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      this.emit('hui-item-click', { item: this._nodeItem.get(card), originalEvent: e });
      return;
    }
    if (e.key !== ' ' || e.repeat || this.disabled) return;
    const container = this._containerOf(card);
    if (!container) return;
    e.preventDefault();
    e.stopPropagation();
    this.setState('dragging', true);
    this.emit('hui-drag-start', { item: this._nodeItem.get(card), column: container.colId });
    this._kbd = startKeyboardSort({
      container,
      item: card,
      onAnnounce: (kind, info) => announce(this._live, msg(`kanban.${kind}`, info)),
      onMove: () => this._syncCounts(),
      onCancel: () => {
        this._kbd = null;
        this.setState('dragging', false);
        this._syncCounts();
      },
      onDrop: (result, revert) => {
        this._kbd = null;
        this.setState('dragging', false);
        this._commit(result, revert);
      },
    });
  }

  /**
   * Thả xong: tính mảng items mới (thẻ chuyển cột + đúng vị trí) → hui-change (cancelable).
   * Bị chặn → trả thẻ về chỗ cũ. Trả về true nếu giữ thay đổi.
   */
  _commit({ item: card, from, to, oldIndex, newIndex }, revert) {
    this._syncCounts();
    if (from === to && oldIndex === newIndex) return true;
    const item = this._nodeItem.get(card);
    const all = Array.isArray(this.items) ? this.items : [];
    const moved = { ...item, column: this._cols.get(to.colId)?.col?.id ?? to.colId };
    const others = all.filter((it) => it !== item);
    const inTarget = others.filter((it) => String(it.column) === to.colId && this._cols.has(String(it.column)));
    let pos;
    if (newIndex < inTarget.length) pos = others.indexOf(inTarget[newIndex]);
    else if (inTarget.length) pos = others.indexOf(inTarget[inTarget.length - 1]) + 1;
    else pos = others.length;
    const items = [...others.slice(0, pos), moved, ...others.slice(pos)];

    const fromCol = this._cols.get(from.colId)?.col?.id ?? from.colId;
    const ok = this.emit('hui-change', { item, from: fromCol, to: moved.column, index: newIndex, oldIndex, items }, { cancelable: true });
    if (!ok) {
      revert();
      this._syncCounts();
      return false;
    }
    this._nodeItem.set(card, moved);
    this.items = items;
    return true;
  }
}

defineElement('hui-kanban', HuiKanban);

export default HuiKanban;
