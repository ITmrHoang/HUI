/**
 * HUI Tooltip — Chú thích nổi khi hover/focus/click (Web Component Vanilla JS)
 * Kết hợp API của Ant Design Tooltip + MUI Tooltip.
 *
 * Hỗ trợ:
 * - 12 vị trí (top, top-start, top-end, bottom*, left*, right*) + tự lật khi thiếu chỗ
 * - Trigger: hover (kèm focus), focus, click, manual — có thể kết hợp ("hover click")
 * - Controlled qua attribute "open", methods show() / hide() / toggle()
 * - Arrow, delay, màu sắc, max-width, offset, disabled
 * - Tương tác như MUI: rê chuột từ trigger sang tooltip thì tooltip vẫn mở
 */

import styles from './hui-tooltip.css?raw';
import { createElement, createStyle, ensureTokens } from '../../utils/dom.js';
import { emitEvent } from '../../utils/events.js';

// Bộ đếm sinh id duy nhất cho popup (dùng với aria-describedby)
let tooltipUid = 0;

// Khoảng cách tối thiểu (px) giữa tooltip và mép viewport
const VIEWPORT_MARGIN = 8;

// Các màu có sẵn trong design tokens
const COLOR_VARIANTS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

// Hướng ngược lại — dùng khi tự lật (flip) vị trí
const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

class HuiTooltip extends HTMLElement {
  static get observedAttributes() {
    return [
      'content', 'title', 'placement', 'trigger', 'open', 'arrow', 'delay',
      'hide-delay', 'color', 'max-width', 'disabled', 'offset',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null;   // <span class="hui-tooltip"> bao ngoài
    this._popup = null;     // Khung tooltip (role="tooltip")
    this._styled = false;
    this._open = false;     // Trạng thái hiển thị thực tế
    this._titleText = '';   // Nội dung lấy từ attribute "title" (alias của content)
    this._showTimer = null;
    this._hideTimer = null;
    this._rafId = null;
    this._popupId = `hui-tooltip-${++tooltipUid}`;

    // Bind sẵn các handler gắn lên window/document để có thể removeEventListener chính xác
    this._onReposition = this._onReposition.bind(this);
    this._onDocumentClick = this._onDocumentClick.bind(this);
    this._onDocumentKeydown = this._onDocumentKeydown.bind(this);
  }

  // =====================================================
  // LIFECYCLE CALLBACKS
  // =====================================================

  connectedCallback() {
    if (!this._styled) {
      ensureTokens();
      this.shadowRoot.appendChild(createStyle(styles));
      this._styled = true;
    }
    // Gắn aria-describedby lên host để liên kết trigger với nội dung tooltip
    this.setAttribute('aria-describedby', this._popupId);

    if (!this._wrapper) this._render();

    // Nếu có sẵn attribute open lúc khởi tạo → mở ngay (đợi 1 frame để layout ổn định)
    if (this.hasAttribute('open')) {
      requestAnimationFrame(() => this._applyOpen(this.hasAttribute('open')));
    }
  }

  disconnectedCallback() {
    // Dọn dẹp toàn bộ timer + listener toàn cục để tránh rò rỉ bộ nhớ
    this._clearTimers();
    this._removeGlobalListeners();
    this._open = false;
    if (this._popup) this._popup.classList.remove('hui-tooltip__popup--open');
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;

    // Alias "title" (giống Ant Design): lưu lại nội dung rồi XÓA attribute khỏi host
    // để trình duyệt không hiện thêm tooltip native màu vàng chồng lên.
    if (name === 'title') {
      if (newVal === null) return; // Lần gọi do chính ta removeAttribute → bỏ qua
      this._titleText = newVal;
      this.removeAttribute('title');
      if (this._wrapper) this._render();
      return;
    }

    if (!this._wrapper) return;

    if (name === 'open') {
      // Controlled mode: thay đổi attribute open từ bên ngoài → đồng bộ trạng thái hiển thị
      this._applyOpen(newVal !== null);
      return;
    }

    if (name === 'disabled' && newVal !== null) {
      this._setOpen(false);
    }

    this._render();
  }

  // =====================================================
  // PUBLIC METHODS
  // =====================================================

  show() { this._clearTimers(); this._setOpen(true); }
  hide() { this._clearTimers(); this._setOpen(false); }
  toggle() { this._clearTimers(); this._setOpen(!this._open); }

  // =====================================================
  // HELPERS
  // =====================================================

  /** Danh sách trigger, ví dụ "hover click" → ['hover', 'click'] */
  _getTriggers() {
    const raw = (this.getAttribute('trigger') || 'hover').trim().toLowerCase();
    return raw.split(/\s+/).filter(Boolean);
  }

  _getContentText() {
    return this.getAttribute('content') || this._titleText || '';
  }

  _getNumber(attr, fallback) {
    const n = parseFloat(this.getAttribute(attr));
    return Number.isFinite(n) ? n : fallback;
  }

  /** Có nội dung để hiển thị không (text attribute hoặc slot "content") */
  _hasContent() {
    if (this._getContentText()) return true;
    const slot = this._popup?.querySelector('slot[name="content"]');
    return !!slot && slot.assignedNodes().some((n) =>
      n.nodeType === Node.ELEMENT_NODE || n.textContent.trim() !== ''
    );
  }

  _clearTimers() {
    clearTimeout(this._showTimer);
    clearTimeout(this._hideTimer);
    this._showTimer = null;
    this._hideTimer = null;
  }

  /** Mở sau một khoảng delay (hủy lệnh đóng đang chờ nếu có) */
  _scheduleShow() {
    clearTimeout(this._hideTimer);
    this._hideTimer = null;
    if (this._open || this._showTimer) return;
    this._showTimer = setTimeout(() => {
      this._showTimer = null;
      this._setOpen(true);
    }, this._getNumber('delay', 100));
  }

  /** Đóng sau một khoảng hide-delay (hủy lệnh mở đang chờ nếu có) */
  _scheduleHide() {
    clearTimeout(this._showTimer);
    this._showTimer = null;
    if (!this._open || this._hideTimer) return;
    this._hideTimer = setTimeout(() => {
      this._hideTimer = null;
      this._setOpen(false);
    }, this._getNumber('hide-delay', 100));
  }

  /**
   * Đổi trạng thái do tương tác người dùng / method:
   * cập nhật giao diện, phản chiếu attribute "open" rồi phát event open-change.
   */
  _setOpen(open) {
    if (open && (this.hasAttribute('disabled') || !this._hasContent())) return;
    if (open === this._open) return;

    this._applyOpen(open);
    // Phản chiếu sang attribute (callback sẽ chạy lại nhưng _applyOpen bỏ qua vì state đã khớp)
    this.toggleAttribute('open', open);
    emitEvent(this, 'open-change', { open });
  }

  /** Áp dụng trạng thái mở/đóng lên DOM (không phát event) */
  _applyOpen(open) {
    if (!this._popup) return;
    if (open && (this.hasAttribute('disabled') || !this._hasContent())) open = false;
    if (open === this._open) return;
    this._open = open;

    if (open) {
      this._updatePosition();
      this._popup.classList.add('hui-tooltip__popup--open');
      this._popup.setAttribute('aria-hidden', 'false');
      this._addGlobalListeners();
    } else {
      this._popup.classList.remove('hui-tooltip__popup--open');
      this._popup.setAttribute('aria-hidden', 'true');
      this._removeGlobalListeners();
    }
  }

  // =====================================================
  // GLOBAL LISTENERS (chỉ gắn khi tooltip đang mở)
  // =====================================================

  _addGlobalListeners() {
    // capture: true để bắt cả sự kiện cuộn của MỌI container cha (scroll không nổi bọt)
    window.addEventListener('scroll', this._onReposition, { capture: true, passive: true });
    window.addEventListener('resize', this._onReposition, { passive: true });
    document.addEventListener('click', this._onDocumentClick, true);
    document.addEventListener('keydown', this._onDocumentKeydown);
  }

  _removeGlobalListeners() {
    window.removeEventListener('scroll', this._onReposition, { capture: true });
    window.removeEventListener('resize', this._onReposition);
    document.removeEventListener('click', this._onDocumentClick, true);
    document.removeEventListener('keydown', this._onDocumentKeydown);
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }

  /** Gom nhiều sự kiện scroll/resize vào 1 lần tính toán mỗi frame */
  _onReposition() {
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      if (this._open) this._updatePosition();
    });
  }

  /**
   * Click ra ngoài → đóng (chỉ với trigger click).
   * composedPath() trả về đường đi xuyên qua Shadow DOM, nên kiểm tra
   * xem host có nằm trong đường đi không là biết click trong hay ngoài.
   */
  _onDocumentClick(e) {
    if (!this._getTriggers().includes('click')) return;
    if (e.composedPath().includes(this)) return;
    this._clearTimers();
    this._setOpen(false);
  }

  /** Nhấn Escape → đóng tooltip (trừ chế độ manual do code bên ngoài điều khiển) */
  _onDocumentKeydown(e) {
    if (e.key !== 'Escape') return;
    if (this._getTriggers().includes('manual')) return;
    this._clearTimers();
    this._setOpen(false);
  }

  // =====================================================
  // POSITIONING
  // =====================================================

  /**
   * Tính tọa độ position: fixed của popup dựa trên getBoundingClientRect() của trigger.
   * 1. Tính vị trí theo placement mong muốn
   * 2. Nếu tràn viewport ở phía đó mà phía đối diện rộng hơn → lật (flip)
   * 3. Kẹp (clamp) toàn bộ popup nằm trong viewport, cách mép 8px
   * 4. Dịch mũi tên sao cho luôn chỉ vào giữa trigger
   */
  _updatePosition() {
    if (!this._popup) return;

    const placement = this.getAttribute('placement') || 'top';
    let [side, align = 'center'] = placement.split('-');
    if (!OPPOSITE[side]) side = 'top';

    const offset = this._getNumber('offset', 8);
    const r = this.getBoundingClientRect();
    // offsetWidth/Height bỏ qua transform scale của hiệu ứng → đo được kích thước thật
    const pw = this._popup.offsetWidth;
    const ph = this._popup.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Không gian trống ở mỗi phía của trigger
    const space = {
      top: r.top,
      bottom: vh - r.bottom,
      left: r.left,
      right: vw - r.right,
    };
    const needed = (s) => (s === 'top' || s === 'bottom' ? ph : pw) + offset + VIEWPORT_MARGIN;

    // Tự lật khi không đủ chỗ và phía đối diện có nhiều chỗ hơn
    if (space[side] < needed(side) && space[OPPOSITE[side]] > space[side]) {
      side = OPPOSITE[side];
    }

    let top;
    let left;
    if (side === 'top' || side === 'bottom') {
      top = side === 'top' ? r.top - ph - offset : r.bottom + offset;
      if (align === 'start') left = r.left;
      else if (align === 'end') left = r.right - pw;
      else left = r.left + r.width / 2 - pw / 2;
    } else {
      left = side === 'left' ? r.left - pw - offset : r.right + offset;
      if (align === 'start') top = r.top;
      else if (align === 'end') top = r.bottom - ph;
      else top = r.top + r.height / 2 - ph / 2;
    }

    // Kẹp trong viewport
    const clamp = (val, min, max) => Math.min(Math.max(val, min), Math.max(min, max));
    left = clamp(left, VIEWPORT_MARGIN, vw - pw - VIEWPORT_MARGIN);
    top = clamp(top, VIEWPORT_MARGIN, vh - ph - VIEWPORT_MARGIN);

    this._popup.style.left = `${Math.round(left)}px`;
    this._popup.style.top = `${Math.round(top)}px`;
    this._popup.dataset.side = side; // CSS dùng để đặt mũi tên + transform-origin

    // Mũi tên luôn trỏ vào tâm trigger, nhưng không vượt khỏi góc bo của popup
    const ARROW_EDGE = 12;
    if (side === 'top' || side === 'bottom') {
      const x = clamp(r.left + r.width / 2 - left, ARROW_EDGE, pw - ARROW_EDGE);
      this._popup.style.setProperty('--_arrow-x', `${Math.round(x)}px`);
      this._popup.style.removeProperty('--_arrow-y');
    } else {
      const y = clamp(r.top + r.height / 2 - top, ARROW_EDGE, ph - ARROW_EDGE);
      this._popup.style.setProperty('--_arrow-y', `${Math.round(y)}px`);
      this._popup.style.removeProperty('--_arrow-x');
    }
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  _render() {
    const wasOpen = this._open;
    if (this._wrapper) this._wrapper.remove();
    this._open = false;

    const triggers = this._getTriggers();
    const color = this.getAttribute('color') || '';
    const maxWidth = this.getAttribute('max-width') || '250px';
    const showArrow = this.getAttribute('arrow') !== 'false';
    const text = this._getContentText();

    // ---------- TRIGGER ----------
    // Slot mặc định chứa phần tử kích hoạt (nút, icon, text...)
    const triggerEl = createElement('span', { className: 'hui-tooltip__trigger', part: 'trigger' },
      createElement('slot')
    );

    // ---------- POPUP ----------
    const popupClasses = [
      'hui-tooltip__popup',
      COLOR_VARIANTS.includes(color) ? `hui-tooltip__popup--${color}` : '',
    ].filter(Boolean).join(' ');

    this._popup = createElement('div', {
      className: popupClasses,
      part: 'popup',
      role: 'tooltip',
      id: this._popupId,
      'aria-hidden': 'true',
    },
      // Slot "content" cho nội dung phong phú; nếu không có thì hiển thị text từ attribute (fallback)
      createElement('div', { className: 'hui-tooltip__inner', part: 'content' },
        createElement('slot', { name: 'content' }, text)
      ),
      showArrow ? createElement('span', { className: 'hui-tooltip__arrow', part: 'arrow' }) : null
    );
    this._popup.style.maxWidth = maxWidth;
    // Màu tùy biến (CSS color bất kỳ, ví dụ "#ff6600") → gán thẳng vào biến nền
    if (color && !COLOR_VARIANTS.includes(color)) {
      this._popup.style.setProperty('--_bg', color);
    }

    // ---------- GẮN SỰ KIỆN THEO TRIGGER ----------
    // Hover: rời trigger → hẹn giờ đóng; đi vào popup → hủy hẹn giờ (tooltip tương tác như MUI)
    if (triggers.includes('hover')) {
      triggerEl.addEventListener('mouseenter', () => this._scheduleShow());
      triggerEl.addEventListener('mouseleave', () => this._scheduleHide());
      this._popup.addEventListener('mouseenter', () => this._scheduleShow());
      this._popup.addEventListener('mouseleave', () => this._scheduleHide());
    }

    // Focus: "hover" mặc định bao gồm cả focus bàn phím (trợ năng)
    if (triggers.includes('hover') || triggers.includes('focus')) {
      triggerEl.addEventListener('focusin', (e) => {
        // Với hover: chỉ mở khi focus bằng bàn phím (:focus-visible), tránh mở lại sau khi click chuột
        if (!triggers.includes('focus')) {
          let visible = true;
          try { visible = e.target.matches(':focus-visible'); } catch { /* trình duyệt cũ */ }
          if (!visible) return;
        }
        this._scheduleShow();
      });
      triggerEl.addEventListener('focusout', () => this._scheduleHide());
    }

    // Click: bấm trigger để bật/tắt
    if (triggers.includes('click')) {
      triggerEl.addEventListener('click', () => this.toggle());
    }

    // Nội dung slot "content" thay đổi → đo lại kích thước & vị trí
    this._popup.querySelector('slot[name="content"]').addEventListener('slotchange', () => {
      if (this._open) this._updatePosition();
    });

    this._wrapper = createElement('span', { className: 'hui-tooltip' }, triggerEl, this._popup);
    this.shadowRoot.appendChild(this._wrapper);

    // Vẽ lại khi đang mở → giữ nguyên trạng thái mở với popup mới
    if (wasOpen) this._applyOpen(true);
  }
}

if (!customElements.get('hui-tooltip')) {
  customElements.define('hui-tooltip', HuiTooltip);
}

export default HuiTooltip;
