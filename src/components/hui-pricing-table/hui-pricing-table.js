/**
 * HUI Pricing Table — Bảng giá landing page (Organism): `data` các gói → <hui-pricing-card>,
 * công tắc Theo tháng ↔ Theo năm (radiogroup dạng segmented, nhãn giảm giá "-20%"), gói nổi bật.
 * Đặt sẵn <hui-pricing-card> con cũng được — bảng chỉ đồng bộ `billing` xuống các thẻ.
 */

import styles from './hui-pricing-table.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { createMsg, isNum, toLength, revealOnView } from '../hui-feature-card/landing-shared.js';
import '../hui-pricing-card/hui-pricing-card.js';

const msg = createMsg({
  'pricingTable.monthly': { vi: 'Theo tháng', en: 'Monthly' },
  'pricingTable.yearly': { vi: 'Theo năm', en: 'Yearly' },
  'pricingTable.billing': { vi: 'Kỳ thanh toán', en: 'Billing period' },
  'pricingTable.plans': { vi: 'Các gói giá', en: 'Pricing plans' },
});

/** Trường của gói → attribute của hui-pricing-card */
const PLAN_ATTRS = {
  plan: 'plan', price: 'price', yearlyPrice: 'yearly-price', period: 'period', yearlyPeriod: 'yearly-period',
  description: 'description', highlightText: 'highlight-text', ctaText: 'cta-text', ctaHref: 'cta-href',
  currency: 'currency', effect: 'effect', href: 'href',
};

const BILLINGS = ['monthly', 'yearly'];

/** % tiết kiệm lớn nhất khi trả theo năm (so với 12 × giá tháng) */
export function maxYearlySaving(plans) {
  let best = 0;
  for (const p of Array.isArray(plans) ? plans : []) {
    const month = Number(p?.price);
    const year = Number(p?.yearlyPrice);
    if (!isNum(p?.price) || !isNum(p?.yearlyPrice) || month <= 0) continue;
    best = Math.max(best, Math.round((1 - year / (month * 12)) * 100));
  }
  return best;
}

/**
 * @fires hui-billing-change - Người dùng đổi kỳ thanh toán. detail: { billing }
 * @fires hui-select - Bấm nút CTA của một gói (từ data). detail: { plan, name, index, billing, price }. Cancelable: preventDefault() để không mở cta-href
 * @slot - <hui-pricing-card> con (dùng khi không có data)
 * @slot footer - Ghi chú dưới bảng (vd "Giá chưa gồm VAT")
 * @csspart base - Khung ngoài
 * @csspart toggle - Công tắc kỳ thanh toán (role="radiogroup")
 * @csspart toggle-thumb - Nền trượt của lựa chọn hiện tại
 * @csspart toggle-option - Mỗi lựa chọn (kèm toggle-option-active)
 * @csspart discount - Nhãn giảm giá trên lựa chọn "Theo năm"
 * @csspart grid - Lưới các gói (role="list")
 * @csspart plan - Mỗi <hui-pricing-card> sinh từ data
 * @csspart footer - Vùng ghi chú
 * @cssprop --hui-pricing-table-gap - Khoảng cách giữa các gói
 * @cssprop --hui-pricing-table-min-width - Bề rộng tối thiểu mỗi gói khi không đặt columns (mặc định 260px)
 * @cssprop --hui-pricing-table-toggle-bg - Nền công tắc
 * @cssprop --hui-pricing-table-toggle-thumb-bg - Nền lựa chọn hiện tại
 * @cssprop --hui-pricing-table-toggle-color - Màu chữ lựa chọn
 * @cssprop --hui-pricing-table-toggle-active-color - Màu chữ lựa chọn hiện tại
 * @cssprop --hui-pricing-table-discount-bg - Nền nhãn giảm giá (mặc định success)
 * @cssprop --hui-pricing-table-discount-color - Màu chữ nhãn giảm giá
 */
class HuiPricingTable extends HuiElement {
  static localized = true;

  static properties = {
    /** Mảng gói [{ plan, price, yearlyPrice, description, features, highlighted, highlightText, ctaText, ctaHref, period, yearlyPeriod }] */
    data: { type: Array },
    /** monthly | yearly — kỳ thanh toán đang hiển thị */
    billing: { type: String, default: 'monthly' },
    /** Mã tiền tệ ISO 4217 cho mọi gói (gói tự đặt currency ưu tiên hơn) */
    currency: { type: String, default: 'VND' },
    /** Chữ nhãn giảm giá trên "Theo năm" (mặc định tự tính "-x%" từ data; chuỗi rỗng = ẩn) */
    discount: { type: String },
    /** Chữ lựa chọn tháng (mặc định locale "Theo tháng") */
    monthlyLabel: { type: String },
    /** Chữ lựa chọn năm (mặc định locale "Theo năm") */
    yearlyLabel: { type: String },
    /** Ẩn công tắc kỳ thanh toán */
    noToggle: { type: Boolean },
    /** Số cột cố định (khung hẹp tự giảm); bỏ trống = tự chia theo bề rộng */
    columns: { type: Number },
    /** elevated | outlined | filled | ghost — variant của mọi thẻ gói */
    variant: { type: String, default: 'outlined' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Hiệu ứng hui-card cho mọi gói (gói tự đặt effect ưu tiên) */
    effect: { type: String },
    /** Khoảng cách các gói: xs | sm | md | lg | xl, số (px) hoặc CSS length */
    gap: { type: String },
    /** Tắt chuyển động (công tắc trượt, hiện lần lượt, đổi giá) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  get _isDataMode() {
    return Array.isArray(this.data) && this.data.length > 0;
  }

  /** Các thẻ gói đang hiển thị */
  get plans() {
    return this._isDataMode ? [...this._cards] : this._slot.assignedElements().filter((el) => el.localName === 'hui-pricing-card');
  }

  render() {
    this._cards = [];
    this._thumb = createElement('span', { className: 'pt__thumb', part: 'toggle-thumb', 'aria-hidden': 'true' });
    this._discount = createElement('span', { className: 'pt__discount', part: 'discount' });
    this._options = BILLINGS.map((b) => {
      const label = createElement('span', { className: 'pt__option-label' });
      const btn = createElement('button', { type: 'button', role: 'radio', className: 'pt__option', part: 'toggle-option', 'data-billing': b },
        label, b === 'yearly' ? this._discount : null);
      btn.addEventListener('click', () => this._choose(b));
      return btn;
    });
    this._toggle = createElement('div', { className: 'pt__toggle', part: 'toggle', role: 'radiogroup' }, this._thumb, ...this._options);
    this._toggle.addEventListener('keydown', (e) => this._onToggleKey(e));

    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => { if (!this._isDataMode) this._syncChildren(); });
    this._grid = createElement('div', { className: 'pt__grid', part: 'grid' }, this._slot);
    // Gói từ data: gom hui-select của thẻ thành sự kiện của bảng (kèm object gói gốc)
    this._grid.addEventListener('hui-select', (e) => this._onCardSelect(e));

    this._footerSlot = createElement('slot', { name: 'footer' });
    this._footer = createElement('div', { className: 'pt__footer', part: 'footer' }, this._footerSlot);
    this._footerSlot.addEventListener('slotchange', () => {
      this._footer.hidden = !this._footerSlot.assignedNodes().some((n) => n.nodeType === 1 || n.textContent.trim());
    });

    this._base = createElement('div', { className: 'pt', part: 'base' }, this._toggle, this._grid, this._footer);
    return this._base;
  }

  firstUpdated() {
    this._footer.hidden = !this._footerSlot.assignedNodes().some((n) => n.nodeType === 1 || n.textContent.trim());
    this._stopReveal = revealOnView(this, this.plans, { stagger: 100 });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopReveal?.();
    this._stopReveal = null;
  }

  updated(changed) {
    const billing = BILLINGS.includes(this.billing) ? this.billing : 'monthly';

    if (changed.has('columns')) {
      const cols = Number(this.columns);
      const fixed = Number.isFinite(cols) && cols > 0;
      this._grid.classList.toggle('pt__grid--fixed', fixed);
      this._grid.classList.toggle('pt__grid--fixed-many', fixed && cols > 2);
      if (fixed) this._grid.style.setProperty('--_pt-cols', String(Math.round(cols)));
      else this._grid.style.removeProperty('--_pt-cols');
    }
    if (changed.has('gap')) {
      const gap = toLength(this.gap);
      if (gap) this._grid.style.setProperty('--_pt-gap', gap);
      else this._grid.style.removeProperty('--_pt-gap');
    }
    if (changed.has('noToggle')) this._toggle.hidden = this.noToggle;
    if (changed.has('noAnimation')) this._base.classList.toggle('pt--static', this.noAnimation);

    if (['billing', 'monthlyLabel', 'yearlyLabel', 'locale'].some((k) => changed.has(k))) {
      this._toggle.setAttribute('aria-label', msg('pricingTable.billing'));
      this._toggle.dataset.billing = billing;
      this._options.forEach((btn) => {
        const b = btn.dataset.billing;
        const active = b === billing;
        btn.querySelector('.pt__option-label').textContent = b === 'yearly'
          ? (this.yearlyLabel || msg('pricingTable.yearly'))
          : (this.monthlyLabel || msg('pricingTable.monthly'));
        btn.setAttribute('aria-checked', String(active));
        btn.tabIndex = active ? 0 : -1;
        btn.setAttribute('part', active ? 'toggle-option toggle-option-active' : 'toggle-option');
      });
    }

    if (changed.has('data')) this._renderData();
    else if (['billing', 'currency', 'variant', 'size', 'effect', 'noAnimation'].some((k) => changed.has(k))) {
      if (this._isDataMode) this._cards.forEach((card, i) => this._applyShared(card, this.data[i]));
      else this._syncChildren();
    }

    if (['data', 'discount', 'locale'].some((k) => changed.has(k))) this._syncDiscount();
    if (changed.has('billing')) this._syncDiscount();
  }

  _syncDiscount() {
    let text = this.discount;
    if (text === null || text === undefined) {
      const source = this._isDataMode ? this.data
        : this.plans.map((c) => ({ price: c.price, yearlyPrice: c.yearlyPrice }));
      const pct = maxYearlySaving(source);
      text = pct > 0 ? `-${pct}%` : '';
    }
    this._discount.textContent = text;
    this._discount.hidden = !text;
  }

  _renderData() {
    const data = this._isDataMode;
    this._cards = data ? this.data.map((item, i) => {
      const card = createElement('hui-pricing-card', { part: 'plan', role: 'listitem', 'data-index': String(i) });
      for (const [key, attr] of Object.entries(PLAN_ATTRS)) {
        const v = item?.[key];
        if (v !== undefined && v !== null && v !== '' && key !== 'effect' && key !== 'currency') card.setAttribute(attr, String(v));
      }
      if (Array.isArray(item?.features)) card.features = item.features;
      card.toggleAttribute('highlighted', Boolean(item?.highlighted));
      this._applyShared(card, item);
      return card;
    }) : [];
    if (data) {
      this._grid.setAttribute('role', 'list');
      this._grid.setAttribute('aria-label', msg('pricingTable.plans'));
    } else {
      this._grid.removeAttribute('role');
      this._grid.removeAttribute('aria-label');
    }
    this._grid.replaceChildren(...(data ? this._cards : [this._slot]));
    if (!data) this._syncChildren();
  }

  _applyShared(card, item) {
    const set = (attr, value) => {
      if (value === null || value === undefined || value === '' || value === false) card.removeAttribute(attr);
      else card.setAttribute(attr, value === true ? '' : String(value));
    };
    set('billing', BILLINGS.includes(this.billing) ? this.billing : 'monthly');
    set('currency', item?.currency || this.currency);
    set('variant', item?.variant || this.variant);
    set('size', this.size);
    set('effect', item?.effect || this.effect);
    set('no-animation', this.noAnimation);
  }

  /** Thẻ con: đồng bộ billing (+ currency nếu thẻ chưa tự đặt) */
  _syncChildren() {
    for (const card of this.plans) {
      card.setAttribute('billing', BILLINGS.includes(this.billing) ? this.billing : 'monthly');
      if (this.noAnimation) card.setAttribute('no-animation', '');
    }
    this._syncDiscount();
  }

  _choose(billing) {
    if (billing === this.billing) return;
    this.billing = billing;
    this.emit('hui-billing-change', { billing });
  }

  /** APG radiogroup: ←/→/↑/↓ chuyển và chọn luôn, Home/End về đầu/cuối */
  _onToggleKey(e) {
    const keys = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
    let next = null;
    const current = BILLINGS.indexOf(this.billing) < 0 ? 0 : BILLINGS.indexOf(this.billing);
    if (e.key in keys) next = (current + keys[e.key] + BILLINGS.length) % BILLINGS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = BILLINGS.length - 1;
    if (next === null) return;
    e.preventDefault();
    this._choose(BILLINGS[next]);
    this._options[next].focus();
  }

  _onCardSelect(e) {
    const index = this._cards.indexOf(e.target);
    if (index < 0) return; // thẻ con của người dùng: để sự kiện gốc nổi bọt bình thường
    e.stopPropagation();
    const detail = e.detail || {};
    const ok = this.emit('hui-select', {
      plan: this.data[index], name: detail.plan, index, billing: detail.billing, price: detail.price,
    }, { cancelable: true });
    if (!ok) e.preventDefault();
  }
}

defineElement('hui-pricing-table', HuiPricingTable);

export { HuiPricingTable };
export default HuiPricingTable;
