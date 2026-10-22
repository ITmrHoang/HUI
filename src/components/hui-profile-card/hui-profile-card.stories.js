/**
 * Storybook Stories — HUI Profile Card (thẻ hồ sơ)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { svgImage } from '../hui-image/story-images.js';
import './index.js';
import '../hui-button/index.js';
import '../hui-icon/index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);
const parts = (el, name) => [...sr(el).querySelectorAll(`[part~="${name}"]`)];

const avatar = (initial, hue) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue} 60% 55%)"/>`
  + `<text x="50%" y="62%" font-family="sans-serif" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">${initial}</text></svg>`,
)}`;
const COVER = svgImage({ w: 800, h: 240, hue: 220 });
const STATS = [
  { label: 'Bài viết', value: 128 },
  { label: 'Người theo dõi', value: 12500 },
  { label: 'Đang theo dõi', value: 312 },
];

const socialStyle = 'display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--hui-fill-tertiary);color:var(--hui-text-secondary);';
const socials = () => html`
  <a slot="social" href="#fb" aria-label="Facebook" style=${socialStyle}><hui-icon name="share-facebook"></hui-icon></a>
  <a slot="social" href="#x" aria-label="X" style=${socialStyle}><hui-icon name="share-x"></hui-icon></a>
  <a slot="social" href="#in" aria-label="LinkedIn" style=${socialStyle}><hui-icon name="share-linkedin"></hui-icon></a>
`;

export default {
  title: 'Molecules/HuiProfileCard',
  component: 'hui-profile-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Profile Card** — Thẻ hồ sơ dựng trên \`<hui-card>\`: ảnh bìa, avatar đè lên bìa (\`<hui-avatar>\`), tên + dấu xác minh,
chức danh, giới thiệu, **chỉ số** (\`<hui-number>\` đếm chạy khi cuộn tới, định dạng compact "12,5 N"), nút liên hệ
(\`email\` → mailto, \`phone\` → tel), hàng mạng xã hội (slot \`social\`).

\`\`\`html
<hui-profile-card cover="/cover.jpg" avatar="/me.jpg" name="Minh Anh" job-title="Frontend Lead" verified
  email="minh.anh@example.com" phone="0901 234 567"></hui-profile-card>
<script>card.stats = [{ label: 'Bài viết', value: 128 }, { label: 'Người theo dõi', value: 12500 }];</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`cover\` | string | — | Ảnh bìa (slot \`cover\` thay được) |
| \`avatar\` / \`name\` | string | — | Ảnh đại diện / tên (không ảnh → chữ cái viết tắt) |
| \`heading-level\` | number | \`3\` | aria-level của tên |
| \`job-title\` / \`bio\` | string | — | Chức danh / giới thiệu |
| \`stats\` | array (JSON) | — | \`[{ label, value, format?, prefix?, suffix? }]\` — value số đếm chạy (mặc định format \`compact\`) |
| \`email\` / \`phone\` | string | — | Nút liên hệ mặc định (slot \`actions\` thay toàn bộ) |
| \`verified\` | boolean | \`false\` | Dấu xác minh cạnh tên |
| \`align\` | string | \`center\` | \`center\` \\| \`start\` |
| \`orientation\` | string | \`vertical\` | \`vertical\` \\| \`horizontal\` |
| \`variant\` | string | \`elevated\` | Biến thể hui-card |
| \`effect\` / \`href\` / \`target\` | string | — | Hiệu ứng / link của hui-card |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` (avatar 64 / 80 / 112px) |
| \`loading\` / \`no-animation\` | boolean | \`false\` | Skeleton / tắt chuyển động (kể cả đếm chạy) |

### Events
Không có (nút liên hệ là link mailto: / tel:).

### Slots
\`(mặc định)\` nội dung thêm · \`cover\` · \`avatar\` · \`actions\` · \`social\` · \`footer\`.

### Parts
\`base\`, \`cover\`, \`cover-img\`, \`avatar\` (+ \`avatar-base\`), \`info\`, \`name\`, \`verified\`, \`job-title\`, \`bio\`, \`stats\`, \`stat\`,
\`stat-value\`, \`stat-label\`, \`actions\`, \`contact\` (+ \`contact-email\` / \`contact-phone\`), \`social\` và part của hui-card.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-profile-card-cover-height\` / \`-cover-bg\` | Bìa |
| \`--hui-profile-card-avatar-ring\` | Viền quanh avatar đè lên bìa |
| \`--hui-profile-card-name-color\` / \`-name-font-size\` / \`-title-color\` / \`-bio-color\` | Chữ |
| \`--hui-profile-card-stat-value-color\` / \`-stat-label-color\` / \`-divider-color\` | Chỉ số |
| \`--hui-profile-card-accent\` | Màu nút liên hệ chính |

### Bàn phím
\`Tab\` qua nút liên hệ và link mạng xã hội. Chỉ số là \`<dl>\` (dt nhãn, dd giá trị) cho trình đọc màn hình.

### Locale
\`profileCard.email\` · \`profileCard.phone\` · \`profileCard.verified\` · \`profileCard.stats\`.
        `,
      },
    },
  },
  argTypes: {
    align: { control: 'select', options: ['center', 'start'] },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    variant: { control: 'select', options: ['elevated', 'outlined', 'filled', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 340px;">
      <hui-profile-card id="pf" cover=${COVER} avatar=${avatar('M', 210)} name="Nguyễn Minh Anh" job-title="Frontend Lead · H-UI"
        bio="Xây thư viện Web Components không phụ thuộc framework. Yêu thích hiệu năng và a11y."
        .stats=${STATS} email="minh.anh@example.com" phone="0901 234 567" verified
        align=${args.align} orientation=${args.orientation} variant=${args.variant} size=${args.size}>
        ${socials()}
      </hui-profile-card>
    </div>
  `,
  args: { align: 'center', orientation: 'vertical', variant: 'elevated', size: 'md' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pf');
    await expect(part(el, 'name').textContent).toContain('Nguyễn Minh Anh');
    await expect(part(el, 'name').getAttribute('role')).toBe('heading');
    await expect(part(el, 'verified').hidden).toBe(false);
    await expect(part(el, 'verified').getAttribute('label')).toBe('Đã xác minh');
    await expect(part(el, 'cover').hidden).toBe(false);
    await expect(part(el, 'base').classList.contains('pf--has-cover')).toBe(true);
    // Chỉ số: dl > div > dt + dd
    await expect(part(el, 'stats').tagName).toBe('DL');
    await expect(parts(el, 'stat').length).toBe(3);
    await expect(parts(el, 'stat-label').map((n) => n.textContent)).toEqual(['Bài viết', 'Người theo dõi', 'Đang theo dõi']);
    await expect(part(el, 'stat-value').querySelector('hui-number').getAttribute('value')).toBe('128');
    // Nút liên hệ
    await expect(part(el, 'contact-email').getAttribute('href')).toBe('mailto:minh.anh@example.com');
    await expect(part(el, 'contact-phone').getAttribute('href')).toBe('tel:0901234567');
    await expect(part(el, 'social').hidden).toBe(false);
  },
};

/** Không bìa, căn trái, ngang; slot actions thay nút mặc định */
export const Layouts = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; align-items: start;">
      <hui-profile-card id="pf-nocover" avatar=${avatar('H', 330)} name="Thu Hà" job-title="Product Designer" .stats=${STATS.slice(0, 2)}>
        <hui-button slot="actions" size="sm">Theo dõi</hui-button>
        <hui-button slot="actions" size="sm" variant="outline">Nhắn tin</hui-button>
      </hui-profile-card>
      <hui-profile-card align="start" cover=${svgImage({ w: 800, h: 240, hue: 150 })} name="Quang Huy" job-title="Backend Engineer"
        bio="Go, PostgreSQL, Kubernetes." email="huy@example.com"></hui-profile-card>
      <hui-profile-card size="sm" variant="outlined" name="Lan Chi" job-title="Marketing" phone="+84 912 345 678"></hui-profile-card>
    </div>
    <div style="max-width: 560px; margin-top: 20px;">
      <hui-profile-card id="pf-h" orientation="horizontal" avatar=${avatar('L', 30)} name="Đức Long" job-title="CTO · Mây Xanh"
        bio="15 năm kinh nghiệm xây sản phẩm SaaS." .stats=${STATS} email="long@example.com">${socials()}</hui-profile-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const nc = canvasElement.querySelector('#pf-nocover');
    await expect(part(nc, 'cover').hidden).toBe(true);
    // Slot actions thay nút mặc định
    await expect(part(nc, 'actions').hidden).toBe(false);
    await expect(sr(nc).querySelector('slot[name="actions"]').assignedElements().length).toBe(2);
    await expect(part(nc, 'social').hidden).toBe(true);
    const h = canvasElement.querySelector('#pf-h');
    await expect(part(h, 'base').classList.contains('pf--horizontal')).toBe(true);
  },
};

/** Chỉ số đếm chạy; giá trị chữ; no-animation hiện ngay */
export const Stats = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
      <hui-profile-card id="pf-stats" name="Đếm chạy" .stats=${[{ label: 'Dự án', value: 42 }, { label: 'Hài lòng', value: 0.98, format: 'percent' }, { label: 'Hỗ trợ', value: '24/7' }]}></hui-profile-card>
      <hui-profile-card id="pf-static" no-animation name="Không chuyển động" stats='[{"label":"Khách hàng","value":1500,"suffix":"+","format":"number"}]'></hui-profile-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pf-stats');
    const values = parts(el, 'stat-value');
    await expect(values[2].textContent).toBe('24/7');
    await expect(values[1].querySelector('hui-number').getAttribute('format')).toBe('percent');
    // Attribute JSON + no-animation chuyển xuống hui-number
    const st = canvasElement.querySelector('#pf-static');
    const num = part(st, 'stat-value').querySelector('hui-number');
    await expect(num.hasAttribute('no-animation')).toBe(true);
    await waitFor(() => expect(num.shadowRoot.querySelector('[part="value"]').textContent).toBe('1.500'));
  },
};

/** Hiệu ứng + loading */
export const EffectsAndStates = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px;">
      <hui-profile-card id="pf-fx" effect="tilt glow" href="#profile" cover=${COVER} name="Tilt + Glow" job-title="Rê chuột thử" .stats=${STATS}></hui-profile-card>
      <hui-profile-card loading name="Đang tải"></hui-profile-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const card = sr(canvasElement.querySelector('#pf-fx')).querySelector('hui-card');
    await expect(card.getAttribute('effect')).toBe('tilt glow');
    await expect(card.getAttribute('href')).toBe('#profile');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .pf-custom {
        --hui-profile-card-cover-height: 120px;
        --hui-profile-card-cover-bg: linear-gradient(120deg, #f472b6, #8b5cf6);
        --hui-profile-card-accent: #8b5cf6;
        --hui-profile-card-stat-value-color: #7c3aed;
      }
      .pf-custom::part(name) { letter-spacing: 0.02em; }
      .pf-custom::part(stats) { border: 0; background: var(--hui-fill-tertiary); border-radius: 12px; }
    </style>
    <div style="max-width: 340px;">
      <hui-profile-card id="pf-custom" class="pf-custom" name="Tùy biến" job-title="Biến CSS + ::part" .stats=${STATS} email="a@b.c">
        <span slot="cover" aria-hidden="true"></span>
      </hui-profile-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pf-custom');
    await expect(getComputedStyle(part(el, 'cover')).height).toBe('120px');
    await expect(getComputedStyle(part(el, 'contact-email')).backgroundColor).toBe('rgb(139, 92, 246)');
    await expect(getComputedStyle(part(el, 'stats')).borderTopWidth).toBe('0px');
  },
};
