/**
 * HUI Color Picker — Chọn màu (Ant ColorPicker + MUI color input), tham gia <form> native.
 * Nút kích hoạt (ô màu + chữ) mở bảng chọn (top-layer) hoặc `inline`: vùng bão hòa/độ sáng kéo 2 chiều,
 * thanh hue, thanh alpha, ô nhập HEX | RGB | HSB | HSL, bảng màu có sẵn (`presets`), màu gần đây, EyeDropper.
 * Trạng thái nội bộ giữ ở HSV để không mất hue khi màu là xám/đen.
 */

import styles from './hui-color-picker.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { autoUpdate, computePosition, floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { openOverlay } from '../../utils/overlay.js';
import { formatColor, hslToHsv, hsvToHsl, hsvToRgb, parseColor, rgbToHex, rgbToHsv } from './color.js';
import '../hui-icon/hui-icon.js';
import '../hui-color-swatch/hui-color-swatch.js';

export * from './color.js';

const FALLBACK = {
  'colorPicker.label': { vi: 'Chọn màu', en: 'Color picker' },
  'colorPicker.trigger': { vi: '{label}: {color}', en: '{label}: {color}' },
  'colorPicker.empty': { vi: 'Chưa chọn màu', en: 'No color' },
  'colorPicker.area': { vi: 'Độ bão hòa và độ sáng', en: 'Saturation and brightness' },
  'colorPicker.areaText': { vi: 'Độ bão hòa {s}%, độ sáng {v}%', en: 'Saturation {s}%, brightness {v}%' },
  'colorPicker.area2d': { vi: 'thanh trượt 2 chiều', en: '2D slider' },
  'colorPicker.hue': { vi: 'Sắc độ', en: 'Hue' },
  'colorPicker.alpha': { vi: 'Độ đục', en: 'Opacity' },
  'colorPicker.format': { vi: 'Định dạng', en: 'Format' },
  'colorPicker.red': { vi: 'Đỏ', en: 'Red' },
  'colorPicker.green': { vi: 'Xanh lá', en: 'Green' },
  'colorPicker.blue': { vi: 'Xanh dương', en: 'Blue' },
  'colorPicker.saturation': { vi: 'Độ bão hòa', en: 'Saturation' },
  'colorPicker.brightness': { vi: 'Độ sáng', en: 'Brightness' },
  'colorPicker.lightness': { vi: 'Độ sáng (L)', en: 'Lightness' },
  'colorPicker.eyedropper': { vi: 'Lấy màu trên màn hình', en: 'Pick a color from the screen' },
  'colorPicker.clear': { vi: 'Xóa màu', en: 'Clear color' },
  'colorPicker.recent': { vi: 'Màu gần đây', en: 'Recent colors' },
  'colorPicker.presets': { vi: 'Màu có sẵn', en: 'Presets' },
  'colorPicker.invalid': { vi: 'Màu không hợp lệ', en: 'Invalid color' },
};

/** t() + chuỗi dự phòng khi locale.js chưa có key */
const tx = (key, vars) => {
  let v = t(key, vars);
  if (v !== key) return v;
  v = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : v;
};

const FORMATS = ['hex', 'rgb', 'hsl'];
const INPUT_FORMATS = ['hex', 'rgb', 'hsb', 'hsl'];
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** Màu gần đây dùng chung giữa các picker cùng `recent-key` (chỉ trong bộ nhớ) */
const RECENTS = new Map();

/** Trình duyệt hỗ trợ EyeDropper API (Chromium desktop) */
const supportsEyeDropper = () => typeof window !== 'undefined' && 'EyeDropper' in window;

/** So sánh 2 màu theo #rrggbbaa */
const sameColor = (a, b) => Boolean(a && b) && rgbToHex(a) === rgbToHex(b);

/**
 * Ô chọn màu.
 * @fires input - Màu đổi khi đang kéo / gõ phím (gom theo frame). detail: { value, color: { r, g, b, a } }
 * @fires change - Màu đã chốt (thả chuột, phím, ô nhập, preset, EyeDropper, xóa). detail: { value, color }
 * @fires hui-open - Bảng chọn mở
 * @fires hui-close - Bảng chọn đóng
 * @fires clear - Bấm "Xóa màu"
 * @csspart base - Khung ngoài
 * @csspart trigger - Nút mở bảng chọn
 * @csspart trigger-swatch - Ô màu trong nút
 * @csspart text - Chữ mã màu trong nút (show-text)
 * @csspart popup - Lớp nổi chứa bảng chọn
 * @csspart panel - Bảng chọn
 * @csspart area - Vùng bão hòa / độ sáng (role=slider 2 chiều)
 * @csspart area-thumb - Tay nắm của vùng màu
 * @csspart hue - Thanh hue
 * @csspart alpha - Thanh alpha
 * @csspart slider-thumb - Tay nắm của thanh hue / alpha
 * @csspart preview - Ô xem trước màu hiện tại
 * @csspart eyedropper - Nút lấy màu trên màn hình
 * @csspart inputs - Hàng ô nhập
 * @csspart format-select - Chọn định dạng ô nhập
 * @csspart input - Mỗi ô nhập số / HEX
 * @csspart presets - Vùng bảng màu có sẵn
 * @csspart preset-label - Tiêu đề nhóm màu
 * @csspart preset-swatch - Mỗi ô màu (hui-color-swatch)
 * @csspart clear - Nút xóa màu
 * @cssprop --hui-color-picker-panel-width - Bề rộng bảng chọn (mặc định 248px)
 * @cssprop --hui-color-picker-panel-bg - Nền bảng chọn
 * @cssprop --hui-color-picker-panel-shadow - Đổ bóng bảng chọn
 * @cssprop --hui-color-picker-panel-radius - Bo góc bảng chọn
 * @cssprop --hui-color-picker-area-height - Chiều cao vùng màu (mặc định 160px)
 * @cssprop --hui-color-picker-area-radius - Bo góc vùng màu
 * @cssprop --hui-color-picker-thumb-size - Cỡ tay nắm (mặc định 14px)
 * @cssprop --hui-color-picker-slider-height - Chiều cao thanh hue/alpha (mặc định 10px)
 * @cssprop --hui-color-picker-trigger-radius - Bo góc nút kích hoạt
 * @cssprop --hui-color-picker-border-color - Màu viền nút / ô nhập
 * @cssprop --hui-color-picker-focus-shadow - Vòng sáng khi focus
 * @cssprop --hui-color-picker-checker - Màu ô cờ phía sau màu trong suốt
 */
export class HuiColorPicker extends HuiFormElement {
  static properties = {
    /** Giá trị màu (chuỗi CSS). Rỗng = chưa chọn. Được chuẩn hóa theo `format` */
    value: { type: String, default: '', reflect: false },
    /** hex | rgb | hsl — định dạng của value (có alpha < 1 → #rrggbbaa / rgba() / hsla()) */
    format: { type: String, default: 'hex' },
    /** hex | rgb | hsb | hsl — kiểu ô nhập ban đầu (người dùng đổi được trong bảng) */
    inputFormat: { type: String, default: 'hex' },
    /** Cho chỉnh độ trong suốt (thanh alpha + ô %) */
    alpha: { type: Boolean },
    /** Hiện bảng chọn tại chỗ (không có nút / popup) */
    inline: { type: Boolean },
    /** Bảng chọn đang mở (popup) */
    open: { type: Boolean },
    /** Hiện mã màu cạnh ô màu trong nút */
    showText: { type: Boolean },
    /** Cho phép xóa màu (nút "Xóa màu" trong bảng) */
    clearable: { type: Boolean },
    /** Tên truy cập của control (mặc định "Chọn màu") */
    label: { type: String, default: '' },
    /** Chữ trong nút khi chưa có màu (show-text) */
    placeholder: { type: String, default: '' },
    /** Bảng màu có sẵn: [{ label, colors: ['#f00', { color, label }] }] hoặc mảng màu phẳng */
    presets: { type: Array, default: [] },
    /** Số màu gần đây tối đa lưu trong bộ nhớ (0 = ẩn) */
    recentLimit: { type: Number, default: 8 },
    /** Các picker cùng key dùng chung danh sách màu gần đây (bỏ trống = riêng từng picker) */
    recentKey: { type: String, default: '' },
    /** Vị trí popup so với nút (bottom-start, top, right-start…) */
    placement: { type: String, default: 'bottom-start' },
    /** Ẩn nút EyeDropper (vốn chỉ hiện khi trình duyệt hỗ trợ) */
    noEyedropper: { type: Boolean },
    /** Tắt hiệu ứng mở popup */
    noAnimation: { type: Boolean },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._hsva = { h: 0, s: 0, v: 0, a: 1 };
    this._empty = true;
    this._own = null;
    this._drag = null;
    this._raf = 0;
    this._visible = false;
    this._overlay = null;
    this._stopAuto = null;
    this._token = 0;
    this._mode = null;
    this._fields = [];
    this._swatches = [];
    this._localRecent = [];
  }

  /** Màu hiện tại { r, g, b, a } (0..255, a 0..1) — null khi chưa chọn */
  get color() {
    if (this._empty) return null;
    const c = hsvToRgb(this._hsva);
    return { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), a: this._hsva.a };
  }

  /** Danh sách màu gần đây (bản sao) */
  get recentColors() {
    return [...this._recent()];
  }

  get _canEdit() {
    return !this.isDisabled && !this.readonly;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    // --- Nút kích hoạt ---
    this._triggerColor = createElement('span', { className: 'cp__trigger-color' });
    this._triggerSwatch = createElement('span', { className: 'cp__trigger-swatch', part: 'trigger-swatch' }, this._triggerColor);
    this._text = createElement('span', { className: 'cp__text', part: 'text' });
    this._trigger = createElement('button', {
      className: 'cp__trigger', part: 'trigger', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'panel',
    }, this._triggerSwatch, this._text);
    this._trigger.addEventListener('click', () => {
      if (this._canEdit) this.open = !this.open;
    });
    this._trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && e.altKey && this._canEdit) {
        e.preventDefault();
        this.open = true;
      }
    });

    // --- Vùng bão hòa / độ sáng ---
    this._areaThumb = createElement('span', { className: 'cp__thumb cp__area-thumb', part: 'area-thumb' });
    this._area = createElement('div', {
      className: 'cp__area', part: 'area', role: 'slider', tabindex: '0', 'aria-valuemin': '0', 'aria-valuemax': '100',
    }, this._areaThumb);

    // --- Thanh hue + alpha ---
    this._hueThumb = createElement('span', { className: 'cp__thumb cp__slider-thumb', part: 'slider-thumb' });
    this._hue = createElement('div', {
      className: 'cp__slider cp__hue', part: 'hue', role: 'slider', tabindex: '0', 'aria-valuemin': '0', 'aria-valuemax': '360',
    }, this._hueThumb);
    this._alphaThumb = createElement('span', { className: 'cp__thumb cp__slider-thumb', part: 'slider-thumb' });
    this._alphaTrack = createElement('div', {
      className: 'cp__slider cp__alpha', part: 'alpha', role: 'slider', tabindex: '0', 'aria-valuemin': '0', 'aria-valuemax': '100',
    }, createElement('span', { className: 'cp__alpha-fill' }), this._alphaThumb);

    for (const [el, kind] of [[this._area, 'area'], [this._hue, 'hue'], [this._alphaTrack, 'alpha']]) {
      this._bindDrag(el, kind);
      el.addEventListener('keydown', (e) => this._onSliderKey(e, kind));
    }

    this._eyedropper = createElement('button', { className: 'cp__icon-btn', part: 'eyedropper', type: 'button' },
      createElement('hui-icon', { name: 'eyedropper', 'aria-hidden': 'true' }));
    this._eyedropper.addEventListener('click', () => this._pickFromScreen());
    this._preview = createElement('span', { className: 'cp__preview', part: 'preview', 'aria-hidden': 'true' },
      createElement('span', { className: 'cp__preview-color' }));
    const sliders = createElement('div', { className: 'cp__sliders' }, this._hue, this._alphaTrack);
    const row = createElement('div', { className: 'cp__row' }, this._eyedropper, sliders, this._preview);

    // --- Ô nhập ---
    this._modeSelect = createElement('select', { className: 'cp__mode', part: 'format-select' },
      ...INPUT_FORMATS.map((f) => createElement('option', { value: f }, f.toUpperCase())));
    this._modeSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      this.inputFormat = this._modeSelect.value;
    });
    this._fieldsBox = createElement('div', { className: 'cp__fields' });
    this._alphaInput = this._makeField('alpha', 0, 100);
    this._alphaInput.wrap.classList.add('cp__field--alpha');
    this._inputs = createElement('div', { className: 'cp__inputs', part: 'inputs' }, this._modeSelect, this._fieldsBox, this._alphaInput.wrap);

    // --- Presets + gần đây ---
    this._presets = createElement('div', { className: 'cp__presets', part: 'presets' });
    // hui-color-swatch tự phát `change` (composed) → chặn tại đây, phát lại change đúng của picker
    this._presets.addEventListener('change', (e) => {
      e.stopPropagation();
      const sw = e.target.closest?.('hui-color-swatch');
      if (sw) this._pickPreset(sw);
    });

    this._clearBtn = createElement('button', { className: 'cp__clear', part: 'clear', type: 'button' },
      createElement('hui-icon', { name: 'close', 'aria-hidden': 'true' }), createElement('span', {}));
    this._clearBtn.addEventListener('click', () => this._clear());
    this._footer = createElement('div', { className: 'cp__footer' }, this._clearBtn);

    this._panel = createElement('div', { className: 'cp__panel', part: 'panel', id: 'panel' },
      this._area, row, this._inputs, this._presets, this._footer);

    this._popup = createElement('div', { className: 'hui-floating cp__popup', part: 'popup', hidden: true });
    this._live = createElement('div', { className: 'cp__sr', role: 'status', 'aria-live': 'polite' });
    this._base = createElement('div', { className: 'cp', part: 'base' }, this._trigger, this._popup, this._live);
    return this._base;
  }

  /** Ô nhập số có nhãn nhỏ phía dưới */
  _makeField(key, min, max) {
    const input = createElement('input', {
      className: 'cp__input', part: 'input', type: 'text', inputmode: 'numeric', autocomplete: 'off', spellcheck: 'false',
      dataset: { key },
    });
    input.addEventListener('input', (e) => e.stopPropagation());
    input.addEventListener('change', (e) => {
      e.stopPropagation();
      this._onFieldChange(key);
    });
    input.addEventListener('blur', () => {
      input.removeAttribute('aria-invalid');
      this._paintFields(true);
    });
    input.addEventListener('keydown', (e) => {
      // Enter → chốt giá trị nhưng không submit form
      if (e.key === 'Enter') {
        e.preventDefault();
        this._onFieldChange(key);
        return;
      }
      // ↑/↓ tăng giảm 1 (Shift: 10) trong ô số
      if (key === 'hex' || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      const n = parseFloat(input.value) || 0;
      input.value = String(clamp(Math.round(n + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)), min, max));
      this._onFieldChange(key);
    });
    const caption = createElement('span', { className: 'cp__caption', 'aria-hidden': 'true' });
    const wrap = createElement('label', { className: 'cp__field' }, input, caption);
    return { key, input, caption, wrap, min, max };
  }

  _buildFields() {
    const mode = INPUT_FORMATS.includes(this.inputFormat) ? this.inputFormat : 'hex';
    if (mode === this._mode && this._fields.length) return;
    this._mode = mode;
    this._modeSelect.value = mode;
    const specs = {
      hex: [['hex', 0, 0]],
      rgb: [['r', 0, 255], ['g', 0, 255], ['b', 0, 255]],
      hsb: [['h', 0, 360], ['s', 0, 100], ['v', 0, 100]],
      hsl: [['h', 0, 360], ['s', 0, 100], ['l', 0, 100]],
    }[mode];
    this._fields = specs.map(([key, min, max]) => this._makeField(key, min, max));
    const hex = this._fields[0].key === 'hex';
    if (hex) {
      this._fields[0].input.removeAttribute('inputmode');
      this._fields[0].wrap.classList.add('cp__field--hex');
    }
    this._fieldsBox.replaceChildren(...this._fields.map((f) => f.wrap));
    this._syncFieldLabels();
    this._paintFields(true);
  }

  _syncFieldLabels() {
    const names = {
      hex: 'HEX', r: tx('colorPicker.red'), g: tx('colorPicker.green'), b: tx('colorPicker.blue'),
      h: tx('colorPicker.hue'), s: tx('colorPicker.saturation'), v: tx('colorPicker.brightness'),
      l: tx('colorPicker.lightness'), alpha: tx('colorPicker.alpha'),
    };
    const short = { hex: 'HEX', r: 'R', g: 'G', b: 'B', h: 'H', s: 'S', v: 'B', l: 'L', alpha: 'A' };
    for (const f of [...this._fields, this._alphaInput]) {
      f.input.setAttribute('aria-label', names[f.key]);
      f.caption.textContent = short[f.key];
    }
  }

  updated(changed) {
    if (changed.has('value') || changed.has('format') || changed.has('alpha')) this._syncFromValue();
    if (changed.has('inputFormat')) this._buildFields();
    if (changed.has('inline')) this._placePanel();
    if (changed.has('presets') || changed.has('recentLimit') || changed.has('recentKey') || changed.has('locale')) this._renderPresets();
    if (changed.has('locale')) {
      this._syncFieldLabels();
      this._modeSelect.setAttribute('aria-label', tx('colorPicker.format'));
      this._eyedropper.setAttribute('aria-label', tx('colorPicker.eyedropper'));
      this._eyedropper.title = tx('colorPicker.eyedropper');
      this._area.setAttribute('aria-label', tx('colorPicker.area'));
      this._area.setAttribute('aria-roledescription', tx('colorPicker.area2d'));
      this._hue.setAttribute('aria-label', tx('colorPicker.hue'));
      this._alphaTrack.setAttribute('aria-label', tx('colorPicker.alpha'));
      this._clearBtn.lastChild.textContent = tx('colorPicker.clear');
    }
    if (changed.has('open') || changed.has('disabled') || changed.has('readonly') || changed.has('inline')) {
      if (this.open && !this.inline && this._canEdit) this._openPopup();
      else this._closePopup(!this.isConnected);
      if (this.open && (!this._canEdit || this.inline)) this.open = false;
    }
    this._eyedropper.hidden = this.noEyedropper || !supportsEyeDropper();
    this._alphaTrack.hidden = !this.alpha;
    this._alphaInput.wrap.hidden = !this.alpha;
    this._footer.hidden = !this.clearable;
    this._syncDisabled();
    this._syncClasses();
    this._paint();
    super.updated(changed);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._closePopup(true);
  }

  /** inline: bảng nằm ngay trong khung; ngược lại nằm trong popup */
  _placePanel() {
    if (this.inline) {
      this._base.insertBefore(this._panel, this._popup);
      this._panel.setAttribute('role', 'group');
    } else {
      this._popup.append(this._panel);
      this._panel.setAttribute('role', 'dialog');
    }
    this._trigger.hidden = this.inline;
  }

  // =====================================================
  // GIÁ TRỊ
  // =====================================================

  /** Chuỗi value → trạng thái HSV (bỏ qua nếu chính picker vừa ghi value) */
  _syncFromValue() {
    const raw = this.value == null ? '' : String(this.value).trim();
    if (!raw) {
      this._empty = true;
      this._own = '';
      return;
    }
    if (raw !== this._own) {
      const c = parseColor(raw);
      if (!c) {
        this._empty = true;
        return;
      }
      const hsv = rgbToHsv(c);
      // Xám / đen: hue không xác định → giữ hue cũ để thanh hue không nhảy về 0
      if (hsv.s === 0 || hsv.v === 0) hsv.h = this._hsva.h;
      this._hsva = { ...hsv, a: c.a };
    }
    if (!this.alpha) this._hsva.a = 1;
    this._empty = false;
    const norm = this._stringify();
    this._own = norm;
    if (norm !== raw) this.value = norm; // chuẩn hóa theo format (không phát sự kiện)
  }

  _stringify() {
    const f = FORMATS.includes(this.format) ? this.format : 'hex';
    return formatColor({ ...this._hsva, a: this.alpha ? this._hsva.a : 1 }, f);
  }

  /** Ghi value từ trạng thái HSV hiện tại; phát input nếu đổi */
  _flushValue() {
    const next = this._empty ? '' : this._stringify();
    if (next === String(this.value ?? '')) return false;
    this._own = next;
    this.value = next;
    this.emit('input', { value: next, color: this.color });
    return true;
  }

  _commit() {
    this.markInteracted();
    if (!this._empty) this._pushRecent(this.value);
    this.emit('change', { value: this.value, color: this.color });
  }

  /** Đổi màu (từ kéo / phím / ô nhập / preset). live: kéo chuột → gom input theo frame */
  _setHsva(next, { live = false, commit = false } = {}) {
    this._hsva = {
      h: clamp(next.h, 0, 360), s: clamp(next.s, 0, 1), v: clamp(next.v, 0, 1), a: this.alpha ? clamp(next.a, 0, 1) : 1,
    };
    this._empty = false;
    this._paint();
    if (live) {
      if (!this._raf) {
        this._raf = requestAnimationFrame(() => {
          this._raf = 0;
          this._flushValue();
        });
      }
      return;
    }
    const changedValue = this._flushValue();
    if (commit && changedValue) this._commit();
  }

  // =====================================================
  // KÉO CHUỘT
  // =====================================================

  _bindDrag(el, kind) {
    el.addEventListener('pointerdown', (e) => {
      if (!this._canEdit || e.button !== 0) return;
      e.preventDefault();
      el.focus({ preventScroll: true });
      try { el.setPointerCapture(e.pointerId); } catch { /* pointer giả lập */ }
      this._drag = { el, kind, start: String(this.value ?? '') };
      el.classList.add('cp--dragging');
      this._dragTo(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (this._drag?.el === el) this._dragTo(e);
    });
    const end = (e) => {
      if (this._drag?.el !== el) return;
      try {
        if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
      } catch { /* bỏ qua */ }
      this._endDrag();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  _dragTo(e) {
    const { el, kind } = this._drag;
    const rect = el.getBoundingClientRect();
    const x = rect.width ? clamp((e.clientX - rect.left) / rect.width, 0, 1) : 0;
    const y = rect.height ? clamp((e.clientY - rect.top) / rect.height, 0, 1) : 0;
    const next = { ...this._hsva };
    if (kind === 'area') {
      next.s = x;
      next.v = 1 - y;
    } else if (kind === 'hue') next.h = x * 360;
    else next.a = x;
    this._setHsva(next, { live: true });
  }

  _endDrag() {
    const drag = this._drag;
    this._drag = null;
    drag.el.classList.remove('cp--dragging');
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._flushValue();
    if (String(this.value ?? '') !== drag.start) this._commit();
  }

  // =====================================================
  // BÀN PHÍM TRÊN THANH TRƯỢT
  // =====================================================

  _onSliderKey(e, kind) {
    if (!this._canEdit) return;
    const big = e.shiftKey || e.key === 'PageUp' || e.key === 'PageDown';
    const next = { ...this._hsva, a: this._empty ? 1 : this._hsva.a };
    const keys = {
      ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1], PageUp: [0, 1], PageDown: [0, -1],
    };
    if (kind === 'area') {
      if (e.key === 'Home') next.s = 0;
      else if (e.key === 'End') next.s = 1;
      else if (keys[e.key]) {
        const [dx, dy] = keys[e.key];
        const step = big ? 0.1 : 0.01;
        // PageUp/PageDown chỉ đổi độ sáng
        next.s += (e.key.startsWith('Page') ? 0 : dx) * step;
        next.v += dy * step;
      } else return;
    } else {
      const [max, field, scale] = kind === 'hue' ? [360, 'h', 1] : [100, 'a', 100];
      const dir = keys[e.key] ? keys[e.key][0] + keys[e.key][1] : 0;
      if (e.key === 'Home') next[field] = 0;
      else if (e.key === 'End') next[field] = max / scale;
      else if (dir) next[field] = (Math.round(next[field] * scale) + dir * (big ? 10 : 1)) / scale;
      else return;
    }
    e.preventDefault();
    this._setHsva(next, { commit: true });
  }

  // =====================================================
  // Ô NHẬP
  // =====================================================

  /** Chốt giá trị từ các ô nhập. srcKey: ô vừa đổi (gõ HEX có alpha → lấy alpha từ chuỗi đó) */
  _onFieldChange(srcKey) {
    if (!this._canEdit) return;
    const invalid = (input) => {
      input.setAttribute('aria-invalid', 'true');
      this._live.textContent = tx('colorPicker.invalid');
    };
    let a = this._empty ? 1 : this._hsva.a;
    if (this.alpha && this._alphaInput.input.value.trim() !== '') {
      const n = parseFloat(this._alphaInput.input.value);
      if (!Number.isFinite(n)) {
        invalid(this._alphaInput.input);
        return;
      }
      a = clamp(n, 0, 100) / 100;
    }
    let next;
    if (this._mode === 'hex') {
      const input = this._fields[0].input;
      const text = input.value.trim();
      const c = parseColor(text);
      if (!c) {
        invalid(input);
        return;
      }
      next = rgbToHsv(c);
      if (next.s === 0 || next.v === 0) next.h = this._hsva.h;
      // #rgb / #rrggbb không mang alpha → giữ alpha hiện tại; chuỗi khác (#rrggbbaa, rgba()…) → lấy alpha của nó
      if (srcKey === 'hex' && !/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) a = c.a;
    } else {
      const nums = {};
      for (const f of this._fields) {
        const n = parseFloat(f.input.value);
        if (!Number.isFinite(n)) {
          invalid(f.input);
          return;
        }
        nums[f.key] = clamp(n, f.min, f.max);
      }
      if (this._mode === 'rgb') {
        next = rgbToHsv(nums);
        if (next.s === 0 || next.v === 0) next.h = this._hsva.h;
      } else if (this._mode === 'hsb') next = { h: nums.h, s: nums.s / 100, v: nums.v / 100 };
      else next = hslToHsv({ h: nums.h, s: nums.s / 100, l: nums.l / 100 });
    }
    next.a = a;
    this._live.textContent = '';
    this._setHsva(next, { commit: true });
    this._paintFields(true);
  }

  // =====================================================
  // PRESETS / GẦN ĐÂY
  // =====================================================

  _recent() {
    if (!this.recentKey) return this._localRecent;
    if (!RECENTS.has(this.recentKey)) RECENTS.set(this.recentKey, []);
    return RECENTS.get(this.recentKey);
  }

  _pushRecent(value) {
    const limit = Math.max(0, this.recentLimit ?? 0);
    if (!limit || !value) return;
    const list = this._recent();
    const c = parseColor(value);
    const i = list.findIndex((v) => sameColor(parseColor(v), c));
    if (i >= 0) list.splice(i, 1);
    list.unshift(value);
    list.length = Math.min(list.length, limit);
    this._renderPresets(true);
  }

  /** Chuẩn hóa presets → [{ label, colors: [{ color, label }] }] */
  _groups() {
    const raw = Array.isArray(this.presets) ? this.presets : [];
    const norm = (c) => (c && typeof c === 'object' ? { color: String(c.color ?? c.value ?? ''), label: c.label } : { color: String(c) });
    const groups = raw.some((g) => g && typeof g === 'object' && Array.isArray(g.colors))
      ? raw.filter((g) => g && Array.isArray(g.colors)).map((g) => ({ label: g.label || '', colors: g.colors.map(norm) }))
      : raw.length ? [{ label: '', colors: raw.map(norm) }] : [];
    const recent = this._recent().slice(0, Math.max(0, this.recentLimit ?? 0));
    if (recent.length && this.recentLimit > 0) groups.push({ label: tx('colorPicker.recent'), colors: recent.map((c) => ({ color: c })), recent: true });
    return groups;
  }

  /** Một nhóm màu → { node, swatches } */
  _makeGroup(g, key) {
    const id = `preset-${key}`;
    const label = createElement('div', { className: 'cp__preset-label', part: 'preset-label', id }, g.label);
    label.hidden = !g.label;
    const list = createElement('div', { className: 'cp__swatches', role: 'group' });
    if (g.label) list.setAttribute('aria-labelledby', id);
    else list.setAttribute('aria-label', tx('colorPicker.presets'));
    const swatches = [];
    for (const c of g.colors) {
      const parsed = parseColor(c.color);
      if (!parsed) continue;
      const sw = createElement('hui-color-swatch', {
        color: c.color, selectable: '', size: 'sm', part: 'preset-swatch', className: 'cp__swatch',
      });
      if (c.label) sw.setAttribute('label', c.label);
      sw._cpColor = parsed;
      swatches.push(sw);
      list.append(sw);
    }
    const node = createElement('div', { className: `cp__preset-group${g.recent ? ' cp__preset-group--recent' : ''}` }, label, list);
    return { node, swatches };
  }

  /**
   * Vẽ bảng màu. onlyRecent: chỉ vẽ lại nhóm "gần đây" (sau mỗi lần chốt màu) — không đụng nhóm khác
   * để ô đang focus không bị gỡ khỏi DOM.
   */
  _renderPresets(onlyRecent = false) {
    if (!this._presets) return;
    const groups = this._groups();
    if (!onlyRecent || !this._static) {
      this._static = groups.filter((g) => !g.recent).map((g, i) => this._makeGroup(g, i));
      this._recentGroup = null;
      this._presets.replaceChildren(...this._static.map((x) => x.node));
    }
    const rg = groups.find((g) => g.recent);
    const old = this._recentGroup;
    const hadFocus = Boolean(old && old.node.contains(this.shadowRoot.activeElement));
    this._recentGroup = rg ? this._makeGroup(rg, 'recent') : null;
    if (old && this._recentGroup) old.node.replaceWith(this._recentGroup.node);
    else if (old) old.node.remove();
    else if (this._recentGroup) this._presets.append(this._recentGroup.node);
    // Đang focus ô màu gần đây → focus ô đầu (chính màu vừa chọn, đã lên đầu danh sách)
    if (hadFocus) this._recentGroup?.swatches[0]?.focus();
    this._swatches = [...this._static.flatMap((x) => x.swatches), ...(this._recentGroup?.swatches || [])];
    this._presets.hidden = !this._swatches.length;
    this._syncDisabled();
    this._paintSwatches();
  }

  _pickPreset(sw) {
    const c = sw._cpColor;
    if (!c || !this._canEdit) {
      this._paintSwatches();
      return;
    }
    const hsv = rgbToHsv(c);
    if (hsv.s === 0 || hsv.v === 0) hsv.h = this._hsva.h;
    this._setHsva({ ...hsv, a: c.a }, { commit: true });
    this._paintFields(true);
    this._paintSwatches();
  }

  _paintSwatches() {
    const cur = this.color;
    for (const sw of this._swatches) sw.selected = sameColor(sw._cpColor && { ...sw._cpColor, a: this.alpha ? sw._cpColor.a : 1 }, cur);
  }

  // =====================================================
  // EYEDROPPER / XÓA
  // =====================================================

  async _pickFromScreen() {
    if (!supportsEyeDropper() || !this._canEdit) return;
    try {
      const { sRGBHex } = await new window.EyeDropper().open();
      const c = parseColor(sRGBHex);
      if (!c) return;
      this._setHsva({ ...rgbToHsv(c), a: this._hsva.a }, { commit: true });
      this._paintFields(true);
    } catch { /* người dùng bấm Esc */ }
  }

  _clear() {
    if (!this._canEdit) return;
    const had = !this._empty;
    this._empty = true;
    this._own = '';
    this.value = '';
    this._paint();
    this.emit('clear');
    if (had) {
      this.emit('input', { value: '', color: null });
      this.markInteracted();
      this.emit('change', { value: '', color: null });
    }
  }

  // =====================================================
  // POPUP
  // =====================================================

  _openPopup() {
    if (this._visible) return;
    this._visible = true;
    ++this._token;
    this._renderPresets();
    this._popup.getAnimations?.().forEach((a) => a.cancel());
    showFloating(this._popup, '--hui-z-popover');
    this._stopAuto ||= autoUpdate(this._trigger, this._popup, () => this._position());
    if (!this.noAnimation && !animationsDisabled()) animateIn(this._popup, this._side === 'top' ? 'slide-up' : 'slide-down');
    this._overlay = openOverlay({
      element: this._popup,
      ignore: [this._trigger],
      trapFocus: true,
      restoreFocus: true,
      onEscape: () => { this.open = false; },
      onClickOutside: () => { this.open = false; },
    });
    this._trigger.setAttribute('aria-expanded', 'true');
    this.setState('open', true);
    this.emit('hui-open');
  }

  _closePopup(immediate = false) {
    if (!this._visible) return;
    this._visible = false;
    this._overlay?.close();
    this._overlay = null;
    this._trigger.setAttribute('aria-expanded', 'false');
    this.setState('open', false);
    if (this._drag) this._endDrag();
    const token = ++this._token;
    const done = () => {
      if (token !== this._token) return;
      this._stopAuto?.();
      this._stopAuto = null;
      hideFloating(this._popup);
      this._popup.getAnimations?.().forEach((a) => a.cancel());
    };
    if (immediate || this.noAnimation || animationsDisabled()) done();
    else animateOut(this._popup, 'fade').then(done);
    this.markInteracted();
    this.emit('hui-close');
  }

  _position() {
    const pos = computePosition(this._trigger, this._popup, { placement: this.placement || 'bottom-start', offset: 6 });
    this._popup.style.left = `${pos.x}px`;
    this._popup.style.top = `${pos.y}px`;
    this._side = pos.side;
  }

  // =====================================================
  // VẼ
  // =====================================================

  _paint() {
    if (!this._base) return;
    const { h, s, v, a } = this._hsva;
    const rgb = hsvToRgb({ h, s, v });
    const solid = `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)})`;
    const st = this._base.style;
    st.setProperty('--_cp-hue', String(h));
    st.setProperty('--_cp-x', `${s * 100}%`);
    st.setProperty('--_cp-y', `${(1 - v) * 100}%`);
    st.setProperty('--_cp-hue-x', `${(h / 360) * 100}%`);
    st.setProperty('--_cp-alpha-x', `${a * 100}%`);
    st.setProperty('--_cp-solid', solid);
    st.setProperty('--_cp-color', this._empty ? 'transparent' : `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)} / ${a})`);

    const sp = Math.round(s * 100);
    const vp = Math.round(v * 100);
    this._area.setAttribute('aria-valuenow', String(sp));
    this._area.setAttribute('aria-valuetext', tx('colorPicker.areaText', { s: sp, v: vp }));
    this._hue.setAttribute('aria-valuenow', String(Math.round(h)));
    this._hue.setAttribute('aria-valuetext', `${Math.round(h)}°`);
    this._alphaTrack.setAttribute('aria-valuenow', String(Math.round(a * 100)));
    this._alphaTrack.setAttribute('aria-valuetext', `${Math.round(a * 100)}%`);

    // Nút kích hoạt
    const label = this.label || tx('colorPicker.label');
    const shown = this._empty ? '' : String(this.value ?? '');
    this._text.textContent = shown || this.placeholder || tx('colorPicker.empty');
    this._text.hidden = !this.showText;
    this._trigger.setAttribute('aria-label', tx('colorPicker.trigger', { label, color: shown || tx('colorPicker.empty') }));
    this._panel.setAttribute('aria-label', label);
    this._base.classList.toggle('cp--empty', this._empty);
    this._paintFields(false);
    this._paintSwatches();
  }

  /** Ghi số vào ô nhập (bỏ qua ô đang gõ, trừ khi force) */
  _paintFields(force) {
    if (!this._fields.length) return;
    const active = this.shadowRoot.activeElement;
    const { h, s, v, a } = this._hsva;
    const rgb = hsvToRgb({ h, s, v });
    const hsl = hsvToHsl({ h, s, v });
    const vals = {
      hex: this._empty ? '' : rgbToHex(rgb, false).toUpperCase(),
      r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b),
      h: Math.round(h) % 360,
      s: Math.round((this._mode === 'hsl' ? hsl.s : s) * 100),
      v: Math.round(v * 100), l: Math.round(hsl.l * 100),
      alpha: Math.round(a * 100),
    };
    for (const f of [...this._fields, this._alphaInput]) {
      if (!force && f.input === active) continue;
      f.input.value = this._empty && f.key !== 'hex' ? '' : String(vals[f.key]);
      if (force) f.input.removeAttribute('aria-invalid');
    }
  }

  _syncDisabled() {
    if (!this._base) return;
    const locked = !this._canEdit;
    this._trigger.disabled = this.isDisabled;
    for (const el of [this._area, this._hue, this._alphaTrack]) {
      el.setAttribute('tabindex', this.isDisabled ? '-1' : '0');
      el.toggleAttribute('aria-disabled', this.isDisabled);
      el.toggleAttribute('aria-readonly', this.readonly);
    }
    for (const f of [...this._fields, this._alphaInput]) {
      f.input.disabled = this.isDisabled;
      f.input.readOnly = this.readonly;
    }
    this._modeSelect.disabled = this.isDisabled;
    this._eyedropper.disabled = locked;
    this._clearBtn.disabled = locked;
    for (const sw of this._swatches) sw.disabled = locked;
  }

  _syncClasses() {
    this._base.className = [
      'cp', `cp--${this.effectiveSize}`, this.inline ? 'cp--inline' : '', this._empty ? 'cp--empty' : '',
      this.isDisabled ? 'cp--disabled' : '', this.status ? `cp--${this.status}` : '',
    ].filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
  }

  // =====================================================
  // FORM / API
  // =====================================================

  validationAnchor() {
    return this.inline ? this._area : this._trigger;
  }

  formResetCallback() {
    this._own = null;
    super.formResetCallback();
  }

  /** Mở bảng chọn */
  show() {
    this.open = true;
  }

  /** Đóng bảng chọn */
  hide() {
    this.open = false;
  }

  focus(options) {
    const target = this.inline ? this._area : this._trigger;
    if (target) target.focus(options);
    else super.focus(options);
  }

  blur() {
    this.shadowRoot.activeElement?.blur();
  }
}

defineElement('hui-color-picker', HuiColorPicker);

export default HuiColorPicker;
