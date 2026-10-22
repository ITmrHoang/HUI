/**
 * Storybook Stories — HUI Footer Links (cột link chân trang, accordion trên mobile)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';
import '../hui-icon/index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);
const parts = (el, name) => [...sr(el).querySelectorAll(`[part~="${name}"]`)];

const COLUMNS = [
  { title: 'Sản phẩm', links: [{ label: 'Tính năng', href: '#tinh-nang' }, { label: 'Bảng giá', href: '#gia' }, { label: 'Tích hợp', href: '#tich-hop', badge: 'Mới' }] },
  { title: 'Tài nguyên', links: [{ label: 'Tài liệu', href: '#docs' }, { label: 'Blog', href: '#blog' }, { label: 'Storybook', href: '#sb', target: '_blank' }] },
  { title: 'Công ty', links: [{ label: 'Giới thiệu', href: '#ve-chung-toi' }, { label: 'Tuyển dụng', href: '#tuyen-dung' }, { label: 'Liên hệ', href: '#lien-he' }] },
  { title: 'Pháp lý', links: [{ label: 'Điều khoản', href: '#dieu-khoan' }, { label: 'Bảo mật', href: '#bao-mat' }] },
];

const socialStyle = 'display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--hui-fill-tertiary);color:var(--hui-text-secondary);';
const brand = () => html`
  <div slot="brand">
    <div style="font-size: 20px; font-weight: 700; color: var(--hui-text); margin-bottom: 8px;">H-UI</div>
    <p style="margin: 0;">Thư viện Web Components zero-dependency cho website Việt.</p>
  </div>
`;
const bottom = () => html`
  <span slot="bottom">© 2026 H-UI. Bảo lưu mọi quyền.</span>
  <span slot="bottom" style="display: inline-flex; gap: 8px;">
    <a href="#fb" aria-label="Facebook" style=${socialStyle}><hui-icon name="share-facebook"></hui-icon></a>
    <a href="#x" aria-label="X" style=${socialStyle}><hui-icon name="share-x"></hui-icon></a>
    <a href="#in" aria-label="LinkedIn" style=${socialStyle}><hui-icon name="share-linkedin"></hui-icon></a>
  </span>
`;

export default {
  title: 'Organisms/HuiFooterLinks',
  component: 'hui-footer-links',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Footer Links** — Các cột link chân trang từ \`data\` + vùng thương hiệu (slot \`brand\`) + thanh dưới cùng (slot \`bottom\`).
Khung **< 600px** (container query) → các cột thành **accordion** (mẫu Disclosure của WAI-ARIA APG: tiêu đề là
\`<button aria-expanded aria-controls>\` trong heading). \`collapse="always"\` luôn accordion, \`"never"\` không bao giờ.

\`\`\`html
<hui-footer-links>
  <div slot="brand">Logo + mô tả</div>
  <span slot="bottom">© 2026 Công ty ABC</span>
</hui-footer-links>
<script>footer.data = [{ title: 'Sản phẩm', links: [{ label: 'Tính năng', href: '/tinh-nang' }] }, …];</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | array (JSON) | — | \`[{ title, links: [{ label, href, target, badge }] }]\` |
| \`columns\` | number | tự động | Số cột cố định (khung rộng) |
| \`collapse\` | string | \`auto\` | \`auto\` (accordion khi < 600px) \\| \`always\` \\| \`never\` |
| \`accordion\` | boolean | \`false\` | Chỉ mở 1 cột mỗi lúc |
| \`heading-level\` | number | \`2\` | aria-level tiêu đề cột |
| \`label\` | string | locale | aria-label của \`<nav>\` |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng mở / đóng |

### Properties / Methods
\`collapsed\` (chỉ đọc) — đang ở chế độ accordion · \`toggleColumn(index, force?)\` — mở / đóng cột.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-toggle\` | \`{ index, open }\` | Mở / đóng cột (accordion) |

### Slots
\`brand\` (cột thương hiệu) · \`bottom\` (bản quyền, mạng xã hội).

### Parts
\`base\`, \`top\`, \`brand\`, \`nav\`, \`column\` (+ \`column-open\`), \`heading\`, \`toggle\`, \`toggle-icon\`, \`list\`, \`link\`, \`badge\`, \`bottom\`.

### CSS Variables
\`--hui-footer-links-gap\` · \`-min-width\` · \`-brand-width\` · \`-heading-color\` · \`-link-color\` · \`-link-hover-color\` · \`-divider-color\` · \`-bottom-color\`.

### Bàn phím
Khung rộng: \`Tab\` qua các link. Accordion: \`Tab\` tới tiêu đề cột, \`Enter\`/\`Space\` mở / đóng.

### Locale
\`footerLinks.label\` ("Liên kết chân trang" / "Footer links").
        `,
      },
    },
  },
  argTypes: {
    collapse: { control: 'select', options: ['auto', 'always', 'never'] },
    accordion: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-footer-links id="fl" .data=${COLUMNS} collapse=${args.collapse} ?accordion=${args.accordion}>
      ${brand()}${bottom()}
    </hui-footer-links>
  `,
  args: { collapse: 'auto', accordion: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fl');
    await expect(part(el, 'nav').tagName).toBe('NAV');
    await expect(part(el, 'nav').getAttribute('aria-label')).toBe('Liên kết chân trang');
    await expect(parts(el, 'column').length).toBe(4);
    await expect(parts(el, 'heading')[0].getAttribute('aria-level')).toBe('2');
    await expect(parts(el, 'link')[0].getAttribute('href')).toBe('#tinh-nang');
    await expect(part(el, 'badge').textContent).toBe('Mới');
    const blank = parts(el, 'link').find((a) => a.target === '_blank');
    await expect(blank.rel).toBe('noopener noreferrer');
    await expect(part(el, 'brand').hidden).toBe(false);
    await expect(part(el, 'bottom').hidden).toBe(false);
    // Khung rộng: không accordion, mọi danh sách đều hiện
    await expect(el.collapsed).toBe(false);
    await expect(parts(el, 'list').every((l) => getComputedStyle(l).display !== 'none')).toBe(true);
  },
};

/** Khung hẹp (< 600px) → accordion; bấm tiêu đề mở cột */
export const MobileAccordion = {
  render: () => html`
    <div style="width: 360px; border: 1px dashed var(--hui-border); padding: 16px;">
      <hui-footer-links id="fl-m" .data=${COLUMNS} accordion>${brand()}${bottom()}</hui-footer-links>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fl-m');
    await expect(el.collapsed).toBe(true);
    const [t0, t1] = parts(el, 'toggle');
    const [l0, l1] = parts(el, 'list');
    await expect(t0.getAttribute('aria-expanded')).toBe('false');
    await expect(t0.getAttribute('aria-controls')).toBe(l0.id);
    await expect(getComputedStyle(l0).display).toBe('none');
    const events = [];
    el.addEventListener('hui-toggle', (e) => events.push(e.detail));
    await userEvent.click(t0);
    await expect(t0.getAttribute('aria-expanded')).toBe('true');
    await expect(getComputedStyle(l0).display).not.toBe('none');
    await expect(parts(el, 'column')[0].getAttribute('part')).toContain('column-open');
    // accordion: mở cột 2 → cột 1 đóng
    await userEvent.click(t1);
    await expect(t0.getAttribute('aria-expanded')).toBe('false');
    await expect(t1.getAttribute('aria-expanded')).toBe('true');
    await waitFor(() => expect(getComputedStyle(l0).display).toBe('none'));
    await expect(getComputedStyle(l1).display).not.toBe('none');
    await expect(events[0]).toEqual({ index: 0, open: true });
    // Bàn phím: Enter trên nút
    t1.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(t1.getAttribute('aria-expanded')).toBe('false'));
  },
};

/** collapse="always" / "never"; columns cố định; không brand */
export const CollapseModes = {
  render: () => html`
    <div style="display: grid; gap: 32px;">
      <hui-footer-links id="fl-always" collapse="always" no-animation .data=${COLUMNS.slice(0, 2)}></hui-footer-links>
      <div style="width: 360px;">
        <hui-footer-links id="fl-never" collapse="never" columns="2" .data=${COLUMNS}></hui-footer-links>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const always = canvasElement.querySelector('#fl-always');
    await expect(always.collapsed).toBe(true);
    await expect(part(always, 'brand').hidden).toBe(true);
    await always.toggleColumn(1, true);
    await expect(parts(always, 'toggle')[1].getAttribute('aria-expanded')).toBe('true');
    const never = canvasElement.querySelector('#fl-never');
    await expect(never.collapsed).toBe(false);
    await expect(getComputedStyle(part(never, 'nav')).gridTemplateColumns.split(' ').length).toBe(2);
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .fl-custom {
        --hui-footer-links-heading-color: #f8fafc;
        --hui-footer-links-link-color: #94a3b8;
        --hui-footer-links-link-hover-color: #38bdf8;
        --hui-footer-links-divider-color: #334155;
        --hui-footer-links-bottom-color: #64748b;
        background: #0f172a;
        padding: 32px;
        border-radius: 12px;
      }
      .fl-custom::part(heading) { text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; }
    </style>
    <hui-footer-links id="fl-custom" class="fl-custom" .data=${COLUMNS}>${bottom()}</hui-footer-links>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fl-custom');
    await expect(getComputedStyle(part(el, 'heading')).color).toBe('rgb(248, 250, 252)');
    await expect(getComputedStyle(part(el, 'link')).color).toBe('rgb(148, 163, 184)');
    await expect(getComputedStyle(part(el, 'heading')).textTransform).toBe('uppercase');
  },
};
