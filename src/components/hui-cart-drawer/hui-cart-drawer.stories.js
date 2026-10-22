/**
 * Storybook Stories — HUI Cart Drawer (giỏ hàng dạng ngăn kéo)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { setLocale } from '../../core/locale.js';
import './index.js';
import '../hui-button/index.js';
import '../hui-coupon-input/index.js';

/** Ảnh sản phẩm SVG tự sinh */
const img = (bg, fg) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${bg}"/><rect x="30" y="28" width="60" height="64" rx="12" fill="${fg}"/><circle cx="60" cy="54" r="12" fill="${bg}"/></svg>`,
)}`;

const ITEMS = [
  { id: 'p1', name: 'Áo thun cotton Basic', image: img('#eef3fb', '#3b6fd8'), price: 199000, original: 249000, qty: 2, variant: 'Xanh dương / M' },
  { id: 'p2', name: 'Quần jean slim fit co giãn', image: img('#f6efe6', '#9c6b3c'), price: 459000, qty: 1, variant: 'Nâu / 30', max: 3 },
  { id: 'p3', name: 'Mũ lưỡi trai thêu logo', image: img('#eaf6ef', '#2e9e6a'), price: 129000, qty: 1, variant: 'Xanh lá' },
];
const clone = () => ITEMS.map((it) => ({ ...it }));

const sr = (el) => el.shadowRoot;
/** Chờ drawer trượt vào xong (focus trap đặt focus xong) */
const settle = async (cart) => {
  await waitFor(() => expect(cart.shadowRoot.activeElement).not.toBeNull());
  await waitFor(() => expect(document.getAnimations().filter((a) => a.playState === 'running').length).toBe(0));
};
const rows = (el) => [...sr(el).querySelectorAll('[part="item"]')];

export default {
  title: 'Organisms/HuiCartDrawer',
  component: 'hui-cart-drawer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Cart Drawer** — giỏ hàng trượt từ mép phải, dựng trên \`hui-drawer\`: danh sách sản phẩm với \`hui-quantity\`,
xóa có **Hoàn tác**, tạm tính (\`formatCurrency\`), thanh miễn phí vận chuyển (\`hui-free-ship-bar\`), nút thanh toán,
trạng thái trống (\`hui-empty\`). Gán \`data\` một lần, sau đó component tự quản lý — lắng nghe \`hui-cart-change\` để lưu.

\`\`\`html
<hui-cart-drawer id="cart" free-ship-threshold="500000" checkout-href="/checkout"></hui-cart-drawer>
<script>
  cart.data = [{ id: 'p1', name: 'Áo thun', image: '/a.jpg', price: 199000, qty: 2, variant: 'Xanh / M' }];
  cart.addEventListener('hui-cart-change', (e) => save(e.detail.items));
  cart.show();
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`open\` | boolean | — | Đang mở |
| \`data\` | JSON array | \`[]\` | \`[{ id, name, image, price, original, qty, variant, max, href }]\` |
| \`heading\` | string | "Giỏ hàng" | Tiêu đề (kèm tổng số lượng) |
| \`currency\` | string | \`VND\` | Tiền tệ |
| \`free-ship-threshold\` | number | \`0\` | Ngưỡng free-ship (0 = ẩn thanh) |
| \`checkout-text\` / \`checkout-href\` | string | "Thanh toán" / — | Nút thanh toán / URL chuyển tới |
| \`empty-text\` | string | locale | Chữ trạng thái trống |
| \`undo-duration\` | number (giây) | \`5\` | Giữ dòng Hoàn tác (0 = xóa luôn) |
| \`placement\` | \`right\` \\| \`left\` | \`right\` | Mép trượt ra |
| \`size\` | \`default\` \\| \`large\` \\| CSS | \`default\` | Bề rộng drawer |
| \`mask\` | \`'true'\` \\| \`'false'\` | \`'true'\` | \`false\`: không modal — thông báo xóa có nút Hoàn tác |
| \`no-animation\` | boolean | — | Tắt hiệu ứng dòng |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`data\` | Danh sách hiện tại (đã chuẩn hóa) |
| \`total\` / \`count\` | Tạm tính / tổng số lượng (chỉ đọc) |
| \`show()\` / \`hide()\` / \`toggle()\` | Mở / đóng |
| \`addItem(item, { open })\` | Thêm (cùng id → cộng dồn qty, kẹp theo \`max\`) |
| \`removeItem(id)\` / \`updateQty(id, qty)\` / \`clear()\` | Thao tác dòng |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-cart-change\` | \`{ items, total, count, reason, item }\` | \`reason\`: \`qty\` \\| \`remove\` \\| \`undo\` \\| \`add\` \\| \`clear\` |
| \`hui-checkout\` | \`{ items, total, count }\` | Bấm thanh toán — cancelable (chặn \`checkout-href\`) |
| \`hui-continue\` | — | Bấm "Tiếp tục mua sắm" (drawer tự đóng) |
| \`hui-open\` / \`hui-close\` | — | Từ \`hui-drawer\` bên trong |

### Slots
| Slot | Mô tả |
|------|-------|
| \`footer-extra\` | Trên dòng tạm tính (vd \`hui-coupon-input\`) |
| \`empty\` | Thay nút "Tiếp tục mua sắm" |
| \`header-extra\` | Bên phải tiêu đề |

### Parts
\`drawer\` (+ \`drawer-panel\`, \`drawer-header\`, \`drawer-body\`, \`drawer-footer\`, \`drawer-close\`, \`drawer-mask\`), \`heading\`, \`free-ship\`,
\`list\`, \`item\`, \`item-image\`, \`item-name\`, \`item-variant\`, \`item-quantity\`, \`item-price\`, \`item-remove\`, \`undo\`, \`undo-button\`,
\`empty\`, \`footer\`, \`subtotal\`, \`total\`, \`note\`, \`checkout\`. State: \`:state(empty)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-cart-drawer-image-size\` / \`--hui-cart-drawer-image-radius\` | Ảnh sản phẩm |
| \`--hui-cart-drawer-item-gap\` / \`--hui-cart-drawer-divider\` | Khoảng cách / đường kẻ giữa dòng |
| \`--hui-cart-drawer-name-color\` / \`--hui-cart-drawer-variant-color\` | Chữ tên / biến thể |
| \`--hui-cart-drawer-total-color\` / \`--hui-cart-drawer-total-font-size\` | Số tạm tính |
| \`--hui-cart-drawer-undo-bg\` / \`--hui-cart-drawer-body-padding\` | Dòng hoàn tác / padding danh sách |
| \`--hui-drawer-*\` | Biến của \`hui-drawer\` (nền, bóng, rộng...) |

### Bàn phím / A11y
Drawer modal: focus trap, \`Esc\` đóng, trả focus khi đóng (\`hui-drawer\`). Mỗi dòng: \`Tab\` tới ô số lượng (↑/↓) và nút xóa
(\`aria-label\` "Xóa … khỏi giỏ"). Xóa → focus chuyển sang nút **Hoàn tác** (dòng \`role="status"\`). Khi drawer có mask,
chỉ dùng dòng hoàn tác trong drawer (không hiện thêm \`message\`); \`mask="false"\` thì thông báo có thêm nút Hoàn tác;
\`undo-duration="0"\` → chỉ hiện \`message\`.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-button id="cd-open" icon="cart" @hui-click=${() => document.querySelector('#cd-demo').show()}>Mở giỏ hàng</hui-button>
    <hui-cart-drawer id="cd-demo" free-ship-threshold="1000000" .data=${clone()}>
      <hui-coupon-input slot="footer-extra" size="sm"></hui-coupon-input>
    </hui-cart-drawer>
  `,
};

export const Empty = {
  render: () => html`
    <hui-button @hui-click=${() => document.querySelector('#cd-empty').show()}>Mở giỏ trống</hui-button>
    <hui-cart-drawer id="cd-empty"></hui-cart-drawer>
  `,
};

export const NonModal = {
  render: () => html`
    <hui-button @hui-click=${() => document.querySelector('#cd-nm').toggle()}>Bật / tắt giỏ (không mask)</hui-button>
    <hui-cart-drawer id="cd-nm" mask="false" .data=${clone()}></hui-cart-drawer>
  `,
};

/** Mở → dòng + tạm tính đúng; tăng số lượng → hui-cart-change + tổng đổi; kẹp theo max */
export const ChangeQuantity = {
  render: () => html`<hui-cart-drawer id="cd-q" no-animation .data=${clone()}></hui-cart-drawer>`,
  play: async ({ canvasElement }) => {
    setLocale('vi');
    const cart = canvasElement.querySelector('#cd-q');
    await cart.updateComplete;
    cart.show();
    await waitFor(() => expect(sr(cart).querySelector('hui-drawer').open).toBe(true));
    expect(rows(cart).length).toBe(3);
    expect(cart.total).toBe(199000 * 2 + 459000 + 129000);
    expect(sr(cart).querySelector('[part="total"]').textContent).toMatch(/986\.000/);
    expect(sr(cart).querySelector('[part="heading"]').textContent).toContain('(4)');
    // Bố cục: thành tiền ở cột phải, footer chiếm hết bề ngang panel
    const r = (el) => el.getBoundingClientRect();
    const row0 = rows(cart)[0];
    expect(r(row0.querySelector('[part="item-price"]')).left).toBeGreaterThan(r(row0.querySelector('[part="item-quantity"]')).right);
    expect(r(sr(cart).querySelector('[part="footer"]')).width).toBeGreaterThan(r(row0).width - 2);

    const changes = [];
    cart.addEventListener('hui-cart-change', (e) => changes.push(e.detail));
    const qty = rows(cart)[1].querySelector('hui-quantity');
    const inc = qty.shadowRoot.querySelector('[part="increment"]');
    inc.click();
    inc.click();
    inc.click(); // max 3
    await cart.updateComplete;
    expect(cart.data[1].qty).toBe(3);
    expect(changes.length).toBe(2);
    expect(changes.at(-1).reason).toBe('qty');
    expect(changes.at(-1).total).toBe(199000 * 2 + 459000 * 3 + 129000);
    expect(inc.disabled).toBe(true);
    // dòng vẫn là phần tử cũ (vẽ theo khóa, không dựng lại)
    expect(rows(cart)[1].querySelector('hui-quantity')).toBe(qty);
    cart.hide();
  },
};

/** Xóa → dòng Hoàn tác (focus vào nút) → Hoàn tác khôi phục đúng vị trí; hết giờ thì biến mất */
export const RemoveAndUndo = {
  render: () => html`<hui-cart-drawer id="cd-u" no-animation undo-duration="0.4" .data=${clone()}></hui-cart-drawer>`,
  play: async ({ canvasElement }) => {
    const cart = canvasElement.querySelector('#cd-u');
    await cart.updateComplete;
    cart.show();
    await waitFor(() => expect(sr(cart).querySelector('hui-drawer').open).toBe(true));
    await settle(cart);
    const reasons = [];
    cart.addEventListener('hui-cart-change', (e) => reasons.push(e.detail.reason));

    const remove = rows(cart)[0].querySelector('[part="item-remove"]');
    expect(remove.getAttribute('aria-label')).toContain('Áo thun');
    await userEvent.click(remove);
    expect(cart.data.length).toBe(2);
    const undo = sr(cart).querySelector('[part="undo-button"]');
    expect(undo).not.toBeNull();
    expect(sr(cart).activeElement).toBe(undo);
    await userEvent.click(undo);
    expect(cart.data.map((it) => it.id)).toEqual(['p1', 'p2', 'p3']);
    expect(sr(cart).querySelector('[part="undo"]')).toBeNull();

    await userEvent.click(rows(cart)[2].querySelector('[part="item-remove"]'));
    expect(sr(cart).querySelector('[part="undo"]')).not.toBeNull();
    await waitFor(() => expect(sr(cart).querySelector('[part="undo"]')).toBeNull(), { timeout: 2000 });
    expect(cart.data.length).toBe(2);
    expect(reasons).toEqual(['remove', 'undo', 'remove']);
    cart.hide();
  },
};

/** Xóa hết (không hoàn tác) → hui-empty, footer rút khỏi slot; addItem cộng dồn */
export const EmptyStateAndAddItem = {
  render: () => html`<hui-cart-drawer id="cd-e" no-animation undo-duration="0" free-ship-threshold="500000" .data=${clone().slice(0, 1)}></hui-cart-drawer>`,
  play: async ({ canvasElement }) => {
    const cart = canvasElement.querySelector('#cd-e');
    await cart.updateComplete;
    expect(sr(cart).querySelector('[part="free-ship"]').hidden).toBe(false);
    cart.removeItem('p1');
    await cart.updateComplete;
    expect(sr(cart).querySelector('[part="empty"]').hidden).toBe(false);
    expect(sr(cart).querySelector('[part="footer"]').slot).toBe('');
    expect(sr(cart).querySelector('[part="free-ship"]').hidden).toBe(true);

    cart.addItem({ id: 'x', name: 'Tất cổ ngắn', price: 39000, qty: 2 });
    cart.addItem({ id: 'x', name: 'Tất cổ ngắn', price: 39000, qty: 1 });
    expect(cart.count).toBe(3);
    expect(rows(cart).length).toBe(1);
    expect(sr(cart).querySelector('[part="empty"]').hidden).toBe(true);
    expect(sr(cart).querySelector('[part="footer"]').slot).toBe('footer');
  },
};

/** Thanh toán: hui-checkout có items + total, cancelable */
export const Checkout = {
  render: () => html`<hui-cart-drawer id="cd-c" no-animation checkout-href="#should-not-navigate" .data=${clone()}></hui-cart-drawer>`,
  play: async ({ canvasElement }) => {
    const cart = canvasElement.querySelector('#cd-c');
    await cart.updateComplete;
    cart.show();
    await waitFor(() => expect(sr(cart).querySelector('hui-drawer').open).toBe(true));
    let detail = null;
    cart.addEventListener('hui-checkout', (e) => {
      detail = e.detail;
      e.preventDefault();
    });
    // chờ drawer trượt vào xong rồi mới bấm
    await settle(cart);
    const before = window.location.href;
    // hui-button: bấm vào <button> bên trong (userEvent.click lên host không đi vào shadow)
    await userEvent.click(sr(cart).querySelector('[part="checkout"]').shadowRoot.querySelector('button'));
    expect(detail.count).toBe(4);
    expect(detail.items.length).toBe(3);
    expect(window.location.href).toBe(before);
    cart.hide();
    await waitFor(() => expect(cart.open).toBe(false));
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cd-custom {
        --hui-cart-drawer-image-size: 56px;
        --hui-cart-drawer-image-radius: 50%;
        --hui-cart-drawer-total-color: var(--hui-danger);
        --hui-drawer-size: 420px;
      }
      .cd-custom::part(drawer-header) { background: var(--hui-primary); }
      .cd-custom::part(heading) { color: var(--hui-text-inverse); }
      .cd-custom::part(item) { padding-block: 10px; }
    </style>
    <hui-button @hui-click=${() => document.querySelector('#cd-custom').show()}>Mở giỏ (tùy biến)</hui-button>
    <hui-cart-drawer id="cd-custom" class="cd-custom" heading="Túi đồ của bạn" .data=${clone()}></hui-cart-drawer>
  `,
};
