/**
 * HUI Profile Card — Thẻ hồ sơ (Molecule): ảnh bìa, avatar đè lên bìa, tên (+ dấu xác minh), chức danh, giới thiệu,
 * chỉ số (followers… đếm chạy bằng <hui-number>), nút liên hệ (email / điện thoại), mạng xã hội. Dựng trên <hui-card>.
 */

import styles from './hui-profile-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import {
  createMsg, createForwardSlot, forwardToCard, hasContent, isNum, headingLevel, CARD_EXPORTPARTS,
} from '../hui-feature-card/landing-shared.js';
import '../hui-card/hui-card.js';
import '../hui-avatar/hui-avatar.js';
import '../hui-number/hui-number.js';
import '../hui-icon/hui-icon.js';

const msg = createMsg({
  'profileCard.email': { vi: 'Gửi email', en: 'Email' },
  'profileCard.phone': { vi: 'Gọi điện', en: 'Call' },
  'profileCard.verified': { vi: 'Đã xác minh', en: 'Verified' },
  'profileCard.stats': { vi: 'Chỉ số', en: 'Stats' },
});

/** Slot có phần tử / chữ được gán thật (không tính nội dung dự phòng) */
const assigned = (slot) => slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());

/**
 * Thẻ hồ sơ. `stats` là mảng { label, value, format?, prefix?, suffix? } — value số sẽ đếm chạy khi cuộn tới.
 * `email` / `phone` → nút liên hệ mặc định (slot actions thay toàn bộ).
 *
 * @slot - Nội dung thêm dưới phần giới thiệu
 * @slot cover - Ảnh bìa tùy biến (thay attribute cover)
 * @slot avatar - Avatar tùy biến (thay <hui-avatar>)
 * @slot actions - Nút hành động (thay nút liên hệ email / phone mặc định)
 * @slot social - Hàng link mạng xã hội
 * @slot footer - Chân thẻ (chuyển xuống hui-card)
 * @csspart base - Khung nội dung
 * @csspart cover - Vùng ảnh bìa
 * @csspart cover-img - Ảnh bìa (attribute cover)
 * @csspart avatar - Vùng avatar (chứa <hui-avatar> — part avatar-base)
 * @csspart info - Khối tên + chức danh + giới thiệu
 * @csspart name - Tên (role heading)
 * @csspart verified - Dấu xác minh
 * @csspart job-title - Chức danh
 * @csspart bio - Giới thiệu
 * @csspart stats - Danh sách chỉ số (<dl>)
 * @csspart stat - Mỗi chỉ số
 * @csspart stat-value - Giá trị chỉ số (<dd>)
 * @csspart stat-label - Nhãn chỉ số (<dt>)
 * @csspart actions - Vùng nút hành động
 * @csspart contact - Mỗi nút liên hệ mặc định (kèm contact-email | contact-phone)
 * @csspart social - Hàng mạng xã hội
 * @csspart card - Khung <hui-card> (và cover, main, header, body, skeleton, actions, footer, overlay, card-link, card-check, card-glow)
 * @cssprop --hui-profile-card-cover-height - Chiều cao ảnh bìa (mặc định 96px)
 * @cssprop --hui-profile-card-cover-bg - Nền bìa khi không có ảnh (mặc định gradient primary)
 * @cssprop --hui-profile-card-avatar-ring - Màu viền quanh avatar đè lên bìa (mặc định nền card)
 * @cssprop --hui-profile-card-name-color - Màu tên
 * @cssprop --hui-profile-card-name-font-size - Cỡ chữ tên
 * @cssprop --hui-profile-card-title-color - Màu chức danh
 * @cssprop --hui-profile-card-bio-color - Màu giới thiệu
 * @cssprop --hui-profile-card-stat-value-color - Màu giá trị chỉ số
 * @cssprop --hui-profile-card-stat-label-color - Màu nhãn chỉ số
 * @cssprop --hui-profile-card-divider-color - Màu vạch chia các chỉ số
 * @cssprop --hui-profile-card-accent - Màu nút liên hệ chính (mặc định primary)
 */
class HuiProfileCard extends HuiElement {
  static localized = true;

  static properties = {
    /** URL ảnh bìa (bỏ trống + không slot cover = không có bìa) */
    cover: { type: String },
    /** URL ảnh đại diện (không có → chữ cái viết tắt từ name) */
    avatar: { type: String },
    /** Tên hiển thị */
    name: { type: String },
    /** Cấp heading của tên (aria-level) */
    headingLevel: { type: Number, default: 3 },
    /** Chức danh / mô tả ngắn dưới tên */
    jobTitle: { type: String },
    /** Đoạn giới thiệu */
    bio: { type: String },
    /** Mảng chỉ số [{ label, value, format?, prefix?, suffix? }] (attribute nhận JSON) */
    stats: { type: Array },
    /** Email → nút "Gửi email" (mailto:) */
    email: { type: String },
    /** Số điện thoại → nút "Gọi điện" (tel:) */
    phone: { type: String },
    /** Hiện dấu xác minh cạnh tên */
    verified: { type: Boolean },
    /** center | start — căn nội dung */
    align: { type: String, default: 'center' },
    /** vertical | horizontal — horizontal: avatar trái, thông tin phải */
    orientation: { type: String, default: 'vertical' },
    /** elevated | outlined | filled | ghost — biến thể hui-card */
    variant: { type: String, default: 'elevated' },
    /** Hiệu ứng của hui-card: lift | tilt | glow | border-gradient… */
    effect: { type: String },
    /** Link trang hồ sơ — cả thẻ bấm được */
    href: { type: String },
    /** target của link */
    target: { type: String },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Skeleton thay cho nội dung */
    loading: { type: Boolean },
    /** Tắt chuyển động (kể cả đếm chạy chỉ số) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._coverImg = createElement('img', { className: 'pf__cover-img', part: 'cover-img', alt: '', loading: 'lazy', decoding: 'async' });
    this._coverSlot = createElement('slot', { name: 'cover' }, this._coverImg);
    this._cover = createElement('div', { className: 'pf__cover', part: 'cover' }, this._coverSlot);

    this._avatarEl = createElement('hui-avatar', { className: 'pf__avatar-el', exportparts: 'base: avatar-base' });
    this._avatarSlot = createElement('slot', { name: 'avatar' }, this._avatarEl);
    // Tên đã hiện bằng chữ → avatar là trang trí
    this._avatar = createElement('div', { className: 'pf__avatar', part: 'avatar', 'aria-hidden': 'true' }, this._avatarSlot);

    this._nameText = createElement('span');
    this._verified = createElement('hui-icon', { className: 'pf__verified', part: 'verified', name: 'check' });
    this._name = createElement('div', { className: 'pf__name', part: 'name', role: 'heading' }, this._nameText, this._verified);
    this._job = createElement('div', { className: 'pf__job', part: 'job-title' });
    this._bio = createElement('p', { className: 'pf__bio', part: 'bio' });
    this._extraSlot = createElement('slot');
    this._extra = createElement('div', { className: 'pf__extra' }, this._extraSlot);
    this._info = createElement('div', { className: 'pf__info', part: 'info' }, this._name, this._job, this._bio, this._extra);

    this._stats = createElement('dl', { className: 'pf__stats', part: 'stats' });

    this._emailBtn = createElement('a', { className: 'pf__contact pf__contact--primary', part: 'contact contact-email' },
      createElement('hui-icon', { name: 'mail' }), createElement('span'));
    this._phoneBtn = createElement('a', { className: 'pf__contact', part: 'contact contact-phone' },
      createElement('hui-icon', { name: 'phone' }), createElement('span'));
    this._actionsSlot = createElement('slot', { name: 'actions' }, this._emailBtn, this._phoneBtn);
    this._actions = createElement('div', { className: 'pf__actions', part: 'actions' }, this._actionsSlot);

    this._socialSlot = createElement('slot', { name: 'social' });
    this._social = createElement('div', { className: 'pf__social', part: 'social' }, this._socialSlot);

    for (const s of [this._coverSlot, this._avatarSlot, this._extraSlot, this._actionsSlot, this._socialSlot]) {
      s.addEventListener('slotchange', () => this._syncSections());
    }

    this._base = createElement('div', { className: 'pf', part: 'base' },
      this._cover,
      createElement('div', { className: 'pf__inner' },
        this._avatar,
        createElement('div', { className: 'pf__main' }, this._info, this._stats, this._actions, this._social)));

    this._card = createElement('hui-card', { className: 'pf__card', exportparts: CARD_EXPORTPARTS },
      this._base, createForwardSlot('footer'));
    return this._card;
  }

  firstUpdated() {
    this._syncSections();
  }

  updated(changed) {
    forwardToCard(this, this._card, changed, { orientation: null });

    if (['align', 'orientation', 'size'].some((k) => changed.has(k))) {
      this._base.className = [
        'pf',
        `pf--${this.align === 'start' ? 'start' : 'center'}`,
        `pf--${this.orientation === 'horizontal' ? 'horizontal' : 'vertical'}`,
        `pf--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
      ].join(' ');
      // Khớp --_pf-avatar-size trong CSS (avatar đè nửa lên bìa)
      this._avatarEl.setAttribute('size', this.size === 'sm' ? '64' : this.size === 'lg' ? '112' : '80');
    }

    if (changed.has('cover')) {
      if (this.cover) this._coverImg.src = this.cover;
      else this._coverImg.removeAttribute('src');
      this._coverImg.hidden = !this.cover;
    }

    if (changed.has('avatar') || changed.has('name')) {
      if (this.avatar) this._avatarEl.setAttribute('src', this.avatar);
      else this._avatarEl.removeAttribute('src');
      if (this.name) this._avatarEl.setAttribute('name', this.name);
      else this._avatarEl.removeAttribute('name');
    }

    if (changed.has('name')) {
      this._nameText.textContent = this.name || '';
      this._name.hidden = !this.name;
    }
    if (changed.has('headingLevel')) this._name.setAttribute('aria-level', String(headingLevel(this.headingLevel)));
    if (changed.has('verified') || changed.has('locale')) {
      this._verified.hidden = !this.verified;
      this._verified.setAttribute('label', msg('profileCard.verified'));
    }
    if (changed.has('jobTitle')) {
      this._job.textContent = this.jobTitle || '';
      this._job.hidden = !this.jobTitle;
    }
    if (changed.has('bio')) {
      this._bio.textContent = this.bio || '';
      this._bio.hidden = !this.bio;
    }

    if (changed.has('stats') || changed.has('locale')) this._renderStats();
    else if (changed.has('noAnimation')) {
      this._stats.querySelectorAll('hui-number').forEach((n) => n.toggleAttribute('no-animation', this.noAnimation));
    }

    if (['email', 'phone', 'locale'].some((k) => changed.has(k))) {
      this._syncContact(this._emailBtn, this.email ? `mailto:${this.email}` : '', msg('profileCard.email'));
      this._syncContact(this._phoneBtn, this.phone ? `tel:${String(this.phone).replace(/[^\d+]/g, '')}` : '', msg('profileCard.phone'));
    }

    this._syncSections();
  }

  _syncContact(btn, href, text) {
    btn.lastChild.textContent = text;
    btn.hidden = !href;
    if (href) btn.href = href;
    else btn.removeAttribute('href');
  }

  _renderStats() {
    const list = Array.isArray(this.stats) ? this.stats.filter((s) => s && typeof s === 'object') : [];
    this._stats.setAttribute('aria-label', msg('profileCard.stats'));
    this._stats.replaceChildren(...list.map((s) => {
      let value;
      if (isNum(s.value)) {
        value = createElement('hui-number', { value: String(s.value), format: s.format || 'compact', duration: '1000' });
        if (s.prefix) value.setAttribute('prefix', String(s.prefix));
        if (s.suffix) value.setAttribute('suffix', String(s.suffix));
        if (this.noAnimation) value.setAttribute('no-animation', '');
      } else {
        value = String(s.value ?? '');
      }
      return createElement('div', { className: 'pf__stat', part: 'stat' },
        createElement('dt', { className: 'pf__stat-label', part: 'stat-label' }, String(s.label ?? '')),
        createElement('dd', { className: 'pf__stat-value', part: 'stat-value' }, value));
    }));
    this._stats.hidden = !list.length;
  }

  _syncSections() {
    if (!this._base) return;
    this._cover.hidden = !this.cover && !assigned(this._coverSlot);
    this._base.classList.toggle('pf--has-cover', !this._cover.hidden);
    this._extra.hidden = !hasContent(this._extraSlot);
    this._actions.hidden = !assigned(this._actionsSlot) && !this.email && !this.phone;
    this._social.hidden = !assigned(this._socialSlot);
    this._info.hidden = !this.name && !this.jobTitle && !this.bio && this._extra.hidden;
  }
}

defineElement('hui-profile-card', HuiProfileCard);

export { HuiProfileCard };
export default HuiProfileCard;
