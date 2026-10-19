/**
 * HUI Image — ảnh có khung tỉ lệ, tải lười, placeholder khi đang tải, ảnh dự phòng khi lỗi (Atom)
 *   <hui-image src="a.jpg" alt="Mô tả" ratio="16/9" fit="cover" rounded preview></hui-image>
 * `preview`: bấm (hoặc Enter/Space) mở hui-lightbox với chính ảnh này — trong hui-gallery thì mở cả nhóm.
 */

import styles from './hui-image.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { tx, ensureMediaIcons, toAspectRatio } from './media-shared.js';
import { lightbox } from '../hui-lightbox/lightbox-api.js';
import '../hui-icon/hui-icon.js';

ensureMediaIcons();

const FITS = ['cover', 'contain', 'fill', 'none', 'scale-down'];
const PLACEHOLDERS = ['blur', 'skeleton', 'none'];

/**
 * @fires load - Ảnh (hoặc ảnh fallback) tải xong. Không nổi bọt (giống <img>). detail: { src, naturalWidth, naturalHeight }
 * @fires error - Ảnh `src` lỗi (phát 1 lần, trước khi thử fallback). Không nổi bọt. detail: { src }
 * @fires hui-preview - (preview) sắp mở lightbox. Cancelable: preventDefault() để tự xử lý (hui-gallery dùng). detail: { item }
 * @slot - Nội dung phủ lên ảnh (badge, chú thích…)
 * @slot placeholder - Nội dung thay placeholder mặc định khi đang tải
 * @slot error - Nội dung thay icon lỗi mặc định
 * @csspart base - Khung ảnh (giữ tỉ lệ, bo góc; là nút bấm khi preview)
 * @csspart img - Thẻ <img>
 * @csspart placeholder - Lớp placeholder (skeleton / blur)
 * @csspart error - Lớp hiện khi lỗi (không có fallback hoặc fallback cũng lỗi)
 * @cssprop --hui-image-radius - Bo góc khi rounded (mặc định --hui-radius-lg)
 * @cssprop --hui-image-bg - Nền khung khi chưa có ảnh (mặc định --hui-fill-tertiary)
 * @cssprop --hui-image-placeholder-color - Màu skeleton (mặc định --hui-fill-secondary)
 * @cssprop --hui-image-placeholder-highlight - Vệt sáng skeleton (mặc định --hui-fill)
 * @cssprop --hui-image-placeholder-ratio - Tỉ lệ khung tạm khi chưa biết kích thước ảnh (mặc định 4 / 3)
 * @cssprop --hui-image-blur - Độ mờ của ảnh placeholder-src (mặc định 16px)
 * @cssprop --hui-image-duration - Thời gian hiện dần ảnh khi tải xong (mặc định --hui-motion-duration-slow)
 * @cssprop --hui-image-error-color - Màu icon lỗi (mặc định --hui-text-tertiary)
 * @cssprop --hui-image-focus-color - Viền focus khi preview
 */
class HuiImage extends HuiElement {
  static properties = {
    /** Đường dẫn ảnh */
    src: { type: String },
    /** Mô tả ảnh (bắt buộc cho a11y; ảnh trang trí để alt="") */
    alt: { type: String },
    /** Tỉ lệ khung: 16/9, 4/3, 1/1, 1.5… Bỏ trống = theo kích thước ảnh */
    ratio: { type: String },
    /** cover | contain | fill | none | scale-down — cách ảnh lấp khung (object-fit) */
    fit: { type: String, default: 'cover' },
    /** true | false — false: tải ngay (eager). Mặc định tải lười (loading="lazy", decoding="async") */
    lazy: { type: String, default: 'true' },
    /** blur | skeleton | none — placeholder khi đang tải (blur dùng placeholder-src nếu có) */
    placeholder: { type: String, default: 'skeleton' },
    /** Ảnh nhỏ/mờ (LQIP) hiện trong lúc tải khi placeholder="blur" */
    placeholderSrc: { type: String },
    /** Ảnh dự phòng khi src lỗi; không có (hoặc cũng lỗi) → icon ảnh hỏng */
    fallback: { type: String },
    /** Bo góc (--hui-image-radius) */
    rounded: { type: Boolean },
    /** Bấm để xem lớn trong hui-lightbox */
    preview: { type: Boolean },
    /** Ảnh độ phân giải cao dùng khi xem lớn (mặc định = src) */
    previewSrc: { type: String },
    /** Chú thích hiện trong lightbox */
    caption: { type: String },
    /** srcset của <img> (ảnh responsive) */
    srcset: { type: String },
    /** sizes của <img> */
    sizes: { type: String },
    /** Bề rộng gốc của ảnh (px) — giúp giữ chỗ, tránh nhảy layout khi không có ratio */
    width: { type: Number },
    /** Chiều cao gốc của ảnh (px) */
    height: { type: Number },
    /** Tắt hiệu ứng hiện dần / shimmer */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._status = 'idle'; // idle | loading | loaded | error
    this._usingFallback = false;
  }

  render() {
    this._img = createElement('img', { className: 'img', part: 'img', draggable: 'false' });
    this._img.addEventListener('load', () => this._onLoad());
    this._img.addEventListener('error', () => this._onError());

    this._lqip = createElement('img', { className: 'lqip', alt: '', 'aria-hidden': 'true', draggable: 'false' });
    this._placeholder = createElement('div', { className: 'placeholder', part: 'placeholder', 'aria-hidden': 'true' },
      createElement('slot', { name: 'placeholder' }, this._lqip));

    this._errorText = createElement('span', { className: 'sr-only' });
    this._error = createElement('div', { className: 'error', part: 'error', hidden: true },
      createElement('slot', { name: 'error' }, createElement('hui-icon', { name: 'image', className: 'error__icon' }), this._errorText));

    this._base = createElement('div', { className: 'image', part: 'base' },
      this._placeholder, this._img, this._error, createElement('div', { className: 'overlay' }, createElement('slot')));

    this._base.addEventListener('click', (e) => {
      if (!this.preview) return;
      // Click vào nút/link phủ trên ảnh → để phần tử đó xử lý
      if (e.composedPath().some((n) => n instanceof Element && n !== this._base && n.matches?.('a[href], button, hui-button, input, select, textarea'))) return;
      this.openPreview();
    });
    this._base.addEventListener('keydown', (e) => {
      if (!this.preview || e.composedPath()[0] !== this._base) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openPreview();
      }
    });
    return this._base;
  }

  updated(changed) {
    if (changed.has('fit')) {
      this._base.style.setProperty('--_image-fit', FITS.includes(this.fit) ? this.fit : 'cover');
    }
    if (changed.has('ratio') || changed.has('width') || changed.has('height')) {
      const ratio = toAspectRatio(this.ratio) || (this.width > 0 && this.height > 0 ? `${this.width} / ${this.height}` : null);
      if (ratio) this._base.style.setProperty('--_image-ratio', ratio);
      else this._base.style.removeProperty('--_image-ratio');
      this._base.classList.toggle('image--ratio', Boolean(ratio));
      if (this.width > 0) this._img.setAttribute('width', String(this.width)); else this._img.removeAttribute('width');
      if (this.height > 0) this._img.setAttribute('height', String(this.height)); else this._img.removeAttribute('height');
    }
    if (changed.has('rounded')) this._base.classList.toggle('image--rounded', this.rounded);
    if (changed.has('noAnimation')) this._base.classList.toggle('image--static', this.noAnimation);

    if (changed.has('placeholder') || changed.has('placeholderSrc')) {
      const mode = PLACEHOLDERS.includes(this.placeholder) ? this.placeholder : 'skeleton';
      for (const p of PLACEHOLDERS) this._base.classList.toggle(`image--ph-${p}`, p === mode);
      if (mode === 'blur' && this.placeholderSrc) this._lqip.src = this.placeholderSrc;
      else this._lqip.removeAttribute('src');
      this._lqip.hidden = !(mode === 'blur' && this.placeholderSrc);
    }

    if (changed.has('lazy')) {
      const lazy = String(this.lazy) !== 'false';
      this._img.loading = lazy ? 'lazy' : 'eager';
      this._img.decoding = lazy ? 'async' : 'auto';
    }

    if (changed.has('alt') || changed.has('locale')) {
      this._img.alt = this.alt ?? '';
      this._errorText.textContent = tx('image.error');
    }

    if (changed.has('srcset') || changed.has('sizes')) {
      if (this.srcset) this._img.srcset = this.srcset; else this._img.removeAttribute('srcset');
      if (this.sizes) this._img.sizes = this.sizes; else this._img.removeAttribute('sizes');
    }

    if (changed.has('src') || changed.has('srcset')) this._loadSource();
    else if (changed.has('fallback') && this._status === 'error' && !this._usingFallback && this.fallback) {
      this._usingFallback = true;
      this._setStatus('loading');
      this._img.src = this.fallback;
    }

    if (changed.has('preview') || changed.has('alt') || changed.has('locale')) this._syncPreview();
  }

  // =====================================================
  // API
  // =====================================================

  /** Trạng thái tải: idle | loading | loaded | error (chỉ đọc) */
  get status() {
    return this._status;
  }

  /** Thẻ <img> bên trong (chỉ đọc) — dùng làm điểm gốc cho hiệu ứng phóng của lightbox */
  get imageElement() {
    return this._img;
  }

  /** Mục dùng cho lightbox: { src, alt, caption } */
  get previewItem() {
    return {
      src: this.previewSrc || this.src || this.fallback || '',
      alt: this.alt || '',
      caption: this.caption || '',
    };
  }

  /** Mở lightbox với ảnh này (phát hui-preview trước — bị chặn thì không mở) */
  openPreview() {
    const item = this.previewItem;
    if (!item.src) return null;
    if (!this.emit('hui-preview', { item }, { cancelable: true })) return null;
    return lightbox.open([item], 0, { origin: this });
  }

  // =====================================================
  // TẢI ẢNH
  // =====================================================

  _loadSource() {
    this._usingFallback = false;
    const src = this.src || '';
    if (!src && !this.srcset) {
      this._img.removeAttribute('src');
      // Không có src: thử fallback, không thì giữ placeholder (chờ gán src)
      if (this.fallback) {
        this._usingFallback = true;
        this._setStatus('loading');
        this._img.src = this.fallback;
      } else this._setStatus('idle');
      return;
    }
    this._setStatus('loading');
    if (src) this._img.src = src;
    // Ảnh đã có trong cache → load có thể đã xong trước khi gắn listener
    if (this._img.complete && this._img.naturalWidth > 0) this._onLoad();
  }

  _onLoad() {
    if (this._status === 'loaded' && this._loadedSrc === this._img.currentSrc) return;
    this._loadedSrc = this._img.currentSrc;
    this._setStatus('loaded');
    this.emit('load', {
      src: this._img.currentSrc || this._img.src,
      naturalWidth: this._img.naturalWidth,
      naturalHeight: this._img.naturalHeight,
    }, { bubbles: false, composed: false });
  }

  _onError() {
    if (!this._img.getAttribute('src')) return;
    if (!this._usingFallback) {
      this.emit('error', { src: this.src }, { bubbles: false, composed: false });
      if (this.fallback && this.fallback !== this.src) {
        this._usingFallback = true;
        this._img.src = this.fallback;
        return;
      }
    }
    this._setStatus('error');
  }

  _setStatus(status) {
    this._status = status;
    const cl = this._base.classList;
    for (const s of ['idle', 'loading', 'loaded', 'error']) cl.toggle(`is-${s}`, s === status);
    // idle (chưa có src) → giữ placeholder chờ src; chỉ hiện icon lỗi khi tải lỗi thật
    this._error.hidden = status !== 'error';
    this._img.hidden = status === 'error' || status === 'idle';
    this.setState('loading', status === 'loading');
    this.setState('loaded', status === 'loaded');
    this.setState('error', status === 'error');
    this._syncPreview();
  }

  /** preview: khung ảnh (part base) thành nút focus được; ngược lại trả về như ảnh thường */
  _syncPreview() {
    const base = this._base;
    if (this.preview) {
      base.setAttribute('role', 'button');
      base.setAttribute('tabindex', '0');
      base.setAttribute('aria-label', this.alt ? `${this.alt} — ${tx('image.preview')}` : tx('image.preview'));
      this._img.setAttribute('aria-hidden', 'true');
    } else {
      ['role', 'tabindex', 'aria-label'].forEach((a) => base.removeAttribute(a));
      this._img.removeAttribute('aria-hidden');
    }
    base.classList.toggle('image--preview', this.preview);
  }

  /** Focus vào khung ảnh khi preview (host không tự nhận focus) */
  focus(options) {
    if (this.preview) this._base?.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-image', HuiImage);

export default HuiImage;
