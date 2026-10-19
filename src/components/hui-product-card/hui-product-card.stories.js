/**
 * Storybook Stories — HUI Product Card (thẻ sản phẩm)
 */

import { html, nothing } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-tag/index.js';

/** Ảnh minh họa SVG tự sinh (không tải ảnh ngoài mạng) */
const svgImage = (label, hue = 220, w = 600, h = 600) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`
  + `<stop offset="0" stop-color="hsl(${hue} 85% 72%)"/><stop offset="1" stop-color="hsl(${hue + 40} 70% 42%)"/></linearGradient></defs>`
  + `<rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.7}" cy="${h * 0.32}" r="${Math.min(w, h) * 0.17}" fill="rgba(255,255,255,.3)"/>`
  + `<rect x="${w * 0.18}" y="${h * 0.55}" width="${w * 0.64}" height="${h * 0.2}" rx="${h * 0.04}" fill="rgba(255,255,255,.22)"/>`
  + `<text x="50%" y="${h * 0.68}" font-family="sans-serif" font-size="${Math.min(w, h) * 0.08}" font-weight="700" fill="#fff" text-anchor="middle">${label}</text></svg>`,
)}`;

const IMG = {
  headphone: svgImage('Tai nghe', 220),
  watch: svgImage('Đồng hồ', 160),
  shoe: svgImage('Giày', 10),
  bag: svgImage('Balo', 280),
  lamp: svgImage('Đèn bàn', 40),
};

const sr = (el) => el.shadowRoot;
const addButton = (el) => sr(el).querySelector('[part~="add-button"]');
const clickAdd = (el) => addButton(el).shadowRoot.querySelector('button').click();

export default {
  title: 'Molecules/HuiProductCard',
  component: 'hui-product-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Product Card** — Thẻ sản phẩm dựng trên \`<hui-card>\`: ảnh (tỉ lệ \`ratio\`), nhãn \`badge\`, nút yêu thích,
tên (link khi có \`href\`), \`<hui-rating-display>\`, \`<hui-price>\` (giá gốc + % giảm), nút thêm giỏ.
\`sold-out\` → ảnh xám + lớp "Hết hàng" + khóa nút. Mặc định \`effect="lift zoom-media"\`.

\`\`\`html
<hui-product-card
  image="/img/tai-nghe.jpg" name="Tai nghe Bluetooth chống ồn" href="/san-pham/tai-nghe"
  price="1290000" original-price="1890000" rating="4.6" reviews="328"
  badge="Mới" wishlist>
</hui-product-card>
<hui-product-card orientation="horizontal" …></hui-product-card>   <!-- dạng danh sách -->
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`image\` / \`image-alt\` | string | — | Ảnh sản phẩm / mô tả ảnh (mặc định = name) |
| \`ratio\` | string | \`1/1\` | Tỉ lệ ảnh, vd \`4/3\`, \`3/4\` |
| \`name\` | string | — | Tên sản phẩm (cắt 2 dòng) |
| \`heading-level\` | number | \`3\` | aria-level của tên |
| \`href\` / \`target\` | string | — | Link chi tiết: tên là \`<a>\`, cả card bấm được (chuyển xuống hui-card) |
| \`price\` / \`original-price\` | number | — | Giá bán / giá gốc → \`<hui-price>\` |
| \`currency\` | string | \`VND\` | Mã tiền tệ |
| \`rating\` / \`reviews\` | number | — | Điểm 0–5 + số đánh giá → \`<hui-rating-display>\` (bỏ trống = ẩn) |
| \`badge\` | string | — | Nhãn góc ảnh ("Mới", "-30%"…) |
| \`sold-out\` | boolean | \`false\` | Hết hàng: ảnh xám + lớp "Hết hàng" + khóa nút thêm giỏ |
| \`wishlist\` / \`wishlisted\` | boolean | \`false\` | Hiện nút trái tim / trạng thái đang bật |
| \`add-text\` | string | locale \`product.addToCart\` | Chữ nút thêm giỏ |
| \`no-add-button\` | boolean | \`false\` | Ẩn nút thêm giỏ |
| \`effect\` | string | \`lift zoom-media\` | Hiệu ứng hui-card: \`lift\` \\| \`tilt\` \\| \`glow\` \\| \`zoom-media\` \\| \`reveal\` \\| \`border-gradient\` |
| \`variant\` | string | \`elevated\` | \`elevated\` \\| \`outlined\` \\| \`filled\` \\| \`ghost\` |
| \`orientation\` | string | \`vertical\` | \`horizontal\` = ảnh trái (danh sách) |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`loading\` | boolean | \`false\` | Skeleton thay cho nội dung |
| \`no-animation\` | boolean | \`false\` | Tắt chuyển động |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-add-to-cart\` | \`{ name, price }\` | Bấm nút thêm giỏ (không phát khi \`sold-out\`) |
| \`hui-wishlist\` | \`{ active }\` | Bật/tắt yêu thích |

### Slots
| Slot | Mô tả |
|------|-------|
| \`badge\` | Nhãn tùy biến góc trên ảnh (vd \`<hui-tag>\`) |
| \`extra\` | Nội dung dưới giá ("Đã bán 1,2k", freeship…) |
| \`actions\` | Nút phụ cạnh nút thêm giỏ |
| \`overlay\` | Lớp phủ trên ảnh (dùng với \`effect="reveal"\`) |

### Parts
\`image\`, \`media\`, \`badges\`, \`badge\`, \`wishlist\`, \`sold-out\`, \`content\`, \`name\`, \`rating\`,
\`price\` (+ \`price-value\`, \`price-original\`, \`price-discount\`), \`add-button\` (+ \`add-button-base\`),
và part của hui-card: \`card\`, \`cover\`, \`main\`, \`body\`, \`skeleton\`, \`actions\`, \`footer\`, \`overlay\`, \`card-link\`, \`card-check\`, \`card-glow\`.

### Custom states
\`:state(wishlisted)\` · \`:state(sold-out)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-product-card-image-fit\` / \`--hui-product-card-image-bg\` | object-fit / nền vùng ảnh |
| \`--hui-product-card-name-color\` / \`--hui-product-card-name-font-size\` / \`--hui-product-card-name-lines\` | Tên |
| \`--hui-product-card-badge-bg\` / \`--hui-product-card-badge-color\` | Nhãn |
| \`--hui-product-card-wishlist-bg\` / \`--hui-product-card-wishlist-active-color\` | Nút yêu thích |
| \`--hui-product-card-sold-out-bg\` | Lớp "Hết hàng" |
| \`--hui-card-*\` | Mọi biến của hui-card (radius, shadow, padding…) |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Tên (link) → nút yêu thích → nút thêm giỏ |
| \`Enter\` | Mở link tên |
| \`Enter\` / \`Space\` | Bật/tắt yêu thích (\`aria-pressed\`), thêm giỏ |

### Locale
\`product.addToCart\` · \`product.soldOut\` · \`product.wishlist\`.
        `,
      },
    },
  },
  argTypes: {
    name: { control: 'text' },
    price: { control: 'number' },
    originalPrice: { control: 'number' },
    rating: { control: { type: 'number', min: 0, max: 5, step: 0.1 } },
    reviews: { control: 'number' },
    badge: { control: 'text' },
    soldOut: { control: 'boolean' },
    wishlist: { control: 'boolean' },
    ratio: { control: 'select', options: ['1/1', '4/3', '3/4', '16/9'] },
    effect: { control: 'text' },
    variant: { control: 'select', options: ['elevated', 'outlined', 'filled', 'ghost'] },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 280px;">
      <hui-product-card
        image=${IMG.headphone}
        name=${args.name}
        href="#san-pham"
        price=${args.price ?? nothing}
        original-price=${args.originalPrice ?? nothing}
        rating=${args.rating ?? nothing}
        reviews=${args.reviews ?? nothing}
        badge=${args.badge || nothing}
        ratio=${args.ratio || nothing}
        effect=${args.effect ?? nothing}
        variant=${args.variant || nothing}
        orientation=${args.orientation || nothing}
        size=${args.size || nothing}
        ?sold-out=${args.soldOut}
        ?wishlist=${args.wishlist}
        ?loading=${args.loading}
      ></hui-product-card>
    </div>
  `,
  args: {
    name: 'Tai nghe Bluetooth chống ồn chủ động ANC Pro 2',
    price: 1290000,
    originalPrice: 1890000,
    rating: 4.6,
    reviews: 328,
    badge: 'Mới',
    soldOut: false,
    wishlist: true,
    ratio: '1/1',
    effect: 'lift zoom-media',
    variant: 'elevated',
    orientation: 'vertical',
    size: 'md',
    loading: false,
  },
};

/** Thêm giỏ + yêu thích: sự kiện, aria-pressed */
export const Events = {
  render: () => html`
    <div style="max-width: 280px;">
      <hui-product-card id="pc-ev" image=${IMG.watch} name="Đồng hồ thông minh Fit 5" price="2490000" original-price="2990000"
        rating="4.3" reviews="86" wishlist></hui-product-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pc-ev');
    const added = [];
    const wished = [];
    el.addEventListener('hui-add-to-cart', (e) => added.push(e.detail));
    el.addEventListener('hui-wishlist', (e) => wished.push(e.detail));

    // Nút thêm giỏ → { name, price }
    await expect(addButton(el).textContent).toBe('Thêm vào giỏ');
    clickAdd(el);
    await expect(added).toEqual([{ name: 'Đồng hồ thông minh Fit 5', price: 2490000 }]);

    // Giá: % giảm tự tính trong hui-price
    const price = sr(el).querySelector('hui-price');
    await expect(price.shadowRoot.querySelector('[part~="discount"]').textContent).toBe('-17%');

    // Yêu thích: aria-pressed + event { active }
    const wish = sr(el).querySelector('[part~="wishlist"]');
    await expect(wish.getAttribute('aria-pressed')).toBe('false');
    await expect(wish.getAttribute('aria-label')).toBe('Yêu thích');
    wish.click();
    await el.updateComplete;
    await expect(wished).toEqual([{ active: true }]);
    await expect(el.wishlisted).toBe(true);
    await expect(el.hasAttribute('wishlisted')).toBe(true);
    await expect(wish.getAttribute('aria-pressed')).toBe('true');
    wish.click();
    await el.updateComplete;
    await expect(wished[1]).toEqual({ active: false });
    await expect(wish.getAttribute('aria-pressed')).toBe('false');

    // Đánh giá chuyển xuống hui-rating-display
    const rating = sr(el).querySelector('hui-rating-display');
    await expect(rating.getAttribute('value')).toBe('4.3');
    await expect(rating.getAttribute('reviews')).toBe('86');
  },
};

/** Hết hàng: ảnh xám, lớp "Hết hàng", nút thêm giỏ bị khóa */
export const SoldOut = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; max-width: 520px;">
      <hui-product-card id="pc-sold" image=${IMG.shoe} name="Giày chạy bộ Air Run" price="1590000" rating="4.8" reviews="1200" sold-out></hui-product-card>
      <hui-product-card image=${IMG.bag} name="Balo laptop chống nước 15.6 inch" price="690000" original-price="890000" badge="-22%"></hui-product-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pc-sold');
    const added = [];
    el.addEventListener('hui-add-to-cart', (e) => added.push(e.detail));
    const overlay = sr(el).querySelector('[part~="sold-out"]');
    await expect(overlay.hidden).toBe(false);
    await expect(overlay.textContent).toBe('Hết hàng');
    await expect(addButton(el).hasAttribute('disabled')).toBe(true);
    await expect(addButton(el).shadowRoot.querySelector('button').disabled).toBe(true);
    clickAdd(el);
    await expect(added.length).toBe(0);
    await expect(getComputedStyle(sr(el).querySelector('[part~="image"]')).filter).toContain('grayscale');

    // Bỏ sold-out → nút mở lại, bấm được
    el.soldOut = false;
    await el.updateComplete;
    await new Promise((r) => requestAnimationFrame(r));
    await expect(overlay.hidden).toBe(true);
    await expect(addButton(el).hasAttribute('disabled')).toBe(false);
    clickAdd(el);
    await expect(added.length).toBe(1);
  },
};

/** Chuyển attribute xuống hui-card bên trong (effect, href, variant, orientation, size, loading) */
export const ForwardToCard = {
  render: () => html`
    <div style="max-width: 300px;">
      <hui-product-card id="pc-fw" image=${IMG.lamp} name="Đèn bàn LED chống cận" href="#den-ban" price="459000"
        variant="outlined" size="sm"></hui-product-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pc-fw');
    const card = sr(el).querySelector('hui-card');
    await expect(card.getAttribute('effect')).toBe('lift zoom-media');
    await expect(card.getAttribute('href')).toBe('#den-ban');
    await expect(card.getAttribute('variant')).toBe('outlined');
    await expect(card.getAttribute('size')).toBe('sm');
    await expect(sr(el).querySelector('[part~="name"]').getAttribute('href')).toBe('#den-ban');
    await expect(sr(el).querySelector('[part~="name"]').textContent).toBe('Đèn bàn LED chống cận');
    el.loading = true;
    el.orientation = 'horizontal';
    el.effect = 'tilt';
    await el.updateComplete;
    await expect(card.hasAttribute('loading')).toBe(true);
    await expect(card.getAttribute('orientation')).toBe('horizontal');
    await expect(card.getAttribute('effect')).toBe('tilt');
    el.effect = '';
    await el.updateComplete;
    await expect(card.hasAttribute('effect')).toBe(false);
  },
};

/** Lưới sản phẩm kết hợp nhiều trạng thái */
export const ProductGrid = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;">
      <hui-product-card image=${IMG.headphone} name="Tai nghe Bluetooth chống ồn ANC Pro 2" href="#1" price="1290000" original-price="1890000" rating="4.6" reviews="328" badge="Mới" wishlist></hui-product-card>
      <hui-product-card image=${IMG.watch} name="Đồng hồ thông minh Fit 5" href="#2" price="2490000" rating="4.3" reviews="86" wishlist wishlisted>
        <span slot="extra" style="font-size: 12px; color: var(--hui-text-muted);">Đã bán 1,2k</span>
      </hui-product-card>
      <hui-product-card image=${IMG.shoe} name="Giày chạy bộ Air Run" href="#3" price="1590000" rating="4.8" reviews="1200" sold-out wishlist></hui-product-card>
      <hui-product-card image=${IMG.bag} name="Balo laptop chống nước 15.6 inch" href="#4" price="690000" original-price="890000" rating="4.1" reviews="54">
        <hui-tag slot="badge" color="success" size="sm" variant="filled">Freeship</hui-tag>
        <hui-button slot="actions" variant="outline" size="sm" shape="circle" icon="eye" aria-label="Xem nhanh"></hui-button>
      </hui-product-card>
    </div>
  `,
};

/** Dạng danh sách: ảnh trái */
export const Horizontal = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 560px;">
      <hui-product-card orientation="horizontal" ratio="1/1" image=${IMG.headphone} name="Tai nghe Bluetooth chống ồn ANC Pro 2" href="#1"
        price="1290000" original-price="1890000" rating="4.6" reviews="328" badge="Mới" wishlist style="--hui-card-cover-width: 180px;"></hui-product-card>
      <hui-product-card orientation="horizontal" image=${IMG.lamp} name="Đèn bàn LED chống cận" href="#2" price="459000" rating="4.4" reviews="73"
        variant="outlined" style="--hui-card-cover-width: 180px;"></hui-product-card>
    </div>
  `,
};

export const SizesAndRatios = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; max-width: 780px;">
      <hui-product-card size="sm" ratio="4/3" image=${IMG.bag} name="Size sm · 4/3" price="690000" original-price="890000"></hui-product-card>
      <hui-product-card size="md" image=${IMG.watch} name="Size md · 1/1" price="2490000" rating="4.3"></hui-product-card>
      <hui-product-card size="lg" ratio="3/4" image=${IMG.shoe} name="Size lg · 3/4" price="1590000" rating="4.8" reviews="1200"></hui-product-card>
    </div>
  `,
};

export const Loading = {
  render: () => html`
    <div style="max-width: 260px;">
      <hui-product-card loading image=${IMG.lamp} name="Đang tải" price="459000"></hui-product-card>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .pc-brand {
        --hui-card-radius: 20px;
        --hui-product-card-badge-bg: var(--hui-danger);
        --hui-product-card-name-lines: 1;
        --hui-product-card-wishlist-active-color: var(--hui-primary);
        --hui-price-color: var(--hui-primary);
      }
      hui-product-card.pc-brand::part(name) { text-transform: uppercase; letter-spacing: 0.03em; }
      hui-product-card.pc-brand::part(add-button-base) { border-radius: 999px; }
      hui-product-card.pc-brand::part(badge) { border-radius: 999px; }
    </style>
    <div class="pc-brand" style="max-width: 260px;">
      <hui-product-card class="pc-brand" image=${IMG.headphone} name="Tai nghe Bluetooth chống ồn" price="1290000" original-price="1890000"
        rating="4.6" badge="HOT" wishlist wishlisted add-text="Mua ngay"></hui-product-card>
    </div>
  `,
};
