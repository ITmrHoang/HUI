/**
 * Storybook Stories — HUI Theme Toggle (Atom)
 * Đổi giao diện sáng / tối / theo hệ thống, nhớ lựa chọn, hiệu ứng lan vòng tròn (View Transitions).
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { applyTheme, getStoredTheme, THEME_STORAGE_KEY } from './index.js';

const root = document.documentElement;

/** Giữ nguyên theme / storage của Storybook sau mỗi test */
async function withCleanTheme(fn) {
  const prevTheme = root.getAttribute('data-theme');
  const prevStored = localStorage.getItem(THEME_STORAGE_KEY);
  try {
    await fn();
  } finally {
    if (prevStored === null) localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, prevStored);
    if (prevTheme === null) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', prevTheme);
  }
}

const sr = (el, sel) => el.shadowRoot.querySelector(sel);

export default {
  title: 'Atoms/HuiThemeToggle',
  component: 'hui-theme-toggle',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Theme Toggle** — nút sáng / tối / theo hệ thống. Lưu lựa chọn trong \`localStorage["hui-theme"]\`,
áp bằng \`<html data-theme="light|dark">\` (system = gỡ attribute → token theo \`prefers-color-scheme\`).
Đổi theme có hiệu ứng **lan vòng tròn** từ nút bấm (View Transitions API), trình duyệt cũ: mờ dần;
tắt khi \`no-animation\` hoặc người dùng bật giảm chuyển động.

\`\`\`html
<hui-theme-toggle></hui-theme-toggle>
<hui-theme-toggle variant="switch"></hui-theme-toggle>
<hui-theme-toggle variant="segmented" show-label></hui-theme-toggle>

<!-- Tránh nháy theme khi tải trang: khôi phục sớm trong <head> -->
<script type="module">
  import { applyTheme, getStoredTheme } from '@itmrhoang/h-ui/hui-theme-toggle';
  applyTheme(getStoredTheme()); // chưa lưu → không làm gì
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`mode\` | string | đã lưu → \`data-theme\` hiện có → \`'system'\` | \`light\` / \`dark\` / \`system\` (reflect) |
| \`variant\` | string | \`'icon'\` | \`icon\` (xoay vòng 3 chế độ) / \`switch\` (gạt sáng ↔ tối) / \`segmented\` (3 lựa chọn) |
| \`size\` | string | \`'md'\` | \`sm\` / \`md\` / \`lg\` |
| \`show-label\` | boolean | \`false\` | Hiện chữ tên chế độ |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Properties & methods
| Tên | Mô tả |
|-----|-------|
| \`resolved\` | Theme thực tế: \`'light'\` / \`'dark'\` |
| \`setMode(mode, { origin?, animate? })\` | Đổi như người dùng bấm (lưu + hiệu ứng + \`change\`) |

### Helper (export từ \`@itmrhoang/h-ui/hui-theme-toggle\`)
| Hàm | Mô tả |
|-----|-------|
| \`applyTheme(mode)\` | Áp lên \`<html>\`, phát \`hui-theme-change\` trên document; mode null/không hợp lệ → bỏ qua |
| \`getStoredTheme()\` | Lựa chọn đã lưu hoặc \`null\` (storage bị chặn cũng trả null) |
| \`storeTheme(mode)\` · \`resolveTheme(mode)\` · \`getCurrentTheme()\` | Lưu · system → light/dark · đọc \`data-theme\` hiện tại |

Toggle đầu tiên trên trang tự khôi phục lựa chọn đã lưu; nhiều toggle (và nhiều tab) tự đồng bộ.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ mode, resolved }\` | Người dùng đổi chế độ (sau khi đã áp) |
| \`hui-theme-change\` (document) | \`{ mode, resolved }\` | Mỗi lần \`applyTheme()\` chạy |

### Parts
\`base\`, \`button\`, \`icon\`, \`label\`, \`switch\`, \`track\`, \`thumb\`, \`segmented\`, \`option\` (+ \`option-active\`), \`indicator\`

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-theme-toggle-size\` | \`--hui-size-md\` | Chiều cao |
| \`--hui-theme-toggle-radius\` | \`--hui-radius\` | Bo góc |
| \`--hui-theme-toggle-bg\` | container / fill-tertiary | Nền |
| \`--hui-theme-toggle-color\` | \`--hui-text\` | Màu icon / chữ |
| \`--hui-theme-toggle-border-color\` | \`--hui-border\` | Viền |
| \`--hui-theme-toggle-hover-color\` | \`--hui-primary\` | Hover |
| \`--hui-theme-toggle-active-color\` | \`--hui-text\` | Lựa chọn đang chọn (segmented) |
| \`--hui-theme-toggle-indicator-bg\` | \`--hui-bg-elevated\` | Nền trượt (segmented) |
| \`--hui-theme-toggle-track-bg\` / \`-track-active-bg\` | \`--hui-fill\` / \`--hui-primary\` | Rãnh switch |
| \`--hui-theme-toggle-thumb-bg\` | \`--hui-bg-elevated\` | Núm switch |

### Bàn phím
| Variant | Phím | Hành động |
|---------|------|-----------|
| icon | \`Enter\` / \`Space\` | Sang chế độ kế tiếp (sáng → tối → hệ thống) |
| switch | \`Enter\` / \`Space\` | Gạt sáng ↔ tối (\`role="switch"\`) |
| segmented | \`←\` \`→\` \`↑\` \`↓\` / \`Home\` \`End\` | Di chuyển + chọn (APG radio group, roving tabindex) |

Icon \`sun\` / \`moon\` / \`monitor\` được đăng ký bằng \`registerIcon\` nếu bộ icon chưa có.
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['icon', 'switch', 'segmented'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    'show-label': { control: 'boolean' },
    'no-animation': { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-theme-toggle
      variant=${args.variant}
      size=${args.size}
      ?show-label=${args['show-label']}
      ?no-animation=${args['no-animation']}
    ></hui-theme-toggle>
  `,
  args: { variant: 'icon', size: 'md', 'show-label': false, 'no-animation': false },
  play: async ({ canvasElement }) => withCleanTheme(async () => {
    const toggle = canvasElement.querySelector('hui-theme-toggle');
    await toggle.setMode('system', { animate: false });
    await toggle.updateComplete;
    const btn = sr(toggle, '[part="button"]');
    await expect(btn.getAttribute('aria-label')).toBe('Giao diện: Theo hệ thống');

    const events = [];
    toggle.addEventListener('change', (e) => events.push(e.detail));

    // system → light (kèm hiệu ứng view transition nếu có)
    btn.click();
    await waitFor(() => expect(root.getAttribute('data-theme')).toBe('light'));
    await expect(localStorage.getItem('hui-theme')).toBe('light');
    await expect(toggle.getAttribute('mode')).toBe('light');
    await waitFor(() => expect(events[0]).toEqual({ mode: 'light', resolved: 'light' }));

    // light → dark
    btn.click();
    await waitFor(() => expect(root.getAttribute('data-theme')).toBe('dark'));
    await expect(localStorage.getItem('hui-theme')).toBe('dark');
    await waitFor(() => expect(events[1]).toEqual({ mode: 'dark', resolved: 'dark' }));

    // dark → system: gỡ data-theme
    btn.click();
    await waitFor(() => expect(root.hasAttribute('data-theme')).toBe(false));
    await expect(localStorage.getItem('hui-theme')).toBe('system');
    await waitFor(() => expect(events.length).toBe(3));
    await expect(['light', 'dark']).toContain(events[2].resolved);
  }),
};

export const Variants = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center;">
      <hui-theme-toggle variant="icon"></hui-theme-toggle>
      <hui-theme-toggle variant="icon" show-label></hui-theme-toggle>
      <hui-theme-toggle variant="switch"></hui-theme-toggle>
      <hui-theme-toggle variant="segmented"></hui-theme-toggle>
      <hui-theme-toggle variant="segmented" show-label></hui-theme-toggle>
    </div>
  `,
};

export const Switch = {
  render: () => html`<hui-theme-toggle variant="switch" no-animation></hui-theme-toggle>`,
  play: async ({ canvasElement }) => withCleanTheme(async () => {
    const toggle = canvasElement.querySelector('hui-theme-toggle');
    await toggle.setMode('light');
    await toggle.updateComplete;
    const sw = sr(toggle, '[part="switch"]');
    await expect(sw.getAttribute('role')).toBe('switch');
    await expect(sw.getAttribute('aria-checked')).toBe('false');
    sw.click();
    await toggle.updateComplete;
    await expect(root.getAttribute('data-theme')).toBe('dark');
    await expect(sw.getAttribute('aria-checked')).toBe('true');
    await expect(getStoredTheme()).toBe('dark');
    sw.click();
    await toggle.updateComplete;
    await expect(root.getAttribute('data-theme')).toBe('light');
  }),
};

export const Segmented = {
  render: () => html`<hui-theme-toggle variant="segmented" show-label no-animation></hui-theme-toggle>`,
  play: async ({ canvasElement }) => withCleanTheme(async () => {
    const toggle = canvasElement.querySelector('hui-theme-toggle');
    await toggle.setMode('light');
    await toggle.updateComplete;
    await expect(sr(toggle, '[part="segmented"]').getAttribute('role')).toBe('radiogroup');
    const opts = [...toggle.shadowRoot.querySelectorAll('[role="radio"]')];
    await expect(opts.map((o) => o.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    await expect(opts.map((o) => o.tabIndex)).toEqual([0, -1, -1]);

    // Phím mũi tên: di chuyển + chọn
    opts[0].focus();
    opts[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
    await toggle.updateComplete;
    await expect(toggle.mode).toBe('dark');
    await expect(root.getAttribute('data-theme')).toBe('dark');
    await expect(toggle.shadowRoot.activeElement).toBe(opts[1]);
    await expect(opts[1].getAttribute('part')).toBe('option option-active');

    opts[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }));
    await toggle.updateComplete;
    await expect(toggle.mode).toBe('system');
    await expect(root.hasAttribute('data-theme')).toBe(false);

    opts[2].click();
    opts[0].click();
    await toggle.updateComplete;
    await expect(getStoredTheme()).toBe('light');
  }),
};

export const SyncedToggles = {
  name: 'Nhiều toggle tự đồng bộ',
  render: () => html`
    <div style="display: flex; gap: 16px; align-items: center;">
      <hui-theme-toggle id="a" no-animation></hui-theme-toggle>
      <hui-theme-toggle id="b" variant="segmented" no-animation></hui-theme-toggle>
    </div>
  `,
  play: async ({ canvasElement }) => withCleanTheme(async () => {
    const a = canvasElement.querySelector('#a');
    const b = canvasElement.querySelector('#b');
    await a.setMode('dark');
    await b.updateComplete;
    await expect(b.mode).toBe('dark');
    // applyTheme() từ bên ngoài cũng đồng bộ
    applyTheme('light');
    await a.updateComplete;
    await expect(a.mode).toBe('light');
    await expect(b.mode).toBe('light');
  }),
};

export const RestoreStoredTheme = {
  name: 'Khôi phục lựa chọn đã lưu',
  render: () => html`<div id="host"></div>`,
  play: async ({ canvasElement }) => withCleanTheme(async () => {
    root.removeAttribute('data-theme');
    // Chưa lưu → applyTheme(null) không làm gì
    localStorage.removeItem(THEME_STORAGE_KEY);
    applyTheme(getStoredTheme());
    await expect(root.hasAttribute('data-theme')).toBe(false);

    // Đã lưu "dark" → khôi phục khi tải trang
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    applyTheme(getStoredTheme());
    await expect(root.getAttribute('data-theme')).toBe('dark');

    // Toggle mới gắn vào trang đọc lựa chọn đã lưu (ưu tiên hơn attribute mode)
    const toggle = document.createElement('hui-theme-toggle');
    toggle.setAttribute('mode', 'light');
    canvasElement.querySelector('#host').append(toggle);
    await toggle.updateComplete;
    await expect(toggle.mode).toBe('dark');
    await expect(toggle.resolved).toBe('dark');

    // Giá trị rác trong storage → bị bỏ qua
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    await expect(getStoredTheme()).toBe(null);
  }),
};

export const Sizes = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${['sm', 'md', 'lg'].map((size) => html`
        <div style="display: flex; gap: 16px; align-items: center;">
          <hui-theme-toggle size=${size}></hui-theme-toggle>
          <hui-theme-toggle size=${size} variant="switch"></hui-theme-toggle>
          <hui-theme-toggle size=${size} variant="segmented"></hui-theme-toggle>
        </div>
      `)}
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-toggle {
        --hui-theme-toggle-radius: 999px;
        --hui-theme-toggle-bg: var(--hui-primary-1);
        --hui-theme-toggle-border-color: var(--hui-primary-3);
        --hui-theme-toggle-color: var(--hui-primary-7);
        --hui-theme-toggle-indicator-bg: var(--hui-primary);
        --hui-theme-toggle-active-color: var(--hui-text-light-solid);
        --hui-theme-toggle-track-active-bg: var(--hui-primary-7);
      }
      .brand-toggle::part(indicator) { border-radius: 999px; }
      .brand-toggle::part(thumb) { box-shadow: none; }
    </style>
    <div class="brand-toggle" style="display: flex; gap: 16px; align-items: center;">
      <hui-theme-toggle></hui-theme-toggle>
      <hui-theme-toggle variant="switch"></hui-theme-toggle>
      <hui-theme-toggle variant="segmented" show-label></hui-theme-toggle>
    </div>
  `,
};
