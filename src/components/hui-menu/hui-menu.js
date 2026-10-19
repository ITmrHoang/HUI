/**
 * HUI Menu — Menu điều hướng (Ant Menu + MUI MenuList)
 *   <hui-menu mode="inline" selected-keys="home" open-keys="settings">
 *     <hui-menu-item key="home" icon="home">Trang chủ</hui-menu-item>
 *     <hui-sub-menu key="settings" label="Cài đặt" icon="settings">
 *       <hui-menu-item key="profile">Hồ sơ</hui-menu-item>
 *     </hui-sub-menu>
 *   </hui-menu>
 * hui-menu là "bộ điều khiển": giữ selected-keys / open-keys, truyền ngữ cảnh (mode, cấp lồng, chọn, mở)
 * xuống từng item con, xử lý click + bàn phím tập trung (WAI-ARIA APG menubar / menu, roving tabindex).
 */

import styles from './hui-menu.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { keyOf, parseKeyList } from './menu-shared.js';
import './hui-menu-item.js';
import './hui-sub-menu.js';
import './hui-menu-group.js';
import './hui-menu-divider.js';

const MODES = ['vertical', 'horizontal', 'inline'];
const ENTRY_SELECTOR = 'hui-menu-item, hui-sub-menu, hui-menu-group, hui-menu-divider';
const KEY_ATTRS = { 'selected-keys': 'selectedKeys', 'open-keys': 'openKeys' };

const isEntry = (el) => el?.localName === 'hui-menu-item' || el?.localName === 'hui-sub-menu';
const isSub = (el) => el?.localName === 'hui-sub-menu';
const enabled = (el) => !el.hasAttribute('disabled');

/**
 * Menu điều hướng: inline (sidebar), vertical (popup bên phải), horizontal (menubar).
 *
 * @fires hui-select - Chọn một item. detail: { key, keyPath, item } — keyPath: [key item, key sub-menu cha, ...]
 * @fires hui-open-change - Sub-menu đóng/mở do người dùng. detail: { openKeys }
 * @slot - hui-menu-item, hui-sub-menu, hui-menu-group, hui-menu-divider
 * @csspart base - Khung menu (role=menubar | menu)
 * @cssprop --hui-menu-bg - Nền menu
 * @cssprop --hui-menu-border-color - Viền phân cách (cạnh phải menu dọc, cạnh dưới menu ngang)
 * @cssprop --hui-menu-font-size - Cỡ chữ item
 * @cssprop --hui-menu-collapsed-width - Chiều rộng khi thu gọn (64px)
 * @cssprop --hui-menu-item-height - Chiều cao item (40px)
 * @cssprop --hui-menu-item-padding-x - Padding ngang item
 * @cssprop --hui-menu-item-margin - Margin item
 * @cssprop --hui-menu-item-radius - Bo góc item
 * @cssprop --hui-menu-item-gap - Khoảng cách icon ↔ nhãn
 * @cssprop --hui-menu-item-color - Màu chữ item
 * @cssprop --hui-menu-item-hover-bg - Nền item khi hover
 * @cssprop --hui-menu-item-selected-bg - Nền item đang chọn
 * @cssprop --hui-menu-item-selected-color - Màu chữ item đang chọn
 * @cssprop --hui-menu-icon-size - Cỡ icon
 * @cssprop --hui-menu-horizontal-height - Chiều cao menu ngang
 * @cssprop --hui-menu-horizontal-item-padding-x - Padding ngang item menu ngang
 * @cssprop --hui-menu-sub-bg - Nền danh sách con khi mở inline
 * @cssprop --hui-menu-popup-bg - Nền popup sub-menu
 * @cssprop --hui-menu-popup-radius - Bo góc popup
 * @cssprop --hui-menu-popup-shadow - Đổ bóng popup
 * @cssprop --hui-menu-popup-min-width - Chiều rộng tối thiểu popup
 * @cssprop --hui-menu-popup-max-height - Chiều cao tối đa popup
 */
class HuiMenu extends HuiElement {
  static properties = {
    /** vertical | horizontal | inline — inline: sub-menu mở ngay trong menu (sidebar); còn lại: popup nổi */
    mode: { type: String, default: 'vertical' },
    /** Thu gọn (chỉ mode inline): chỉ hiện icon, nhãn hiện qua tooltip, sub-menu thành popup */
    collapsed: { type: Boolean },
    /** Key các item đang chọn — attribute dạng "a,b" */
    selectedKeys: { type: Array, default: [], reflect: false },
    /** Key các sub-menu đang mở — attribute dạng "a,b" */
    openKeys: { type: Array, default: [], reflect: false },
    /** Chỉ mở một sub-menu mỗi cấp (inline) */
    accordion: { type: Boolean },
    /** light | dark — dark: gắn data-theme="dark" lên menu để toàn bộ token chuyển tối */
    theme: { type: String, default: '' },
    /** Độ thụt lề mỗi cấp (px, mode inline) */
    inlineIndent: { type: Number, default: 24 },
    /** hover | click — cách mở sub-menu dạng popup */
    subMenuTrigger: { type: String, default: 'hover' },
  };

  static styles = styles;

  constructor() {
    super();
    this._syncQueued = false;
    this._active = null;          // entry giữ tabindex=0 (roving)
    this._stashedOpenKeys = null; // openKeys trước khi thu gọn
    this._themeAttr = null;
  }

  // =====================================================
  // ATTRIBUTE dạng danh sách "a,b"
  // =====================================================

  attributeChangedCallback(name, oldVal, newVal) {
    const prop = KEY_ATTRS[name];
    if (prop) {
      if (oldVal !== newVal) this[prop] = parseKeyList(newVal);
      return;
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }

  get selectedKeys() {
    return this._getProp('selectedKeys');
  }

  set selectedKeys(val) {
    this._setProp('selectedKeys', Array.isArray(val) ? val.map(String) : parseKeyList(val));
  }

  get openKeys() {
    return this._getProp('openKeys');
  }

  set openKeys(val) {
    this._setProp('openKeys', Array.isArray(val) ? val.map(String) : parseKeyList(val));
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._base = createElement('div', { className: 'menu', part: 'base' }, createElement('slot'));
    this.addEventListener('click', (e) => this._onClick(e));
    this.addEventListener('keydown', (e) => this._onKeydown(e));
    this.addEventListener('focusin', (e) => this._onFocusIn(e));
    this.addEventListener('focusout', (e) => this._onFocusOut(e));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._observer ||= new MutationObserver(() => this._scheduleSync());
    this._observer.observe(this, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['key', 'disabled', 'hidden'],
    });
    this._scheduleSync();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
  }

  updated(changed) {
    // Đổi mode sau lần đầu → đóng hết popup (open-keys của inline không có nghĩa với popup)
    if (changed.has('mode') && changed.get('mode') !== undefined && this._mode !== 'inline') this._setProp('openKeys', []);
    if (changed.has('collapsed') && changed.get('collapsed') !== undefined) {
      if (this.collapsed) {
        this._stashedOpenKeys = this.openKeys;
        this._setProp('openKeys', []);
      } else if (this._stashedOpenKeys) {
        this._setProp('openKeys', this._stashedOpenKeys);
        this._stashedOpenKeys = null;
      }
    }

    if (changed.has('theme')) {
      // data-theme trên host → :where([data-theme]) trong tokens.css đổi toàn bộ token cho cây con (kể cả popup)
      const theme = this.theme === 'dark' || this.theme === 'light' ? this.theme : null;
      if (theme) {
        this.setAttribute('data-theme', theme);
        this._themeAttr = theme;
      } else if (this._themeAttr && this.getAttribute('data-theme') === this._themeAttr) {
        this.removeAttribute('data-theme');
        this._themeAttr = null;
      }
    }

    const mode = this._effectiveMode;
    this._base.className = [
      'menu',
      `menu--${this._mode}`,
      this._isCollapsed ? 'menu--collapsed' : '',
      this.theme === 'dark' ? 'menu--dark' : '',
    ].filter(Boolean).join(' ');
    this._base.setAttribute('role', mode === 'horizontal' ? 'menubar' : 'menu');
    this._base.setAttribute('aria-orientation', mode === 'horizontal' ? 'horizontal' : 'vertical');
    this._syncItems();
  }

  // =====================================================
  // PUBLIC
  // =====================================================

  /** Focus item đầu tiên (không disabled) ở cấp gốc */
  focusFirst() {
    this._childEntries(this).filter(enabled)[0]?.focus();
  }

  /** Focus item cuối cùng ở cấp gốc */
  focusLast() {
    const list = this._childEntries(this).filter(enabled);
    list[list.length - 1]?.focus();
  }

  // =====================================================
  // GETTERS
  // =====================================================

  get _mode() {
    return MODES.includes(this.mode) ? this.mode : 'vertical';
  }

  get _isCollapsed() {
    return this._mode === 'inline' && this.collapsed;
  }

  /** Inline thu gọn hoạt động như vertical (sub-menu thành popup) */
  get _effectiveMode() {
    return this._isCollapsed ? 'vertical' : this._mode;
  }

  get _subTrigger() {
    return this.subMenuTrigger === 'click' ? 'click' : 'hover';
  }

  /** Phần tử thuộc chính menu này (không phải menu lồng bên trong) */
  _owns(el) {
    return el.closest('hui-menu') === this;
  }

  /** Cha gần nhất là sub-menu hoặc chính menu (bỏ qua group) */
  _parentOf(el) {
    let p = el.parentElement;
    while (p && p !== this && !isSub(p)) p = p.parentElement;
    return p || this;
  }

  /** Các sub-menu tổ tiên, từ ngoài vào trong */
  _ancestors(el) {
    const out = [];
    for (let p = this._parentOf(el); p && p !== this; p = this._parentOf(p)) out.unshift(p);
    return out;
  }

  /** Item / sub-menu con trực tiếp của container (đi xuyên hui-menu-group) */
  _childEntries(container) {
    const out = [];
    for (const el of container.children) {
      if (el.hidden) continue;
      if (el.localName === 'hui-menu-group') out.push(...this._childEntries(el));
      else if (isEntry(el)) out.push(el);
    }
    return out;
  }

  /** Inline: danh sách phẳng các entry đang nhìn thấy (gồm con của sub-menu đang mở) */
  _visibleFlat(container) {
    const out = [];
    for (const el of this._childEntries(container)) {
      out.push(el);
      if (isSub(el) && this._isOpen(el)) out.push(...this._visibleFlat(el));
    }
    return out;
  }

  _isOpen(sub) {
    return this.openKeys.includes(keyOf(sub));
  }

  // =====================================================
  // ĐỒNG BỘ NGỮ CẢNH XUỐNG ITEM CON
  // =====================================================

  _scheduleSync() {
    if (this._syncQueued || !this._hasRendered) return;
    this._syncQueued = true;
    queueMicrotask(() => {
      this._syncQueued = false;
      this._syncItems();
    });
  }

  _syncItems() {
    if (!this._hasRendered) return;
    const mode = this._effectiveMode;
    const selected = new Set(this.selectedKeys);
    const open = new Set(this.openKeys);

    for (const el of this.querySelectorAll(ENTRY_SELECTOR)) {
      if (!this._owns(el)) continue;
      const level = this._ancestors(el).length;
      const ctx = {
        mode,
        level,
        indent: this.inlineIndent ?? 24,
        horizontalRoot: mode === 'horizontal' && level === 0,
        inPopup: mode !== 'inline' && level > 0,
        collapsedRoot: this._isCollapsed && level === 0,
        selected: el.localName === 'hui-menu-item' && selected.has(keyOf(el)),
        open: isSub(el) && open.has(keyOf(el)) && this._ancestors(el).every((a) => open.has(keyOf(a))),
        childSelected: isSub(el) && [...el.querySelectorAll('hui-menu-item')].some((i) => selected.has(keyOf(i))),
      };
      el._applyContext?.(ctx);
    }
    this._updateTabbable();
  }

  /** Entry có đang hiển thị (mọi sub-menu tổ tiên đều mở) */
  _reachable(el) {
    return el.isConnected && this._owns(el) && !el.hidden && this._ancestors(el).every((a) => this._isOpen(a));
  }

  /** Roving tabindex: đúng một entry có tabindex=0 */
  _updateTabbable() {
    let active = this._active;
    if (active && !this._reachable(active)) {
      // Entry đang giữ focus nằm trong popup đã đóng → chuyển về tổ tiên gần nhất còn thấy
      active = this._ancestors(active).find((a) => this._reachable(a)) || null;
    }
    if (!active || !enabled(active)) {
      const roots = this._childEntries(this).filter(enabled);
      const selected = new Set(this.selectedKeys);
      active = roots.find((el) => (el.localName === 'hui-menu-item' ? selected.has(keyOf(el))
        : [...el.querySelectorAll('hui-menu-item')].some((i) => selected.has(keyOf(i))))) || roots[0] || null;
    }
    this._active = active;
    for (const el of this.querySelectorAll('hui-menu-item, hui-sub-menu')) {
      if (this._owns(el)) el._setTabbable?.(el === active);
    }
  }

  // =====================================================
  // ĐÓNG / MỞ SUB-MENU
  // =====================================================

  _commitOpenKeys(keys) {
    const next = [...new Set(keys)];
    const prev = this.openKeys;
    if (next.length === prev.length && next.every((k, i) => k === prev[i])) return false;
    this.openKeys = next;
    this._syncItems();
    this.emit('hui-open-change', { openKeys: next });
    return true;
  }

  /** Mở/đóng sub-menu do người dùng. Popup: chỉ giữ nhánh đang mở; inline + accordion: đóng anh em */
  _setSubOpen(sub, open) {
    if (!sub.isConnected || (open && !enabled(sub))) return;
    const key = keyOf(sub);
    const popup = this._effectiveMode !== 'inline';
    let keys = [...this.openKeys];

    if (open) {
      if (popup) {
        keys = [...this._ancestors(sub).map(keyOf), key];
      } else {
        if (this.accordion) {
          const parent = this._parentOf(sub);
          const siblings = this._childEntries(parent).filter((el) => isSub(el) && el !== sub);
          const drop = new Set();
          for (const s of siblings) {
            drop.add(keyOf(s));
            s.querySelectorAll('hui-sub-menu').forEach((d) => drop.add(keyOf(d)));
          }
          keys = keys.filter((k) => !drop.has(k));
        }
        keys.push(key);
      }
    } else {
      const drop = new Set([key]);
      if (popup) sub.querySelectorAll('hui-sub-menu').forEach((d) => drop.add(keyOf(d)));
      keys = keys.filter((k) => !drop.has(k));
    }
    this._commitOpenKeys(keys);
  }

  _closeAllPopups() {
    if (this._effectiveMode === 'inline') return;
    this._commitOpenKeys([]);
  }

  /** Esc trong popup (overlay manager gọi): đóng popup đó, trả focus về tiêu đề */
  _onPopupEscape(sub) {
    this._setSubOpen(sub, false);
    sub.focus();
  }

  /** Click ra ngoài popup: ngoài cả menu → đóng hết; trong menu → chỉ đóng nhánh đó */
  _onPopupOutside(sub, e) {
    if (!e.composedPath().includes(this)) this._closeAllPopups();
    else this._setSubOpen(sub, false);
  }

  // =====================================================
  // CHỌN ITEM
  // =====================================================

  _select(item, viaKeyboard = false) {
    if (!enabled(item)) return;
    const key = keyOf(item);
    const keyPath = [key, ...this._ancestors(item).map(keyOf).reverse()];
    const popupRoot = this._ancestors(item)[0];

    this.selectedKeys = [key];
    if (this._effectiveMode !== 'inline') this._closeAllPopups();
    this._syncItems();
    // Chọn trong popup bằng bàn phím → focus về item gốc chứa popup để không mất focus
    if (viaKeyboard && popupRoot && this._effectiveMode !== 'inline') popupRoot.focus();
    this.emit('hui-select', { key, keyPath, item });
  }

  // =====================================================
  // SỰ KIỆN
  // =====================================================

  /** Từ composedPath tìm: item được click, hoặc tiêu đề sub-menu */
  _targetOf(e) {
    for (const node of e.composedPath()) {
      if (node === this) break;
      if (node.localName === 'hui-menu-item') return this._owns(node) ? { item: node } : null;
      if (node.dataset && 'menuTitle' in node.dataset) {
        const sub = node.getRootNode().host;
        return sub && this._owns(sub) ? { sub } : null;
      }
      if (node.localName === 'hui-menu') return null; // menu lồng bên trong
    }
    return null;
  }

  _onClick(e) {
    const target = this._targetOf(e);
    if (!target) return;
    if (target.item) {
      if (!enabled(target.item)) {
        e.preventDefault();
        return;
      }
      this._select(target.item);
      return;
    }
    const sub = target.sub;
    if (!enabled(sub)) return;
    // Popup + hover: click chỉ mở (không đóng lại ngay khi chuột vừa rê vào đã mở)
    const hoverPopup = this._effectiveMode !== 'inline' && this._subTrigger === 'hover';
    this._setSubOpen(sub, hoverPopup ? true : !this._isOpen(sub));
  }

  _entryFromEvent(e) {
    for (const node of e.composedPath()) {
      if (node === this) return null;
      if (isEntry(node)) return this._owns(node) ? node : null;
    }
    return null;
  }

  _onFocusIn(e) {
    const entry = this._entryFromEvent(e);
    if (!entry || entry === this._active) return;
    this._active = entry;
    this._updateTabbable();
  }

  /** Focus rời hẳn menu (Tab ra ngoài) → đóng popup */
  _onFocusOut(e) {
    const to = e.relatedTarget;
    if (!to || to === this || this.contains(to)) return;
    this._closeAllPopups();
  }

  _openAndFocus(sub, which = 'first') {
    this._setSubOpen(sub, true);
    const kids = this._childEntries(sub).filter(enabled);
    (which === 'last' ? kids[kids.length - 1] : kids[0])?.focus();
  }

  /** Enter / Space trên item: item có href để <a> tự điều hướng (Enter native), Space thì bấm hộ */
  _activateItem(item, e) {
    if (item.hasAttribute('href') && enabled(item)) {
      if (e.key === ' ') {
        e.preventDefault();
        item._activate();
      }
      return; // Enter → click native của <a> → _onClick xử lý
    }
    e.preventDefault();
    this._select(item, true);
  }

  _onKeydown(e) {
    const entry = this._entryFromEvent(e);
    if (!entry || e.altKey || e.ctrlKey || e.metaKey) return;
    const mode = this._effectiveMode;
    const parent = this._parentOf(entry);
    const sub = isSub(entry);
    const focusIn = (list, index) => {
      if (!list.length) return;
      e.preventDefault();
      list[(index + list.length) % list.length].focus();
    };

    // ---------- INLINE: một danh sách phẳng, ←/→ đóng/mở ----------
    if (mode === 'inline') {
      const list = this._visibleFlat(this).filter(enabled);
      const i = list.indexOf(entry);
      switch (e.key) {
        case 'ArrowDown': focusIn(list, i + 1); break;
        case 'ArrowUp': focusIn(list, i - 1); break;
        case 'Home': focusIn(list, 0); break;
        case 'End': focusIn(list, list.length - 1); break;
        case 'ArrowRight':
          if (!sub) break;
          e.preventDefault();
          if (!this._isOpen(entry)) this._setSubOpen(entry, true);
          else this._childEntries(entry).filter(enabled)[0]?.focus();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (sub && this._isOpen(entry)) this._setSubOpen(entry, false);
          else if (parent !== this) parent.focus();
          break;
        case 'Enter':
        case ' ':
          if (sub) {
            e.preventDefault();
            this._setSubOpen(entry, !this._isOpen(entry));
          } else {
            this._activateItem(entry, e);
          }
          break;
        default:
      }
      return;
    }

    // ---------- POPUP (vertical / horizontal) ----------
    const bar = mode === 'horizontal' && parent === this;
    const siblings = this._childEntries(parent).filter(enabled);
    const i = siblings.indexOf(entry);
    const roots = this._childEntries(this).filter(enabled);
    const rootOf = parent === this ? entry : this._ancestors(entry)[0];
    const horizontalMenu = mode === 'horizontal';

    switch (e.key) {
      case 'ArrowRight':
        if (bar) focusIn(siblings, i + 1);
        else if (sub) {
          e.preventDefault();
          this._openAndFocus(entry);
        } else if (horizontalMenu) {
          // Trong popup của menubar: → sang item gốc kế tiếp
          e.preventDefault();
          this._closeAllPopups();
          const next = roots[(roots.indexOf(rootOf) + 1) % roots.length];
          if (isSub(next)) this._openAndFocus(next);
          else next?.focus();
        }
        break;
      case 'ArrowLeft':
        if (bar) focusIn(siblings, i - 1);
        else if (parent !== this) {
          e.preventDefault();
          if (horizontalMenu && this._parentOf(parent) === this) {
            this._closeAllPopups();
            const prev = roots[(roots.indexOf(rootOf) - 1 + roots.length) % roots.length];
            if (isSub(prev)) this._openAndFocus(prev);
            else prev?.focus();
          } else {
            this._setSubOpen(parent, false);
            parent.focus();
          }
        }
        break;
      case 'ArrowDown':
        if (bar) {
          if (sub) {
            e.preventDefault();
            this._openAndFocus(entry, 'first');
          }
        } else focusIn(siblings, i + 1);
        break;
      case 'ArrowUp':
        if (bar) {
          if (sub) {
            e.preventDefault();
            this._openAndFocus(entry, 'last');
          }
        } else focusIn(siblings, i - 1);
        break;
      case 'Home': focusIn(siblings, 0); break;
      case 'End': focusIn(siblings, siblings.length - 1); break;
      case 'Enter':
      case ' ':
        if (sub) {
          e.preventDefault();
          this._openAndFocus(entry);
        } else {
          this._activateItem(entry, e);
        }
        break;
      default:
    }
  }
}

defineElement('hui-menu', HuiMenu);

export default HuiMenu;
