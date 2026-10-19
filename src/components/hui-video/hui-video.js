/**
 * HUI Video — nhúng video dạng "facade" (Molecule)
 *   <hui-video src="https://youtu.be/VIDEO_ID" title="Giới thiệu sản phẩm"></hui-video>
 *   <hui-video src="https://vimeo.com/123456" poster="cover.jpg"></hui-video>
 *   <hui-video src="intro.mp4" autoplay-on-view></hui-video>
 *   <hui-video src="VIDEO_ID" mode="popup"></hui-video>
 * Chỉ hiện ảnh bìa + nút play; bấm mới tạo iframe (youtube-nocookie.com / player.vimeo.com) hoặc <video>
 * → trang không phải tải trình phát nặng khi chưa cần.
 * Ảnh bìa YouTube tự lấy từ i.ytimg.com KHI không có `poster` (tài nguyên mạng bên ngoài, chỉ lúc chạy thật).
 */

import styles from './hui-video.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { openOverlay } from '../../utils/overlay.js';
import { animateIn, animateOut, prefersReducedMotion } from '../../utils/motion.js';
import { inView } from '../../utils/scroll.js';
import { tx, ensureMediaIcons, toAspectRatio } from '../hui-image/media-shared.js';
import '../hui-icon/hui-icon.js';

ensureMediaIcons();

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Nhận diện nguồn video.
 * @param {string} src
 * @param {string} [provider] - youtube | vimeo | file | auto
 * @returns {{ type: 'youtube'|'vimeo'|'file'|null, id: string, url: string }}
 */
export function parseVideoSource(src, provider = 'auto') {
  const s = String(src || '').trim();
  if (!s) return { type: null, id: '', url: '' };
  if (provider === 'youtube') return { type: 'youtube', id: youtubeId(s) || s, url: s };
  if (provider === 'vimeo') return { type: 'vimeo', id: vimeoId(s) || s, url: s };
  if (provider === 'file') return { type: 'file', id: '', url: s };
  const yt = youtubeId(s);
  if (yt) return { type: 'youtube', id: yt, url: s };
  const vm = vimeoId(s);
  if (vm) return { type: 'vimeo', id: vm, url: s };
  return { type: 'file', id: '', url: s };
}

function youtubeId(s) {
  if (YT_ID.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return YT_ID.test(u.pathname.slice(1)) ? u.pathname.slice(1) : null;
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
      const v = u.searchParams.get('v');
      if (v && YT_ID.test(v)) return v;
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
      return m ? m[1] : null;
    }
  } catch { /* không phải URL */ }
  return null;
}

function vimeoId(s) {
  if (/^\d{6,12}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (!/(^|\.)vimeo\.com$/.test(u.hostname)) return null;
    const m = u.pathname.match(/(?:^|\/)(?:video\/)?(\d{6,12})(?:\/|$)/);
    return m ? m[1] : null;
  } catch { /* không phải URL */ }
  return null;
}

/**
 * @fires hui-play - Người dùng bấm play (iframe / video vừa được tạo). detail: { type, id, src }
 * @fires hui-open - (mode="popup") hộp video mở
 * @fires hui-close - (mode="popup") hộp video đóng
 * @slot - Nội dung phủ trên ảnh bìa (tiêu đề, thời lượng…)
 * @slot poster - Ảnh bìa tùy biến (thay attribute poster)
 * @slot play-icon - Icon nút play tùy biến
 * @csspart base - Khung giữ tỉ lệ
 * @csspart poster - Ảnh bìa
 * @csspart play - Nút play (phủ toàn khung)
 * @csspart play-icon - Hình tròn chứa icon play
 * @csspart player - iframe / <video> sau khi bấm
 * @csspart dialog - (popup) thẻ <dialog>
 * @csspart mask - (popup) nền tối
 * @csspart panel - (popup) khung video trong hộp
 * @csspart close - (popup) nút đóng
 * @cssprop --hui-video-radius - Bo góc (mặc định --hui-radius-lg)
 * @cssprop --hui-video-bg - Nền khi chưa có ảnh bìa (mặc định --hui-bg-spotlight)
 * @cssprop --hui-video-play-size - Đường kính nút play (mặc định 68px)
 * @cssprop --hui-video-play-bg - Nền nút play (mặc định --hui-bg-spotlight)
 * @cssprop --hui-video-play-hover-bg - Nền nút play khi hover (mặc định --hui-primary)
 * @cssprop --hui-video-play-color - Màu icon play (mặc định --hui-text-light-solid)
 * @cssprop --hui-video-overlay - Lớp phủ tối trên ảnh bìa
 * @cssprop --hui-video-popup-width - Bề rộng khung video trong popup (mặc định min(960px, 92vw))
 * @cssprop --hui-video-mask-bg - Nền popup
 * @cssprop --hui-video-focus-color - Viền focus nút play
 */
class HuiVideo extends HuiElement {
  static properties = {
    /** YouTube (URL hoặc ID 11 ký tự), Vimeo (URL hoặc ID số) hoặc file video (mp4/webm…) */
    src: { type: String },
    /** auto | youtube | vimeo | file — ép loại nguồn khi tự nhận diện sai */
    provider: { type: String, default: 'auto' },
    /** Ảnh bìa. YouTube không có poster → tự dùng ảnh bìa của YouTube (i.ytimg.com) */
    poster: { type: String },
    /** Tiêu đề video — nhãn nút play và title của iframe (attribute `title`) */
    videoTitle: { type: String, attribute: 'title' },
    /** Tỉ lệ khung (mặc định 16/9) */
    ratio: { type: String, default: '16/9' },
    /** inline | popup — phát ngay tại chỗ hoặc mở trong hộp thoại */
    mode: { type: String, default: 'inline' },
    /** (file) tự phát khi cuộn tới (tắt tiếng, phát lặp), dừng khi ra khỏi màn hình; giảm chuyển động → không tự phát */
    autoplayOnView: { type: Boolean },
    /** (file) tắt tiếng */
    muted: { type: Boolean },
    /** (file) phát lặp */
    loop: { type: Boolean },
    /** Giây bắt đầu phát (YouTube / Vimeo / file) */
    start: { type: Number },
    /** Tắt hiệu ứng popup */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._active = false;
    this._player = null;
    this._handle = null;
    this._stopView = null;
  }

  render() {
    this._posterImg = createElement('img', { className: 'poster', part: 'poster', alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' });
    this._posterImg.addEventListener('error', () => { this._posterImg.hidden = true; });
    this._playLabel = createElement('span', { className: 'sr-only' });
    this._playBtn = createElement('button', { type: 'button', className: 'play', part: 'play' },
      createElement('span', { className: 'play__icon', part: 'play-icon' },
        createElement('slot', { name: 'play-icon' }, createElement('hui-icon', { name: 'play' }))),
      this._playLabel);
    this._playBtn.addEventListener('click', () => this.play());

    this._facade = createElement('div', { className: 'facade' },
      createElement('slot', { name: 'poster' }, this._posterImg),
      createElement('div', { className: 'shade' }),
      createElement('div', { className: 'overlay' }, createElement('slot')),
      this._playBtn);
    this._stage = createElement('div', { className: 'stage', hidden: true });
    this._base = createElement('div', { className: 'video', part: 'base' }, this._facade, this._stage);

    // Popup: <dialog> riêng (top-layer) — không phụ thuộc hui-modal
    this._closeBtn = createElement('button', { type: 'button', className: 'close', part: 'close', autofocus: '' }, createElement('hui-icon', { name: 'close' }));
    this._closeBtn.addEventListener('click', () => this.closePopup());
    this._popupStage = createElement('div', { className: 'popup__stage' });
    this._panel = createElement('div', { className: 'popup__panel', part: 'panel' }, this._closeBtn, this._popupStage);
    this._mask = createElement('div', { className: 'popup__mask', part: 'mask' });
    this._wrap = createElement('div', { className: 'popup__wrap' }, this._panel);
    this._dialog = createElement('dialog', { className: 'popup', part: 'dialog' }, this._mask, this._wrap);
    this._dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      if (this._handle?.isTop()) this.closePopup();
    });
    this._dialog.addEventListener('close', () => { if (this._handle) this.closePopup(); });
    this._wrap.addEventListener('click', (e) => { if (e.target === this._wrap) this.closePopup(); });

    return [this._base, this._dialog];
  }

  connectedCallback() {
    super.connectedCallback();
    this.listen(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this._dialog.open) e.preventDefault();
    }, { capture: true });
    this._syncAutoView();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopView?.();
    this._stopView = null;
    if (this._handle) {
      this._handle.close();
      this._handle = null;
      this._popupStage.replaceChildren();
    }
  }

  updated(changed) {
    if (changed.has('ratio')) {
      const r = toAspectRatio(this.ratio) || '16 / 9';
      this._base.style.setProperty('--_video-ratio', r);
      this._panel.style.setProperty('--_video-ratio', r);
    }
    if (['src', 'provider'].some((k) => changed.has(k))) {
      this._source = parseVideoSource(this.src, this.provider);
      if (this._active) this.stop();
    }
    if (['src', 'provider', 'poster'].some((k) => changed.has(k))) this._syncPoster();
    if (['videoTitle', 'locale'].some((k) => changed.has(k))) {
      const title = this.videoTitle;
      this._playLabel.textContent = title ? tx('video.play', { title }) : tx('video.playDefault');
      this._closeBtn.setAttribute('aria-label', tx('video.close'));
      this._dialog.setAttribute('aria-label', title || tx('video.frameTitle'));
      if (this._player?.localName === 'iframe') this._player.title = title || tx('video.frameTitle');
    }
    if (['autoplayOnView', 'src', 'provider', 'mode'].some((k) => changed.has(k))) this._syncAutoView();
    if (changed.has('muted') && this._player?.localName === 'video') this._player.muted = this.muted || this.autoplayOnView;
    if (changed.has('loop') && this._player?.localName === 'video') this._player.loop = this.loop || this.autoplayOnView;
  }

  // =====================================================
  // API
  // =====================================================

  /** Nguồn đã nhận diện { type: youtube | vimeo | file, id, url } (chỉ đọc) */
  get source() {
    return this._source || parseVideoSource(this.src, this.provider);
  }

  /** URL nhúng (iframe) cho YouTube / Vimeo; file → chính src (chỉ đọc) */
  get embedUrl() {
    const { type, id, url } = this.source;
    const start = this.start > 0 ? Math.floor(this.start) : 0;
    if (type === 'youtube') {
      const q = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' });
      if (start) q.set('start', String(start));
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${q}`;
    }
    if (type === 'vimeo') {
      const q = new URLSearchParams({ autoplay: '1', dnt: '1' });
      return `https://player.vimeo.com/video/${encodeURIComponent(id)}?${q}${start ? `#t=${start}s` : ''}`;
    }
    return url;
  }

  /** Thẻ iframe / video đang phát (null khi đang là facade) — chỉ đọc */
  get player() {
    return this._player;
  }

  /** Tạo trình phát (inline) hoặc mở popup */
  play() {
    if (!this.source.type) return;
    if (this.mode === 'popup') {
      this.openPopup();
      return;
    }
    if (this._active) {
      if (this._player?.localName === 'video') this._player.play?.().catch(() => {});
      return;
    }
    this._active = true;
    const player = this._createPlayer(true);
    this._stage.replaceChildren(player);
    this._stage.hidden = false;
    this._facade.hidden = true;
    this.setState('playing', true);
    this.emit('hui-play', { type: this.source.type, id: this.source.id, src: this.embedUrl });
    // Giữ focus cho người dùng bàn phím (nút play vừa biến mất)
    player.focus?.({ preventScroll: true });
  }

  /** Gỡ trình phát, quay lại ảnh bìa */
  stop() {
    this._active = false;
    this._player = null;
    this._stage.replaceChildren();
    this._stage.hidden = true;
    this._facade.hidden = false;
    this.setState('playing', false);
  }

  /** Mở popup phát video (mode="popup" hoặc gọi trực tiếp) */
  openPopup() {
    if (this._handle || !this.source.type || !this.isConnected) return;
    this._handle = openOverlay({
      element: this._panel,
      trapFocus: true,
      lockScroll: true,
      restoreFocus: true,
      onEscape: () => this.closePopup(),
      onClickOutside: () => this.closePopup(),
    });
    const player = this._createPlayer(true);
    this._popupStage.replaceChildren(player);
    const dlg = this._dialog;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    this.setState('open', true);
    if (!this.noAnimation) {
      animateIn(this._mask, 'fade');
      animateIn(this._panel, 'zoom');
    }
    this.emit('hui-open');
    this.emit('hui-play', { type: this.source.type, id: this.source.id, src: this.embedUrl });
  }

  async closePopup() {
    const handle = this._handle;
    if (!handle) return;
    this._handle = null;
    this.setState('open', false);
    this.emit('hui-close');
    const dlg = this._dialog;
    if (dlg.open && !this.noAnimation) {
      // Trang không vẽ frame (tab nền) thì animation đứng yên → tối đa 600ms vẫn đóng
      await Promise.race([
        Promise.all([animateOut(this._mask, 'fade'), animateOut(this._panel, 'zoom')]),
        new Promise((r) => setTimeout(r, 600)),
      ]);
    }
    // Gỡ iframe/video → dừng phát hẳn
    this._popupStage.replaceChildren();
    this._player = null;
    dlg.close();
    dlg.removeAttribute('open');
    for (const el of [this._mask, this._panel]) el.getAnimations?.().forEach((a) => a.cancel());
    handle.close();
  }

  // =====================================================
  // NỘI BỘ
  // =====================================================

  _createPlayer(autoplay) {
    const { type } = this.source;
    let el;
    if (type === 'file') {
      const auto = this.autoplayOnView;
      el = createElement('video', {
        className: 'player', part: 'player', src: this.start > 0 ? `${this.embedUrl}#t=${this.start}` : this.embedUrl, playsinline: true, preload: 'metadata',
      });
      el.controls = !auto;
      el.muted = this.muted || auto;
      el.loop = this.loop || auto;
      if (this.poster) el.poster = this.poster;
      if (autoplay) {
        el.autoplay = true;
        el.play?.().catch(() => {});
      }
    } else {
      el = createElement('iframe', {
        className: 'player',
        part: 'player',
        src: this.embedUrl,
        title: this.videoTitle || tx('video.frameTitle'),
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen',
        allowfullscreen: true,
        referrerpolicy: 'strict-origin-when-cross-origin',
      });
    }
    this._player = el;
    return el;
  }

  _syncPoster() {
    const { type, id } = this._source || {};
    const src = this.poster || (type === 'youtube' && id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : '');
    if (src) {
      this._posterImg.src = src;
      this._posterImg.hidden = false;
    } else {
      this._posterImg.removeAttribute('src');
      this._posterImg.hidden = true;
    }
  }

  /** autoplay-on-view (chỉ file, inline): tạo <video> tắt tiếng, phát khi vào màn hình, dừng khi ra */
  _syncAutoView() {
    this._stopView?.();
    this._stopView = null;
    if (!this._hasRendered || !this.isConnected) return;
    const ok = this.autoplayOnView && this.source.type === 'file' && this.mode !== 'popup' && !prefersReducedMotion();
    if (!ok) return;
    if (!this._active || this._player?.localName !== 'video') {
      this._active = true;
      const player = this._createPlayer(false);
      this._stage.replaceChildren(player);
      this._stage.hidden = false;
      this._facade.hidden = true;
    }
    this._stopView = inView(this, (entry) => {
      const v = this._player;
      if (!v || v.localName !== 'video') return;
      if (entry.isIntersecting) v.play?.().catch(() => {});
      else v.pause?.();
    }, { threshold: 0.5 });
  }
}

defineElement('hui-video', HuiVideo);

export default HuiVideo;
