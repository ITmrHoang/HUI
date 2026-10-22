/**
 * HUI Cart Drawer — giỏ hàng trượt bên phải (organism dựng trên hui-drawer).
 * Danh sách sản phẩm (data) với hui-quantity từng dòng, xóa có "Hoàn tác", tạm tính (formatCurrency),
 * thanh miễn phí vận chuyển (hui-free-ship-bar), nút thanh toán, trạng thái trống (hui-empty).
 * Dòng được vẽ theo khóa id → đổi số lượng không dựng lại cả danh sách (giữ focus ô số).
 */

import styles from './hui-cart-drawer.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { formatCurrency } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import { collapse } from '../../utils/motion.js';
import { message } from '../hui-message/index.js';
import '../hui-add-to-cart/shop-icons.js';
import '../hui-drawer/index.js';
import '../hui-quantity/index.js';
import '../hui-price/index.js';
import '../hui-free-ship-bar/index.js';
import '../hui-empty/index.js';
import '../hui-button/index.js';
import '../hui-icon/index.js';

const FALLBACK = {
  'cart.title': { vi: 'Giỏ hàng', en: 'Your cart' },
  'cart.count': { vi: '{count} sản phẩm', en: '{count} item(s)' },
  'cart.subtotal': { vi: 'Tạm tính', en: 'Subtotal' },
  'cart.note': { vi: 'Phí vận chuyển và thuế được tính khi thanh toán', en: 'Shipping and taxes calculated at checkout' },
  'cart.checkout': { vi: 'Thanh toán', en: 'Checkout' },
  'cart.empty': { vi: 'Giỏ hàng của bạn đang trống', en: 'Your cart is empty' },
  'cart.continue': { vi: 'Tiếp tục mua sắm', en: 'Continue shopping' },
  'cart.remove': { vi: 'Xóa {name} khỏi giỏ', en: 'Remove {name} from cart' },
  'cart.removed': { vi: 'Đã xóa {name} khỏi giỏ', en: 'Removed {name} from cart' },
  'cart.undo': { vi: 'Hoàn tác', en: 'Undo' },
  'cart.quantity': { vi: 'Số lượng {name}', en: 'Quantity of {name}' },
  'cart.list': { vi: 'Sản phẩm trong giỏ', en: 'Items in cart' },
};
const msg = (key, vars) => {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
};

/** Chuẩn hóa 1 dòng giỏ: id luôn là chuỗi, qty nguyên ≥ 1, price là số */
function normalizeItem(raw, i) {
  if (!raw || typeof raw !== 'object') return null;
  const qty = Math.max(1, Math.round(Number(raw.qty) || 1));
  return { ...raw, id: String(raw.id ?? raw.name ?? i), qty, price: Number(raw.price) || 0 };
}

/**
 * Giỏ hàng dạng ngăn kéo.
 * @fires hui-cart-change - Đổi số lượng / xóa / hoàn tác / thêm. detail: { items, total, count, reason, item }
 * @fires hui-checkout - Bấm thanh toán. Cancelable: preventDefault() chặn chuyển trang checkout-href. detail: { items, total, count }
 * @fires hui-continue - Bấm "Tiếp tục mua sắm" ở trạng thái trống (drawer tự đóng)
 * @fires hui-open - (từ hui-drawer) Vừa mở
 * @fires hui-close - (từ hui-drawer) Bắt đầu đóng
 * @slot footer-extra - Nội dung trên dòng tạm tính (vd hui-coupon-input)
 * @slot empty - Thay nút "Tiếp tục mua sắm" ở trạng thái trống
 * @slot header-extra - Vùng hành động bên phải tiêu đề
 * @csspart drawer - <hui-drawer> bên trong (style sâu hơn: drawer-panel, drawer-header, drawer-body, drawer-footer)
 * @csspart heading - Tiêu đề "Giỏ hàng (3)"
 * @csspart free-ship - Vùng chứa hui-free-ship-bar
 * @csspart list - Danh sách (<ul>)
 * @csspart item - Một dòng sản phẩm
 * @csspart item-image - Ảnh sản phẩm
 * @csspart item-name - Tên sản phẩm
 * @csspart item-variant - Biến thể (màu / cỡ)
 * @csspart item-quantity - <hui-quantity>
 * @csspart item-price - <hui-price> (thành tiền dòng)
 * @csspart item-remove - Nút xóa dòng
 * @csspart undo - Dòng "Đã xóa … · Hoàn tác"
 * @csspart undo-button - Nút Hoàn tác
 * @csspart empty - <hui-empty>
 * @csspart footer - Khối dưới cùng (tạm tính + thanh toán)
 * @csspart subtotal - Dòng tạm tính
 * @csspart total - Số tiền tạm tính
 * @csspart note - Ghi chú phí vận chuyển
 * @csspart checkout - Nút thanh toán (<hui-button>)
 * @cssprop --hui-cart-drawer-image-size - Cạnh ảnh sản phẩm (mặc định 72px)
 * @cssprop --hui-cart-drawer-image-radius - Bo góc ảnh
 * @cssprop --hui-cart-drawer-item-gap - Khoảng cách giữa các dòng
 * @cssprop --hui-cart-drawer-divider - Đường kẻ giữa các dòng
 * @cssprop --hui-cart-drawer-name-color - Màu tên sản phẩm
 * @cssprop --hui-cart-drawer-variant-color - Màu chữ biến thể
 * @cssprop --hui-cart-drawer-total-color - Màu số tiền tạm tính
 * @cssprop --hui-cart-drawer-total-font-size - Cỡ chữ tạm tính
 * @cssprop --hui-cart-drawer-undo-bg - Nền dòng hoàn tác
 * @cssprop --hui-cart-drawer-body-padding - Padding vùng danh sách
 */
class HuiCartDrawer extends HuiElement {
  static properties = {
    /** Đang mở (hoặc show() / hide() / toggle()) */
    open: { type: Boolean },
    /** [{ id, name, image, price, original, qty, variant, max, href }] — attribute dạng JSON */
    data: { type: Array, default: [] },
    /** Tiêu đề (mặc định "Giỏ hàng") */
    heading: { type: String },
    /** Mã tiền tệ ISO 4217 */
    currency: { type: String, default: 'VND' },
    /** Ngưỡng miễn phí vận chuyển — 0 / bỏ trống = ẩn thanh free-ship */
    freeShipThreshold: { type: Number, default: 0 },
    /** Chữ nút thanh toán (mặc định "Thanh toán") */
    checkoutText: { type: String },
    /** URL trang thanh toán — chuyển tới khi bấm (trừ khi hui-checkout bị preventDefault) */
    checkoutHref: { type: String },
    /** Chữ trạng thái trống (mặc định "Giỏ hàng của bạn đang trống") */
    emptyText: { type: String },
    /** Số giây giữ dòng "Hoàn tác" sau khi xóa (0 = xóa luôn, không hoàn tác) */
    undoDuration: { type: Number, default: 5 },
    /** right | left — mép trượt ra */
    placement: { type: String, default: 'right' },
    /** default | large hoặc độ dài CSS (truyền cho hui-drawer) */
    size: { type: String, default: 'default' },
    /** 'false' = không lớp phủ (trang bên dưới vẫn thao tác được) */
    mask: { type: String, default: 'true' },
    /** Tắt hiệu ứng thêm / xóa dòng */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    /** Danh sách hiện tại (nguồn sự thật sau lần gán data gần nhất) */
    this._items = [];
    /** id → <li> */
    this._rows = new Map();
    /** Dòng đã xóa chờ hoàn tác: { item, index, el, timer } */
    this._pending = [];
    this._syncingData = false;
  }

  /** Danh sách hiện tại (đã chuẩn hóa) — gán mảng mới để thay toàn bộ */
  get data() {
    return this._items;
  }
  set data(v) {
    this._setProp('data', Array.isArray(v) ? v : []);
  }

  /** Tổng tiền tạm tính */
  get total() {
    return this._items.reduce((sum, it) => sum + it.price * it.qty, 0);
  }

  /** Tổng số lượng sản phẩm */
  get count() {
    return this._items.reduce((sum, it) => sum + it.qty, 0);
  }

  get _motion() {
    return !this.noAnimation && !animationsDisabled();
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  show() { this.open = true; }
  hide() { this.open = false; }
  toggle() { this.open = !this.open; }

  /** Thêm sản phẩm (cùng id → cộng dồn số lượng). `open` = mở drawer sau khi thêm */
  addItem(item, { open = false } = {}) {
    const next = normalizeItem(item, this._items.length);
    if (!next) return;
    const existing = this._items.find((it) => it.id === next.id);
    if (existing) {
      existing.qty = this._clampQty(existing, existing.qty + next.qty);
      this._patchRow(existing);
    } else {
      this._items.push(next);
    }
    this._renderList(next.id);
    this._emitChange('add', existing || next);
    if (open) this.show();
  }

  /** Xóa theo id (có dòng Hoàn tác nếu undo-duration > 0) */
  removeItem(id) {
    const index = this._items.findIndex((it) => it.id === String(id));
    if (index < 0) return;
    const [item] = this._items.splice(index, 1);
    const row = this._rows.get(item.id);
    this._rows.delete(item.id);
    if (this.undoDuration > 0 && row) this._showUndo(item, index, row);
    else if (row) this._removeRow(row);
    this._renderList();
    this._emitChange('remove', item);
    this._toast(item);
  }

  /** Đặt số lượng cho dòng id */
  updateQty(id, qty) {
    const item = this._items.find((it) => it.id === String(id));
    if (!item) return;
    const next = this._clampQty(item, qty);
    if (next === item.qty) return;
    item.qty = next;
    this._patchRow(item);
    this._renderSummary();
    this._emitChange('qty', item);
  }

  /** Xóa sạch giỏ (không hoàn tác) */
  clear() {
    this._flushPending();
    const had = this._items.length;
    this._items = [];
    this._renderList();
    if (had) this._emitChange('clear', null);
  }

  _clampQty(item, qty) {
    const max = Number.isFinite(Number(item.max)) && Number(item.max) > 0 ? Number(item.max) : Infinity;
    return Math.min(Math.max(1, Math.round(Number(qty) || 1)), max);
  }

  _emitChange(reason, item) {
    this.emit('hui-cart-change', {
      items: this._items.map((it) => ({ ...it })), total: this.total, count: this.count, reason, item: item ? { ...item } : null,
    });
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._headingText = document.createTextNode('');
    this._countEl = createElement('span', { className: 'cd__count' });
    const heading = createElement('span', { slot: 'header', className: 'cd__heading', part: 'heading' }, this._headingText, this._countEl);
    const headerExtra = createElement('slot', { name: 'header-extra', slot: 'extra' });

    this._freeShip = createElement('hui-free-ship-bar', { className: 'cd__free-ship', size: 'sm' });
    this._freeShipBox = createElement('div', { className: 'cd__free-ship-box', part: 'free-ship' }, this._freeShip);

    this._list = createElement('ul', { className: 'cd__list', part: 'list', role: 'list' });

    this._continueBtn = createElement('hui-button', { variant: 'outline', className: 'cd__continue' });
    this._continueBtn.addEventListener('hui-click', (e) => {
      e.stopPropagation();
      this.emit('hui-continue');
      this.hide();
    });
    this._empty = createElement('hui-empty', { className: 'cd__empty', part: 'empty', hidden: true },
      createElement('slot', { name: 'empty' }, this._continueBtn));

    this._totalEl = createElement('strong', { className: 'cd__total', part: 'total' });
    this._subtotalLabel = createElement('span', {});
    const subtotal = createElement('div', { className: 'cd__subtotal', part: 'subtotal' }, this._subtotalLabel, this._totalEl);
    this._note = createElement('p', { className: 'cd__note', part: 'note' });
    this._checkout = createElement('hui-button', { className: 'cd__checkout', part: 'checkout', block: '', size: 'lg' });
    this._checkout.addEventListener('hui-click', (e) => {
      e.stopPropagation();
      this._onCheckout();
    });
    this._footer = createElement('div', { slot: 'footer', className: 'cd__footer', part: 'footer' },
      createElement('slot', { name: 'footer-extra' }), subtotal, this._note, this._checkout);

    this._drawer = createElement('hui-drawer', {
      className: 'cd', part: 'drawer',
      exportparts: 'panel: drawer-panel, header: drawer-header, body: drawer-body, footer: drawer-footer, close: drawer-close, mask: drawer-mask',
    }, heading, headerExtra, this._freeShipBox, this._list, this._empty, this._footer);

    // Đồng bộ open khi người dùng đóng bằng X / Esc / mask (sự kiện tự nổi ra ngoài host — composed)
    this._drawer.addEventListener('hui-open', () => { this.open = true; });
    this._drawer.addEventListener('hui-close', () => { this.open = false; });
    return this._drawer;
  }

  updated(changed) {
    if (changed.has('data')) {
      this._flushPending();
      const raw = this._getProp('data');
      this._items = (Array.isArray(raw) ? raw : []).map(normalizeItem).filter(Boolean);
      // Dữ liệu mới → dựng lại toàn bộ dòng
      for (const row of this._rows.values()) row.remove();
      this._rows.clear();
      this._renderList();
    }
    if (changed.has('placement')) this._drawer.setAttribute('placement', this.placement === 'left' ? 'left' : 'right');
    if (changed.has('size')) this._drawer.setAttribute('size', this.size || 'default');
    if (changed.has('mask')) this._drawer.setAttribute('mask', this.mask === 'false' ? 'false' : 'true');
    if (changed.has('open') && this._drawer.open !== this.open) this._drawer.open = this.open;
    if (changed.has('locale') || changed.has('heading') || changed.has('checkoutText') || changed.has('emptyText')) {
      this._headingText.data = this.heading || msg('cart.title');
      this._subtotalLabel.textContent = msg('cart.subtotal');
      this._note.textContent = msg('cart.note');
      this._checkout.textContent = this.checkoutText || msg('cart.checkout');
      this._continueBtn.textContent = msg('cart.continue');
      this._empty.setAttribute('description', this.emptyText || msg('cart.empty'));
      this._list.setAttribute('aria-label', msg('cart.list'));
      if (changed.has('locale') && !changed.has('data')) {
        for (const item of this._items) this._patchRow(item);
      }
    }
    if (changed.has('currency') || changed.has('freeShipThreshold') || changed.has('locale')) this._renderSummary();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._flushPending();
  }

  // =====================================================
  // DÒNG SẢN PHẨM (vẽ theo khóa id)
  // =====================================================

  /** Đồng bộ <ul> với _items: tạo dòng mới, giữ dòng cũ, đúng thứ tự (dòng hoàn tác giữ chỗ) */
  _renderList(enterId) {
    const wanted = this._items.map((item) => {
      let row = this._rows.get(item.id);
      if (!row) {
        row = this._createRow(item);
        this._rows.set(item.id, row);
        row._new = true;
      }
      return row;
    });
    // Chèn theo thứ tự, bỏ qua dòng hoàn tác (vẫn nằm tại chỗ)
    let cursor = this._list.firstElementChild;
    for (const row of wanted) {
      while (cursor && cursor.classList.contains('cd__undo')) cursor = cursor.nextElementSibling;
      if (cursor !== row) this._list.insertBefore(row, cursor);
      else cursor = cursor.nextElementSibling;
    }
    for (const row of wanted) {
      // Chỉ dòng vừa thêm bằng addItem() mới trượt vào (gán data mới thì hiện ngay)
      if (row._new && row.dataset.id === enterId && this._motion) {
        row.animate?.([{ opacity: 0, transform: 'translateX(16px)' }, { opacity: 1, transform: 'none' }],
          { duration: 260, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' });
      }
      row._new = false;
    }
    this._renderSummary();
  }

  _createRow(item) {
    const img = createElement('img', { className: 'cd__img', part: 'item-image', alt: '', loading: 'lazy', decoding: 'async' });
    const name = createElement('a', { className: 'cd__name', part: 'item-name' });
    const variant = createElement('div', { className: 'cd__variant', part: 'item-variant' });
    const qty = createElement('hui-quantity', { className: 'cd__qty', part: 'item-quantity', size: 'sm', min: '1' });
    const price = createElement('hui-price', { className: 'cd__price', part: 'item-price', size: 'sm', 'show-discount': 'false' });
    const remove = createElement('button', { type: 'button', className: 'cd__remove', part: 'item-remove' },
      createElement('hui-icon', { name: 'delete' }));
    const li = createElement('li', { className: 'cd__item', part: 'item', 'data-id': item.id },
      img,
      createElement('div', { className: 'cd__info' }, name, variant, qty),
      createElement('div', { className: 'cd__side' }, price, remove));

    qty.addEventListener('input', (e) => e.stopPropagation());
    qty.addEventListener('change', (e) => {
      e.stopPropagation();
      this.updateQty(li.dataset.id, e.detail?.value ?? qty.value);
    });
    remove.addEventListener('click', () => this.removeItem(li.dataset.id));
    li._parts = { img, name, variant, qty, price, remove };
    this._patchRow(item, li);
    return li;
  }

  _patchRow(item, li = this._rows.get(item.id)) {
    if (!li) return;
    const { img, name, variant, qty, price, remove } = li._parts;
    if (item.image) {
      if (img.getAttribute('src') !== item.image) img.src = item.image;
      img.hidden = false;
    } else img.hidden = true;
    name.textContent = item.name ?? '';
    if (item.href) name.setAttribute('href', item.href);
    else name.removeAttribute('href');
    variant.textContent = item.variant ?? '';
    variant.hidden = !item.variant;
    if (item.max) qty.setAttribute('max', String(item.max));
    else qty.removeAttribute('max');
    if (qty.value !== item.qty) qty.value = item.qty;
    qty.setAttribute('label', msg('cart.quantity', { name: item.name ?? '' }));
    price.value = item.price * item.qty;
    price.currency = this.currency || 'VND';
    if (Number(item.original) > item.price) price.original = Number(item.original) * item.qty;
    else price.original = null;
    remove.setAttribute('aria-label', msg('cart.remove', { name: item.name ?? '' }));
  }

  _removeRow(row) {
    if (!this._motion) {
      row.remove();
      return;
    }
    collapse(row, false).then(() => row.remove());
    row.style.height = '0px';
  }

  // =====================================================
  // HOÀN TÁC
  // =====================================================

  /** Thay dòng vừa xóa bằng dòng "Đã xóa … · Hoàn tác" tại đúng chỗ */
  _showUndo(item, index, row) {
    const btn = createElement('button', { type: 'button', className: 'cd__undo-btn', part: 'undo-button' }, msg('cart.undo'));
    const el = createElement('li', { className: 'cd__undo', part: 'undo', role: 'status' },
      createElement('span', { className: 'cd__undo-text' }, msg('cart.removed', { name: item.name ?? '' })), btn);
    const hadFocus = row.contains(this.shadowRoot.activeElement);
    // Focus sang "Hoàn tác" TRƯỚC khi gỡ dòng: gỡ phần tử đang focus trong <dialog> modal sẽ kích hoạt
    // "focus fixup" của trình duyệt (trễ, không phát sự kiện) và kéo focus về nút đóng của drawer
    row.before(el);
    if (hadFocus) btn.focus({ preventScroll: true });
    row.remove();
    if (hadFocus) {
      // Trình duyệt / dialog đôi khi trả focus về nút đầu tiên của drawer ở khung kế tiếp → kéo lại nếu focus
      // không còn ở nội dung giỏ (người dùng chưa chủ động chuyển đi chỗ khác)
      requestAnimationFrame(() => {
        const active = this.shadowRoot.activeElement;
        if (btn.isConnected && active !== btn && !this._list.contains(active)) btn.focus({ preventScroll: true });
      });
    }
    const entry = { item, index, el, timer: null };
    entry.timer = setTimeout(() => this._expireUndo(entry), Math.max(0, this.undoDuration) * 1000);
    btn.addEventListener('click', () => this._undo(entry));
    this._pending.push(entry);
    if (this._motion) {
      el.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    }
  }

  _undo(entry) {
    const i = this._pending.indexOf(entry);
    if (i < 0) return;
    this._pending.splice(i, 1);
    clearTimeout(entry.timer);
    const item = entry.item;
    this._items.splice(Math.min(entry.index, this._items.length), 0, item);
    const row = this._createRow(item);
    this._rows.set(item.id, row);
    // Cùng lý do như _showUndo: chuyển focus xong mới gỡ dòng "Hoàn tác" đang giữ focus
    entry.el.before(row);
    this._renderList();
    if (entry.el.contains(this.shadowRoot.activeElement)) row.querySelector('.cd__remove')?.focus({ preventScroll: true });
    entry.el.remove();
    if (this._motion) row.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    this._emitChange('undo', item);
  }

  _expireUndo(entry) {
    const i = this._pending.indexOf(entry);
    if (i < 0) return;
    this._pending.splice(i, 1);
    this._removeRow(entry.el);
  }

  /** Bỏ mọi dòng hoàn tác đang chờ (dữ liệu bị thay / tháo khỏi trang) */
  _flushPending() {
    for (const entry of this._pending) {
      clearTimeout(entry.timer);
      entry.el.remove();
    }
    this._pending = [];
  }

  /**
   * Thông báo bằng message API. Drawer modal làm mọi thứ ngoài nó bị inert (kể cả message) →
   * chỉ gắn nút Hoàn tác vào thông báo khi drawer không có mask; còn lại dùng dòng hoàn tác trong drawer.
   * Đã có dòng hoàn tác (role=status, tự đọc cho trình đọc màn hình) thì không hiện thêm thông báo: việc đưa
   * container thông báo lên top-layer trên dialog modal còn làm trình duyệt giật focus khỏi nút Hoàn tác.
   */
  _toast(item) {
    const text = msg('cart.removed', { name: item.name ?? '' });
    if (this.mask === 'false' && this.undoDuration > 0) {
      const entry = this._pending.find((p) => p.item === item);
      const btn = createElement('button', { type: 'button', className: 'hui-cart-drawer-toast-undo' }, msg('cart.undo'));
      Object.assign(btn.style, {
        marginInlineStart: '8px', padding: '0', border: '0', background: 'none', cursor: 'pointer',
        color: 'var(--hui-primary)', font: 'inherit', fontWeight: '600',
      });
      const content = createElement('span', {}, text, btn);
      const close = message.info(content, { duration: this.undoDuration });
      btn.addEventListener('click', () => {
        if (entry) this._undo(entry);
        close();
      });
    } else if (!(this.undoDuration > 0)) {
      message.info(text, { duration: 2 });
    }
  }

  // =====================================================
  // TỔNG / TRỐNG / THANH TOÁN
  // =====================================================

  _renderSummary() {
    const empty = this._items.length === 0;
    const total = this.total;
    const count = this.count;
    const prevTotal = this._totalEl.textContent;
    this._totalEl.textContent = formatCurrency(total, this.currency || 'VND');
    if (prevTotal && prevTotal !== this._totalEl.textContent && this._motion) {
      this._totalEl.animate?.([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
    }
    this._countEl.textContent = count ? ` (${count})` : '';
    this._countEl.setAttribute('aria-label', msg('cart.count', { count }));
    // Còn dòng hoàn tác → chưa coi là trống (người dùng vẫn bấm Hoàn tác được)
    const showEmpty = empty && this._pending.length === 0;
    this._empty.hidden = !showEmpty;
    this._list.hidden = empty && this._pending.length === 0;
    // Trống: rút footer khỏi slot footer → hui-drawer tự ẩn vùng footer (kẻ viền + padding)
    this._footer.hidden = empty;
    this._footer.slot = empty ? '' : 'footer';
    this._checkout.disabled = empty;

    const th = Number(this.freeShipThreshold) || 0;
    this._freeShipBox.hidden = th <= 0 || empty;
    if (th > 0) {
      this._freeShip.threshold = th;
      this._freeShip.total = total;
      this._freeShip.currency = this.currency || 'VND';
    }
    this.setState('empty', empty);
  }

  _onCheckout() {
    if (!this._items.length) return;
    const ok = this.emit('hui-checkout', { items: this._items.map((it) => ({ ...it })), total: this.total, count: this.count }, { cancelable: true });
    if (ok && this.checkoutHref) window.location.assign(this.checkoutHref);
  }
}

defineElement('hui-cart-drawer', HuiCartDrawer);

export default HuiCartDrawer;
