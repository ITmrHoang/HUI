/**
 * HUI Hotkey — Phím tắt khai báo (Atom, không hiển thị): `<hui-hotkey keys="mod+s">` → phát `hui-hotkey`.
 * Kèm hàm JS `registerHotkey(keys, handler, options)` trả về hàm hủy đăng ký.
 *
 * Cú pháp keys:
 *   "ctrl+s"        tổ hợp (ctrl / alt / shift / meta, `mod` = ⌘ trên Mac, Ctrl ở nơi khác)
 *   "g i"           chuỗi phím bấm lần lượt (cách nhau khoảng trắng, trong `sequence-timeout` ms)
 *   "mod+k, /"      nhiều lựa chọn (cách nhau dấu phẩy) — khớp một trong số đó là chạy
 */

import styles from './hui-hotkey.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { isMacPlatform } from '../hui-kbd/hui-kbd.js';

/** Tên phím viết tắt → giá trị KeyboardEvent.key (viết thường) */
const KEY_ALIASES = {
  esc: 'escape',
  return: 'enter',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  del: 'delete',
  ins: 'insert',
  plus: '+',
  comma: ',',
  minus: '-',
  pgup: 'pageup',
  pgdn: 'pagedown',
};

const MODIFIERS = new Set(['ctrl', 'control', 'alt', 'option', 'shift', 'meta', 'cmd', 'command', 'win', 'super', 'mod']);
const MODIFIER_KEYS = new Set(['control', 'alt', 'shift', 'meta', 'altgraph', 'os']);

/**
 * Phân tích một tổ hợp "ctrl+shift+k" → { ctrl, alt, shift, meta, key }.
 * @param {string} combo
 * @param {boolean} mac
 */
function parseCombo(combo, mac) {
  const parts = combo.toLowerCase().split(/\+(?!$)/).map((s) => s.trim()).filter(Boolean);
  const out = { ctrl: false, alt: false, shift: false, meta: false, key: '' };
  for (const p of parts) {
    if (!MODIFIERS.has(p)) {
      out.key = KEY_ALIASES[p] ?? p;
      continue;
    }
    if (p === 'mod') out[mac ? 'meta' : 'ctrl'] = true;
    else if (p === 'ctrl' || p === 'control') out.ctrl = true;
    else if (p === 'alt' || p === 'option') out.alt = true;
    else if (p === 'shift') out.shift = true;
    else out.meta = true; // meta / cmd / command / win / super
  }
  return out;
}

/**
 * "mod+k, g i" → [[combo], [combo, combo]] — mỗi phần tử là 1 lựa chọn (chuỗi các tổ hợp).
 * @param {string} keys
 * @param {boolean} [mac]
 */
export function parseHotkey(keys, mac = isMacPlatform()) {
  return String(keys || '')
    .split(',')
    .map((alt) => alt.trim())
    .filter(Boolean)
    .map((alt) => alt.split(/\s+/).filter(Boolean).map((c) => parseCombo(c, mac)))
    .filter((seq) => seq.length && seq.every((c) => c.key));
}

/** Phím của sự kiện (viết thường); chữ/số lấy theo `code` để alt+s trên Mac (ra "ß") vẫn khớp */
function eventKeys(e) {
  const key = (e.key || '').toLowerCase();
  const list = [key];
  const m = /^(?:Key([A-Z])|Digit(\d))$/.exec(e.code || '');
  if (m) list.push((m[1] || m[2]).toLowerCase());
  return list;
}

/** KeyboardEvent có khớp tổ hợp không */
export function matchCombo(e, combo) {
  if (e.ctrlKey !== combo.ctrl || e.altKey !== combo.alt || e.metaKey !== combo.meta) return false;
  const keys = eventKeys(e);
  if (!keys.includes(combo.key)) return false;
  // Ký tự cần Shift mới gõ được ("?", "!", "+") → không bắt buộc khớp Shift nếu không ghi rõ
  const symbol = combo.key.length === 1 && !/[a-z0-9]/.test(combo.key);
  return combo.shift ? e.shiftKey : symbol || !e.shiftKey;
}

/** Sự kiện xuất phát từ ô đang gõ chữ (input, textarea, select, contenteditable) */
export function isTypingTarget(e) {
  const el = e.composedPath?.()[0] || e.target;
  if (!(el instanceof Element)) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT') {
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'].includes(el.type);
  }
  return el.getAttribute?.('role') === 'textbox' || el.getAttribute?.('role') === 'combobox';
}

/**
 * Đăng ký phím tắt. Trả về hàm hủy đăng ký.
 *   const off = registerHotkey('mod+s', (e) => save(), { preventDefault: true });
 * @param {string} keys - xem cú pháp đầu file
 * @param {(e: KeyboardEvent, info: {keys: string, combo: string}) => void} handler
 * @param {{target?: EventTarget, allowInInputs?: boolean, preventDefault?: boolean,
 *   sequenceTimeout?: number, capture?: boolean, eventType?: 'keydown'|'keyup', mac?: boolean}} [options]
 * @returns {() => void}
 */
export function registerHotkey(keys, handler, options = {}) {
  const {
    target = typeof document !== 'undefined' ? document : null,
    allowInInputs = false,
    preventDefault = false,
    sequenceTimeout = 1000,
    capture = false,
    eventType = 'keydown',
    mac = isMacPlatform(),
  } = options;
  const sequences = parseHotkey(keys, mac);
  if (!target || !sequences.length) return () => {};
  const alternatives = String(keys).split(',').map((s) => s.trim()).filter(Boolean);

  // Tiến độ của từng chuỗi phím (vd "g i": đã bấm g → progress = 1)
  const progress = sequences.map(() => 0);
  let timer = 0;
  const reset = () => {
    progress.fill(0);
    clearTimeout(timer);
  };

  const onKey = (e) => {
    if (e.isComposing || e.keyCode === 229) return; // đang gõ bộ gõ tiếng Việt / IME
    if (MODIFIER_KEYS.has((e.key || '').toLowerCase())) return; // chỉ nhấn Ctrl/Shift… chưa tính
    if (!allowInInputs && isTypingTarget(e)) {
      reset();
      return;
    }
    let fired = false;
    sequences.forEach((seq, i) => {
      if (fired) return;
      let step = progress[i];
      if (!matchCombo(e, seq[step])) {
        // Sai phím giữa chừng → thử lại từ đầu chuỗi với chính phím này
        step = 0;
        progress[i] = 0;
        if (!matchCombo(e, seq[0])) return;
      }
      step += 1;
      if (step < seq.length) {
        progress[i] = step;
        clearTimeout(timer);
        timer = setTimeout(reset, sequenceTimeout);
        // Phím đầu của chuỗi cũng chặn mặc định nếu được yêu cầu (vd "g" không cuộn trang)
        if (preventDefault && seq.length > 1) e.preventDefault();
        return;
      }
      fired = true;
      reset();
      if (preventDefault) e.preventDefault();
      handler(e, { keys: String(keys), combo: alternatives[i] || String(keys) });
    });
  };

  target.addEventListener(eventType, onKey, { capture });
  return () => {
    reset();
    target.removeEventListener(eventType, onKey, { capture });
  };
}

/**
 * Phím tắt khai báo. Không hiển thị gì (display: contents) — bọc được nội dung khác mà không đổi bố cục.
 *
 * @fires hui-hotkey - Phím tắt được bấm. detail: { keys, combo, originalEvent }. Cancelable: preventDefault() để chặn hành vi mặc định của trình duyệt
 * @slot - Nội dung tùy ý (vd nút mà phím tắt đại diện); không bắt buộc
 */
class HuiHotkey extends HuiElement {
  static properties = {
    /** Phím tắt: "ctrl+s", "mod+k" (⌘ trên Mac), chuỗi "g i", nhiều lựa chọn "mod+k, /" */
    keys: { type: String },
    /** document | window | parent | <CSS selector> — phạm vi lắng nghe (parent: chỉ khi focus nằm trong phần tử cha) */
    target: { type: String, default: 'document' },
    /** Vẫn nhận phím khi đang gõ trong input / textarea / select / contenteditable */
    allowInInputs: { type: Boolean },
    /** Gọi preventDefault() cho phím (vd chặn hộp "Lưu trang" của Ctrl+S) */
    preventDefault: { type: Boolean },
    /** Thời gian chờ tối đa giữa 2 phím của một chuỗi (ms) */
    sequenceTimeout: { type: Number, default: 1000 },
    /** keydown | keyup — sự kiện bàn phím được lắng nghe */
    event: { type: String, default: 'keydown' },
    /** Tạm tắt phím tắt */
    disabled: { type: Boolean },
  };

  static styles = styles;

  render() {
    return createElement('slot');
  }

  connectedCallback() {
    super.connectedCallback();
    this._bind();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._off?.();
    this._off = null;
  }

  updated(changed) {
    if (['keys', 'target', 'allowInInputs', 'preventDefault', 'sequenceTimeout', 'event', 'disabled'].some((k) => changed.has(k))) {
      this._bind();
    }
  }

  /** Phần tử đang được lắng nghe */
  get targetElement() {
    const t = (this.target || 'document').trim();
    if (t === 'document') return document;
    if (t === 'window') return window;
    if (t === 'parent') return this.parentElement || this.getRootNode()?.host || document;
    try {
      return this.getRootNode()?.querySelector?.(t) || document.querySelector(t);
    } catch {
      return null;
    }
  }

  _bind() {
    this._off?.();
    this._off = null;
    if (!this.isConnected || this.disabled || !this.keys) return;
    const target = this.targetElement;
    if (!target) return;
    this._off = registerHotkey(this.keys, (e, info) => {
      const ok = this.emit('hui-hotkey', { ...info, originalEvent: e }, { cancelable: true });
      if (!ok) e.preventDefault();
    }, {
      target,
      allowInInputs: this.allowInInputs,
      preventDefault: this.preventDefault,
      sequenceTimeout: this.sequenceTimeout || 1000,
      eventType: this.event === 'keyup' ? 'keyup' : 'keydown',
    });
  }
}

defineElement('hui-hotkey', HuiHotkey);

export default HuiHotkey;
