/**
 * Storybook Stories — HUI Team Grid (lưới thành viên)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);
const parts = (el, name) => [...sr(el).querySelectorAll(`[part~="${name}"]`)];

/** Ảnh chân dung SVG tự sinh (không tải ảnh ngoài mạng) */
const portrait = (initial, hue) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">`
  + `<stop offset="0" stop-color="hsl(${hue} 70% 75%)"/><stop offset="1" stop-color="hsl(${hue} 55% 45%)"/></linearGradient></defs>`
  + `<rect width="400" height="400" fill="url(#g)"/><circle cx="200" cy="160" r="72" fill="hsl(${hue} 40% 92%)"/>`
  + `<path d="M70 400c10-90 70-140 130-140s120 50 130 140Z" fill="hsl(${hue} 40% 92%)"/>`
  + `<text x="200" y="182" font-family="sans-serif" font-size="64" font-weight="700" fill="hsl(${hue} 50% 40%)" text-anchor="middle">${initial}</text></svg>`,
)}`;

const socials = (slug) => [
  { icon: 'share-linkedin', href: `#in-${slug}`, label: 'LinkedIn' },
  { icon: 'share-x', href: `#x-${slug}`, label: 'X' },
  { icon: 'mail', href: `mailto:${slug}@example.com`, label: 'Email' },
];
const TEAM = [
  { name: 'Nguyễn Minh Anh', role: 'CEO & Co-founder', avatar: portrait('M', 210), bio: '10 năm xây sản phẩm SaaS.', socials: socials('minhanh') },
  { name: 'Trần Thu Hà', role: 'Head of Design', avatar: portrait('H', 330), bio: 'Thiết kế hệ thống, yêu typography.', socials: socials('thuha') },
  { name: 'Lê Quang Huy', role: 'CTO', avatar: portrait('Q', 150), bio: 'Web Components, hiệu năng, a11y.', socials: socials('huy') },
  { name: 'Phạm Lan Chi', role: 'Marketing Lead', avatar: portrait('L', 30), socials: socials('chi').slice(0, 1) },
];

export default {
  title: 'Organisms/HuiTeamGrid',
  component: 'hui-team-grid',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Team Grid** — Lưới thành viên từ \`data\`: ảnh (\`<hui-image>\`) hoặc avatar tròn (\`<hui-avatar>\`), tên, chức vụ, giới thiệu,
link mạng xã hội **hiện khi rê chuột / focus** (luôn hiện trên thiết bị cảm ứng hoặc \`social-reveal="always"\`).
Cột co theo bề rộng khung (container query); thành viên hiện lần lượt khi cuộn tới.

\`\`\`html
<hui-team-grid columns="4"></hui-team-grid>
<script>
  team.data = [{ name: 'Minh Anh', role: 'CEO', avatar: '/minh-anh.jpg',
    socials: [{ icon: 'share-linkedin', href: 'https://linkedin.com/in/…', label: 'LinkedIn' }] }, …];
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | array (JSON) | — | \`[{ name, role, avatar, bio, href, socials: [{ icon, href, label, target }] }]\` |
| \`columns\` | number | tự động | Số cột cố định (khung < 640px còn 2, < 400px còn 1) |
| \`variant\` | string | \`plain\` | \`plain\` \\| \`card\` |
| \`media\` | string | \`photo\` | \`photo\` (mạng xã hội phủ trên ảnh) \\| \`avatar\` |
| \`ratio\` | string | \`1/1\` | Tỉ lệ ảnh (photo) |
| \`social-reveal\` | string | \`hover\` | \`hover\` \\| \`always\` |
| \`align\` | string | \`center\` | \`center\` \\| \`start\` |
| \`heading-level\` | number | \`3\` | aria-level của tên |
| \`gap\` | string | — | Khoảng cách |
| \`stagger\` | number | \`80\` | Trễ hiện lần lượt (ms) |
| \`label\` | string | locale | aria-label danh sách |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

Link mạng xã hội \`http(s)\` tự mở tab mới (\`rel="noopener noreferrer"\`).

### Properties · Events
\`members\` (chỉ đọc) — các ô thành viên. Không có event.

### Parts
\`base\` (\`<ul role="list">\`), \`member\`, \`media\`, \`photo\`, \`avatar\`, \`name\`, \`role\`, \`bio\`, \`socials\`, \`social\`.

### CSS Variables
\`--hui-team-grid-gap\` · \`-min-width\` · \`-radius\` · \`-card-bg\` · \`-name-color\` · \`-role-color\` · \`-bio-color\` · \`-social-bg\` ·
\`-social-color\` · \`-social-hover-bg\` · \`-overlay\` · \`-avatar-size\`.

### Bàn phím
\`Tab\` tới link mạng xã hội (khi focus vào, hàng nút tự hiện — không bao giờ bị ẩn khỏi bàn phím).

### Locale
\`teamGrid.label\` ("Đội ngũ") · \`teamGrid.socials\` ("Mạng xã hội của {name}").
        `,
      },
    },
  },
  argTypes: {
    columns: { control: { type: 'number', min: 1, max: 6 } },
    variant: { control: 'select', options: ['plain', 'card'] },
    media: { control: 'select', options: ['photo', 'avatar'] },
    socialReveal: { control: 'select', options: ['hover', 'always'] },
    align: { control: 'select', options: ['center', 'start'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-team-grid id="tg" .data=${TEAM} columns=${args.columns} variant=${args.variant} media=${args.media}
      social-reveal=${args.socialReveal} align=${args.align}></hui-team-grid>
  `,
  args: { columns: 4, variant: 'plain', media: 'photo', socialReveal: 'hover', align: 'center' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tg');
    const base = part(el, 'base');
    await expect(base.tagName).toBe('UL');
    await expect(base.getAttribute('aria-label')).toBe('Đội ngũ');
    await expect(parts(el, 'member').length).toBe(4);
    await expect(parts(el, 'name')[0].textContent).toBe('Nguyễn Minh Anh');
    await expect(parts(el, 'name')[0].getAttribute('aria-level')).toBe('3');
    await expect(parts(el, 'role')[2].textContent).toBe('CTO');
    await expect(parts(el, 'photo')[0].getAttribute('src')).toBe(TEAM[0].avatar);
    await expect(parts(el, 'photo')[0].getAttribute('alt')).toBe('');
    const socialsList = parts(el, 'socials')[0];
    await expect(socialsList.getAttribute('aria-label')).toBe('Mạng xã hội của Nguyễn Minh Anh');
    const links = parts(el, 'social');
    await expect(links[0].getAttribute('aria-label')).toBe('LinkedIn');
    await expect(links[2].getAttribute('href')).toBe('mailto:minhanh@example.com');
    // hover: ẩn → focus vào link thì hiện
    await expect(getComputedStyle(socialsList).opacity).toBe('0');
    links[0].focus();
    await waitFor(() => expect(getComputedStyle(socialsList).opacity).toBe('1'));
    // Hiện lần lượt khi cuộn tới
    await waitFor(() => expect(el.members.every((m) => m.style.opacity === '')).toBe(true));
  },
};

/** Avatar tròn + thẻ, luôn hiện mạng xã hội; căn trái */
export const AvatarCards = {
  render: () => html`
    <hui-team-grid id="tg-av" .data=${TEAM} variant="card" media="avatar" social-reveal="always" align="start" gap="lg"></hui-team-grid>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tg-av');
    await expect(parts(el, 'avatar').length).toBe(4);
    await expect(parts(el, 'avatar')[0].getAttribute('aria-hidden')).toBe('true');
    await expect(parts(el, 'photo').length).toBe(0);
    await expect(getComputedStyle(parts(el, 'socials')[0]).opacity).toBe('1');
    await expect(getComputedStyle(parts(el, 'member')[0]).borderTopStyle).toBe('solid');
  },
};

/** Cột co theo khung; ảnh dọc 3/4; đổi data; link http mở tab mới */
export const ResponsiveAndDynamic = {
  render: () => html`
    <div style="width: 380px; border: 1px dashed var(--hui-border); padding: 8px;">
      <hui-team-grid id="tg-narrow" columns="4" ratio="3/4" no-animation
        .data=${[{ name: 'A', role: 'Dev', avatar: portrait('A', 90), href: '#a', socials: [{ icon: 'share-facebook', href: 'https://facebook.com/a', label: 'Facebook' }] }, { name: 'B', role: 'QA' }]}></hui-team-grid>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tg-narrow');
    // 380px → còn 1 cột (< 400px)
    await expect(getComputedStyle(part(el, 'base')).gridTemplateColumns.split(' ').length).toBe(1);
    await expect(part(el, 'photo').getAttribute('ratio')).toBe('3/4');
    const social = part(el, 'social');
    await expect(social.target).toBe('_blank');
    await expect(social.rel).toBe('noopener noreferrer');
    await expect(part(el, 'name').querySelector('a').getAttribute('href')).toBe('#a');
    el.data = TEAM;
    await el.updateComplete;
    await expect(parts(el, 'member').length).toBe(4);
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .tg-custom {
        --hui-team-grid-radius: 50%;
        --hui-team-grid-role-color: #059669;
        --hui-team-grid-social-hover-bg: #059669;
      }
      .tg-custom::part(name) { font-size: 16px; }
      .tg-custom::part(member) { padding-bottom: 8px; border-bottom: 2px solid #059669; }
    </style>
    <hui-team-grid id="tg-custom" class="tg-custom" .data=${TEAM} social-reveal="always" columns="4"></hui-team-grid>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tg-custom');
    await expect(getComputedStyle(part(el, 'role')).color).toBe('rgb(5, 150, 105)');
    await expect(getComputedStyle(part(el, 'name')).fontSize).toBe('16px');
    await expect(getComputedStyle(part(el, 'member')).borderBottomWidth).toBe('2px');
  },
};
