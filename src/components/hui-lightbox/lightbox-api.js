/**
 * Mở lightbox bằng hàm (không cần đặt thẻ trong HTML):
 *   import { lightbox } from '@itmrhoang/h-ui/hui-lightbox';
 *   lightbox.open([{ src: 'a.jpg', alt: 'A', caption: 'Ảnh A' }, 'b.jpg'], 0, { origin: thumbEl, loop: true });
 *   lightbox.close();
 * Dùng chung MỘT <hui-lightbox> gắn vào <body> (tạo khi gọi lần đầu).
 */

import HuiLightbox from './hui-lightbox.js';

/** @type {HuiLightbox|null} */
let shared = null;

/**
 * @typedef {object} LightboxOpenOptions
 * @property {Element} [origin] - Ảnh thu nhỏ để phóng to từ đó (FLIP) và thu về khi đóng
 * @property {boolean} [loop=false] - Ảnh cuối → ảnh đầu
 * @property {boolean} [noDownload=false] - Ẩn nút tải ảnh
 * @property {number} [zoomMax=4] - Mức zoom tối đa
 */

export const lightbox = {
  /**
   * @param {Array<{src: string, alt?: string, caption?: string}|string>} items
   * @param {number} [index=0]
   * @param {LightboxOpenOptions} [opts]
   * @returns {HuiLightbox} thẻ lightbox dùng chung (nghe hui-change / hui-close trên đó)
   */
  open(items, index = 0, opts = {}) {
    if (!shared || !shared.isConnected) {
      shared = /** @type {HuiLightbox} */ (document.createElement('hui-lightbox'));
      shared.setAttribute('data-hui-lightbox-api', '');
      document.body.appendChild(shared);
    }
    shared.loop = Boolean(opts.loop);
    shared.noDownload = Boolean(opts.noDownload);
    if (opts.zoomMax) shared.zoomMax = opts.zoomMax;
    shared.items = Array.isArray(items) ? items : [items];
    shared.show(index, { origin: opts.origin || null });
    return shared;
  },

  /** Đóng lightbox dùng chung (nếu đang mở) */
  close() {
    shared?.close();
  },

  /** Thẻ <hui-lightbox> dùng chung (null nếu chưa mở lần nào) */
  get element() {
    return shared;
  },
};

export default lightbox;
