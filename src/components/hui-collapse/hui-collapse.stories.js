/**
 * Storybook Stories — HUI Collapse
 * Nhóm panel đóng/mở (Ant Collapse + MUI Accordion), theo mẫu WAI-ARIA APG Accordion.
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const TEXT = 'Một con chó là loại vật nuôi trung thành, được nuôi ở nhiều gia đình trên khắp thế giới như một người bạn đồng hành.';

/** Trigger (phần tử role=button) bên trong panel */
const triggerOf = (panel) => panel.shadowRoot.querySelector('[role="button"]');
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export default {
  title: 'Components/HuiCollapse',
  component: 'hui-collapse',
  subcomponents: { HuiCollapsePanel: 'hui-collapse-panel' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Collapse** — nhóm panel đóng/mở, có chế độ accordion (chỉ mở 1 panel).

\`\`\`html
<hui-collapse active-key="1" accordion>
  <hui-collapse-panel key="1" header="Panel 1">Nội dung 1</hui-collapse-panel>
  <hui-collapse-panel key="2" header="Panel 2">Nội dung 2</hui-collapse-panel>
</hui-collapse>
\`\`\`

### Attributes — \`hui-collapse\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`active-key\` | string | — | Key panel đang mở, phân tách dấu phẩy (\`"1,3"\`) |
| \`accordion\` | boolean | \`false\` | Chỉ mở tối đa 1 panel |
| \`bordered\` | string | (bật) | \`bordered="false"\` để bỏ viền ngoài |
| \`ghost\` | boolean | \`false\` | Trong suốt: không nền, không viền |
| \`size\` | string | \`'md'\` | \`sm\` / \`md\` / \`lg\` |
| \`expand-icon-position\` | string | \`'start'\` | \`start\` / \`end\` — vị trí mũi tên |

### Attributes — \`hui-collapse-panel\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`key\` | string | chỉ số | Định danh dùng trong \`active-key\` |
| \`header\` | string | — | Tiêu đề (hoặc \`slot="header"\`) |
| \`active\` | boolean | \`false\` | Đang mở (thường do collapse điều khiển) |
| \`disabled\` | boolean | \`false\` | Không cho đóng/mở |
| \`collapsible\` | string | (cả hàng) | \`header\` (chỉ chữ + mũi tên) / \`icon\` (chỉ mũi tên) / \`disabled\` |
| \`show-arrow\` | string | (bật) | \`show-arrow="false"\` để ẩn mũi tên |
| \`heading-level\` | number | \`3\` | \`aria-level\` của heading bọc header |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`activeKey\` | \`string[]\` | Luôn trả về mảng; gán mảng hoặc chuỗi \`"1,2"\` |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ activeKeys: string[] }\` | Người dùng mở/đóng panel |

### Slots
| Thẻ | Slot | Mô tả |
|-----|------|-------|
| collapse | _(default)_ | Các \`hui-collapse-panel\` |
| panel | _(default)_ | Nội dung |
| panel | \`header\` | Tiêu đề tùy biến |
| panel | \`extra\` | Góc phải header (click không đóng/mở) |
| panel | \`icon\` | Thay mũi tên (tự xoay 90° khi mở) |

### Parts
| Thẻ | Part |
|-----|------|
| collapse | \`base\` |
| panel | \`item\`, \`header\`, \`icon\`, \`title\`, \`extra\`, \`content\`, \`content-box\` |

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-collapse-bg\` | \`--hui-fill-tertiary\` | Nền khung |
| \`--hui-collapse-border-color\` | \`--hui-border\` | Viền + đường kẻ |
| \`--hui-collapse-radius\` | \`--hui-radius-lg\` | Bo góc |
| \`--hui-collapse-header-bg\` | trong suốt | Nền header |
| \`--hui-collapse-header-padding\` | theo size | Đệm header |
| \`--hui-collapse-header-color\` | \`--hui-text\` | Màu chữ header |
| \`--hui-collapse-content-bg\` | \`--hui-bg-container\` | Nền nội dung |
| \`--hui-collapse-content-padding\` | theo size | Đệm nội dung |
| \`--hui-collapse-content-color\` | \`--hui-text\` | Màu chữ nội dung |
| \`--hui-collapse-icon-color\` | \`currentColor\` | Màu mũi tên |

### Bàn phím (APG Accordion)
| Phím | Hành động |
|------|-----------|
| \`Enter\` / \`Space\` | Mở / đóng panel đang focus |
| \`↓\` / \`↑\` | Chuyển tới header kế tiếp / trước (vòng) |
| \`Home\` / \`End\` | Header đầu / cuối |
| \`Tab\` | Đi qua các header và nội dung đang mở |
        `,
      },
    },
  },
  argTypes: {
    accordion: { control: 'boolean' },
    ghost: { control: 'boolean' },
    bordered: { control: 'inline-radio', options: ['true', 'false'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    'expand-icon-position': { control: 'inline-radio', options: ['start', 'end'] },
  },
};

const panels = () => html`
  <hui-collapse-panel key="1" header="Đây là panel 1">${TEXT}</hui-collapse-panel>
  <hui-collapse-panel key="2" header="Đây là panel 2">${TEXT}</hui-collapse-panel>
  <hui-collapse-panel key="3" header="Đây là panel 3">${TEXT}</hui-collapse-panel>
`;

export const Default = {
  render: (args) => html`
    <hui-collapse
      active-key="1"
      ?accordion=${args.accordion}
      ?ghost=${args.ghost}
      bordered=${args.bordered}
      size=${args.size}
      expand-icon-position=${args['expand-icon-position']}
    >${panels()}</hui-collapse>
  `,
  args: { accordion: false, ghost: false, bordered: 'true', size: 'md', 'expand-icon-position': 'start' },
  play: async ({ canvasElement }) => {
    const collapse = canvasElement.querySelector('hui-collapse');
    const [p1, p2] = collapse.querySelectorAll('hui-collapse-panel');
    await expect(collapse.activeKey).toEqual(['1']);
    await expect(triggerOf(p1).getAttribute('aria-expanded')).toBe('true');
    await expect(triggerOf(p2).getAttribute('aria-expanded')).toBe('false');

    // Không accordion → mở thêm panel 2, panel 1 vẫn mở
    let detail = null;
    collapse.addEventListener('change', (e) => { detail = e.detail; }, { once: true });
    triggerOf(p2).click();
    await expect(detail).toEqual({ activeKeys: ['1', '2'] });
    await expect(collapse.getAttribute('active-key')).toBe('1,2');
    await expect(triggerOf(p2).getAttribute('aria-expanded')).toBe('true');

    // region được liên kết với nút
    const region = p2.shadowRoot.querySelector('[role="region"]');
    await expect(triggerOf(p2).getAttribute('aria-controls')).toBe(region.id);
  },
};

export const Accordion = {
  render: () => html`<hui-collapse accordion active-key="1">${panels()}</hui-collapse>`,
  play: async ({ canvasElement }) => {
    const collapse = canvasElement.querySelector('hui-collapse');
    const [p1, p2, p3] = collapse.querySelectorAll('hui-collapse-panel');
    const t1 = triggerOf(p1);

    // Bàn phím: ↓ chuyển focus, End/Home, Enter mở
    t1.focus();
    t1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    await expect(p2.shadowRoot.activeElement).toBe(triggerOf(p2));
    triggerOf(p2).dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }));
    await expect(p3.shadowRoot.activeElement).toBe(triggerOf(p3));
    triggerOf(p3).dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true }));
    await expect(p1.shadowRoot.activeElement).toBe(t1);

    triggerOf(p2).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await expect(collapse.activeKey).toEqual(['2']);
    await expect(t1.getAttribute('aria-expanded')).toBe('false');
    await expect(triggerOf(p2).getAttribute('aria-expanded')).toBe('true');

    // Space trên panel đang mở → đóng hết
    triggerOf(p2).dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }));
    await expect(collapse.activeKey).toEqual([]);
    await expect(collapse.hasAttribute('active-key')).toBe(false);

    // Gán property mảng
    collapse.activeKey = ['3'];
    await collapse.updateComplete;
    await expect(p3.active).toBe(true);
    await expect(collapse.getAttribute('active-key')).toBe('3');
  },
};

export const AllSizes = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${['sm', 'md', 'lg'].map((size) => html`
        <hui-collapse size=${size} active-key="a">
          <hui-collapse-panel key="a" header="size=${size}">${TEXT}</hui-collapse-panel>
        </hui-collapse>
      `)}
    </div>
  `,
};

export const Borderless = {
  render: () => html`<hui-collapse bordered="false" active-key="1">${panels()}</hui-collapse>`,
};

export const Ghost = {
  render: () => html`<hui-collapse ghost active-key="1">${panels()}</hui-collapse>`,
};

export const IconPositionAndExtra = {
  render: () => html`
    <hui-collapse expand-icon-position="end" active-key="1">
      <hui-collapse-panel key="1" header="Mũi tên bên phải">
        ${TEXT}
        <hui-button slot="extra" size="sm" variant="ghost">Sửa</hui-button>
      </hui-collapse-panel>
      <hui-collapse-panel key="2" header="Không có mũi tên" show-arrow="false">${TEXT}</hui-collapse-panel>
      <hui-collapse-panel key="3">
        <strong slot="header">Header qua slot</strong>
        <span slot="icon" aria-hidden="true">➤</span>
        Mũi tên tùy biến bằng slot="icon".
      </hui-collapse-panel>
    </hui-collapse>
  `,
  play: async ({ canvasElement }) => {
    const p1 = canvasElement.querySelector('hui-collapse-panel');
    // Click vào extra không đóng panel
    canvasElement.querySelector('[slot="extra"]').click();
    await expect(p1.active).toBe(true);
  },
};

export const Collapsible = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      <hui-collapse>
        <hui-collapse-panel header="collapsible=header — chỉ chữ tiêu đề bấm được" collapsible="header">${TEXT}</hui-collapse-panel>
      </hui-collapse>
      <hui-collapse>
        <hui-collapse-panel header="collapsible=icon — chỉ mũi tên bấm được" collapsible="icon">${TEXT}</hui-collapse-panel>
      </hui-collapse>
      <hui-collapse>
        <hui-collapse-panel header="collapsible=disabled" collapsible="disabled">${TEXT}</hui-collapse-panel>
        <hui-collapse-panel header="disabled" disabled>${TEXT}</hui-collapse-panel>
      </hui-collapse>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [header, icon, disabledByCollapsible] = canvasElement.querySelectorAll('hui-collapse-panel');
    await expect(triggerOf(header).getAttribute('part')).toBe('title');
    await expect(triggerOf(icon).getAttribute('part')).toBe('icon');
    await expect(triggerOf(icon).getAttribute('aria-labelledby')).toBeTruthy();
    triggerOf(icon).click();
    await expect(icon.active).toBe(true);

    await expect(triggerOf(disabledByCollapsible).getAttribute('aria-disabled')).toBe('true');
    triggerOf(disabledByCollapsible).click();
    await expect(disabledByCollapsible.active).toBe(false);
  },
};

export const Nested = {
  render: () => html`
    <hui-collapse active-key="outer">
      <hui-collapse-panel key="outer" header="Panel ngoài">
        <hui-collapse active-key="inner">
          <hui-collapse-panel key="inner" header="Panel lồng bên trong">${TEXT}</hui-collapse-panel>
        </hui-collapse>
      </hui-collapse-panel>
    </hui-collapse>
  `,
  play: async ({ canvasElement }) => {
    const [outer, inner] = canvasElement.querySelectorAll('hui-collapse');
    const innerPanel = inner.querySelector('hui-collapse-panel');
    triggerOf(innerPanel).click();
    await nextFrame();
    // Đóng panel trong không ảnh hưởng collapse ngoài
    await expect(inner.activeKey).toEqual([]);
    await expect(outer.activeKey).toEqual(['outer']);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-collapse {
        --hui-collapse-bg: var(--hui-primary-1);
        --hui-collapse-border-color: var(--hui-primary-3);
        --hui-collapse-header-color: var(--hui-primary-7);
        --hui-collapse-icon-color: var(--hui-primary);
        --hui-collapse-radius: 4px;
      }
      hui-collapse-panel.fancy::part(title) { text-transform: uppercase; letter-spacing: 0.05em; }
      hui-collapse-panel.fancy::part(content-box) { font-style: italic; }
    </style>
    <div class="brand-collapse">
      <hui-collapse active-key="1">
        <hui-collapse-panel key="1" class="fancy" header="Biến CSS trên thẻ cha + ::part()">${TEXT}</hui-collapse-panel>
        <hui-collapse-panel key="2" header="Panel 2">${TEXT}</hui-collapse-panel>
      </hui-collapse>
    </div>
  `,
};
