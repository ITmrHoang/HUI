/**
 * Storybook Stories — HUI FAQ (Organism)
 * Câu hỏi thường gặp trên nền hui-collapse: tìm kiếm bỏ dấu, mở tất cả, nhóm theo chủ đề, JSON-LD FAQPage.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const FAQ_DATA = [
  { question: 'Chính sách trả hàng như thế nào?', answer: 'Bạn có thể trả hàng trong vòng 30 ngày kể từ khi nhận, sản phẩm còn nguyên tem mác.', category: 'Đơn hàng' },
  { question: 'Bao lâu thì nhận được hàng?', answer: 'Đơn nội thành giao trong 1–2 ngày, ngoại thành 3–5 ngày làm việc.', category: 'Vận chuyển' },
  { question: 'Phí vận chuyển là bao nhiêu?', answer: 'Miễn phí cho đơn từ 500.000₫; đơn nhỏ hơn tính phí theo khu vực.', category: 'Vận chuyển' },
  { question: 'Tôi có thể thanh toán bằng những cách nào?', answer: 'Thẻ ATM nội địa, Visa/Mastercard, ví điện tử và COD.', category: 'Thanh toán' },
  { question: 'Làm sao để đổi địa chỉ giao hàng?', answer: 'Vào "Đơn hàng của tôi" → chọn đơn → "Sửa địa chỉ" trước khi đơn được đóng gói.', category: 'Đơn hàng' },
  { question: 'Có xuất hóa đơn VAT không?', answer: 'Có. Nhập thông tin công ty ở bước thanh toán,\nhóa đơn điện tử gửi qua email trong 24 giờ.', category: 'Thanh toán' },
];

// ---------- Tiện ích cho play ----------
const faqOf = (canvas) => canvas.querySelector('hui-faq');
const panelsOf = (faq) => [...faq.shadowRoot.querySelectorAll('hui-collapse-panel'), ...faq.querySelectorAll('hui-collapse-panel')];
const visiblePanels = (faq) => panelsOf(faq).filter((p) => p.style.display !== 'none');
async function typeSearch(faq, text) {
  const input = faq.shadowRoot.querySelector('hui-input').shadowRoot.querySelector('input');
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await faq.updateComplete;
  await faq.updateComplete;
}
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export default {
  title: 'Organisms/HuiFaq',
  component: 'hui-faq',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI FAQ** — khối câu hỏi thường gặp, xây trên \`hui-collapse\` + DataController.

\`\`\`html
<hui-faq search expand-all group-by-category="tabs" seo></hui-faq>
<script>
  document.querySelector('hui-faq').data = [
    { question: 'Chính sách trả hàng?', answer: 'Trong 30 ngày…', category: 'Đơn hàng' },
  ];
</script>

<!-- Hoặc viết tay: hui-faq chỉ "nâng cấp" các panel -->
<hui-faq search>
  <hui-collapse-panel header="Bảo hành bao lâu?" data-category="Sản phẩm">12 tháng…</hui-collapse-panel>
</hui-faq>
\`\`\`

> ⚠ **XSS:** \`answer\` luôn hiển thị bằng \`textContent\`. \`answerHtml\` chỉ được dùng khi bật \`allow-html\` —
> nội dung được chèn bằng \`innerHTML\`, **chỉ dùng với HTML tin cậy / đã lọc** (không dùng cho nội dung người dùng nhập).

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`search\` | boolean | \`false\` | Hiện ô tìm (không phân biệt hoa/thường + dấu tiếng Việt, tô sáng \`<mark>\`) |
| \`query\` | string | \`''\` | Từ khóa đang tìm |
| \`search-placeholder\` | string | locale | Chữ gợi ý ô tìm |
| \`expand-all\` | boolean | \`false\` | Nút "Mở tất cả / Thu gọn tất cả" (ẩn khi \`accordion\`) |
| \`accordion\` | boolean | \`false\` | Chỉ mở 1 câu hỏi (trong mỗi nhóm) |
| \`variant\` | string | \`'default'\` | \`default\` / \`ghost\` / \`card\` / \`separated\` |
| \`size\` | string | \`'md'\` | \`sm\` / \`md\` / \`lg\` |
| \`expand-icon-position\` | string | \`'start'\` | \`start\` / \`end\` |
| \`group-by-category\` | string | — | \`tabs\` (hoặc rỗng) / \`headings\` |
| \`active-category\` | string | \`''\` | Chủ đề đang chọn (tabs), \`''\` = Tất cả |
| \`seo\` | boolean | \`false\` | Chèn JSON-LD FAQPage vào \`<head>\`, tự gỡ khi tháo |
| \`allow-html\` | boolean | \`false\` | Cho phép \`answerHtml\` (⚠ XSS) |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng hiện lần lượt khi cuộn tới |
| \`src\` / \`data-path\` / \`params\` / \`debounce\` / \`loading\` / \`empty-text\` | | | Từ DataController |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`data\` | \`{question, answer, category?, key?, active?, answerHtml?}[]\` | Dữ liệu (cũng nhận JSON qua attribute) |
| \`fetchFn\` | \`(params, {signal}) => Promise\` | Tự lấy dữ liệu |
| \`dataState\` | string | \`idle\` / \`loading\` / \`empty\` / \`error\` / \`ready\` |
| \`openAll()\` / \`closeAll()\` | method | Mở / thu mọi câu đang hiện |
| \`refresh()\` | method | Đọc lại panel viết tay (sau khi sửa chữ) |
| \`reload()\` | method | Tải lại \`src\` / \`fetchFn\` |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-search\` | \`{ query, matches }\` | Người dùng gõ tìm |
| \`hui-category-change\` | \`{ category }\` | Đổi tab chủ đề |
| \`change\` | \`{ activeKeys }\` | (hui-collapse) mở/đóng câu hỏi |
| \`hui-load\` / \`hui-error\` | \`{ data, total }\` / \`{ error }\` | Tải dữ liệu |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Các \`<hui-collapse-panel>\` viết tay (\`data-category\` để nhóm) |

### Parts
\`base\`, \`toolbar\`, \`search\`, \`expand-button\`, \`tabs\`, \`body\`, \`list\`, \`group\`, \`category\`,
\`collapse\` / \`question\` / \`answer\` (chỉ khi dùng data), \`empty\`, \`state\`

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-faq-gap\` | \`--hui-space-lg\` | Khoảng cách toolbar ↔ danh sách |
| \`--hui-faq-group-gap\` | \`--hui-space-xl\` | Khoảng cách giữa các nhóm |
| \`--hui-faq-category-color\` / \`-font-size\` | \`--hui-text\` / \`--hui-font-lg\` | Tiêu đề chủ đề |
| \`--hui-faq-question-font-weight\` | medium | Độ đậm câu hỏi |
| \`--hui-faq-answer-color\` | inherit | Màu câu trả lời |
| \`--hui-faq-search-max-width\` | none | Rộng tối đa ô tìm |
| \`--hui-faq-mark-bg\` / \`-color\` / \`-radius\` | \`--hui-warning-3\` | Chữ được tô sáng |
| \`--hui-faq-card-bg\` / \`-card-shadow\` | container / \`--hui-shadow-md\` | Variant card |
| \`--hui-faq-item-bg\` / \`-border-color\` / \`-radius\` / \`-gap\` / \`-shadow\` | | Variant separated |
| \`--hui-collapse-*\` | | Toàn bộ biến của hui-collapse |

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Ô tìm → nút mở tất cả → tab chủ đề → các câu hỏi |
| \`Enter\` / \`Space\` | Mở / đóng câu hỏi |
| \`↓\` / \`↑\` / \`Home\` / \`End\` | Chuyển câu hỏi (hui-collapse) |
| \`←\` / \`→\` | Chuyển tab chủ đề (hui-tabs) |
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'ghost', 'card', 'separated'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    search: { control: 'boolean' },
    'expand-all': { control: 'boolean' },
    accordion: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-faq
      .data=${FAQ_DATA}
      ?search=${args.search}
      ?expand-all=${args['expand-all']}
      ?accordion=${args.accordion}
      variant=${args.variant}
      size=${args.size}
    ></hui-faq>
  `,
  args: { search: true, 'expand-all': true, accordion: false, variant: 'default', size: 'md' },
  play: async ({ canvasElement }) => {
    const faq = faqOf(canvasElement);
    await faq.updateComplete;
    await expect(panelsOf(faq).length).toBe(6);

    // Không dấu + không phân biệt hoa thường: "tra hang" khớp "trả hàng"
    let detail = null;
    faq.addEventListener('hui-search', (e) => { detail = e.detail; }, { once: true });
    await typeSearch(faq, 'tra hang');
    await expect(visiblePanels(faq).length).toBe(1);
    const header = visiblePanels(faq)[0].querySelector('[slot="header"]');
    const marks = [...header.querySelectorAll('mark')].map((m) => m.textContent);
    await expect(marks).toEqual(['trả', 'hàng']);
    await expect(header.textContent).toBe('Chính sách trả hàng như thế nào?');
    await waitFor(() => expect(detail).toEqual({ query: 'tra hang', matches: 1 }));

    await typeSearch(faq, 'TRẢ HÀNG');
    await expect(visiblePanels(faq).length).toBe(1);

    // Không có kết quả → hui-empty
    await typeSearch(faq, 'xyz không tồn tại');
    await expect(visiblePanels(faq).length).toBe(0);
    await expect(faq.shadowRoot.querySelector('hui-empty').hidden).toBe(false);

    // Xóa từ khóa → hiện lại tất cả, gỡ <mark>
    await typeSearch(faq, '');
    await expect(visiblePanels(faq).length).toBe(6);
    await expect(faq.shadowRoot.querySelectorAll('mark').length).toBe(0);
    await expect(faq.shadowRoot.querySelector('hui-empty').hidden).toBe(true);
  },
};

export const ExpandAll = {
  render: () => html`<hui-faq .data=${FAQ_DATA} expand-all></hui-faq>`,
  play: async ({ canvasElement }) => {
    const faq = faqOf(canvasElement);
    await faq.updateComplete;
    const btn = faq.shadowRoot.querySelector('[part="expand-button"]');
    await expect(btn.textContent).toBe('Mở tất cả');

    btn.click();
    await faq.updateComplete;
    await nextFrame();
    await expect(panelsOf(faq).every((p) => p.active)).toBe(true);
    await expect(btn.textContent).toBe('Thu gọn tất cả');
    await expect(faq.shadowRoot.querySelector('hui-collapse').activeKey.length).toBe(6);

    btn.click();
    await faq.updateComplete;
    await expect(panelsOf(faq).some((p) => p.active)).toBe(false);
    await expect(btn.textContent).toBe('Mở tất cả');
  },
};

export const Variants = {
  render: () => html`
    <div style="display: grid; gap: 32px;">
      ${['default', 'ghost', 'card', 'separated'].map((v) => html`
        <div>
          <p style="margin: 0 0 8px; color: var(--hui-text-secondary);">variant="${v}"</p>
          <hui-faq variant=${v} .data=${FAQ_DATA.slice(0, 3)}></hui-faq>
        </div>
      `)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const all = [...canvasElement.querySelectorAll('hui-faq')];
    await all[3].updateComplete;
    const [ghost, , separated] = [all[1], all[2], all[3]];
    await expect(ghost.shadowRoot.querySelector('hui-collapse').hasAttribute('ghost')).toBe(true);
    const sepPanels = panelsOf(separated);
    await expect(separated.shadowRoot.querySelector('hui-collapse').hasAttribute('ghost')).toBe(true);
    await expect(sepPanels[0].style.borderRadius).not.toBe('');
    await expect(sepPanels[0].style.marginBlockEnd).not.toBe('');
    await expect(sepPanels[2].style.marginBlockEnd).toBe('');
  },
};

export const Accordion = {
  render: () => html`<hui-faq accordion variant="separated" .data=${FAQ_DATA}></hui-faq>`,
};

export const GroupByTabs = {
  render: () => html`<hui-faq search group-by-category="tabs" .data=${FAQ_DATA}></hui-faq>`,
  play: async ({ canvasElement }) => {
    const faq = faqOf(canvasElement);
    await faq.updateComplete;
    const tabs = faq.shadowRoot.querySelector('hui-tabs');
    await tabs.updateComplete;
    await waitFor(() => expect(tabs.shadowRoot.querySelectorAll('[role="tab"]').length).toBe(4));
    const tabEls = [...tabs.shadowRoot.querySelectorAll('[role="tab"]')];
    await expect(tabEls.map((x) => x.textContent)).toEqual(['Tất cả', 'Đơn hàng', 'Vận chuyển', 'Thanh toán']);

    let cat = null;
    faq.addEventListener('hui-category-change', (e) => { cat = e.detail.category; }, { once: true });
    tabEls[3].click();
    await faq.updateComplete;
    await expect(cat).toBe('Thanh toán');
    await expect(faq.activeCategory).toBe('Thanh toán');
    await expect(visiblePanels(faq).length).toBe(2);
    // Danh sách nằm trong tab-panel đang mở (đúng vai trò tabpanel)
    await expect(faq.shadowRoot.querySelector('[part="body"]').parentElement.getAttribute('key')).toBe('c2');

    // Tìm thứ không có trong tab hiện tại → tự về "Tất cả"
    await typeSearch(faq, 'tra hang');
    await waitFor(() => expect(faq.activeCategory).toBe(''));
    await faq.updateComplete;
    await expect(visiblePanels(faq).length).toBe(1);
  },
};

export const GroupByHeadings = {
  render: () => html`<hui-faq search group-by-category="headings" variant="ghost" .data=${FAQ_DATA}></hui-faq>`,
  play: async ({ canvasElement }) => {
    const faq = faqOf(canvasElement);
    await faq.updateComplete;
    const headings = [...faq.shadowRoot.querySelectorAll('[part="category"]')];
    await expect(headings.map((h) => h.textContent)).toEqual(['Đơn hàng', 'Vận chuyển', 'Thanh toán']);
    await expect(faq.shadowRoot.querySelectorAll('hui-collapse').length).toBe(3);

    // Nhóm không còn kết quả thì ẩn cả tiêu đề
    await typeSearch(faq, 'van chuyen');
    const groups = [...faq.shadowRoot.querySelectorAll('[part="group"]')];
    await expect(groups.map((g) => g.hidden)).toEqual([true, false, true]);
  },
};

export const LightDomPanels = {
  render: () => html`
    <hui-faq search expand-all>
      <hui-collapse-panel header="Sản phẩm được bảo hành bao lâu?" active>
        <p>Bảo hành <strong>12 tháng</strong> tại mọi trung tâm bảo hành chính hãng.</p>
      </hui-collapse-panel>
      <hui-collapse-panel key="doi-tra">
        <span slot="header">Đổi trả sản phẩm lỗi?</span>
        Đổi mới trong 7 ngày nếu lỗi do nhà sản xuất.
      </hui-collapse-panel>
      <hui-collapse-panel header="Có hỗ trợ trả góp không?">Có, trả góp 0% qua thẻ tín dụng.</hui-collapse-panel>
    </hui-faq>
  `,
  play: async ({ canvasElement }) => {
    const faq = faqOf(canvasElement);
    await faq.updateComplete;
    // Panel được gom vào hui-collapse ở light DOM, giữ trạng thái active của tác giả
    const collapse = faq.querySelector(':scope > hui-collapse');
    await expect(collapse).toBeTruthy();
    const panels = [...collapse.querySelectorAll('hui-collapse-panel')];
    await expect(panels.length).toBe(3);
    await expect(panels[0].active).toBe(true);

    await typeSearch(faq, 'bao hanh');
    await expect(visiblePanels(faq).length).toBe(1);
    const marks = [...panels[0].querySelectorAll('mark')].map((m) => m.textContent.toLowerCase());
    // Mỗi từ khóa tô riêng: "bảo", "hành" (và "bao" trong "bao lâu")
    await expect(marks).toEqual(['bảo', 'hành', 'bao', 'bảo', 'hành', 'bảo', 'hành']);
    await expect(panels[0].querySelector('strong').textContent).toBe('12 tháng');

    await typeSearch(faq, '');
    await expect(panels[0].querySelectorAll('mark').length).toBe(0);
    await expect(panels[0].querySelector('p').textContent).toBe('Bảo hành 12 tháng tại mọi trung tâm bảo hành chính hãng.');

    // Panel thêm sau cũng được nâng cấp
    const extra = document.createElement('hui-collapse-panel');
    extra.setAttribute('header', 'Câu hỏi thêm sau');
    extra.textContent = 'Nội dung mới';
    faq.append(extra);
    await waitFor(() => expect(faq.querySelector(':scope > hui-collapse').querySelectorAll('hui-collapse-panel').length).toBe(4));
  },
};

const SEO_DATA = [
  ...FAQ_DATA.slice(0, 2),
  { question: 'Ký tự đặc biệt?', answer: 'Không thể thoát </script><!-- ra ngoài thẻ script' },
];

export const Seo = {
  render: () => html`<hui-faq seo .data=${SEO_DATA}></hui-faq>`,
  play: async ({ canvasElement }) => {
    const faq = faqOf(canvasElement);
    await faq.updateComplete;
    const scripts = () => [...document.head.querySelectorAll('script[type="application/ld+json"][data-hui-faq]')];
    await expect(scripts().length).toBe(1);
    const raw = scripts()[0].textContent;
    await expect(raw.includes('</script')).toBe(false);
    await expect(raw.includes('<!--')).toBe(false);
    const json = JSON.parse(raw);
    await expect(json['@type']).toBe('FAQPage');
    await expect(json.mainEntity.length).toBe(3);
    await expect(json.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'Chính sách trả hàng như thế nào?',
      acceptedAnswer: { '@type': 'Answer', text: FAQ_DATA[0].answer },
    });
    await expect(json.mainEntity[2].acceptedAnswer.text).toBe(SEO_DATA[2].answer);

    // Đổi dữ liệu → JSON-LD cập nhật
    faq.data = FAQ_DATA;
    await faq.updateComplete;
    await expect(JSON.parse(scripts()[0].textContent).mainEntity.length).toBe(6);

    // Tháo khỏi trang → gỡ; gắn lại → chèn lại
    const parent = faq.parentNode;
    faq.remove();
    await expect(scripts().length).toBe(0);
    parent.append(faq);
    await expect(scripts().length).toBe(1);
  },
};

export const AllowHtml = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <hui-faq id="safe" .data=${[{ question: 'Mặc định (an toàn)', answer: '<b>không</b> được hiểu là HTML', answerHtml: '<b>bị bỏ qua</b>', active: true }]}></hui-faq>
      <hui-faq id="html" allow-html .data=${[{ question: 'allow-html (HTML tin cậy)', answerHtml: 'Liên hệ <a href="#">bộ phận hỗ trợ</a> hoặc gọi <b>1900 1234</b>.', active: true }]}></hui-faq>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const safe = canvasElement.querySelector('#safe');
    const htmlFaq = canvasElement.querySelector('#html');
    await htmlFaq.updateComplete;
    const safeAnswer = safe.shadowRoot.querySelector('[part="answer"]');
    await expect(safeAnswer.querySelector('b')).toBe(null);
    await expect(safeAnswer.textContent).toBe('<b>không</b> được hiểu là HTML');
    await expect(htmlFaq.shadowRoot.querySelector('[part="answer"] b').textContent).toBe('1900 1234');
  },
};

export const RemoteData = {
  render: () => html`
    <hui-faq
      search
      .fetchFn=${() => new Promise((resolve) => setTimeout(() => resolve(FAQ_DATA), 800))}
    ></hui-faq>
  `,
  play: async ({ canvasElement }) => {
    const faq = faqOf(canvasElement);
    await waitFor(() => expect(faq.dataState).toBe('loading'));
    await waitFor(() => expect(faq.dataState).toBe('ready'), { timeout: 3000 });
    await faq.updateComplete;
    await expect(panelsOf(faq).length).toBe(6);
  },
};

export const EmptyData = {
  render: () => html`<hui-faq .data=${[]} empty-text="Chưa có câu hỏi nào"></hui-faq>`,
  play: async ({ canvasElement }) => {
    const faq = faqOf(canvasElement);
    await faq.updateComplete;
    await expect(faq.dataState).toBe('empty');
    await expect(faq.shadowRoot.querySelector('[part="state"] hui-empty')).toBeTruthy();
  },
};

export const NoAnimation = {
  render: () => html`<hui-faq no-animation .data=${FAQ_DATA.slice(0, 3)}></hui-faq>`,
  play: async ({ canvasElement }) => {
    const faq = faqOf(canvasElement);
    await faq.updateComplete;
    await expect(faq.shadowRoot.querySelector('.faq__list--pending')).toBe(null);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-faq {
        --hui-faq-mark-bg: var(--hui-primary-3);
        --hui-faq-item-border-color: var(--hui-primary-3);
        --hui-faq-item-radius: 4px;
        --hui-faq-item-gap: 4px;
        --hui-faq-question-font-weight: 700;
        --hui-faq-answer-color: var(--hui-text-secondary);
        --hui-collapse-header-color: var(--hui-primary-7);
        --hui-collapse-icon-color: var(--hui-primary);
      }
      .brand-faq::part(toolbar) { padding: 12px; border-radius: 8px; background: var(--hui-primary-1); }
      .brand-faq::part(question) { letter-spacing: 0.01em; }
    </style>
    <hui-faq class="brand-faq" variant="separated" search expand-all query="giao" .data=${FAQ_DATA}></hui-faq>
  `,
  play: async ({ canvasElement }) => {
    const faq = faqOf(canvasElement);
    await faq.updateComplete;
    // query gán sẵn qua attribute → đã lọc + tô sáng
    await expect(visiblePanels(faq).length).toBe(2);
    await expect(faq.shadowRoot.querySelector('mark')).toBeTruthy();
  },
};
