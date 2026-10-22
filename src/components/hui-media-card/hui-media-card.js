/**
 * HUI Media Card — Thẻ ảnh / video + tiêu đề + mô tả + meta (tác giả, thời gian) + actions (Molecule).
 * Ảnh dùng <hui-image> (tải lười, skeleton), video dùng <hui-video> (facade: bấm mới tải trình phát),
 * thời gian dùng <hui-time> (tương đối "3 giờ trước", tự cập nhật). Dựng trên <hui-card>.
 */

import styles from './hui-media-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import {
  TitleAttrMixin, createForwardSlot, forwardToCard, hasContent, headingLevel, CARD_EXPORTPARTS,
} from '../hui-feature-card/landing-shared.js';
import { ensureElement } from '../hui-data-view/lazy-elements.js';
import '../hui-card/hui-card.js';
import '../hui-image/hui-image.js';
// Tải động khi dùng tới: hui-video (có video), hui-avatar (có tác giả), hui-time (có datetime)

const RATIO = /^\d+(\.\d+)?(\s*\/\s*\d+(\.\d+)?)?$/;
const assigned = (slot) => slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());

/**
 * Thẻ media. Có `video` → <hui-video> (ảnh `image` làm poster); chỉ có `image` → <hui-image>; slot `media` thay toàn bộ.
 *
 * @slot - Nội dung thêm dưới mô tả
 * @slot media - Media tùy biến (thay image / video)
 * @slot actions - Thanh hành động (chuyển xuống hui-card)
 * @slot footer - Chân thẻ (chuyển xuống hui-card)
 * @slot overlay - Lớp phủ trên media (dùng với effect="reveal")
 * @csspart media - Khung media
 * @csspart image - <hui-image> (kèm image-base, image-img)
 * @csspart video - <hui-video> (kèm video-base, video-play)
 * @csspart badge - Nhãn góc media (thời lượng video, "Mới"…)
 * @csspart content - Khối nội dung
 * @csspart heading - Tiêu đề (role heading)
 * @csspart title-link - Link tiêu đề (khi có href)
 * @csspart description - Mô tả
 * @csspart meta - Hàng tác giả · thời gian
 * @csspart avatar - <hui-avatar> tác giả
 * @csspart author - Tên tác giả
 * @csspart time - <hui-time>
 * @csspart card - Khung <hui-card> (và cover, main, header, body, skeleton, actions, footer, overlay, card-link, card-check, card-glow)
 * @cssprop --hui-media-card-title-color - Màu tiêu đề
 * @cssprop --hui-media-card-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-media-card-title-lines - Số dòng tối đa của tiêu đề (mặc định 2)
 * @cssprop --hui-media-card-description-color - Màu mô tả
 * @cssprop --hui-media-card-meta-color - Màu hàng meta
 * @cssprop --hui-media-card-badge-bg - Nền nhãn góc
 * @cssprop --hui-media-card-badge-color - Màu chữ nhãn góc
 * @cssprop --hui-media-card-media-min-height - Chiều cao tối thiểu media ở layout horizontal (mặc định 160px)
 */
class HuiMediaCard extends TitleAttrMixin(HuiElement) {
  static properties = {
    /** URL ảnh (với video: ảnh bìa) */
    image: { type: String },
    /** Mô tả ảnh (mặc định rỗng — ảnh trang trí, tiêu đề đã mô tả nội dung) */
    imageAlt: { type: String },
    /** Video: YouTube / Vimeo (URL hoặc ID) hoặc file mp4 — hiện dạng facade, bấm mới tải */
    video: { type: String },
    /** Tỉ lệ media rộng/cao, vd "16/9", "4/3", "1/1" */
    ratio: { type: String, default: '16/9' },
    /** true | false — false: tải ảnh ngay (eager). Mặc định tải lười */
    lazy: { type: String, default: 'true' },
    /** Nhãn góc trên media (vd thời lượng "12:30", "Mới") */
    badge: { type: String },
    /** Tiêu đề. Attribute bị gỡ khỏi host để không hiện tooltip native */
    title: { type: String, reflect: false },
    /** Cấp heading của tiêu đề (aria-level) */
    headingLevel: { type: Number, default: 3 },
    /** Mô tả */
    description: { type: String },
    /** Số dòng tối đa của mô tả */
    descriptionLines: { type: Number, default: 3 },
    /** Tên tác giả */
    author: { type: String },
    /** URL avatar tác giả (không có → chữ cái viết tắt) */
    authorAvatar: { type: String },
    /** Thời điểm đăng (ISO / timestamp ms) — hiển thị bằng <hui-time> */
    datetime: { type: String },
    /** relative | date | date:short | date:long | datetime | time — định dạng của hui-time */
    timeFormat: { type: String, default: 'relative' },
    /** Link chi tiết — tiêu đề thành link, cả thẻ bấm được */
    href: { type: String },
    /** target của link */
    target: { type: String },
    /** Hiệu ứng của hui-card: lift | tilt | glow | zoom-media | reveal | border-gradient */
    effect: { type: String, default: 'lift zoom-media' },
    /** elevated | outlined | filled | ghost — biến thể hui-card */
    variant: { type: String, default: 'elevated' },
    /** vertical | horizontal — horizontal: media bên trái */
    orientation: { type: String, default: 'vertical' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Skeleton thay cho nội dung */
    loading: { type: Boolean },
    /** Tắt chuyển động */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._image = createElement('hui-image', { className: 'mc__image', part: 'image', exportparts: 'base: image-base, img: image-img' });
    this._video = createElement('hui-video', { className: 'mc__video', part: 'video', exportparts: 'base: video-base, play: video-play' });
    this._badge = createElement('span', { className: 'mc__badge', part: 'badge' });
    this._mediaSlot = createElement('slot', { name: 'media' }, this._image, this._video);
    this._mediaSlot.addEventListener('slotchange', () => this._syncMedia());
    this._media = createElement('div', { slot: 'cover', className: 'mc__media', part: 'media' }, this._mediaSlot, this._badge);

    this._link = createElement('a', { className: 'mc__title-link', part: 'title-link' });
    this._heading = createElement('div', { className: 'mc__heading', part: 'heading', role: 'heading' }, this._link);
    this._desc = createElement('p', { className: 'mc__desc', part: 'description' });
    this._extraSlot = createElement('slot');
    this._extra = createElement('div', { className: 'mc__extra' }, this._extraSlot);
    this._extraSlot.addEventListener('slotchange', () => { this._extra.hidden = !hasContent(this._extraSlot); });

    this._avatar = createElement('hui-avatar', { className: 'mc__avatar', part: 'avatar', size: 'sm', 'aria-hidden': 'true' });
    this._author = createElement('span', { className: 'mc__author', part: 'author' });
    this._time = createElement('hui-time', { className: 'mc__time', part: 'time' });
    this._meta = createElement('div', { className: 'mc__meta', part: 'meta' }, this._avatar,
      createElement('span', { className: 'mc__meta-text' }, this._author, this._time));

    const content = createElement('div', { className: 'mc__content', part: 'content' },
      this._heading, this._desc, this._extra, this._meta);

    this._card = createElement('hui-card', { className: 'mc__card', 'cover-height': 'auto', exportparts: CARD_EXPORTPARTS },
      this._media, content, createForwardSlot('actions'), createForwardSlot('footer'), createForwardSlot('overlay'));
    return this._card;
  }

  firstUpdated() {
    this._extra.hidden = !hasContent(this._extraSlot);
    this._syncMedia();
  }

  updated(changed) {
    forwardToCard(this, this._card, changed);

    if (['image', 'imageAlt', 'video', 'ratio', 'lazy', 'title', 'orientation', 'noAnimation'].some((k) => changed.has(k))) {
      this._syncMediaAttrs();
    }

    if (changed.has('effect') || changed.has('noAnimation')) {
      const zoom = !this.noAnimation && (this.effect || '').split(/\s+/).includes('zoom-media');
      this._media.classList.toggle('mc__media--zoom', zoom);
    }

    if (changed.has('badge')) {
      this._badge.textContent = this.badge || '';
      this._badge.hidden = !this.badge;
    }

    if (changed.has('title') || changed.has('href') || changed.has('target')) {
      this._link.textContent = this.title || '';
      if (this.href) {
        this._link.href = this.href;
        if (this.target) this._link.target = this.target;
        else this._link.removeAttribute('target');
        if (this.target === '_blank') this._link.rel = 'noopener noreferrer';
        else this._link.removeAttribute('rel');
      } else {
        for (const a of ['href', 'target', 'rel']) this._link.removeAttribute(a);
      }
      this._heading.hidden = !this.title;
    }
    if (changed.has('headingLevel')) this._heading.setAttribute('aria-level', String(headingLevel(this.headingLevel)));

    if (changed.has('description') || changed.has('descriptionLines')) {
      this._desc.textContent = this.description || '';
      this._desc.hidden = !this.description;
      const lines = Number.isFinite(this.descriptionLines) && this.descriptionLines > 0 ? Math.round(this.descriptionLines) : 3;
      this._desc.style.setProperty('--_mc-lines', String(lines));
    }

    if (['author', 'authorAvatar', 'datetime', 'timeFormat'].some((k) => changed.has(k))) {
      this._author.textContent = this.author || '';
      this._author.hidden = !this.author;
      if (this.authorAvatar) this._avatar.setAttribute('src', this.authorAvatar);
      else this._avatar.removeAttribute('src');
      if (this.author) this._avatar.setAttribute('name', this.author);
      else this._avatar.removeAttribute('name');
      this._avatar.hidden = !this.author && !this.authorAvatar;
      if (!this._avatar.hidden) ensureElement('hui-avatar');
      if (this.datetime) {
        this._time.setAttribute('datetime', this.datetime);
        this._time.setAttribute('format', this.timeFormat || 'relative');
      } else {
        this._time.removeAttribute('datetime');
      }
      this._time.hidden = !this.datetime;
      if (this.datetime) ensureElement('hui-time');
      this._meta.hidden = !this.author && !this.authorAvatar && !this.datetime;
    }
  }

  /** Chọn hui-video (có video) hoặc hui-image; tỉ lệ bỏ ở layout ngang để media cao bằng thẻ */
  _syncMediaAttrs() {
    const ratio = RATIO.test(String(this.ratio || '').trim()) ? String(this.ratio).trim() : '16/9';
    const horizontal = this.orientation === 'horizontal';
    const img = this._image;
    const vid = this._video;

    img.hidden = Boolean(this.video) || !this.image;
    if (this.image && !this.video) img.setAttribute('src', this.image);
    else img.removeAttribute('src');
    img.setAttribute('alt', this.imageAlt || '');
    img.setAttribute('lazy', this.lazy === 'false' ? 'false' : 'true');
    if (horizontal) img.removeAttribute('ratio');
    else img.setAttribute('ratio', ratio);
    img.toggleAttribute('no-animation', this.noAnimation);

    vid.hidden = !this.video;
    if (this.video) {
      ensureElement('hui-video', () => import('../hui-video/index.js'));
      vid.setAttribute('src', this.video);
      vid.setAttribute('ratio', ratio);
      if (this.image) vid.setAttribute('poster', this.image);
      else vid.removeAttribute('poster');
      if (this.title) vid.setAttribute('title', this.title);
      else vid.removeAttribute('title');
    } else {
      for (const a of ['src', 'poster', 'title']) vid.removeAttribute(a);
    }
    this._syncMedia();
  }

  _syncMedia() {
    if (!this._media) return;
    const custom = assigned(this._mediaSlot);
    const none = !custom && !this.image && !this.video;
    this._media.hidden = none;
    // Không có media → ẩn luôn vùng cover của hui-card (phần tử slot="cover" vẫn nằm đó để nhận slot media sau này)
    this._card.classList.toggle('mc__card--no-media', none);
    this._media.classList.toggle('mc__media--custom', custom);
  }
}

defineElement('hui-media-card', HuiMediaCard);

export { HuiMediaCard };
export default HuiMediaCard;
