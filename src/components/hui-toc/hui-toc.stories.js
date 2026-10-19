/**
 * Storybook Stories — HUI Toc
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import { slugify } from './hui-toc.js';
import './index.js';

const para = (n = 3) => Array.from({ length: n }, () => html`<p>H-UI dựng giao diện bằng Web Components thuần, không phụ thuộc framework.
  Mỗi component có biến CSS, part và slot để tùy biến; animation bật sẵn và tôn trọng chế độ giảm chuyển động của hệ điều hành.</p>`);

const article = (prefix) => html`
  <h2>Giới thiệu Đà Nẵng</h2>${para()}
  <h3>Lịch sử</h3>${para(2)}
  <h3>Khí hậu</h3>${para(2)}
  <h2 id="${prefix}-custom">Ẩm thực đặc sắc</h2>${para()}
  <h3>Mì Quảng</h3>${para(2)}
  <h4>Cách nấu</h4>${para(1)}
  <h3>Bánh xèo</h3>${para(2)}
  <h2 data-toc-ignore>Không vào mục lục</h2>${para(1)}
  <h2>Điểm đến</h2>${para(4)}
  <h2>Giới thiệu Đà Nẵng</h2>${para(6)}
`;

const links = (el) => [...el.shadowRoot.querySelectorAll('[part~="link"]')];
const layout = 'display: grid; grid-template-columns: 220px 1fr; gap: 32px; align-items: start;';

export default {
  title: 'Molecules/HuiToc',
  component: 'hui-toc',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Toc** — Mục lục tự sinh từ heading của bài viết: danh sách **lồng nhau theo cấp**, tự gắn \`id\` còn thiếu
(slug tiếng Việt bỏ dấu: "Giới thiệu Đà Nẵng" → \`gioi-thieu-da-nang\`), **scroll-spy** tô mục đang đọc (IntersectionObserver),
**cuộn mượt** khi bấm có bù \`offset\` cho header dính, thanh chỉ báo trượt theo mục đang đọc.

\`\`\`html
<aside><hui-toc target="#article" headings="h2,h3" sticky offset="64"></hui-toc></aside>
<article id="article">
  <h2>Giới thiệu</h2> …
  <h2 data-toc-ignore>Không đưa vào mục lục</h2>
  <h3 data-toc-label="Tên ngắn">Tiêu đề rất dài …</h3>
</article>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`target\` | string | cả trang | CSS selector vùng nội dung |
| \`headings\` | string | \`h2,h3\` | Các cấp heading đưa vào mục lục |
| \`offset\` | number | \`0\` | Bù trừ (px) khi cuộn tới heading / xác định mục đang đọc (chiều cao header dính) |
| \`sticky\` | boolean | \`false\` | Dính khi cuộn, tự cuộn trong nếu dài |
| \`label\` | string | "Mục lục" | Tiêu đề / tên vùng điều hướng |
| \`no-title\` | boolean | \`false\` | Ẩn tiêu đề (vẫn làm aria-label) |
| \`no-hash\` | boolean | \`false\` | Không ghi #id lên thanh địa chỉ khi bấm |
| \`no-animation\` | boolean | \`false\` | Tắt cuộn mượt + hiệu ứng thanh chỉ báo |

Trên heading: \`data-toc-ignore\` (bỏ qua), \`data-toc-label\` (chữ thay thế trong mục lục).

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`activeId\` | (chỉ đọc) id heading đang đọc |
| \`entries\` | (chỉ đọc) \`[{ id, heading, level, text }]\` |
| \`refresh()\` | Quét lại heading (tự động khi nội dung đích thay đổi) |
| \`scrollToHeading(id)\` | Cuộn tới heading bằng code |
| \`slugify(text)\` | Hàm export: chuỗi → slug không dấu |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-change\` | \`{ id, heading }\` | Mục đang đọc đổi |
| \`hui-navigate\` | \`{ id, heading }\` | Bấm một mục — \`preventDefault()\` để tự cuộn |

### Slots
Không có.

### Parts
\`base\` (\`<nav>\`), \`title\`, \`list\` (+ \`list-nested\`), \`item\`, \`link\` (+ \`link-active\`), \`indicator\`.

### CSS Variables
\`--hui-toc-font-size\`, \`--hui-toc-color\`, \`--hui-toc-hover-color\`, \`--hui-toc-active-color\`, \`--hui-toc-active-bg\`,
\`--hui-toc-track-color\`, \`--hui-toc-indicator-color\`, \`--hui-toc-indicator-width\`, \`--hui-toc-indent\`, \`--hui-toc-title-color\`,
\`--hui-toc-sticky-top\`, \`--hui-toc-max-height\`.

### Bàn phím & Accessibility
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Di chuyển giữa các mục |
| \`Enter\` | Cuộn tới heading, focus chuyển vào heading (trình đọc màn hình đọc tiếp từ đó) |

\`<nav aria-labelledby>\` với tiêu đề "Mục lục"; mục đang đọc có \`aria-current="true"\`. Cuộn mượt tắt khi \`prefers-reduced-motion\`.
        `,
      },
    },
  },
  argTypes: {
    headings: { control: 'text' },
    offset: { control: 'number' },
    sticky: { control: 'boolean' },
    noAnimation: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="${layout} height: 420px; overflow: auto;" id="toc-scroll">
      <hui-toc target="#toc-article" headings=${args.headings} offset=${args.offset} ?sticky=${args.sticky} ?no-animation=${args.noAnimation} no-hash></hui-toc>
      <article id="toc-article">${article('d')}</article>
    </div>
  `,
  args: { headings: 'h2,h3', offset: 0, sticky: true, noAnimation: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-toc');
    const nav = el.shadowRoot.querySelector('nav');
    await expect(nav.getAttribute('aria-labelledby')).toBe(el.shadowRoot.querySelector('[part="title"]').id);
    await expect(el.shadowRoot.querySelector('[part="title"]').textContent).toBe('Mục lục');
    const ls = links(el);
    // data-toc-ignore bị bỏ qua, h4 không thuộc headings
    await expect(ls.map((a) => a.textContent)).toEqual([
      'Giới thiệu Đà Nẵng', 'Lịch sử', 'Khí hậu', 'Ẩm thực đặc sắc', 'Mì Quảng', 'Bánh xèo', 'Điểm đến', 'Giới thiệu Đà Nẵng',
    ]);
    // id: slug bỏ dấu, giữ id có sẵn, trùng thì thêm -2
    await expect(ls[0].getAttribute('href')).toBe('#gioi-thieu-da-nang');
    await expect(ls[3].getAttribute('href')).toBe('#d-custom');
    await expect(ls[7].getAttribute('href')).toBe('#gioi-thieu-da-nang-2');
    // Lồng nhau: h3 nằm trong <ol> con của h2
    await expect(el.shadowRoot.querySelectorAll('[part~="list-nested"]').length).toBe(2);

    // Bấm → cuộn tới, mục thành active (aria-current), focus vào heading
    let navigated = null;
    el.addEventListener('hui-navigate', (e) => { navigated = e.detail.id; }, { once: true });
    await userEvent.click(ls[4]);
    await expect(navigated).toBe('mi-quang');
    await waitFor(() => expect(el.activeId).toBe('mi-quang'), { timeout: 3000 });
    await expect(ls[4].getAttribute('aria-current')).toBe('true');
    await expect(ls[4].getAttribute('part')).toBe('link link-active');
    await expect(document.activeElement).toBe(canvasElement.querySelector('#mi-quang'));
    const box = canvasElement.querySelector('#toc-scroll');
    await waitFor(() => expect(Math.abs(canvasElement.querySelector('#mi-quang').getBoundingClientRect().top - box.getBoundingClientRect().top)).toBeLessThan(4), { timeout: 3000 });
    await waitFor(() => expect(el.shadowRoot.querySelector('[part="indicator"]').style.opacity).toBe('1'));
  },
};

/** Scroll-spy: cuộn nội dung → mục đang đọc tự đổi */
export const ScrollSpy = {
  render: () => html`
    <div style="${layout} height: 360px; overflow: auto;" id="spy-scroll">
      <hui-toc target="#spy-article" sticky no-animation no-hash></hui-toc>
      <article id="spy-article">${article('s')}</article>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-toc');
    const box = canvasElement.querySelector('#spy-scroll');
    const changes = [];
    el.addEventListener('hui-change', (e) => changes.push(e.detail.id));
    const target = canvasElement.querySelector('#s-custom');
    box.scrollTop = target.offsetTop - box.offsetTop;
    await waitFor(() => expect(el.activeId).toBe('s-custom'), { timeout: 3000 });
    await expect(changes).toContain('s-custom');
    // Cuộn chạm đáy → mục cuối
    box.scrollTop = box.scrollHeight;
    await waitFor(() => expect(el.activeId).not.toBe('s-custom'), { timeout: 3000 });
  },
};

/** headings="h2,h3,h4", nội dung thêm sau → tự dựng lại; label tùy chỉnh */
export const DeepAndDynamic = {
  render: () => html`
    <div style="${layout}">
      <hui-toc target="#dyn-article" headings="h2,h3,h4" label="Trong bài này" no-hash></hui-toc>
      <article id="dyn-article">
        <h2>Bắt đầu</h2><p>…</p>
        <h3>Cài đặt</h3><p>…</p>
        <h4 data-toc-label="Yêu cầu">Yêu cầu hệ thống tối thiểu</h4><p>…</p>
      </article>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-toc');
    await expect(links(el).map((a) => a.textContent)).toEqual(['Bắt đầu', 'Cài đặt', 'Yêu cầu']);
    await expect(el.shadowRoot.querySelector('[part="title"]').textContent).toBe('Trong bài này');
    const h = document.createElement('h2');
    h.textContent = 'Câu hỏi thường gặp';
    canvasElement.querySelector('#dyn-article').append(h);
    await waitFor(() => expect(links(el).length).toBe(4));
    await expect(h.id).toBe('cau-hoi-thuong-gap');
    await expect(slugify('Giới thiệu Đà Nẵng!')).toBe('gioi-thieu-da-nang');
    await expect(slugify('  Tiếng Việt — có dấu & ký tự @#  ')).toBe('tieng-viet-co-dau-ky-tu');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .toc-brand {
        --hui-toc-active-color: var(--hui-success-8);
        --hui-toc-indicator-color: var(--hui-success);
        --hui-toc-indicator-width: 3px;
        --hui-toc-track-color: var(--hui-border-secondary);
        --hui-toc-active-bg: var(--hui-success-light);
        --hui-toc-indent: 20px;
        --hui-toc-font-size: 13px;
      }
      hui-toc.toc-brand::part(title) { color: var(--hui-success-8); }
      hui-toc.toc-brand::part(link) { border-radius: 0 999px 999px 0; }
    </style>
    <div style="${layout} height: 360px; overflow: auto;">
      <hui-toc class="toc-brand" target="#brand-article" sticky no-hash></hui-toc>
      <article id="brand-article">${article('b')}</article>
    </div>
  `,
};
