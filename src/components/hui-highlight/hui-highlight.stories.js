/**
 * Storybook Stories — HUI Highlight
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import { highlightText } from './hui-highlight.js';
import './index.js';

const marksOf = (el) => [...el.shadowRoot.querySelectorAll('[part="mark"]')].map((m) => m.textContent);

export default {
  title: 'Atoms/HuiHighlight',
  component: 'hui-highlight',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Highlight** — Tô sáng từ khóa tìm kiếm trong đoạn chữ. Mặc định **không phân biệt dấu tiếng Việt** và hoa/thường:
gõ \`ha noi\` vẫn tô đúng "Hà Nội". Nhiều từ cách nhau bằng khoảng trắng; \`"cụm từ"\` trong ngoặc kép được giữ nguyên cụm.

\`\`\`html
<hui-highlight query="ha noi">Thủ đô Hà Nội nghìn năm văn hiến</hui-highlight>
<hui-highlight text="Áo thun cotton nam" query="ao nam"></hui-highlight>
\`\`\`

Nội dung slot có thể chứa thẻ định dạng (\`<b>\`, \`<a>\`, \`<code>\`…): component **nhân bản cấu trúc node** và chỉ ghi \`textContent\`
(không bao giờ dùng \`innerHTML\`) → an toàn với dữ liệu người dùng nhập. Đổi chữ trong light DOM → tự tô lại.

Hàm thuần dùng được ở nơi khác (vd tự tô trong cell bảng):
\`\`\`js
import { highlightText } from '@itmrhoang/h-ui';
highlightText('Hà Nội, Hải Phòng', 'ha') // → [[0, 2], [8, 10]]
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`query\` | string | — | Từ khóa (nhiều từ / "cụm từ") |
| \`text\` | string | — | Chữ nguồn, thay cho nội dung slot |
| \`case-sensitive\` | boolean | \`false\` | Phân biệt hoa / thường |
| \`diacritics\` | string | \`insensitive\` | \`insensitive\` \\| \`sensitive\` — sensitive: "ha" không khớp "hà" |
| \`max-marks\` | number | \`0\` | Số đoạn tô tối đa (0 = không giới hạn) |

### Properties (chỉ đọc)
| Tên | Mô tả |
|-----|-------|
| \`matchCount\` | Số đoạn đang tô |
| \`ranges\` | Mảng \`[start, end)\` trên chữ nguồn |

### Hàm export
| Hàm | Mô tả |
|-----|-------|
| \`highlightText(text, query, { caseSensitive, diacritics, maxMarks })\` | Trả \`Array<[start, end]>\` đã sắp xếp + gộp chồng lấn |
| \`parseQuery(query)\` | Tách query thành mảng từ / cụm từ |

### Events
Không có. Custom state \`:state(matched)\` khi có ít nhất 1 đoạn khớp.

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Đoạn chữ cần tô (bị bỏ qua khi có \`text\`) |

### Parts
\`base\`, \`mark\` (mỗi \`<mark>\`).

### CSS Variables
| Biến | Mặc định |
|------|----------|
| \`--hui-highlight-bg\` | warning 35% |
| \`--hui-highlight-color\` | kế thừa |
| \`--hui-highlight-font-weight\` | kế thừa |
| \`--hui-highlight-radius\` | \`2px\` |
| \`--hui-highlight-padding\` | \`0 1px\` |

### Bàn phím / A11y
Không nhận focus. Dùng thẻ \`<mark>\` chuẩn (trình đọc màn hình hỗ trợ đọc "đánh dấu"); chế độ tương phản cao dùng màu hệ thống \`Mark\`.
        `,
      },
    },
  },
  argTypes: {
    query: { control: 'text' },
    text: { control: 'text' },
    caseSensitive: { control: 'boolean' },
    diacritics: { control: 'inline-radio', options: ['insensitive', 'sensitive'] },
    maxMarks: { control: 'number' },
  },
};

export const Default = {
  args: { query: 'ha noi', caseSensitive: false, diacritics: 'insensitive', maxMarks: 0 },
  render: (args) => html`
    <p style="font-size: 15px;">
      <hui-highlight query=${args.query} ?case-sensitive=${args.caseSensitive} diacritics=${args.diacritics} max-marks=${args.maxMarks}
        >Thủ đô Hà Nội có Hồ Hoàn Kiếm; HÀ NỘI mùa thu rất đẹp, ai cũng muốn về Hà Nội một lần.</hui-highlight>
    </p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-highlight');
    // 2 từ "ha" + "noi" → tô riêng từng từ
    await waitFor(() => expect(marksOf(el)).toEqual(['Hà', 'Nội', 'HÀ', 'NỘI', 'Hà', 'Nội']));
    await expect(el.matchCount).toBe(6);
    // Cụm trong ngoặc kép → tô cả cụm
    el.query = '"ha noi"';
    await waitFor(() => expect(marksOf(el)).toEqual(['Hà Nội', 'HÀ NỘI', 'Hà Nội']));
    await expect(el.shadowRoot.querySelector('mark').tagName).toBe('MARK');
  },
};

/** Nhiều từ + "cụm từ" trong ngoặc kép */
export const MultipleWords = {
  render: () => html`
    <p><hui-highlight query='áo "quần jean" nam'>Áo sơ mi nam, quần jean nữ, áo khoác nam và quần jean nam.</hui-highlight></p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-highlight');
    await waitFor(() => expect(el.matchCount).toBe(7));
    await expect(marksOf(el)).toEqual(['Áo', 'nam', 'quần jean', 'áo', 'nam', 'quần jean', 'nam']);
  },
};

/** Phân biệt dấu / hoa thường */
export const Sensitivity = {
  render: () => html`
    <div style="display: grid; gap: 8px;">
      <div><code>mặc định</code> — <hui-highlight class="d" query="ha" text="Hà Giang, ha ha, HA LONG"></hui-highlight></div>
      <div><code>diacritics="sensitive"</code> — <hui-highlight class="s" diacritics="sensitive" query="ha" text="Hà Giang, ha ha, HA LONG"></hui-highlight></div>
      <div><code>case-sensitive</code> — <hui-highlight class="c" case-sensitive query="HA" text="Hà Giang, ha ha, HA LONG"></hui-highlight></div>
      <div><code>max-marks="2"</code> — <hui-highlight class="m" max-marks="2" query="ha" text="Hà Giang, ha ha, HA LONG"></hui-highlight></div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const q = (s) => canvasElement.querySelector(s);
    await waitFor(() => expect(marksOf(q('.d'))).toEqual(['Hà', 'ha', 'ha', 'HA']));
    await expect(marksOf(q('.s'))).toEqual(['ha', 'ha', 'HA']);
    await expect(marksOf(q('.c'))).toEqual(['HA']);
    await expect(marksOf(q('.m'))).toEqual(['Hà', 'ha']);
    // Hàm thuần
    await expect(highlightText('Hà Nội, Hải Phòng', 'ha')).toEqual([[0, 2], [8, 10]]);
    await expect(highlightText('Hà Nội', 'ha', { diacritics: 'sensitive' })).toEqual([]);
    // Chuỗi dạng NFD: dấu kết hợp rời vẫn nằm trong đoạn tô
    await expect(highlightText('Hà Nội', '"ha noi"')).toEqual([[0, 9]]);
    // Khoảng chồng lấn được gộp
    await expect(highlightText('abcdef', 'abc cde')).toEqual([[0, 5]]);
  },
};

/** Gõ để tìm — query đổi là tô lại ngay */
export const LiveSearch = {
  render: () => html`
    <label style="display: block; margin-bottom: 8px;">Tìm: <input class="q" value="" placeholder="vd: da nang" /></label>
    <ul class="list" style="line-height: 1.8;">
      ${['Đà Nẵng — thành phố đáng sống', 'Hội An cổ kính', 'Đà Lạt ngàn hoa', 'Nha Trang biển xanh'].map((s) => html`<li><hui-highlight text=${s}></hui-highlight></li>`)}
    </ul>
    <p class="count" role="status"></p>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('.q');
    const items = [...canvasElement.querySelectorAll('hui-highlight')];
    const count = canvasElement.querySelector('.count');
    input.addEventListener('input', () => {
      items.forEach((h) => { h.query = input.value; });
      queueMicrotask(() => { count.textContent = `${items.reduce((n, h) => n + h.matchCount, 0)} kết quả`; });
    });
    await userEvent.type(input, 'da');
    await waitFor(() => expect(marksOf(items[0])).toEqual(['Đà', 'đá']));
    await expect(marksOf(items[2])).toEqual(['Đà']);
    await expect(items[1].matchCount).toBe(0);
    await waitFor(() => expect(count.textContent).toBe('3 kết quả'));
  },
};

/** Light DOM có định dạng — giữ nguyên thẻ, đoạn khớp vắt qua nhiều thẻ vẫn tô đúng; chữ đổi → tô lại */
export const RichContent = {
  render: () => html`
    <p>
      <hui-highlight query="react web component">
        So sánh <b>React</b> và <a href="#">Web <em>Compo</em>nents</a>: <code>customElements.define()</code>
        giúp viết <span class="live">component</span> không phụ thuộc framework.
      </hui-highlight>
    </p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-highlight');
    await waitFor(() => expect(el.matchCount).toBe(4));
    const base = el.shadowRoot.querySelector('[part="base"]');
    // Cấu trúc được giữ: <b>, <a>, <em>, <code>
    await expect(base.querySelector('b mark').textContent).toBe('React');
    await expect(base.querySelector('a em mark').textContent).toBe('Compo');
    await expect(base.querySelector('code')).not.toBeNull();
    // "Component" vắt qua <em> → 2 mảnh mark, vẫn tính 1 đoạn khớp
    await expect(marksOf(el)).toEqual(['React', 'Web', 'Compo', 'nent', 'component']);
    // Đổi chữ trong light DOM → tự tô lại (MutationObserver)
    el.querySelector('.live').textContent = 'thành phần';
    await waitFor(() => expect(marksOf(el)).toEqual(['React', 'Web', 'Compo', 'nent']));
    await expect(el.matchCount).toBe(3);
  },
};

/** An toàn: chữ chứa HTML chỉ hiện dạng văn bản */
export const SafeText = {
  render: () => html`<hui-highlight query="script" text="<img src=x onerror=alert(1)> <script>alert('x')</script>"></hui-highlight>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-highlight');
    await waitFor(() => expect(el.matchCount).toBe(2));
    const base = el.shadowRoot.querySelector('[part="base"]');
    await expect(base.querySelector('img, script')).toBeNull();
    await expect(base.textContent).toContain('<img src=x');
  },
};

/** Override từ ngoài: biến CSS + ::part(mark) */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .hl-brand {
        --hui-highlight-bg: var(--hui-primary);
        --hui-highlight-color: var(--hui-text-inverse);
        --hui-highlight-radius: var(--hui-radius-sm);
        --hui-highlight-padding: 0 4px;
      }
      .hl-underline::part(mark) {
        background: none;
        color: var(--hui-danger);
        text-decoration: underline wavy;
        font-weight: 600;
      }
    </style>
    <p><hui-highlight class="hl-brand" query="vietnam">Du lịch Việt Nam — Vietnam travel guide</hui-highlight></p>
    <p><hui-highlight class="hl-underline" query="loi">Có 2 lỗi chính tả trong đoạn này: lôi, lõi.</hui-highlight></p>
  `,
  play: async ({ canvasElement }) => {
    const [brand, under] = canvasElement.querySelectorAll('hui-highlight');
    await waitFor(() => expect(marksOf(brand)).toEqual(['Vietnam']));
    await expect(marksOf(under)).toEqual(['lỗi', 'lôi', 'lõi']);
    const mark = under.shadowRoot.querySelector('mark');
    await expect(getComputedStyle(mark).fontWeight).toBe('600');
  },
};
