/**
 * Storybook Stories — HUI Tabs
 * Ant Tabs + MUI Tabs: type line / card / editable-card, 4 vị trí, ink bar trượt, cuộn khi tràn, bàn phím APG.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }));
const tabsOf = (el) => [...el.shadowRoot.querySelectorAll('[role="tab"]')];

export default {
  title: 'Components/HuiTabs',
  component: 'hui-tabs',
  subcomponents: { HuiTabPanel: 'hui-tab-panel' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Tabs** — Chuyển giữa các vùng nội dung cùng cấp (Ant Tabs + MUI Tabs).
Thanh tab được dựng trong Shadow DOM từ các \`<hui-tab-panel>\` con; panel vẫn nằm ở light DOM và chỉ bật/tắt \`hidden\`
(panel chưa từng mở thì nội dung không hiển thị — "lazy" theo kiểu light DOM).

\`\`\`html
<hui-tabs active-key="2" @change=\${(e) => console.log(e.detail.key)}>
  <hui-tab-panel key="1" label="Tổng quan">...</hui-tab-panel>
  <hui-tab-panel key="2" label="Cài đặt" icon="settings">...</hui-tab-panel>
  <hui-tab-panel key="3" disabled label="Khóa">...</hui-tab-panel>
</hui-tabs>
\`\`\`

### Attributes — hui-tabs
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`active-key\` | string | _tab đầu_ | Key tab đang mở (tự cập nhật khi người dùng đổi tab) |
| \`type\` | \`line \\| card \\| editable-card\` | \`line\` | editable-card: có ✕ trên tab và nút "+" |
| \`placement\` | \`top \\| bottom \\| left \\| right\` | \`top\` | Vị trí thanh tab |
| \`centered\` | boolean | \`false\` | Căn giữa tab |
| \`size\` | \`sm \\| md \\| lg\` | \`md\` | Kích thước |
| \`hide-add\` | boolean | \`false\` | Ẩn nút "+" của editable-card |

### Attributes — hui-tab-panel
| Attribute | Type | Mô tả |
|-----------|------|-------|
| \`key\` / \`name\` | string | Khóa định danh (trống → theo vị trí 0, 1, 2...) |
| \`label\` | string | Nhãn tab (slot \`label\` ưu tiên hơn) |
| \`icon\` | string | Tên hui-icon |
| \`disabled\` | boolean | Không chọn được |
| \`closable\` | boolean | Hiện ✕. Với editable-card mặc định có — đặt \`closable="false"\` để tắt |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ key }\` | Người dùng đổi tab, hoặc tab đang mở bị gỡ (tự chọn tab kề bên) |
| \`hui-add\` | — | Bấm "+" — tự thêm \`<hui-tab-panel>\` |
| \`hui-close\` | \`{ key, panel }\` | Bấm ✕ / phím Delete — tự gỡ panel (component không tự xóa để không lệch state của framework) |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Các \`<hui-tab-panel>\` |
| \`extra\` | Nội dung phụ ở cuối thanh tab |
| \`label\` _(của hui-tab-panel)_ | Nhãn tab dạng HTML (được sao chép lên thanh tab) |

### Bàn phím (WAI-ARIA APG Tabs — kích hoạt tự động)
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Vào tab đang chọn → Tab tiếp vào panel |
| \`←\` / \`→\` (\`↑\` / \`↓\` khi left/right) | Tab trước / sau (vòng tròn, bỏ qua disabled) và mở luôn |
| \`Home\` / \`End\` | Tab đầu / cuối |
| \`Delete\` / \`Backspace\` | Đóng tab (nếu đóng được) |

ARIA: \`role="tablist" / "tab" / "tabpanel"\`, \`aria-selected\`, \`aria-controls\` (qua \`ariaControlsElements\` vì tab nằm trong
shadow, panel ở light DOM), panel có \`aria-label\` theo nhãn tab.

### Parts
\`base\`, \`nav\`, \`nav-wrap\`, \`tablist\`, \`tab\` (+ \`tab-active\`, \`tab-disabled\`), \`tab-icon\`, \`tab-label\`, \`close-button\`,
\`ink-bar\`, \`scroll-button\` (+ \`scroll-prev\`, \`scroll-next\`), \`add-button\`, \`extra\`, \`content\`. State: \`:state(overflow)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-tabs-color\` / \`--hui-tabs-hover-color\` / \`--hui-tabs-active-color\` | Màu chữ tab |
| \`--hui-tabs-ink-color\` / \`--hui-tabs-ink-size\` | Màu / độ dày ink bar |
| \`--hui-tabs-border-color\` | Đường kẻ thanh tab |
| \`--hui-tabs-gap\` / \`--hui-tabs-tab-padding\` / \`--hui-tabs-font-size\` | Khoảng cách, padding, cỡ chữ |
| \`--hui-tabs-card-bg\` / \`--hui-tabs-card-active-bg\` | Nền tab kiểu card |
| \`--hui-tabs-nav-margin\` | Khoảng cách thanh tab ↔ nội dung |
        `,
      },
    },
  },
  argTypes: {
    type: { control: 'radio', options: ['line', 'card', 'editable-card'] },
    placement: { control: 'radio', options: ['top', 'bottom', 'left', 'right'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    centered: { control: 'boolean' },
  },
};

const panels = () => html`
  <hui-tab-panel key="1" label="Tổng quan">Nội dung tab <b>Tổng quan</b>.</hui-tab-panel>
  <hui-tab-panel key="2" label="Thành viên">Danh sách thành viên.</hui-tab-panel>
  <hui-tab-panel key="3" label="Cài đặt">Cài đặt dự án.</hui-tab-panel>
`;

export const Default = {
  render: (args) => html`
    <hui-tabs type=${args.type} placement=${args.placement} size=${args.size} ?centered=${args.centered}
      @change=${(e) => console.log('[hui-tabs] change', e.detail)}>
      ${panels()}
    </hui-tabs>
  `,
  args: { type: 'line', placement: 'top', size: 'md', centered: false },
};

/** Ba kiểu: line (ink bar), card, editable-card. */
export const Types = {
  render: () => html`
    <div style="display: grid; gap: 32px;">
      <hui-tabs>${panels()}</hui-tabs>
      <hui-tabs type="card">${panels()}</hui-tabs>
    </div>
  `,
};

/** Bốn vị trí thanh tab. */
export const Placements = {
  render: () => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
      ${['top', 'bottom', 'left', 'right'].map((p) => html`
        <hui-tabs placement=${p}>
          <hui-tab-panel label="Tab 1">placement="${p}" — nội dung 1</hui-tab-panel>
          <hui-tab-panel label="Tab 2">placement="${p}" — nội dung 2</hui-tab-panel>
          <hui-tab-panel label="Tab 3">placement="${p}" — nội dung 3</hui-tab-panel>
        </hui-tabs>
      `)}
    </div>
  `,
};

/** Icon, tab disabled, nhãn HTML qua slot="label", slot extra và căn giữa. */
export const IconsDisabledAndSlots = {
  render: () => html`
    <div style="display: grid; gap: 32px;">
      <hui-tabs>
        <hui-tab-panel key="home" icon="home" label="Trang chủ">Trang chủ</hui-tab-panel>
        <hui-tab-panel key="user" icon="user" label="Hồ sơ">Hồ sơ</hui-tab-panel>
        <hui-tab-panel key="lock" icon="settings" label="Bị khóa" disabled>Không thấy</hui-tab-panel>
        <hui-tab-panel key="star">
          <span slot="label">Yêu thích <b style="color: var(--hui-danger)">3</b></span>
          Nhãn HTML qua slot="label"
        </hui-tab-panel>
        <hui-button slot="extra" size="sm" variant="outline">Extra</hui-button>
      </hui-tabs>
      <hui-tabs centered size="lg">${panels()}</hui-tabs>
      <hui-tabs size="sm" type="card">${panels()}</hui-tabs>
    </div>
  `,
};

/** Nhiều tab trong khung hẹp → hiện nút cuộn ‹ ›, tab được chọn tự cuộn vào khung. */
export const Overflow = {
  render: () => html`
    <div style="max-width: 420px;">
      <hui-tabs id="tabs-overflow" active-key="t15">
        ${Array.from({ length: 20 }, (_, i) => html`<hui-tab-panel key="t${i}" label="Tab số ${i + 1}">Nội dung ${i + 1}</hui-tab-panel>`)}
      </hui-tabs>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('#tabs-overflow');
    const next = tabs.shadowRoot.querySelector('[part~="scroll-next"]');
    await waitFor(() => expect(next.hidden).toBe(false));
    await expect(tabs.shadowRoot.querySelector('[aria-selected="true"]').textContent).toBe('Tab số 16');
  },
};

/** editable-card: thêm tab bằng "+", đóng bằng ✕ (component phát sự kiện, ứng dụng tự thêm / gỡ panel). */
export const EditableCard = {
  render: () => {
    let n = 3;
    const onAdd = (e) => {
      n += 1;
      const panel = document.createElement('hui-tab-panel');
      panel.setAttribute('key', `new-${n}`);
      panel.setAttribute('label', `Tab mới ${n}`);
      panel.textContent = `Nội dung tab mới ${n}`;
      e.currentTarget.append(panel);
      e.currentTarget.activeKey = `new-${n}`;
    };
    const onClose = (e) => e.detail.panel.remove();
    return html`
      <hui-tabs id="tabs-editable" type="editable-card" @hui-add=${onAdd} @hui-close=${onClose}>
        <hui-tab-panel key="a" label="Không đóng được" closable="false">Tab này không có ✕</hui-tab-panel>
        <hui-tab-panel key="b" label="Tab B">Nội dung B</hui-tab-panel>
        <hui-tab-panel key="c" label="Tab C">Nội dung C</hui-tab-panel>
      </hui-tabs>
    `;
  },
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('#tabs-editable');
    await waitFor(() => expect(tabsOf(tabs).length).toBe(3));
    await expect(tabsOf(tabs)[0].querySelector('[part~="close-button"]')).toBeNull();

    tabs.shadowRoot.querySelector('[part~="add-button"]').click();
    await waitFor(() => expect(tabsOf(tabs).length).toBe(4));
    await waitFor(() => expect(tabsOf(tabs)[3].getAttribute('aria-selected')).toBe('true'));

    // Đóng tab đang mở → tự chọn tab kề bên và phát change
    const changes = [];
    tabs.addEventListener('change', (e) => changes.push(e.detail.key));
    tabsOf(tabs)[3].querySelector('[part~="close-button"]').click();
    await waitFor(() => expect(tabsOf(tabs).length).toBe(3));
    await waitFor(() => expect(changes).toEqual(['c']));
  },
};

/**
 * Bàn phím (APG): ← → chuyển và mở tab ngay, bỏ qua tab disabled; Home / End.
 */
export const Keyboard = {
  render: () => html`
    <hui-tabs id="tabs-kbd">
      <hui-tab-panel key="1" label="Một">Panel một</hui-tab-panel>
      <hui-tab-panel key="2" label="Hai" disabled>Panel hai</hui-tab-panel>
      <hui-tab-panel key="3" label="Ba">Panel ba</hui-tab-panel>
      <hui-tab-panel key="4" label="Bốn">Panel bốn</hui-tab-panel>
    </hui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('#tabs-kbd');
    const panelEls = [...tabs.querySelectorAll('hui-tab-panel')];
    await waitFor(() => expect(tabsOf(tabs).length).toBe(4));
    const events = [];
    tabs.addEventListener('change', (e) => events.push(e.detail.key));

    const list = tabsOf(tabs);
    await expect(tabs.shadowRoot.querySelector('[role="tablist"]')).toBeTruthy();
    await expect(list[0].getAttribute('aria-selected')).toBe('true');
    await expect(panelEls[0].getAttribute('role')).toBe('tabpanel');
    await expect(panelEls[2].hidden).toBe(true);

    list[0].focus();
    key(list[0], 'ArrowRight'); // bỏ qua tab 2 (disabled)
    await expect(tabs.shadowRoot.activeElement).toBe(list[2]);
    await expect(list[2].getAttribute('aria-selected')).toBe('true');
    await expect(panelEls[2].hidden).toBe(false);
    await expect(panelEls[0].hidden).toBe(true);
    await expect(tabs.getAttribute('active-key')).toBe('3');

    key(list[2], 'End');
    await expect(list[3].getAttribute('aria-selected')).toBe('true');
    key(list[3], 'ArrowRight'); // vòng lại đầu
    await expect(list[0].getAttribute('aria-selected')).toBe('true');
    key(list[0], 'ArrowLeft');
    await expect(list[3].getAttribute('aria-selected')).toBe('true');
    key(list[3], 'Home');
    await expect(events).toEqual(['3', '4', '1', '4', '1']);

    // Đổi active-key từ ngoài → không phát change
    tabs.setAttribute('active-key', '4');
    await waitFor(() => expect(panelEls[3].hidden).toBe(false));
    await expect(events.length).toBe(5);
  },
};

/** Override từ bên ngoài — biến CSS trên thẻ cha + ::part(). */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .tabs-brand {
        --hui-tabs-ink-color: var(--hui-success);
        --hui-tabs-active-color: var(--hui-success);
        --hui-tabs-ink-size: 3px;
        --hui-tabs-gap: 20px;
      }
      .tabs-brand hui-tabs::part(tab) { text-transform: uppercase; letter-spacing: 0.04em; font-size: 12px; }
      .tabs-brand hui-tabs::part(tab-active) { font-weight: 600; }
      .tabs-brand hui-tabs::part(content) { padding: 12px; background: var(--hui-fill-tertiary); border-radius: 8px; }
    </style>
    <div class="tabs-brand">
      <hui-tabs id="tabs-custom">${panels()}</hui-tabs>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('#tabs-custom');
    await waitFor(() => expect(tabsOf(tabs).length).toBe(3));
    const ink = tabs.shadowRoot.querySelector('[part="ink-bar"]');
    await expect(getComputedStyle(ink).height).toBe('3px');
    tabsOf(tabs)[1].click();
    await waitFor(() => expect(ink.style.transform).toContain(`${tabsOf(tabs)[1].offsetLeft}px`));
  },
};
