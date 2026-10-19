/**
 * HUI Sider — Thanh bên thu gọn được trong hui-layout (Ant Layout.Sider + MUI Drawer permanent)
 * collapsible → nút thu/mở ở đáy; collapsed-width="0" → nút nổi bên cạnh (zero-width trigger).
 * breakpoint → tự thu gọn khi màn hình nhỏ hơn breakpoint (matchMedia).
 * Biến CSS: xem đầu hui-sider.css.
 */

import styles from './hui-sider.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { t } from '../../core/locale.js';
import '../hui-icon/hui-icon.js';

/** Ngưỡng tự thu gọn (giống Ant Sider): màn hình < giá trị → thu gọn */
const BREAKPOINTS = { xs: 480, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1600 };

/** Số trơn → px, còn lại giữ nguyên */
const toLength = (v) => (/^\d+(\.\d+)?$/.test(String(v).trim()) ? `${v}px` : String(v));

/**
 * @fires hui-collapse - Thu gọn / mở rộng do người dùng bấm nút hoặc do breakpoint. detail: { collapsed, type: 'clickTrigger' | 'responsive' }
 * @fires hui-breakpoint - Màn hình vượt qua breakpoint. detail: { broken }
 * @slot - Nội dung thanh bên (menu...)
 * @slot trigger - Nội dung nút thu/mở tùy chỉnh (thay icon mặc định)
 * @csspart base - Thẻ <aside>
 * @csspart children - Vùng nội dung (cuộn dọc)
 * @csspart trigger - Nút thu/mở
 * @cssprop --hui-sider-width - Chiều rộng khi mở (mặc định 200px; attribute width thắng)
 * @cssprop --hui-sider-collapsed-width - Chiều rộng khi thu gọn (mặc định 80px; attribute collapsed-width thắng)
 * @cssprop --hui-sider-bg - Màu nền (mặc định --hui-bg-container)
 * @cssprop --hui-sider-color - Màu chữ
 * @cssprop --hui-sider-border-color - Màu viền phải
 * @cssprop --hui-sider-trigger-height - Chiều cao nút thu/mở (mặc định 48px)
 * @cssprop --hui-sider-trigger-bg - Màu nền nút thu/mở
 * @cssprop --hui-sider-trigger-color - Màu icon nút thu/mở
 */
class HuiSider extends HuiElement {
  static localized = true;

  static properties = {
    /** Chiều rộng khi mở: số (px) hoặc độ dài CSS */
    width: { type: String },
    /** Đang thu gọn */
    collapsed: { type: Boolean },
    /** Hiện nút thu/mở */
    collapsible: { type: Boolean },
    /** Chiều rộng khi thu gọn: số (px) hoặc độ dài CSS; 0 = ẩn hẳn, nút nổi bên cạnh */
    collapsedWidth: { type: String },
    /** xs | sm | md | lg | xl | xxl — tự thu gọn khi màn hình nhỏ hơn breakpoint */
    breakpoint: { type: String },
    /** Đảo chiều mũi tên (sider nằm bên phải) */
    reverseArrow: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._mql = null;
    this._mqlAbort = null;
    this._broken = false;
  }

  render() {
    this._children = createElement('div', { className: 'sider__children', part: 'children' }, createElement('slot'));

    this._icon = createElement('hui-icon', { className: 'sider__icon', name: 'chevron-left' });
    this._trigger = createElement('button', { type: 'button', className: 'sider__trigger', part: 'trigger' },
      createElement('slot', { name: 'trigger' }, this._icon));
    this._trigger.addEventListener('click', () => this.toggle('clickTrigger'));

    this._base = createElement('aside', { className: 'sider', part: 'base' }, this._children, this._trigger);
    return this._base;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mqlAbort?.abort();
    this._mqlAbort = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // Lần gắn lại vào trang (sau disconnect) → theo dõi breakpoint lại
    if (this._hasRendered && !this._mqlAbort) this._watchBreakpoint();
  }

  /** Thu gọn / mở rộng, phát hui-collapse */
  toggle(type = 'clickTrigger') {
    this._setCollapsed(!this.collapsed, type);
  }

  _setCollapsed(value, type) {
    if (this.collapsed === value) return;
    this.collapsed = value;
    this.emit('hui-collapse', { collapsed: value, type });
  }

  /** Màn hình đang nhỏ hơn breakpoint hay không */
  get broken() {
    return this._broken;
  }

  updated(changed) {
    if (changed.has('width')) {
      if (this.width) this.style.setProperty('--_sider-width', toLength(this.width));
      else this.style.removeProperty('--_sider-width');
    }

    const zero = this.collapsedWidth !== null && parseFloat(this.collapsedWidth) === 0;
    if (changed.has('collapsedWidth')) {
      if (this.collapsedWidth !== null && this.collapsedWidth !== '') this.style.setProperty('--_sider-collapsed-width', toLength(this.collapsedWidth));
      else this.style.removeProperty('--_sider-collapsed-width');
    }

    const base = this._base;
    base.classList.toggle('sider--collapsed', this.collapsed);
    base.classList.toggle('sider--zero', zero);
    base.classList.toggle('sider--collapsible', this.collapsible);
    base.classList.toggle('sider--reverse', this.reverseArrow);

    this._trigger.hidden = !this.collapsible;
    this._icon.setAttribute('name', zero ? 'menu' : 'chevron-left');
    this._trigger.setAttribute('aria-expanded', String(!this.collapsed));
    this._trigger.setAttribute('aria-label', t(this.collapsed ? 'common.expand' : 'common.collapse'));
    this.setState('collapsed', this.collapsed);

    if (changed.has('breakpoint')) this._watchBreakpoint();
  }

  /** Theo dõi matchMedia của breakpoint hiện tại (đổi breakpoint → gỡ listener cũ) */
  _watchBreakpoint() {
    this._mqlAbort?.abort();
    this._mqlAbort = null;
    const px = BREAKPOINTS[this.breakpoint];
    if (!px || typeof window.matchMedia !== 'function') return;

    this._mqlAbort = new AbortController();
    this._mql = window.matchMedia(`(max-width: ${px - 0.02}px)`);
    const apply = () => {
      const broken = this._mql.matches;
      if (broken !== this._broken) {
        this._broken = broken;
        this.emit('hui-breakpoint', { broken });
      }
      this._setCollapsed(broken, 'responsive');
    };
    this._mql.addEventListener('change', apply, { signal: this._mqlAbort.signal });
    // Lần đầu: chỉ thu gọn khi đang nhỏ hơn breakpoint (không tự mở sider người dùng đặt collapsed)
    if (this._mql.matches) apply();
  }
}

defineElement('hui-sider', HuiSider);

export default HuiSider;
