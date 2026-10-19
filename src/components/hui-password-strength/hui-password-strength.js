/**
 * HUI Password Strength — Thanh đo độ mạnh mật khẩu (4 nấc: yếu / trung bình / khá / mạnh)
 * + danh sách điều kiện ✓/✗. Gắn vào ô mật khẩu qua `for` (id của <input>/<hui-input> cùng root),
 * hoặc bọc ô nhập trong slot, hoặc gán `value` trực tiếp. Không phải control form.
 */

import styles from './hui-password-strength.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { animationsDisabled } from '../../utils/animate.js';
import { createElement } from '../../utils/dom.js';

/** Chuỗi chưa có trong locale.js → dùng bản dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  'passwordStrength.label': { vi: 'Độ mạnh mật khẩu', en: 'Password strength' },
  'passwordStrength.rules': { vi: 'Yêu cầu mật khẩu', en: 'Password requirements' },
  'passwordStrength.empty': { vi: 'Chưa nhập', en: 'Not entered' },
  'passwordStrength.weak': { vi: 'Yếu', en: 'Weak' },
  'passwordStrength.fair': { vi: 'Trung bình', en: 'Fair' },
  'passwordStrength.good': { vi: 'Khá', en: 'Good' },
  'passwordStrength.strong': { vi: 'Mạnh', en: 'Strong' },
  'passwordStrength.length': { vi: 'Ít nhất {min} ký tự', en: 'At least {min} characters' },
  'passwordStrength.lower': { vi: 'Có chữ thường (a-z)', en: 'A lowercase letter (a-z)' },
  'passwordStrength.upper': { vi: 'Có chữ hoa (A-Z)', en: 'An uppercase letter (A-Z)' },
  'passwordStrength.number': { vi: 'Có chữ số (0-9)', en: 'A number (0-9)' },
  'passwordStrength.symbol': { vi: 'Có ký tự đặc biệt (!@#...)', en: 'A symbol (!@#...)' },
  'passwordStrength.passed': { vi: 'đã đạt', en: 'met' },
  'passwordStrength.failed': { vi: 'chưa đạt', en: 'not met' },
};

function msg(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

const LEVELS = ['', 'weak', 'fair', 'good', 'strong'];

const ICON_PASS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const ICON_FAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>';

/** Luật mặc định (nhãn theo ngôn ngữ hiện tại) */
function defaultRules(min) {
  return [
    { id: 'length', label: msg('passwordStrength.length', { min }), test: (v) => v.length >= min },
    { id: 'lower', label: msg('passwordStrength.lower'), test: /\p{Ll}/u },
    { id: 'upper', label: msg('passwordStrength.upper'), test: /\p{Lu}/u },
    { id: 'number', label: msg('passwordStrength.number'), test: /\p{N}/u },
    { id: 'symbol', label: msg('passwordStrength.symbol'), test: /[^\p{L}\p{N}\s]/u },
  ];
}

/** Chạy 1 luật: hàm, RegExp, hoặc chuỗi pattern (test / pattern) */
function runRule(rule, value) {
  const test = rule.test ?? rule.pattern;
  try {
    if (typeof test === 'function') return Boolean(test(value));
    if (test instanceof RegExp) {
      test.lastIndex = 0;
      return test.test(value);
    }
    if (typeof test === 'string' && test) return new RegExp(test, 'u').test(value);
  } catch {
    return false;
  }
  return false;
}

/**
 * Chấm điểm mật khẩu theo danh sách luật.
 * score = round(đạt / tổng × 4), tối thiểu 1 khi đã nhập; luật `length` chưa đạt → tối đa 1 (yếu).
 * @returns {{ score: number, level: string, passed: string[], results: Array<{id: string, label: string, passed: boolean}> }}
 */
export function scorePassword(value, rules) {
  const v = String(value ?? '');
  const results = rules.map((r, i) => ({ id: String(r.id ?? i), label: r.label ?? '', passed: Boolean(v) && runRule(r, v) }));
  const passed = results.filter((r) => r.passed).map((r) => r.id);
  let score = 0;
  if (v && results.length) {
    score = Math.max(1, Math.round((passed.length / results.length) * 4));
    if (results.some((r) => r.id === 'length' && !r.passed)) score = 1;
  } else if (v) {
    score = 1;
  }
  return { score, level: LEVELS[score], passed, results };
}

/**
 * Thanh đo độ mạnh mật khẩu + danh sách điều kiện.
 * @fires hui-strength - Điểm hoặc danh sách luật đạt thay đổi. detail: { score, level, passed }
 * @slot - (tùy chọn) Ô mật khẩu được bọc bên trong (<input> / <hui-input>) — tự gắn theo dõi
 * @csspart base - Khung ngoài
 * @csspart header - Hàng nhãn + mức độ
 * @csspart label - Chữ "Độ mạnh mật khẩu"
 * @csspart level - Chữ mức độ (aria-live)
 * @csspart meter - Thanh đo (role="meter")
 * @csspart segment - Từng nấc; nấc đang sáng thêm segment-active
 * @csspart checklist - Danh sách điều kiện
 * @csspart rule - Từng điều kiện; kèm rule-passed | rule-failed
 * @csspart rule-icon - Icon ✓ / ✗
 * @cssprop --hui-password-strength-height - Chiều cao thanh đo
 * @cssprop --hui-password-strength-gap - Khoảng cách giữa các nấc
 * @cssprop --hui-password-strength-radius - Bo góc nấc
 * @cssprop --hui-password-strength-track-color - Màu nấc chưa sáng
 * @cssprop --hui-password-strength-weak-color - Màu mức yếu
 * @cssprop --hui-password-strength-fair-color - Màu mức trung bình
 * @cssprop --hui-password-strength-good-color - Màu mức khá
 * @cssprop --hui-password-strength-strong-color - Màu mức mạnh
 * @cssprop --hui-password-strength-pass-color - Màu điều kiện đã đạt
 * @cssprop --hui-password-strength-fail-color - Màu điều kiện chưa đạt
 * @cssprop --hui-password-strength-font-size - Cỡ chữ
 */
class HuiPasswordStrength extends HuiElement {
  static localized = true;

  static properties = {
    /** id của <input> / <hui-input> cùng root cần theo dõi */
    htmlFor: { type: String, attribute: 'for' },
    /** Mật khẩu cần chấm (tự cập nhật khi gắn với ô nhập) */
    value: { type: String, default: '', reflect: false },
    /** Độ dài tối thiểu của luật mặc định `length` */
    minLength: { type: Number, default: 8 },
    /** Luật tùy chỉnh: [{ id, label, test: (v) => boolean | RegExp | 'pattern' }] — thay toàn bộ luật mặc định */
    rules: { type: Array, default: null },
    /** Ẩn danh sách điều kiện (chỉ hiện thanh đo) */
    hideChecklist: { type: Boolean },
    /** Nhãn thanh đo (mặc định "Độ mạnh mật khẩu") */
    label: { type: String, default: '' },
    /** Tắt hiệu ứng chuyển màu / nảy nấc */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._target = null;
    this._detach = null;
    this._last = null;
    this._result = null;
    this._ruleEls = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this._attach();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._detach?.();
    this._detach = null;
    this._target = null;
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._attach());

    this._labelEl = createElement('span', { className: 'hui-pw__label', part: 'label', id: 'label' });
    this._levelEl = createElement('span', { className: 'hui-pw__level', part: 'level', 'aria-live': 'polite' });
    const header = createElement('div', { className: 'hui-pw__header', part: 'header' }, this._labelEl, this._levelEl);

    this._segments = Array.from({ length: 4 }, () => createElement('span', { className: 'hui-pw__segment', part: 'segment' }));
    this._meter = createElement('div', {
      className: 'hui-pw__meter', part: 'meter', role: 'meter',
      'aria-valuemin': '0', 'aria-valuemax': '4', 'aria-labelledby': 'label',
    }, ...this._segments);

    this._list = createElement('ul', { className: 'hui-pw__list', part: 'checklist', 'aria-live': 'polite' });

    this._base = createElement('div', { className: 'hui-pw', part: 'base' }, this._slot, header, this._meter, this._list);
    return this._base;
  }

  updated(changed) {
    if (changed.has('htmlFor') && this._hasRendered && this.isConnected) this._attach();
    const rulesChanged = ['rules', 'minLength', 'locale'].some((k) => changed.has(k));
    if (rulesChanged) this._buildList();

    const result = scorePassword(this.value, this._rules);
    this._result = result;
    this._paint(result);

    this._list.hidden = this.hideChecklist;
    this._labelEl.textContent = this.label || msg('passwordStrength.label');
    this._list.setAttribute('aria-label', msg('passwordStrength.rules'));

    const key = `${result.score}|${result.passed.join(',')}`;
    if (this._last !== null && key !== this._last) {
      this.emit('hui-strength', { score: result.score, level: result.level, passed: result.passed });
    }
    this._last = key;
  }

  /** Luật đang dùng */
  get _rules() {
    if (Array.isArray(this.rules) && this.rules.length) return this.rules.filter(Boolean);
    const min = Math.max(1, Math.floor(Number(this.minLength) || 8));
    return defaultRules(min);
  }

  /** Kết quả chấm hiện tại: { score, level, passed, results } */
  get strength() {
    return this._result || scorePassword(this.value, this._rules);
  }

  _buildList() {
    this._ruleEls = this._rules.map((r) => {
      const icon = createElement('span', { className: 'hui-pw__icon', part: 'rule-icon' });
      const text = createElement('span', { className: 'hui-pw__text' }, String(r.label ?? ''));
      const sr = createElement('span', { className: 'hui-pw__sr' });
      const li = createElement('li', { className: 'hui-pw__rule', part: 'rule rule-failed' }, icon, text, sr);
      li._icon = icon;
      li._sr = sr;
      li._passed = null;
      return li;
    });
    this._list.replaceChildren(...this._ruleEls);
  }

  _paint({ score, level, results }) {
    const off = this.noAnimation || animationsDisabled();
    this._base.className = ['hui-pw', level ? `hui-pw--${level}` : 'hui-pw--empty', off ? 'hui-pw--static' : ''].filter(Boolean).join(' ');

    const prevScore = this._prevScore ?? 0;
    this._segments.forEach((seg, i) => {
      const on = i < score;
      seg.setAttribute('part', on ? 'segment segment-active' : 'segment');
      // Nấc vừa sáng → nảy nhẹ
      if (on && i >= prevScore && !off && seg.animate && this._prevScore !== undefined) {
        seg.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.8)' }, { transform: 'scaleY(1)' }], { duration: 260, easing: 'ease-out' });
      }
    });
    this._prevScore = score;

    const levelText = level ? msg(`passwordStrength.${level}`) : msg('passwordStrength.empty');
    const shown = level ? levelText : '';
    if (this._levelEl.textContent !== shown) this._levelEl.textContent = shown;
    this._meter.setAttribute('aria-valuenow', String(score));
    this._meter.setAttribute('aria-valuetext', levelText);

    // Chỉ đụng tới mục đổi trạng thái → aria-live chỉ đọc mục vừa đổi
    results.forEach((r, i) => {
      const li = this._ruleEls[i];
      if (!li || li._passed === r.passed) return;
      li._passed = r.passed;
      li.setAttribute('part', `rule ${r.passed ? 'rule-passed' : 'rule-failed'}`);
      li.classList.toggle('hui-pw__rule--passed', r.passed);
      li._icon.innerHTML = r.passed ? ICON_PASS : ICON_FAIL;
      li._sr.textContent = `, ${msg(r.passed ? 'passwordStrength.passed' : 'passwordStrength.failed')}`;
    });
  }

  // =====================================================
  // GẮN VỚI Ô NHẬP
  // =====================================================

  /** Tìm ô nhập: `for` → id trong cùng root; không có thì phần tử bọc trong slot */
  _findTarget() {
    if (this.htmlFor) {
      const root = this.getRootNode();
      return root.getElementById?.(this.htmlFor) || root.querySelector?.(`#${CSS.escape(this.htmlFor)}`) || null;
    }
    for (const el of this._slot?.assignedElements({ flatten: true }) || []) {
      if (el.matches('input, textarea, hui-input')) return el;
      const inner = el.querySelector('input, textarea, hui-input');
      if (inner) return inner;
    }
    return null;
  }

  _attach() {
    if (!this._hasRendered) return;
    const target = this._findTarget();
    if (target === this._target) return;
    this._detach?.();
    this._detach = null;
    this._target = target;
    if (!target) {
      // Ô nhập có thể được chèn sau (framework) → thử lại 1 lần
      if (this.htmlFor && !this._retried) {
        this._retried = true;
        requestAnimationFrame(() => this._attach());
      }
      return;
    }
    const sync = () => { this.value = target.value ?? ''; };
    target.addEventListener('input', sync);
    target.addEventListener('change', sync);
    this._detach = () => {
      target.removeEventListener('input', sync);
      target.removeEventListener('change', sync);
    };
    sync();
  }
}

defineElement('hui-password-strength', HuiPasswordStrength);

export default HuiPasswordStrength;
