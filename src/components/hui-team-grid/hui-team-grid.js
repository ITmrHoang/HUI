/**
 * HUI Team Grid — Lưới thành viên (Organism): ảnh, tên, chức vụ, giới thiệu, link mạng xã hội
 * hiện ra khi rê chuột / focus (luôn hiện trên thiết bị cảm ứng). Nhận `data`; cột co theo khung, hiện lần lượt khi cuộn tới.
 */

import styles from './hui-team-grid.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { createMsg, revealOnView, toLength, headingLevel } from '../hui-feature-card/landing-shared.js';
import '../hui-image/hui-image.js';
import '../hui-avatar/hui-avatar.js';
import '../hui-icon/hui-icon.js';

const msg = createMsg({
  'teamGrid.label': { vi: 'Đội ngũ', en: 'Team' },
  'teamGrid.socials': { vi: 'Mạng xã hội của {name}', en: '{name} on social media' },
});

const RATIO = /^\d+(\.\d+)?(\s*\/\s*\d+(\.\d+)?)?$/;

/**
 * @csspart base - Lưới (<ul role="list">)
 * @csspart member - Mỗi thành viên (<li>)
 * @csspart media - Khung ảnh / avatar
 * @csspart photo - <hui-image> (media="photo")
 * @csspart avatar - <hui-avatar> (media="avatar")
 * @csspart name - Tên (role heading)
 * @csspart role - Chức vụ
 * @csspart bio - Giới thiệu
 * @csspart socials - Danh sách link mạng xã hội
 * @csspart social - Mỗi link mạng xã hội
 * @cssprop --hui-team-grid-gap - Khoảng cách giữa các thành viên (attribute gap ưu tiên)
 * @cssprop --hui-team-grid-min-width - Bề rộng tối thiểu mỗi thành viên khi không đặt columns (mặc định 200px)
 * @cssprop --hui-team-grid-radius - Bo góc ảnh / thẻ
 * @cssprop --hui-team-grid-card-bg - Nền thẻ (variant card)
 * @cssprop --hui-team-grid-name-color - Màu tên
 * @cssprop --hui-team-grid-role-color - Màu chức vụ (mặc định primary)
 * @cssprop --hui-team-grid-bio-color - Màu giới thiệu
 * @cssprop --hui-team-grid-social-bg - Nền nút mạng xã hội
 * @cssprop --hui-team-grid-social-color - Màu icon mạng xã hội
 * @cssprop --hui-team-grid-social-hover-bg - Nền nút khi hover (mặc định primary)
 * @cssprop --hui-team-grid-overlay - Lớp phủ dưới chân ảnh khi hiện mạng xã hội (media photo)
 * @cssprop --hui-team-grid-avatar-size - Cỡ avatar (media avatar, mặc định 96px)
 */
class HuiTeamGrid extends HuiElement {
  static localized = true;

  static properties = {
    /** Mảng thành viên [{ name, role, avatar, bio, href, socials: [{ icon, href, label }] }] */
    data: { type: Array },
    /** Số cột cố định (khung < 640px còn tối đa 2, < 400px còn 1); bỏ trống = tự chia theo bề rộng */
    columns: { type: Number },
    /** plain | card — chữ trơn / mỗi thành viên một thẻ */
    variant: { type: String, default: 'plain' },
    /** photo | avatar — ảnh lớn (mạng xã hội phủ trên ảnh) / avatar tròn */
    media: { type: String, default: 'photo' },
    /** Tỉ lệ ảnh (media photo), vd "1/1", "3/4" */
    ratio: { type: String, default: '1/1' },
    /** hover | always — mạng xã hội hiện khi rê chuột / focus, hoặc luôn hiện */
    socialReveal: { type: String, default: 'hover' },
    /** center | start — căn chữ */
    align: { type: String, default: 'center' },
    /** Cấp heading của tên (aria-level) */
    headingLevel: { type: Number, default: 3 },
    /** Khoảng cách: xs | sm | md | lg | xl, số (px) hoặc CSS length */
    gap: { type: String },
    /** Trễ giữa các thành viên khi hiện lần lượt (ms) */
    stagger: { type: Number, default: 80 },
    /** Nhãn ARIA của danh sách (mặc định locale "Đội ngũ") */
    label: { type: String },
    /** Tắt hiệu ứng (hiện lần lượt, nổi khi hover, trượt mạng xã hội) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  /** Các ô thành viên đang hiển thị */
  get members() {
    return [...this._grid.children];
  }

  render() {
    this._grid = createElement('ul', { className: 'tg', part: 'base', role: 'list' });
    return this._grid;
  }

  firstUpdated() {
    this._ready = true;
    this._armReveal();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopReveal?.();
    this._stopReveal = null;
  }

  _armReveal() {
    this._stopReveal?.();
    this._stopReveal = null;
    if (this._revealed || !this._ready) return;
    this._stopReveal = revealOnView(this, this.members, { stagger: this.stagger, onShow: () => { this._revealed = true; } });
  }

  updated(changed) {
    if (['variant', 'media', 'socialReveal', 'align', 'columns', 'noAnimation'].some((k) => changed.has(k))) {
      const cols = Number(this.columns);
      const fixed = Number.isFinite(cols) && cols > 0;
      this._grid.className = [
        'tg',
        `tg--${this.variant === 'card' ? 'card' : 'plain'}`,
        `tg--${this.media === 'avatar' ? 'avatar' : 'photo'}`,
        `tg--reveal-${this.socialReveal === 'always' ? 'always' : 'hover'}`,
        `tg--${this.align === 'start' ? 'start' : 'center'}`,
        fixed ? 'tg--fixed' : '',
        fixed && cols > 2 ? 'tg--fixed-many' : '',
        this.noAnimation ? 'tg--static' : '',
      ].filter(Boolean).join(' ');
      if (fixed) this._grid.style.setProperty('--_tg-cols', String(Math.round(cols)));
      else this._grid.style.removeProperty('--_tg-cols');
    }
    if (changed.has('gap')) {
      const g = toLength(this.gap);
      if (g) this._grid.style.setProperty('--_tg-gap', g);
      else this._grid.style.removeProperty('--_tg-gap');
    }
    if (changed.has('label') || changed.has('locale')) this._grid.setAttribute('aria-label', this.label || msg('teamGrid.label'));
    if (changed.has('noAnimation') && this.noAnimation) {
      this._stopReveal?.();
      this._stopReveal = null;
    }

    if (['data', 'media', 'ratio', 'headingLevel', 'locale'].some((k) => changed.has(k))) {
      this._grid.replaceChildren(...(Array.isArray(this.data) ? this.data : []).map((m) => this._renderMember(m || {})));
      if (changed.has('data')) this._armReveal();
    }
  }

  _renderMember(m) {
    const name = String(m.name ?? '');
    const photo = this.media !== 'avatar';
    let mediaEl;
    if (photo) {
      const ratio = RATIO.test(String(this.ratio || '').trim()) ? String(this.ratio).trim() : '1/1';
      // Ảnh trang trí: tên đã hiện bằng chữ ngay bên dưới
      mediaEl = createElement('hui-image', { className: 'tg__photo', part: 'photo', alt: '', ratio });
      if (m.avatar) mediaEl.setAttribute('src', String(m.avatar));
    } else {
      mediaEl = createElement('hui-avatar', { className: 'tg__avatar', part: 'avatar', 'aria-hidden': 'true', name });
      if (m.avatar) mediaEl.setAttribute('src', String(m.avatar));
    }

    const socials = (Array.isArray(m.socials) ? m.socials : []).filter((s) => s && s.href);
    const socialList = socials.length ? createElement('ul', {
      className: 'tg__socials', part: 'socials', 'aria-label': msg('teamGrid.socials', { name }),
    }, ...socials.map((s) => {
      const a = createElement('a', {
        className: 'tg__social', part: 'social', href: String(s.href), 'aria-label': String(s.label || s.icon || s.href),
      }, createElement('hui-icon', { name: String(s.icon || 'share') }));
      if (s.target || /^https?:/.test(String(s.href))) {
        a.target = String(s.target || '_blank');
        if (a.target === '_blank') a.rel = 'noopener noreferrer';
      }
      return createElement('li', {}, a);
    })) : null;

    const media = createElement('div', { className: 'tg__media', part: 'media' }, mediaEl, photo ? socialList : null);
    const nameEl = createElement('div', {
      className: 'tg__name', part: 'name', role: 'heading', 'aria-level': String(headingLevel(this.headingLevel)),
    });
    if (m.href) nameEl.append(createElement('a', { className: 'tg__name-link', href: String(m.href) }, name));
    else nameEl.textContent = name;
    const info = createElement('div', { className: 'tg__info' }, nameEl,
      m.role ? createElement('div', { className: 'tg__role', part: 'role' }, String(m.role)) : null,
      m.bio ? createElement('p', { className: 'tg__bio', part: 'bio' }, String(m.bio)) : null,
      photo ? null : socialList);
    return createElement('li', { className: 'tg__member', part: 'member' }, media, info);
  }
}

defineElement('hui-team-grid', HuiTeamGrid);

export { HuiTeamGrid };
export default HuiTeamGrid;
