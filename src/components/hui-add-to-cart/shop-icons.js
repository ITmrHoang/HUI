/**
 * Icon dùng chung cho nhóm thương mại điện tử (add-to-cart, cart-drawer, coupon).
 * Chỉ đăng ký khi registry chưa có tên đó → không ghi đè icon dự án đã tự đăng ký.
 */

import { getIcon, registerIcon } from '../hui-icon/icons.js';

export const SHOP_ICONS = {
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h2.6l2.3 11a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 1.9-1.4L21.5 7H6"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  truck: '<path d="M2 6h11v10H2zM13 9h4.5l3.5 3.5V16h-8"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
};

export function ensureShopIcons() {
  if (typeof document === 'undefined') return;
  for (const [name, svg] of Object.entries(SHOP_ICONS)) {
    if (getIcon(name) === undefined) registerIcon(name, svg);
  }
}

ensureShopIcons();
