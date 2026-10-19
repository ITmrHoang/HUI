/**
 * HUI Stat Card — Ô chỉ số KPI (Molecule): tiêu đề, giá trị đếm dần (<hui-statistic>), chênh lệch ▲/▼ %,
 * icon trong vòng tròn màu, sparkline SVG tự vẽ. Dựng trên <hui-card>.
 */

import styles from './hui-stat-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { formatPercent } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import {
  forwardToCard, createMsg, createForwardSlot, hasContent, canAnimate, isNum, CARD_EXPORTPARTS,
} from '../hui-product-card/card-shared.js';
import '../hui-card/hui-card.js';
import '../hui-icon/hui-icon.js';
import '../hui-statistic/hui-statistic.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const COLORS = ['primary', 'success', 'warning', 'danger', 'info'];
/** Khung vẽ sparkline (đơn vị SVG); preserveAspectRatio="none" → giãn theo khung thật */
const VIEW_W = 100;
const VIEW_H = 32;
const NUMERIC = /^-?\d*\.?\d+$/;

const msg = createMsg({
  'stat.up': { vi: 'Tăng', en: 'Up' },
  'stat.down': { vi: 'Giảm', en: 'Down' },
  'stat.flat': { vi: 'Không đổi', en: 'No change' },
  'stat.trend': { vi: 'Biểu đồ xu hướng', en: 'Trend chart' },
});

/**
 * Tọa độ sparkline từ mảng số: x chia đều, y theo min–max (chừa lề 2 đơn vị cho nét vẽ).
 * @returns {{x: number, y: number}[]}
 */
export function sparklinePoints(values, width = VIEW_W, height = VIEW_H, pad = 2) {
  const nums = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
  if (!nums.length) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const step = nums.length > 1 ? width / (nums.length - 1) : 0;
  return nums.map((v, i) => ({
    x: nums.length > 1 ? +(i * step).toFixed(2) : width / 2,
    // Dãy phẳng (min = max) → vẽ ở giữa
    y: +(max === min ? height / 2 : pad + (1 - (v - min) / span) * (height - pad * 2)).toFixed(2),
  }));
}

/**
 * Ô KPI. `delta` dương → ▲ xanh, âm → ▼ đỏ, 0 → trung tính; `invert-delta` đảo màu (chỉ số "càng thấp càng tốt").
 * Giá trị đếm dần từ 0 khi card xuất hiện trong khung nhìn (tắt bằng no-animation / prefers-reduced-motion).
 *
 * @slot - Nội dung thêm dưới chênh lệch
 * @slot icon - Icon tùy biến (thay attribute icon)
 * @slot footer - Chân thẻ (chuyển xuống hui-card)
 * @csspart title - Tiêu đề
 * @csspart icon - Vòng tròn icon
 * @csspart statistic - <hui-statistic>; kèm value, prefix, suffix (xuất từ statistic)
 * @csspart delta - Chênh lệch; kèm delta-up | delta-down | delta-flat
 * @csspart delta-label - Chữ mô tả chênh lệch ("so với tháng trước")
 * @csspart sparkline - Thẻ <svg> sparkline
 * @csspart sparkline-line - Đường (polyline)
 * @csspart sparkline-area - Vùng tô dưới đường
 * @csspart card - Khung <hui-card> (và cover, main, header, body, skeleton, actions, footer, overlay, card-link, card-check, card-glow)
 * @cssprop --hui-stat-card-title-color - Màu tiêu đề
 * @cssprop --hui-stat-card-value-font-size - Cỡ chữ giá trị
 * @cssprop --hui-stat-card-icon-size - Cạnh vòng tròn icon (mặc định 2.75rem)
 * @cssprop --hui-stat-card-icon-color - Màu icon (ghi đè attribute color)
 * @cssprop --hui-stat-card-icon-bg - Nền vòng tròn icon
 * @cssprop --hui-stat-card-up-color - Màu chênh lệch tốt (mặc định success)
 * @cssprop --hui-stat-card-down-color - Màu chênh lệch xấu (mặc định danger)
 * @cssprop --hui-stat-card-sparkline-color - Màu sparkline (mặc định theo chênh lệch, không có delta → color)
 * @cssprop --hui-stat-card-sparkline-height - Chiều cao sparkline (mặc định 40px)
 * @cssprop --hui-stat-card-sparkline-width - Độ dày nét sparkline (mặc định 2)
 */
class HuiStatCard extends HuiElement {
  static localized = true;

  static properties = {
    /** Tiêu đề. Attribute bị gỡ khỏi host để không hiện tooltip native */
    title: { type: String, reflect: false },
    /** Giá trị: số hoặc chuỗi (vd "N/A") — chuyển xuống hui-statistic */
    value: { type: String },
    /** Tiền tố giá trị (vd "₫", "$") */
    prefix: { type: String },
    /** Hậu tố giá trị (vd "%", "đơn") */
    suffix: { type: String },
    /** Số chữ số thập phân của giá trị */
    precision: { type: Number },
    /** Chênh lệch theo % (12.5 = 12,5%) — bỏ trống = ẩn */
    delta: { type: Number },
    /** Chữ sau chênh lệch, vd "so với tháng trước" */
    deltaLabel: { type: String },
    /** Đảo màu chênh lệch: giảm là tốt (vd tỉ lệ thoát, chi phí) */
    invertDelta: { type: Boolean },
    /** Tên hui-icon trong vòng tròn màu */
    icon: { type: String },
    /** primary | success | warning | danger | info — màu icon (và sparkline khi không có delta) */
    color: { type: String, default: 'primary' },
    /** Mảng số cho sparkline (attribute nhận JSON "[3,5,4,8]") */
    trend: { type: Array },
    /** Hiệu ứng của hui-card: lift | tilt | glow | zoom-media | reveal | border-gradient */
    effect: { type: String },
    /** Cả card là link (chuyển xuống hui-card) */
    href: { type: String },
    /** target của link */
    target: { type: String },
    /** elevated | outlined | filled | ghost — biến thể hui-card */
    variant: { type: String, default: 'elevated' },
    /** vertical | horizontal */
    orientation: { type: String, default: 'vertical' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Skeleton thay cho nội dung */
    loading: { type: Boolean },
    /** Tắt đếm dần và hiệu ứng vẽ sparkline */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  /** Alias `title`: lưu nội dung rồi gỡ attribute khỏi host (tránh tooltip native) */
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'title') {
      if (newVal === null) return; // lần gọi do chính ta removeAttribute
      super.attributeChangedCallback(name, oldVal, newVal);
      this.removeAttribute('title');
      return;
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }

  /** 'up' | 'down' | 'flat' | '' theo dấu của delta */
  get deltaDirection() {
    if (!isNum(this.delta)) return '';
    const d = Number(this.delta);
    return d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
  }

  render() {
    this._title = createElement('div', { className: 'sc__title', part: 'title' });
    this._iconEl = createElement('hui-icon');
    this._iconSlot = createElement('slot', { name: 'icon' }, this._iconEl);
    this._iconSlot.addEventListener('slotchange', () => this._syncIcon());
    this._icon = createElement('div', { className: 'sc__icon', part: 'icon' }, this._iconSlot);

    this._stat = createElement('hui-statistic', {
      className: 'sc__statistic', part: 'statistic',
      exportparts: 'value, prefix, suffix, content: statistic-content',
    });

    this._deltaArrow = createElement('span', { className: 'sc__delta-arrow', 'aria-hidden': 'true' });
    this._deltaSr = createElement('span', { className: 'sr-only' });
    this._deltaValue = createElement('span', { className: 'sc__delta-value' });
    this._delta = createElement('span', { part: 'delta' }, this._deltaArrow, this._deltaSr, this._deltaValue);
    this._deltaLabel = createElement('span', { className: 'sc__delta-label', part: 'delta-label' });
    this._deltaRow = createElement('div', { className: 'sc__delta-row' }, this._delta, this._deltaLabel);

    // Sparkline: vùng tô (polygon) + đường (polyline); nét không giãn theo khung (non-scaling-stroke)
    this._svg = document.createElementNS(SVG_NS, 'svg');
    this._svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
    this._svg.setAttribute('preserveAspectRatio', 'none');
    this._svg.setAttribute('part', 'sparkline');
    this._svg.setAttribute('class', 'sc__sparkline');
    this._svg.setAttribute('role', 'img');
    this._area = document.createElementNS(SVG_NS, 'polygon');
    this._area.setAttribute('part', 'sparkline-area');
    this._area.setAttribute('class', 'sc__area');
    this._line = document.createElementNS(SVG_NS, 'polyline');
    this._line.setAttribute('part', 'sparkline-line');
    this._line.setAttribute('class', 'sc__line');
    this._line.setAttribute('vector-effect', 'non-scaling-stroke');
    this._svg.append(this._area, this._line);

    this._extraSlot = createElement('slot');
    this._extra = createElement('div', { className: 'sc__extra' }, this._extraSlot);
    this._extraSlot.addEventListener('slotchange', () => { this._extra.hidden = !hasContent(this._extraSlot); });

    this._body = createElement('div', { className: 'sc__body' },
      createElement('div', { className: 'sc__head' }, this._title, this._icon),
      this._stat,
      this._deltaRow,
      this._extra,
      this._svg);

    this._card = createElement('hui-card', { className: 'sc__card', exportparts: CARD_EXPORTPARTS },
      this._body, createForwardSlot('footer'), createForwardSlot('overlay'));
    return this._card;
  }

  connectedCallback() {
    super.connectedCallback();
    // Gắn lại vào trang khi chưa kịp đếm → theo dõi lại
    if (this._pendingCount) this._observe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._io?.disconnect();
    this._io = null;
  }

  firstUpdated() {
    this._extra.hidden = !hasContent(this._extraSlot);
    this._syncIcon();
  }

  updated(changed) {
    forwardToCard(this, this._card, changed);

    if (changed.has('title')) {
      this._title.textContent = this.title || '';
      this._title.hidden = !this.title;
    }

    if (changed.has('icon') || changed.has('color')) {
      if (this.icon) this._iconEl.setAttribute('name', this.icon);
      else this._iconEl.removeAttribute('name');
      const color = COLORS.includes(this.color) ? this.color : 'primary';
      this._icon.className = `sc__icon sc__icon--${color}`;
      this._syncIcon();
    }

    for (const k of ['prefix', 'suffix', 'precision']) {
      if (!changed.has(k)) continue;
      const v = this[k];
      if (v === null || v === undefined || v === '') this._stat.removeAttribute(k);
      else this._stat.setAttribute(k, String(v));
    }
    if (changed.has('noAnimation')) this._stat.setAttribute('animated', this.noAnimation ? 'false' : 'true');
    if (changed.has('value')) this._syncValue();

    if (['delta', 'invertDelta', 'deltaLabel', 'color', 'locale'].some((k) => changed.has(k))) this._syncDelta();
    if (['trend', 'locale', 'title'].some((k) => changed.has(k))) this._drawSparkline(changed.has('trend'));
  }

  _syncIcon() {
    if (!this._icon) return;
    this._icon.hidden = !this.icon && !this._iconSlot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
  }

  /**
   * Lần đầu (số hợp lệ + được phép chuyển động): hiện 0 rồi đếm tới giá trị thật khi card vào khung nhìn.
   * Các lần sau: hui-statistic tự đếm từ số cũ sang số mới.
   */
  _syncValue() {
    const raw = this.value === null || this.value === undefined ? '' : String(this.value).trim();
    const numeric = NUMERIC.test(raw);
    if (raw === '' && !this._pendingCount) {
      this._stat.value = '';
      return;
    }
    if (!this._counted && numeric && canAnimate(this)) {
      this._counted = true;
      this._pendingCount = true;
      this._stat.value = '0';
      this._observe();
      return;
    }
    this._counted = true;
    if (this._pendingCount) {
      // Giá trị đổi khi còn chờ đếm → chờ tiếp, vẫn đếm tới giá trị mới nhất
      return;
    }
    this._stat.value = raw;
  }

  _observe() {
    this._io?.disconnect();
    const run = () => {
      this._io?.disconnect();
      this._io = null;
      this._pendingCount = false;
      this._stat.value = this.value === null || this.value === undefined ? '' : String(this.value).trim();
    };
    if (typeof IntersectionObserver !== 'function') {
      requestAnimationFrame(run);
      return;
    }
    this._io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) run();
    });
    this._io.observe(this);
  }

  _syncDelta() {
    const dir = this.deltaDirection;
    this._deltaRow.hidden = !dir && !this.deltaLabel;
    this._delta.hidden = !dir;
    // Tốt / xấu: tăng là tốt, trừ khi invert-delta
    const good = dir === 'flat' || !dir ? 'neutral' : ((dir === 'up') !== this.invertDelta ? 'good' : 'bad');
    this._delta.className = `sc__delta sc__delta--${dir || 'flat'} sc__delta--${good}`;
    this._delta.setAttribute('part', `delta delta-${dir || 'flat'}`);
    this._deltaArrow.textContent = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–';
    this._deltaValue.textContent = dir ? formatPercent(Math.abs(Number(this.delta))) : '';
    this._deltaSr.textContent = dir ? `${msg(`stat.${dir}`)} ` : '';
    this._deltaLabel.textContent = this.deltaLabel || '';
    this._deltaLabel.hidden = !this.deltaLabel;
    this.setState('delta-up', dir === 'up');
    this.setState('delta-down', dir === 'down');
    this.setState('delta-good', good === 'good');
    this.setState('delta-bad', good === 'bad');
    // Màu sparkline theo chênh lệch; không có delta → theo color
    const color = COLORS.includes(this.color) ? this.color : 'primary';
    const spark = good === 'good' ? 'var(--hui-stat-card-up-color, var(--hui-success))'
      : good === 'bad' ? 'var(--hui-stat-card-down-color, var(--hui-danger))'
        : `var(--hui-${color})`;
    this._svg.style.setProperty('--_sc-spark', spark);
  }

  _drawSparkline(trendChanged) {
    const pts = sparklinePoints(this.trend);
    this._svg.toggleAttribute('hidden', pts.length < 2);
    if (pts.length < 2) {
      this._line.removeAttribute('points');
      this._area.removeAttribute('points');
      return;
    }
    const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
    this._line.setAttribute('points', line);
    this._area.setAttribute('points', `${pts[0].x},${VIEW_H} ${line} ${pts[pts.length - 1].x},${VIEW_H}`);
    this._svg.setAttribute('aria-label', `${msg('stat.trend')}${this.title ? `: ${this.title}` : ''}`);

    // Hiện dần từ trái sang phải mỗi khi dữ liệu đổi (cắt bằng clip-path, không phụ thuộc độ dài nét)
    if (trendChanged && canAnimate(this) && typeof this._svg.animate === 'function') {
      this._svg.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, easing: 'ease-out' });
    }
  }
}

defineElement('hui-stat-card', HuiStatCard);

export { HuiStatCard };
export default HuiStatCard;
