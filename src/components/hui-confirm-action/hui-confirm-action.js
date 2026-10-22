/**
 * HUI Confirm Action — Nút hành động nguy hiểm cần xác nhận (Molecule), dựng trên <hui-button>:
 *   mode="hold" : nhấn giữ `duration` ms (chuột, cảm ứng, hoặc giữ Space/Enter) — thanh tiến độ lấp đầy nút
 *   mode="type" : bấm nút → hiện ô nhập nhỏ ngay tại chỗ, gõ đúng `confirm-text` mới bật nút Xác nhận
 * Xác nhận xong phát `hui-confirm`.
 */

import styles from './hui-confirm-action.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-button/hui-button.js';

const FALLBACK = {
  'confirmAction.holdHint': { vi: 'nhấn giữ {seconds} giây để xác nhận', en: 'press and hold for {seconds} seconds to confirm' },
  'confirmAction.typePrompt': { vi: 'Gõ {text} để xác nhận', en: 'Type {text} to confirm' },
  'confirmAction.confirm': { vi: 'Xác nhận', en: 'Confirm' },
  'confirmAction.cancel': { vi: 'Hủy', en: 'Cancel' },
  'confirmAction.done': { vi: 'Đã xác nhận', en: 'Confirmed' },
  'confirmAction.defaultText': { vi: 'XÓA', en: 'DELETE' },
};
const msg = (key, vars) => {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
};

let uid = 0;

/**
 * Nút cần xác nhận.
 *
 * @fires hui-confirm - Đã xác nhận (giữ đủ thời gian / gõ đúng chữ). detail: { mode }
 * @fires hui-cancel - Thả tay sớm (hold) hoặc đóng ô nhập (type). detail: { mode, progress? }
 * @slot - Chữ của nút
 * @csspart button - <hui-button> chính
 * @csspart button-base - Thẻ <button> thật của nút chính
 * @csspart progress - Thanh tiến độ lấp đầy khi giữ
 * @csspart panel - Khung ô nhập xác nhận (mode="type")
 * @csspart prompt - Dòng hướng dẫn "Gõ … để xác nhận"
 * @csspart confirm-text - Chữ cần gõ (trong prompt)
 * @csspart input - Ô nhập xác nhận
 * @csspart confirm-button - Nút Xác nhận (hui-button)
 * @csspart cancel-button - Nút Hủy (hui-button)
 * @cssprop --hui-confirm-action-progress-bg - Màu thanh tiến độ khi giữ
 * @cssprop --hui-confirm-action-input-width - Bề rộng ô nhập (mode="type")
 * @cssprop --hui-confirm-action-gap - Khoảng cách các phần tử trong panel
 */
class HuiConfirmAction extends HuiElement {
  static localized = true;

  static properties = {
    /** hold | type — nhấn giữ hoặc gõ chữ xác nhận */
    mode: { type: String, default: 'hold' },
    /** Thời gian phải giữ (ms), mode="hold" */
    duration: { type: Number, default: 1000 },
    /** Chữ phải gõ, mode="type" (mặc định theo locale: "XÓA" / "DELETE") */
    confirmText: { type: String },
    /** So khớp chữ không phân biệt hoa thường */
    ignoreCase: { type: Boolean },
    /** primary | secondary | outline | dashed | ghost | text | link | danger — như hui-button */
    variant: { type: String, default: 'danger' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** default | round */
    shape: { type: String, default: 'default' },
    /** Tên icon trước chữ */
    icon: { type: String },
    /** Chiếm toàn bộ chiều ngang */
    block: { type: Boolean },
    disabled: { type: Boolean },
    /** Chữ nút Xác nhận trong panel (mode="type") */
    confirmLabel: { type: String },
    /** Chữ nút Hủy trong panel (mode="type") */
    cancelLabel: { type: String },
    /** Tắt animation (thanh tiến độ vẫn hiện trạng thái giữ, không chạy mượt) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._holding = false;
    this._timer = 0;
    this._resetTimer = 0;
    this._fillAnim = null;
    this._holdStart = 0;
  }

  /** Panel gõ xác nhận đang mở */
  get panelOpen() {
    return this._panelOpen === true;
  }

  get _text() {
    return this.confirmText || msg('confirmAction.defaultText');
  }

  render() {
    const id = ++uid;
    this._fill = createElement('span', { className: 'fill', part: 'progress', 'aria-hidden': 'true' });
    this._fillWrap = createElement('span', { className: 'fill-wrap', 'aria-hidden': 'true' }, this._fill);
    this._hint = createElement('span', { className: 'sr-only' });
    this._label = createElement('span', { className: 'label' }, createElement('slot'), this._hint);
    this._btn = createElement('hui-button', {
      part: 'button',
      exportparts: 'base: button-base, label: button-label, icon: button-icon',
    }, this._fillWrap, this._label);

    // Panel cho mode="type"
    this._promptId = `hui-ca-prompt-${id}`;
    this._prompt = createElement('span', { className: 'prompt', part: 'prompt', id: this._promptId });
    this._input = createElement('input', {
      className: 'input', part: 'input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      'aria-labelledby': this._promptId,
    });
    this._ok = createElement('hui-button', { part: 'confirm-button', variant: 'danger', disabled: true });
    this._no = createElement('hui-button', { part: 'cancel-button', variant: 'text' });
    this._panel = createElement('span', { className: 'panel', part: 'panel', role: 'group', 'aria-labelledby': this._promptId, hidden: true },
      this._prompt, this._input, this._ok, this._no);
    this._live = createElement('span', { className: 'sr-only', role: 'status' });

    this._bindHold();
    this._bindType();
    return [this._btn, this._panel, this._live];
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopHold(false);
    clearTimeout(this._resetTimer);
  }

  connectedCallback() {
    super.connectedCallback();
    // Esc trong ô nhập: nghe ở window (capture) để không đóng nhầm modal bao ngoài
    this.listen(window, 'keydown', (e) => {
      if (e.key !== 'Escape' || !this._panelOpen || !e.composedPath().includes(this._panel)) return;
      e.preventDefault();
      e.stopPropagation();
      this.closePanel(true);
    }, { capture: true });
  }

  updated(changed) {
    const b = this._btn;
    if (changed.has('variant')) b.setAttribute('variant', this.variant || 'danger');
    if (changed.has('size')) {
      for (const el of [b, this._ok, this._no]) el.setAttribute('size', this.size || 'md');
    }
    if (changed.has('shape')) b.setAttribute('shape', this.shape || 'default');
    if (changed.has('icon')) {
      if (this.icon) b.setAttribute('icon', this.icon);
      else b.removeAttribute('icon');
    }
    if (changed.has('block')) b.toggleAttribute('block', this.block);
    if (changed.has('disabled')) {
      b.toggleAttribute('disabled', this.disabled);
      if (this.disabled) {
        this._stopHold(false);
        this.closePanel(false);
      }
    }
    if (['mode', 'duration', 'locale', 'confirmText', 'confirmLabel', 'cancelLabel'].some((k) => changed.has(k))) this._syncText();
    if (changed.has('mode')) {
      this._stopHold(false);
      if (this.mode !== 'type') this.closePanel(false);
    }
  }

  _syncText() {
    const seconds = Math.round((Number(this.duration) || 1000) / 100) / 10;
    this._hint.textContent = this.mode === 'type' ? '' : `, ${msg('confirmAction.holdHint', { seconds })}`;
    // Dòng hướng dẫn: thay {text} bằng <strong> chứa chữ cần gõ
    const raw = msg('confirmAction.typePrompt');
    const [before, after = ''] = raw.split('{text}');
    this._prompt.replaceChildren(before, createElement('strong', { part: 'confirm-text' }, this._text), after);
    this._ok.textContent = this.confirmLabel || msg('confirmAction.confirm');
    this._no.textContent = this.cancelLabel || msg('confirmAction.cancel');
    this._syncMatch();
  }

  get _animated() {
    return !this.noAnimation && !animationsDisabled();
  }

  // =====================================================
  // MODE HOLD
  // =====================================================

  _bindHold() {
    const b = this._btn;
    b.addEventListener('pointerdown', (e) => {
      if (this.mode === 'type' || e.button !== 0) return;
      this._startHold();
    });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
      b.addEventListener(type, () => { if (this.mode !== 'type') this._stopHold(true); });
    }
    b.addEventListener('keydown', (e) => {
      if (this.mode === 'type' || (e.key !== ' ' && e.key !== 'Enter')) return;
      e.preventDefault(); // chặn click của nút (Enter kích hoạt ngay khi keydown)
      if (!e.repeat) this._startHold();
    });
    b.addEventListener('keyup', (e) => {
      if (this.mode === 'type' || (e.key !== ' ' && e.key !== 'Enter')) return;
      e.preventDefault();
      this._stopHold(true);
    });
    b.addEventListener('blur', () => this._stopHold(true), true);
    b.addEventListener('contextmenu', (e) => { if (this._holding) e.preventDefault(); });
    // Sự kiện công khai là hui-confirm — click/hui-click của nút nội bộ không có ý nghĩa xác nhận
    b.addEventListener('hui-click', (e) => {
      e.stopPropagation();
      if (this.mode === 'type' && !this.disabled) this.openPanel();
    });
  }

  _startHold() {
    if (this.disabled || this._holding) return;
    clearTimeout(this._resetTimer);
    this.setState('confirmed', false);
    this._holding = true;
    this._holdStart = performance.now();
    this.setState('holding', true);
    const duration = Math.max(100, Number(this.duration) || 1000);
    this._fillAnim?.cancel();
    if (this._animated && typeof this._fill.animate === 'function') {
      this._fillAnim = this._fill.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration, easing: 'linear', fill: 'forwards' });
    } else {
      this._fill.style.transform = 'scaleX(1)';
    }
    this._timer = setTimeout(() => this._completeHold(), duration);
  }

  /** Thả tay: chưa đủ thời gian → thanh tiến độ chạy lùi về 0 */
  _stopHold(emitCancel) {
    if (!this._holding) return;
    this._holding = false;
    clearTimeout(this._timer);
    this.setState('holding', false);
    const duration = Math.max(100, Number(this.duration) || 1000);
    const progress = Math.min(1, (performance.now() - this._holdStart) / duration);
    this._resetFill(progress);
    if (emitCancel) this.emit('hui-cancel', { mode: 'hold', progress });
  }

  _resetFill(from = 1) {
    this._fillAnim?.cancel();
    this._fillAnim = null;
    this._fill.style.transform = '';
    if (this._animated && from > 0 && typeof this._fill.animate === 'function') {
      this._fill.animate([{ transform: `scaleX(${from})` }, { transform: 'scaleX(0)' }], { duration: 200, easing: 'ease-out' });
    }
  }

  _completeHold() {
    this._holding = false;
    this.setState('holding', false);
    this._confirm('hold');
    // Giữ thanh đầy một lúc để người dùng thấy đã xác nhận, rồi trả về trạng thái đầu
    this._resetTimer = setTimeout(() => {
      this.setState('confirmed', false);
      this._resetFill(1);
    }, 900);
  }

  _confirm(mode) {
    this.setState('confirmed', true);
    this._live.textContent = '';
    setTimeout(() => { this._live.textContent = msg('confirmAction.done'); }, 30);
    this.emit('hui-confirm', { mode });
  }

  // =====================================================
  // MODE TYPE
  // =====================================================

  _bindType() {
    this._input.addEventListener('input', () => this._syncMatch());
    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        if (this._matches()) this._confirmTyped();
      }
    });
    this._ok.addEventListener('hui-click', (e) => {
      e.stopPropagation();
      if (this._matches()) this._confirmTyped();
    });
    this._no.addEventListener('hui-click', (e) => {
      e.stopPropagation();
      this.closePanel(true);
    });
  }

  _matches() {
    const a = this._input.value.trim();
    const b = this._text.trim();
    return this.ignoreCase ? a.toLocaleLowerCase() === b.toLocaleLowerCase() : a === b;
  }

  _syncMatch() {
    if (!this._ok) return;
    const ok = this._matches();
    this._ok.toggleAttribute('disabled', !ok);
    this._input.setAttribute('aria-invalid', String(Boolean(this._input.value) && !ok));
  }

  /** Mở ô nhập xác nhận (mode="type") */
  openPanel() {
    if (this.disabled || this._panelOpen) return;
    this._panelOpen = true;
    this._input.value = '';
    this._syncMatch();
    this._btn.hidden = true;
    this._panel.hidden = false;
    this.setState('open', true);
    if (this._animated && typeof this._panel.animate === 'function') {
      this._panel.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'ease-out' });
    }
    this._input.focus();
  }

  /** Đóng ô nhập; `restoreFocus` → focus lại nút chính */
  closePanel(restoreFocus = true, emitCancel = true) {
    if (!this._panelOpen) return;
    this._panelOpen = false;
    this._panel.hidden = true;
    this._btn.hidden = false;
    this.setState('open', false);
    if (restoreFocus) this._btn.focus();
    if (emitCancel) this.emit('hui-cancel', { mode: 'type' });
  }

  _confirmTyped() {
    this.closePanel(true, false);
    this._confirm('type');
    clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(() => this.setState('confirmed', false), 900);
  }
}

defineElement('hui-confirm-action', HuiConfirmAction);

export default HuiConfirmAction;
