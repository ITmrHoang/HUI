/**
 * HUI Contact Float — Cụm nút liên hệ nổi cho website Việt Nam: gọi hotline, Zalo, Messenger, email
 * (+ nút lên đầu trang). Dựng từ hui-float-group + hui-float-button.
 * Chỉ dùng icon chung (phone / chat / mail) — thư viện KHÔNG kèm logo thương hiệu:
 *   registerIcon('zalo', '<path d="..."/>');   →   <hui-contact-float zalo="0909123456" zalo-icon="zalo">
 */

import styles from './hui-contact-float.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { tr } from '../hui-float-button/float-utils.js';
import '../hui-float-button/hui-float-button.js';
import '../hui-float-button/hui-float-group.js';
import '../hui-back-top/hui-back-top.js';
// Icon phone / chat / mail nằm trong bộ icon chung (hui-icon/icons.js)

/** Chuỗi mặc định theo kênh (locale.js chưa có key thì dùng bản này) */
const TEXT = {
  phone: { vi: 'Gọi {value}', en: 'Call {value}' },
  zalo: { vi: 'Chat Zalo', en: 'Chat on Zalo' },
  messenger: { vi: 'Nhắn tin Messenger', en: 'Chat on Messenger' },
  email: { vi: 'Gửi email', en: 'Send email' },
  toggle: { vi: 'Liên hệ', en: 'Contact us' },
};

/** Thứ tự trên → dưới: nút gọi nằm sát góc (dễ bấm nhất) */
const CHANNELS = ['email', 'messenger', 'zalo', 'phone'];

/** Tạo liên kết cho từng kênh từ giá trị người dùng nhập */
const LINKS = {
  phone: (v) => `tel:${v.replace(/[^\d+]/g, '')}`,
  zalo: (v) => `https://zalo.me/${encodeURIComponent(v.replace(/\s+/g, ''))}`,
  messenger: (v) => `https://m.me/${encodeURIComponent(v.trim())}`,
  email: (v) => `mailto:${v.trim()}`,
};

/**
 * @csspart group - hui-float-group bao ngoài
 * @csspart group-base - Khung của nhóm
 * @csspart group-list - Danh sách nút của nhóm
 * @csspart group-toggle - Nút chính (khi trigger khác none)
 * @csspart button - Mọi nút kênh (hui-float-button)
 * @csspart button-phone - Nút gọi điện (tương tự button-zalo, button-messenger, button-email)
 * @csspart back-top - Nút lên đầu trang (include-back-top)
 * @cssprop --hui-contact-float-phone-bg - Nền nút gọi (mặc định --hui-success)
 * @cssprop --hui-contact-float-phone-color - Màu icon nút gọi
 * @cssprop --hui-contact-float-zalo-bg - Nền nút Zalo (mặc định --hui-info)
 * @cssprop --hui-contact-float-zalo-color - Màu icon nút Zalo
 * @cssprop --hui-contact-float-messenger-bg - Nền nút Messenger (mặc định --hui-primary)
 * @cssprop --hui-contact-float-messenger-color - Màu icon nút Messenger
 * @cssprop --hui-contact-float-email-bg - Nền nút email (mặc định --hui-warning)
 * @cssprop --hui-contact-float-email-color - Màu icon nút email
 */
class HuiContactFloat extends HuiElement {
  static properties = {
    /** Số hotline → liên kết tel: (khoảng trắng, dấu chấm được bỏ đi) */
    phone: { type: String },
    /** Số điện thoại hoặc Zalo ID → https://zalo.me/<id> */
    zalo: { type: String },
    /** Username trang Facebook → https://m.me/<tên> */
    messenger: { type: String },
    /** Địa chỉ email → mailto: */
    email: { type: String },
    /** Icon nút Zalo (mặc định 'chat'; đăng ký logo riêng qua registerIcon rồi đặt tên ở đây) */
    zaloIcon: { type: String, default: 'chat' },
    /** Icon nút Messenger (mặc định 'chat') */
    messengerIcon: { type: String, default: 'chat' },
    /** bottom-right | bottom-left | top-right | top-left — góc màn hình */
    position: { type: String, default: 'bottom-right' },
    /** Khoảng cách tới mép (px): "24" hoặc "x,y" */
    offset: { type: String },
    /** none | click | hover — none: các nút luôn hiện; click/hover: gom vào một nút chính */
    trigger: { type: String, default: 'none' },
    /** circle | square */
    shape: { type: String, default: 'circle' },
    /** sm | md | lg */
    size: { type: String, default: 'lg' },
    /** Vòng lan thu hút chú ý: trên nút gọi (trigger none) hoặc nút chính */
    pulse: { type: Boolean },
    /** Thêm nút lên đầu trang vào cụm */
    includeBackTop: { type: Boolean },
    /** Tắt hiệu ứng */
    noAnimation: { type: Boolean },
  };

  static styles = styles;
  static localized = true;

  render() {
    this._group = createElement('hui-float-group', {
      part: 'group',
      exportparts: 'base: group-base, list: group-list, toggle: group-toggle',
    });
    this._buttons = {};
    for (const ch of CHANNELS) {
      const btn = createElement('hui-float-button', {
        part: `button button-${ch}`,
        className: `btn btn--${ch}`,
        'data-channel': ch,
        hidden: true,
      });
      this._buttons[ch] = btn;
      this._group.append(btn);
    }
    this._backTop = createElement('hui-back-top', { part: 'back-top' });
    return this._group;
  }

  updated(changed) {
    const g = this._group;
    g.setAttribute('position', this.position || 'bottom-right');
    g.setAttribute('trigger', this.trigger || 'none');
    g.setAttribute('shape', this.shape || 'circle');
    g.setAttribute('size', this.size || 'lg');
    g.toggleAttribute('no-animation', this.noAnimation);
    if (this.offset) g.setAttribute('offset', this.offset);
    else g.removeAttribute('offset');
    g.setAttribute('label', tr('contactFloat.toggle', TEXT.toggle));

    const visible = [];
    for (const ch of CHANNELS) {
      const btn = this._buttons[ch];
      const value = this[ch] ? String(this[ch]).trim() : '';
      btn.hidden = !value;
      if (!value) continue;
      visible.push(btn);
      btn.setAttribute('href', LINKS[ch](value));
      btn.setAttribute('icon', ch === 'zalo' ? this.zaloIcon : ch === 'messenger' ? this.messengerIcon : ch === 'phone' ? 'phone' : 'mail');
      btn.setAttribute('tooltip', tr(`contactFloat.${ch}`, TEXT[ch], { value }));
      if (ch === 'zalo' || ch === 'messenger') btn.setAttribute('target', '_blank');
    }

    // Pulse: luôn bung → nút gọi (hoặc nút sát góc nhất); gom nhóm → nút chính
    const always = (this.trigger || 'none') === 'none';
    const pulseTarget = this._buttons.phone.hidden ? visible[visible.length - 1] : this._buttons.phone;
    for (const btn of Object.values(this._buttons)) btn.toggleAttribute('pulse', Boolean(this.pulse && always && btn === pulseTarget));
    g.toggleAttribute('pulse', Boolean(this.pulse && !always));

    if (changed.has('includeBackTop') || changed.has('position')) this._syncBackTop();
  }

  /** Nút lên đầu trang nằm ở đầu xa góc nhất của cụm → hiện/ẩn không làm xê dịch các nút kênh */
  _syncBackTop() {
    if (!this.includeBackTop) {
      this._backTop.remove();
      return;
    }
    if (this.position?.startsWith('top')) this._group.append(this._backTop);
    else this._group.prepend(this._backTop);
  }
}

defineElement('hui-contact-float', HuiContactFloat);

export default HuiContactFloat;
