/**
 * HUI Kbd — Phím bàn phím (Atom): `<hui-kbd>Esc</hui-kbd>` hoặc tổ hợp `keys="ctrl+k"` có dấu nối,
 * tự đổi theo hệ điều hành (Ctrl → ⌘, Alt → ⌥ trên Mac khi platform="auto").
 */

import styles from './hui-kbd.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/** Máy đang dùng có phải Mac / iOS không */
export function isMacPlatform() {
  if (typeof navigator === 'undefined') return false;
  const p = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(p);
}

/**
 * Bảng tên phím: khóa viết thường → [hiển thị, tên đọc] cho mac / còn lại.
 * Tên đọc chỉ cần khi hiển thị là ký hiệu (⌘, ↑...).
 */
const KEYS = {
  ctrl: { mac: ['⌘', 'Command'], other: ['Ctrl'] },
  mod: { mac: ['⌘', 'Command'], other: ['Ctrl'] },
  cmd: { mac: ['⌘', 'Command'], other: ['Ctrl'] },
  command: { mac: ['⌘', 'Command'], other: ['Ctrl'] },
  meta: { mac: ['⌘', 'Command'], other: ['Win'] },
  win: { mac: ['⌘', 'Command'], other: ['Win'] },
  control: { mac: ['⌃', 'Control'], other: ['Ctrl'] },
  alt: { mac: ['⌥', 'Option'], other: ['Alt'] },
  option: { mac: ['⌥', 'Option'], other: ['Alt'] },
  shift: { mac: ['⇧', 'Shift'], other: ['Shift'] },
  enter: { mac: ['↩', 'Return'], other: ['Enter'] },
  return: { mac: ['↩', 'Return'], other: ['Enter'] },
  backspace: { mac: ['⌫', 'Delete'], other: ['Backspace'] },
  delete: { mac: ['⌦', 'Forward Delete'], other: ['Del'] },
  del: { mac: ['⌦', 'Forward Delete'], other: ['Del'] },
  esc: { mac: ['Esc'], other: ['Esc'] },
  escape: { mac: ['Esc'], other: ['Esc'] },
  tab: { mac: ['⇥', 'Tab'], other: ['Tab'] },
  space: { mac: ['Space'], other: ['Space'] },
  capslock: { mac: ['⇪', 'Caps Lock'], other: ['Caps Lock'] },
  up: { mac: ['↑', 'Up arrow'], other: ['↑', 'Up arrow'] },
  down: { mac: ['↓', 'Down arrow'], other: ['↓', 'Down arrow'] },
  left: { mac: ['←', 'Left arrow'], other: ['←', 'Left arrow'] },
  right: { mac: ['→', 'Right arrow'], other: ['→', 'Right arrow'] },
  pageup: { mac: ['PgUp', 'Page Up'], other: ['PgUp', 'Page Up'] },
  pagedown: { mac: ['PgDn', 'Page Down'], other: ['PgDn', 'Page Down'] },
  home: { mac: ['Home'], other: ['Home'] },
  end: { mac: ['End'], other: ['End'] },
  plus: { mac: ['+'], other: ['+'] },
};

/**
 * Phân tích chuỗi phím → mảng tổ hợp, mỗi tổ hợp là mảng { text, name }.
 *   "ctrl+k"       → [[⌘|Ctrl, K]]
 *   "g g" / "g, i" → 2 tổ hợp bấm lần lượt
 * @param {string} keys
 * @param {boolean} mac
 */
export function parseKeys(keys, mac = false) {
  return String(keys || '')
    .trim()
    .split(/\s*,\s*|\s+/)
    .filter(Boolean)
    .map((combo) => combo.split(/\+(?!$)/).filter(Boolean).map((raw) => {
      const k = raw.trim();
      const entry = KEYS[k.toLowerCase()];
      if (entry) {
        const [text, name] = entry[mac ? 'mac' : 'other'];
        return { text, name: name || '' };
      }
      return { text: k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1), name: '' };
    }));
}

/**
 * Phím / tổ hợp phím. Có `keys` → tự dựng; không có → hiển thị nội dung slot trong một phím.
 * Ký hiệu (⌘, ⇧, ↑...) kèm tên đầy đủ ẩn cho trình đọc màn hình ("Command").
 *
 * @slot - Chữ của phím (khi không dùng `keys`)
 * @csspart base - Khung ngoài
 * @csspart key - Mỗi phím (<kbd>)
 * @csspart separator - Dấu nối giữa các phím trong tổ hợp ("+")
 * @csspart then - Khoảng cách giữa các tổ hợp bấm lần lượt
 * @cssprop --hui-kbd-bg - Nền phím
 * @cssprop --hui-kbd-color - Màu chữ
 * @cssprop --hui-kbd-border-color - Màu viền
 * @cssprop --hui-kbd-shadow - Bóng đáy phím (hiệu ứng nổi)
 * @cssprop --hui-kbd-radius - Bo góc
 * @cssprop --hui-kbd-font-size - Cỡ chữ
 * @cssprop --hui-kbd-font-family - Font chữ (mặc định mono)
 * @cssprop --hui-kbd-min-width - Bề rộng tối thiểu mỗi phím
 * @cssprop --hui-kbd-separator-color - Màu dấu nối
 */
class HuiKbd extends HuiElement {
  static properties = {
    /** Tổ hợp phím, vd "ctrl+k", "ctrl+shift+p", "g g" (bấm lần lượt). Bỏ trống = dùng nội dung slot */
    keys: { type: String },
    /** auto | mac | windows — auto: tự nhận diện hệ điều hành (Ctrl → ⌘ trên Mac) */
    platform: { type: String, default: 'auto' },
    /** Dấu nối giữa các phím trong một tổ hợp; chuỗi rỗng = không có */
    separator: { type: String, default: '+' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** raised | outline | filled — phím nổi 3D / chỉ viền / nền đặc */
    variant: { type: String, default: 'raised' },
  };

  static styles = styles;

  /** Đang hiển thị theo kiểu Mac */
  get isMac() {
    if (this.platform === 'mac') return true;
    if (this.platform === 'auto' || !this.platform) return isMacPlatform();
    return false;
  }

  render() {
    this._base = createElement('span', { className: 'kbd', part: 'base' });
    this._slotKey = createElement('kbd', { className: 'kbd__key', part: 'key' }, createElement('slot'));
    return this._base;
  }

  updated(changed) {
    if (changed.has('size') || changed.has('variant')) {
      this._base.className = `kbd kbd--${['sm', 'md', 'lg'].includes(this.size) ? this.size : 'md'} kbd--${['raised', 'outline', 'filled'].includes(this.variant) ? this.variant : 'raised'}`;
    }
    if (['keys', 'platform', 'separator'].some((k) => changed.has(k))) this._build();
  }

  _build() {
    if (!this.keys) {
      this._base.replaceChildren(this._slotKey);
      return;
    }
    const nodes = [];
    parseKeys(this.keys, this.isMac).forEach((combo, ci) => {
      if (ci > 0) nodes.push(createElement('span', { className: 'kbd__then', part: 'then' }, ' '));
      combo.forEach((key, i) => {
        if (i > 0 && this.separator) {
          nodes.push(createElement('span', { className: 'kbd__sep', part: 'separator', 'aria-hidden': 'true' }, this.separator));
        }
        const kbd = createElement('kbd', { className: 'kbd__key', part: 'key' });
        if (key.name && key.name !== key.text) {
          // Ký hiệu: mắt thấy "⌘", trình đọc màn hình đọc "Command"
          kbd.append(
            createElement('span', { className: 'kbd__glyph', 'aria-hidden': 'true' }, key.text),
            createElement('span', { className: 'kbd__sr' }, key.name),
          );
          kbd.title = key.name;
        } else {
          kbd.textContent = key.text;
        }
        nodes.push(kbd);
      });
    });
    this._base.replaceChildren(...nodes);
  }
}

defineElement('hui-kbd', HuiKbd);

export default HuiKbd;
