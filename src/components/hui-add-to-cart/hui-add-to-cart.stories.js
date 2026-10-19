/**
 * Storybook Stories — HUI Add To Cart (nút thêm giỏ + ảnh bay vào giỏ)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';
import '../hui-badge/index.js';
import '../hui-icon/index.js';

/** Ảnh sản phẩm SVG tự sinh */
const productImg = (bg, fg) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/><circle cx="100" cy="92" r="46" fill="${fg}"/><rect x="58" y="146" width="84" height="14" rx="7" fill="${fg}" opacity=".5"/></svg>`,
)}`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const btnOf = (el) => el.shadowRoot.querySelector('[part="button"]');

/** Thanh header giả có icon giỏ bọc trong hui-badge */
const header = (id, count = 2) => html`
  <div style="display:flex;justify-content:flex-end;padding:8px 16px;border-bottom:1px solid var(--hui-border-secondary);margin-bottom:24px">
    <hui-badge id=${id} count=${count}>
      <span style="display:inline-flex;padding:6px;font-size:22px;color:var(--hui-text)"><hui-icon name="cart" label="Giỏ hàng"></hui-icon></span>
    </hui-badge>
  </div>
`;

const product = (name, img, slot) => html`
  <div style="width:200px;display:grid;gap:8px">
    <img src=${img} alt=${name} width="200" height="200" style="border-radius:8px;display:block">
    <strong style="font-size:14px">${name}</strong>
    ${slot}
  </div>
`;

export default {
  title: 'Molecules/HuiAddToCart',
  component: 'hui-add-to-cart',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Add To Cart** — nút "Thêm vào giỏ" có trạng thái \`idle → loading → added (✓) → idle\`.
Với \`fly-to\`, ảnh sản phẩm bay theo đường cong vào icon giỏ, giỏ "nảy" và \`hui-badge\` tự tăng số.
Gán hàm async \`onAdd\` để gọi API — nút chờ (loading) tới khi hàm xong; ném lỗi → rung + \`hui-add-error\`.

\`\`\`html
<hui-badge id="cart" count="0"><hui-icon name="cart"></hui-icon></hui-badge>
<hui-add-to-cart fly-to="#cart" block></hui-add-to-cart>
<script>
  btn.onAdd = async ({ qty }) => api.addToCart(productId, qty);
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`qty\` | number | \`1\` | Số lượng gửi kèm, cộng vào badge |
| \`label\` / \`added-label\` | string | "Thêm vào giỏ" / "Đã thêm" | Chữ trạng thái idle / added (slot mặc định thay label) |
| \`state\` | \`idle\` \\| \`loading\` \\| \`added\` | \`idle\` | Trạng thái (tự chuyển; gán tay để demo) |
| \`fly-to\` | selector | — | Icon giỏ (đích bay). Là / chứa / nằm trong \`hui-badge\` → badge tự tăng |
| \`source\` | selector | — | Ảnh bay (bỏ trống = ảnh của \`hui-product-card\` cha hoặc \`<img>\` gần nhất) |
| \`reset-delay\` | number (ms) | \`1800\` | Giữ trạng thái "Đã thêm" bao lâu |
| \`variant\` | \`primary\` \\| \`outline\` \\| \`soft\` | \`primary\` | Kiểu nút |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Kích thước |
| \`icon\` | string | \`cart\` | Icon hui-icon; \`icon=""\` để ẩn |
| \`block\` / \`disabled\` / \`no-animation\` | boolean | — | Full width / vô hiệu / tắt hiệu ứng |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`onAdd\` | \`async ({ qty, element }) => any\` — await trước khi báo đã thêm; ném lỗi = thất bại; trả \`false\` = hủy |
| \`add()\` | Chạy quy trình như bấm nút → \`Promise<boolean>\` |
| \`flyToCart(qty?)\` | Chỉ chạy hiệu ứng bay + nảy + tăng badge |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-add\` | \`{ qty }\` | Bấm thêm — cancelable (\`preventDefault()\` hủy) |
| \`hui-added\` | \`{ qty, result }\` | Thêm thành công (\`result\` = giá trị onAdd trả về) |
| \`hui-add-error\` | \`{ qty, error }\` | onAdd ném lỗi |

### Slots / Parts
Slot mặc định: chữ nút. Parts: \`button\`, \`face\` (+ \`face-idle\` \\| \`face-loading\` \\| \`face-added\`), \`icon\`, \`label\`, \`spinner\`, \`check\`.
States: \`:state(idle)\`, \`:state(loading)\`, \`:state(added)\`. Ảnh bay gắn tạm vào \`<body>\` với class \`hui-add-to-cart-fly\` (top-layer).

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-add-to-cart-height\` / \`--hui-add-to-cart-padding-x\` / \`--hui-add-to-cart-font-size\` | Kích thước |
| \`--hui-add-to-cart-radius\` | Bo góc |
| \`--hui-add-to-cart-bg\` / \`--hui-add-to-cart-color\` / \`--hui-add-to-cart-hover-bg\` | Màu idle |
| \`--hui-add-to-cart-added-bg\` / \`--hui-add-to-cart-added-color\` | Màu trạng thái đã thêm |
| \`--hui-add-to-cart-fly-size\` | Cạnh ảnh bay khi tới đích (24px) |
| \`--hui-add-to-cart-fly-radius\` | Bo góc ảnh bay (đặt trên \`:root\`) |

### Bàn phím / A11y
Thẻ \`<button>\` native (\`Enter\` / \`Space\`). Khi loading: \`aria-busy\` + \`aria-disabled\` (vẫn giữ focus).
Vùng \`role="status"\` đọc "Đã thêm 1 sản phẩm vào giỏ hàng". Tắt hiệu ứng → không bay, badge vẫn tăng.
        `,
      },
    },
  },
};

/** Ảnh bay vào giỏ (bấm thử) — onAdd giả lập API 600ms */
export const Default = {
  render: () => html`
    ${header('cart-demo', 2)}
    <div style="display:flex;gap:24px;flex-wrap:wrap">
      ${product('Tai nghe Bluetooth', productImg('#e8f0fe', '#3b6fd8'), html`
        <hui-add-to-cart fly-to="#cart-demo" block .onAdd=${() => wait(600)}></hui-add-to-cart>`)}
      ${product('Đồng hồ thông minh', productImg('#fdecea', '#d9534f'), html`
        <hui-add-to-cart fly-to="#cart-demo" block variant="outline"></hui-add-to-cart>`)}
      ${product('Loa mini', productImg('#e9f7ef', '#2e9e6a'), html`
        <hui-add-to-cart fly-to="#cart-demo" block variant="soft" qty="2" label="Thêm 2 vào giỏ"></hui-add-to-cart>`)}
    </div>
  `,
};

export const Variants = {
  render: () => html`
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <hui-add-to-cart></hui-add-to-cart>
      <hui-add-to-cart variant="outline"></hui-add-to-cart>
      <hui-add-to-cart variant="soft"></hui-add-to-cart>
      <hui-add-to-cart icon="">Mua ngay</hui-add-to-cart>
    </div>
  `,
};

export const Sizes = {
  render: () => html`
    <div style="display:flex;gap:12px;align-items:center">
      <hui-add-to-cart size="sm"></hui-add-to-cart>
      <hui-add-to-cart size="md"></hui-add-to-cart>
      <hui-add-to-cart size="lg"></hui-add-to-cart>
    </div>
  `,
};

export const States = {
  render: () => html`
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <hui-add-to-cart state="idle"></hui-add-to-cart>
      <hui-add-to-cart state="loading"></hui-add-to-cart>
      <hui-add-to-cart state="added" reset-delay="999999"></hui-add-to-cart>
      <hui-add-to-cart disabled label="Hết hàng" icon=""></hui-add-to-cart>
    </div>
  `,
};

/** onAdd async: loading → added → idle; ảnh bay tới badge, badge +qty */
export const AsyncAddFlies = {
  render: () => html`
    ${header('cart-t1', 2)}
    ${product('Tai nghe', productImg('#e8f0fe', '#3b6fd8'), html`
      <hui-add-to-cart id="atc-1" fly-to="#cart-t1" qty="3" reset-delay="300"></hui-add-to-cart>`)}
  `,
  play: async ({ canvasElement }) => {
    const atc = canvasElement.querySelector('#atc-1');
    const badge = canvasElement.querySelector('#cart-t1');
    await atc.updateComplete;
    let resolveAdd;
    atc.onAdd = ({ qty }) => new Promise((r) => { resolveAdd = () => r({ ok: true, qty }); });
    const events = [];
    atc.addEventListener('hui-add', (e) => events.push(['add', e.detail.qty]));
    atc.addEventListener('hui-added', (e) => events.push(['added', e.detail.result.ok]));

    await userEvent.click(btnOf(atc));
    await waitFor(() => expect(atc.state).toBe('loading'));
    expect(btnOf(atc).getAttribute('aria-busy')).toBe('');
    // đang loading: bấm thêm không có tác dụng
    await userEvent.click(btnOf(atc));
    resolveAdd();
    await waitFor(() => expect(atc.state).toBe('added'));
    expect(events).toEqual([['add', 3], ['added', true]]);
    expect(atc.shadowRoot.querySelector('[role="status"]').textContent).toContain('3');
    // ảnh bay xong → badge 2 + 3
    await waitFor(() => expect(badge.count).toBe('5'), { timeout: 3000 });
    expect(document.querySelector('.hui-add-to-cart-fly')).toBeNull();
    await waitFor(() => expect(atc.state).toBe('idle'), { timeout: 2000 });
  },
};

/** onAdd ném lỗi → về idle + hui-add-error, badge không đổi */
export const AddError = {
  render: () => html`
    ${header('cart-t2', 1)}
    <hui-add-to-cart id="atc-2" fly-to="#cart-t2"></hui-add-to-cart>
  `,
  play: async ({ canvasElement }) => {
    const atc = canvasElement.querySelector('#atc-2');
    const badge = canvasElement.querySelector('#cart-t2');
    await atc.updateComplete;
    atc.onAdd = async () => { await wait(20); throw new Error('Hết hàng'); };
    let error = null;
    atc.addEventListener('hui-add-error', (e) => { error = e.detail.error; });
    await userEvent.click(btnOf(atc));
    await waitFor(() => expect(error?.message).toBe('Hết hàng'));
    expect(atc.state).toBe('idle');
    expect(badge.count).toBe('1');
  },
};

/** preventDefault() trên hui-add → không làm gì; no-animation → badge tăng ngay */
export const CancelAndNoAnimation = {
  render: () => html`
    ${header('cart-t3', 0)}
    <hui-add-to-cart id="atc-3" fly-to="#cart-t3" no-animation reset-delay="200"></hui-add-to-cart>
  `,
  play: async ({ canvasElement }) => {
    const atc = canvasElement.querySelector('#atc-3');
    const badge = canvasElement.querySelector('#cart-t3');
    await atc.updateComplete;
    const block = (e) => e.preventDefault();
    atc.addEventListener('hui-add', block);
    expect(await atc.add()).toBe(false);
    expect(atc.state).toBe('idle');
    atc.removeEventListener('hui-add', block);
    expect(await atc.add()).toBe(true);
    await waitFor(() => expect(badge.count).toBe('1'));
    expect(atc.state).toBe('added');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .atc-custom {
        --hui-add-to-cart-radius: 999px;
        --hui-add-to-cart-height: 44px;
        --hui-add-to-cart-bg: var(--hui-warning);
        --hui-add-to-cart-hover-bg: var(--hui-warning-hover);
        --hui-add-to-cart-added-bg: var(--hui-primary);
      }
      .atc-custom::part(label) { text-transform: uppercase; letter-spacing: .04em; }
    </style>
    <hui-add-to-cart class="atc-custom" .onAdd=${() => wait(500)}></hui-add-to-cart>
  `,
};
