/**
 * HUI Share — Nút chia sẻ (Molecule): Facebook / Zalo / X / LinkedIn / Email / sao chép liên kết,
 * mở cửa sổ popup (noopener); `native` → dùng Web Share API (bảng chia sẻ của hệ điều hành, hợp với mobile).
 * Icon mạng xã hội là ký tự đơn giản tự vẽ ("f", "Z", "X", "in") — thư viện không kèm logo thương hiệu.
 */

import styles from './hui-share.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { copyText } from '../hui-copy/hui-copy.js';
import '../hui-icon/hui-icon.js';

/** Chuỗi chưa có trong locale.js → bản dự phòng */
const FALLBACK = {
  'share.label': { vi: 'Chia sẻ', en: 'Share' },
  'share.via': { vi: 'Chia sẻ lên {network}', en: 'Share on {network}' },
  'share.email': { vi: 'Gửi qua email', en: 'Send by email' },
  'share.copy': { vi: 'Sao chép liên kết', en: 'Copy link' },
  'share.copied': { vi: 'Đã sao chép liên kết', en: 'Link copied' },
  'share.native': { vi: 'Chia sẻ…', en: 'Share…' },
};

function msg(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/** Mạng hỗ trợ: tên hiển thị, icon, mẫu URL ({url} {title} {text} đã encode) */
export const NETWORKS = {
  facebook: { name: 'Facebook', icon: 'share-facebook', url: 'https://www.facebook.com/sharer/sharer.php?u={url}' },
  zalo: { name: 'Zalo', icon: 'share-zalo', url: 'https://sp.zalo.me/share_to_zalo?u={url}&t={title}' },
  x: { name: 'X', icon: 'share-x', url: 'https://x.com/intent/tweet?url={url}&text={title}' },
  linkedin: { name: 'LinkedIn', icon: 'share-linkedin', url: 'https://www.linkedin.com/sharing/share-offsite/?url={url}' },
  email: { name: 'Email', icon: 'mail', url: 'mailto:?subject={title}&body={body}' },
  copy: { name: 'Copy', icon: 'copy' },
};

/**
 * Tạo URL chia sẻ cho một mạng.
 * @param {string} network
 * @param {{url: string, title?: string, text?: string}} data
 * @param {Record<string,string>} [templates] - mẫu ghi đè theo mạng
 */
export function buildShareUrl(network, { url, title = '', text = '' }, templates = {}) {
  const tpl = templates?.[network] || NETWORKS[network]?.url;
  if (!tpl) return '';
  const body = [text, url].filter(Boolean).join('\n\n');
  const enc = { url: encodeURIComponent(url), title: encodeURIComponent(title), text: encodeURIComponent(text), body: encodeURIComponent(body) };
  return tpl.replace(/\{(url|title|text|body)\}/g, (_, k) => enc[k]);
}

/**
 * Dãy nút chia sẻ. Bấm → phát `hui-share` (hủy được bằng preventDefault) rồi mở popup / mailto / sao chép.
 *
 * @fires hui-share - Trước khi chia sẻ (cancelable). detail: { network, url, shareUrl }
 * @fires hui-copy - Đã sao chép liên kết. detail: { value }
 * @csspart base - Khung nhóm (role="group")
 * @csspart item - Mỗi nút / liên kết; kèm item-<network>
 * @csspart icon - Icon trong nút
 * @csspart label - Chữ trong nút (show-label)
 * @csspart status - Vùng thông báo "Đã sao chép liên kết"
 * @cssprop --hui-share-gap - Khoảng cách giữa các nút
 * @cssprop --hui-share-size - Cạnh nút (mặc định theo size)
 * @cssprop --hui-share-radius - Bo góc nút
 * @cssprop --hui-share-color - Màu nhấn chung (nền variant filled / chữ outline, ghost)
 * @cssprop --hui-share-facebook-color - Màu nhấn riêng Facebook (tương tự -zalo-, -x-, -linkedin-, -email-, -copy-, -native-)
 * @cssprop --hui-share-text-color - Màu chữ/icon trên nền filled
 */
class HuiShare extends HuiElement {
  static localized = true;

  static properties = {
    /** URL chia sẻ (mặc định location.href lúc bấm) */
    url: { type: String },
    /** Tiêu đề chia sẻ (attribute `title`, được gỡ khỏi thẻ để không hiện tooltip native) — mặc định document.title */
    shareTitle: { type: String, attribute: 'title', reflect: false },
    /** Mô tả ngắn (Web Share API / nội dung email) */
    text: { type: String },
    /** Danh sách mạng, phân tách bằng dấu phẩy: facebook,zalo,x,linkedin,email,copy */
    networks: { type: String, default: 'facebook,zalo,x,linkedin,email,copy' },
    /** Dùng Web Share API (navigator.share) khi trình duyệt hỗ trợ — thay toàn bộ dãy nút bằng một nút "Chia sẻ" */
    native: { type: Boolean },
    /** filled | outline | ghost */
    variant: { type: String, default: 'filled' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** circle | rounded | square */
    shape: { type: String, default: 'circle' },
    /** Hiện tên mạng cạnh icon */
    showLabel: { type: Boolean },
    /** Xếp dọc */
    vertical: { type: Boolean },
    /** Mẫu URL ghi đè theo mạng, vd { zalo: 'https://…?u={url}' } — biến: {url} {title} {text} {body} */
    templates: { type: Object, attribute: false },
    /** Kích thước popup "rộngxcao" */
    popupSize: { type: String, default: '600x540' },
  };

  static styles = styles;

  constructor() {
    super();
    this._copiedTimer = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    // Gỡ attribute title khỏi host sau khi đọc → không hiện tooltip native trên cả dãy nút
    if (name === 'title' && this._strippingTitle) return;
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name === 'title' && newVal !== null) {
      this._strippingTitle = true;
      this.removeAttribute('title');
      this._strippingTitle = false;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._copiedTimer);
  }

  /** Mạng đang bật (đã lọc tên lạ) */
  get networkList() {
    return String(this.networks || '').split(/[\s,]+/).map((n) => n.trim().toLowerCase()).filter((n) => NETWORKS[n]);
  }

  /** Có dùng bảng chia sẻ của hệ điều hành không */
  get usesNative() {
    return this.native && typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  get _data() {
    return {
      url: this.url || (typeof location !== 'undefined' ? location.href : ''),
      title: this.shareTitle ?? (typeof document !== 'undefined' ? document.title : ''),
      text: this.text || '',
    };
  }

  render() {
    this._list = createElement('div', { className: 'share', part: 'base', role: 'group' });
    this._status = createElement('span', { className: 'share__status', part: 'status', role: 'status' });
    this._list.addEventListener('click', (e) => this._onClick(e));
    return [this._list, this._status];
  }

  updated(changed) {
    if (['variant', 'size', 'shape', 'showLabel', 'vertical'].some((k) => changed.has(k))) {
      this._list.className = [
        'share',
        `share--${['filled', 'outline', 'ghost'].includes(this.variant) ? this.variant : 'filled'}`,
        `share--${['sm', 'md', 'lg'].includes(this.size) ? this.size : 'md'}`,
        `share--${['circle', 'rounded', 'square'].includes(this.shape) ? this.shape : 'circle'}`,
        this.showLabel ? 'share--labels' : '',
        this.vertical ? 'share--vertical' : '',
      ].filter(Boolean).join(' ');
    }
    if (['networks', 'native', 'showLabel', 'locale', 'url', 'shareTitle', 'text', 'templates'].some((k) => changed.has(k))) this._build();
    if (changed.has('locale')) this._list.setAttribute('aria-label', msg('share.label'));
  }

  _build() {
    const items = this.usesNative ? ['native'] : this.networkList;
    const data = this._data;
    this._list.replaceChildren(...items.map((key) => {
      const net = key === 'native' ? { name: msg('share.native'), icon: 'share' } : NETWORKS[key];
      const label = key === 'copy' ? msg('share.copy')
        : key === 'email' ? msg('share.email')
          : key === 'native' ? msg('share.label')
            : msg('share.via', { network: net.name });
      const text = key === 'copy' ? msg('share.copy') : key === 'native' ? msg('share.label') : net.name;
      const icon = createElement('hui-icon', { className: 'share__icon', part: 'icon', name: net.icon });
      const labelEl = createElement('span', { className: 'share__label', part: 'label' }, text);
      labelEl.hidden = !this.showLabel;
      const attrs = {
        className: `share__item share__item--${key}`,
        part: `item item-${key}`,
        'data-network': key,
      };
      // Có showLabel thì chữ hiển thị đã là tên; không thì aria-label + title mô tả đầy đủ
      if (!this.showLabel) {
        attrs['aria-label'] = label;
        attrs.title = label;
      }
      let el;
      if (key === 'copy' || key === 'native') {
        el = createElement('button', { ...attrs, type: 'button' }, icon, labelEl);
      } else {
        // Liên kết thật: bấm giữa / chuột phải → mở tab mới vẫn đúng; bấm thường → popup
        el = createElement('a', {
          ...attrs,
          href: buildShareUrl(key, data, this.templates || {}),
          ...(key === 'email' ? {} : { target: '_blank', rel: 'noopener noreferrer' }),
        }, icon, labelEl);
      }
      return el;
    }));
  }

  async _onClick(e) {
    const item = e.target.closest?.('[data-network]');
    if (!item || !this._list.contains(item)) return;
    // Ctrl/⌘/Shift + click trên link → để trình duyệt mở tab mới như bình thường
    if (item.tagName === 'A' && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) return;
    e.preventDefault();
    await this.share(item.dataset.network);
  }

  /**
   * Chia sẻ qua một mạng (facebook | zalo | x | linkedin | email | copy | native).
   * @returns {Promise<boolean>} false nếu bị hủy / thất bại
   */
  async share(network) {
    const data = this._data;
    const shareUrl = network === 'copy' || network === 'native' ? data.url : buildShareUrl(network, data, this.templates || {});
    const go = this.emit('hui-share', { network, url: data.url, shareUrl }, { cancelable: true });
    if (!go) return false;

    if (network === 'native') {
      try {
        await navigator.share({ title: data.title, text: data.text || undefined, url: data.url });
        return true;
      } catch {
        return false; // người dùng đóng bảng chia sẻ
      }
    }
    if (network === 'copy') {
      const ok = await copyText(data.url);
      if (ok) {
        this._flashCopied();
        this.emit('hui-copy', { value: data.url });
      }
      return ok;
    }
    if (network === 'email') {
      window.location.href = shareUrl;
      return true;
    }
    const [w, h] = String(this.popupSize || '600x540').split('x').map(Number);
    const width = w || 600;
    const height = h || 540;
    const left = Math.max(0, (window.screenX ?? 0) + ((window.outerWidth || width) - width) / 2);
    const top = Math.max(0, (window.screenY ?? 0) + ((window.outerHeight || height) - height) / 2);
    window.open(shareUrl, 'hui-share', `noopener,noreferrer,width=${width},height=${height},left=${left},top=${top}`);
    return true;
  }

  _flashCopied() {
    const btn = this._list.querySelector('[data-network="copy"]');
    const icon = btn?.querySelector('hui-icon');
    icon?.setAttribute('name', 'check');
    btn?.classList.add('share__item--done');
    this._status.textContent = msg('share.copied');
    clearTimeout(this._copiedTimer);
    this._copiedTimer = setTimeout(() => {
      icon?.setAttribute('name', 'copy');
      btn?.classList.remove('share__item--done');
      this._status.textContent = '';
    }, 2000);
  }
}

defineElement('hui-share', HuiShare);

export default HuiShare;
