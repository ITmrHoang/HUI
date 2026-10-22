/**
 * Storybook Stories — HUI Language Switch (Molecule)
 * Chọn ngôn ngữ (cờ + tên): dropdown hoặc hàng nút, gọi setLocale, phát hui-language-change.
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { getLocaleName, setLocale } from '../../core/locale.js';

const FLAG_VN = `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#da251d"/><polygon fill="#ff0" points="15,4 16.76,9.43 22.47,9.43 17.85,12.79 19.61,18.21 15,14.86 10.39,18.21 12.15,12.79 7.53,9.43 13.24,9.43"/></svg>`;
const FLAG_JP = `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/></svg>`;
const FLAG_GB = `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg"><rect width="30" height="20" fill="#012169"/><path d="M0 0 30 20M30 0 0 20" stroke="#fff" stroke-width="4"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3"/></svg>`;

const LANGS = [
  { code: 'vi', label: 'Tiếng Việt', flag: FLAG_VN },
  { code: 'en', label: 'English', flag: FLAG_GB },
  { code: 'ja', label: '日本語', flag: FLAG_JP, locale: false },
];

const trigger = (el) => el.shadowRoot.querySelector('[part="trigger"]');
const menuItem = (el, code) => el.shadowRoot.querySelector(`hui-menu-item[key="${code}"]`);
const clickItem = (el, code) => menuItem(el, code).shadowRoot.querySelector('[part="base"]').click();

export default {
  title: 'Molecules/HuiLanguageSwitch',
  component: 'hui-language-switch',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Language Switch** — chọn ngôn ngữ. Chọn xong gọi \`setLocale(code)\` (nếu đã \`registerLocale\`) → mọi component HUI đổi chữ theo.

\`\`\`html
<hui-language-switch></hui-language-switch>                         <!-- Tiếng Việt / English mặc định -->
<hui-language-switch variant="inline" mode="code"></hui-language-switch>
<script>
  sw.languages = [{ code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' }, { code: 'ja', label: '日本語', flag: '<svg…>', locale: false }];
  sw.addEventListener('hui-language-change', (e) => { if (!confirm('Đổi ngôn ngữ?')) e.preventDefault(); });
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`languages\` | JSON array | vi + en | \`[{ code, label, flag, locale }]\` — flag: emoji, chuỗi \`<svg…>\` hoặc URL ảnh; \`locale\`: tên cho setLocale (mặc định = code, \`false\` = không đổi) |
| \`value\` | string | locale hiện tại | Mã đang chọn |
| \`variant\` | string | \`'dropdown'\` | \`dropdown\` / \`inline\` |
| \`mode\` | string | \`'both'\` | \`both\` / \`flag\` / \`label\` / \`code\` (nội dung nút; tên luôn có cho trình đọc màn hình) |
| \`size\` | string | \`'md'\` | \`sm\` / \`md\` / \`lg\` |
| \`placement\` | string | \`'bottom-end'\` | Vị trí menu |
| \`manual\` | boolean | \`false\` | Không gọi setLocale, chỉ phát sự kiện |
| \`html-lang\` | boolean | \`false\` | Đồng bộ \`<html lang>\` |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa |

### Properties & methods
\`selectedLanguage\` (mục đang chọn), \`show()\` / \`hide()\` (menu dropdown). Export \`DEFAULT_LANGUAGES\`.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-language-change\` | \`{ code, previous, language, locale }\` | Cancelable — \`preventDefault()\` giữ ngôn ngữ cũ |

### Parts
\`base\`, \`trigger\`, \`flag\`, \`label\`, \`arrow\`, \`dropdown\`, \`menu\`, \`item\`, \`check\`

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-language-switch-gap\` | \`--hui-space-xs\` | Cờ ↔ tên |
| \`--hui-language-switch-color\` | \`--hui-text\` | Chữ |
| \`--hui-language-switch-bg\` | transparent | Nền nút |
| \`--hui-language-switch-hover-bg\` | \`--hui-fill-secondary\` | Nền hover |
| \`--hui-language-switch-border-color\` | \`--hui-border\` | Viền |
| \`--hui-language-switch-radius\` | \`--hui-radius\` | Bo góc |
| \`--hui-language-switch-active-bg\` / \`-active-color\` | \`--hui-primary-1\` / \`-7\` | Mục chọn (inline) |
| \`--hui-language-switch-flag-size\` | 1.25em | Cỡ cờ |

### Bàn phím
| Phím | Dropdown | Inline (radiogroup) |
|------|----------|---------------------|
| \`Enter\` / \`Space\` | Mở menu / chọn mục | — |
| \`↓\` / \`↑\` | Mở menu, di chuyển mục | Chọn mục kế / trước |
| \`←\` / \`→\` | — | Chọn mục trước / kế |
| \`Home\` / \`End\` | — | Mục đầu / cuối |
| \`Esc\` | Đóng menu, focus về nút | — |

Nhãn mỗi ngôn ngữ có \`lang="<code>"\` để trình đọc màn hình phát âm đúng. Cờ emoji không hiện thành cờ trên Windows → dùng SVG nếu cần.
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['dropdown', 'inline'] },
    mode: { control: 'inline-radio', options: ['both', 'flag', 'label', 'code'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
};

export const Default = {
  render: (args) => html`
    <div style="display: flex; justify-content: flex-end; padding-bottom: 120px;">
      <hui-language-switch variant=${args.variant} mode=${args.mode} size=${args.size}></hui-language-switch>
    </div>
  `,
  args: { variant: 'dropdown', mode: 'both', size: 'md' },
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector('hui-language-switch');
    await sw.updateComplete;
    try {
      await expect(sw.value).toBe(getLocaleName());
      const btn = trigger(sw);
      await expect(btn.getAttribute('aria-haspopup')).toBe('menu');
      await userEvent.click(btn);
      await waitFor(() => expect(btn.getAttribute('aria-expanded')).toBe('true'));

      let detail = null;
      sw.addEventListener('hui-language-change', (e) => { detail = e.detail; }, { once: true });
      clickItem(sw, 'en');
      await expect(detail).toMatchObject({ code: 'en', previous: 'vi', locale: 'en' });
      await expect(sw.value).toBe('en');
      await expect(getLocaleName()).toBe('en');
      await waitFor(() => expect(btn.getAttribute('aria-expanded')).toBe('false'));
      await waitFor(() => expect(btn.getAttribute('aria-label')).toBe('Language: English'));
    } finally {
      setLocale('vi');
    }
    // Đổi locale ở nơi khác → component chọn theo
    await waitFor(() => expect(sw.value).toBe('vi'));
  },
};

export const Inline = {
  render: () => html`
    <div style="display: grid; gap: 16px; justify-items: start;">
      <hui-language-switch variant="inline" manual .languages=${LANGS}></hui-language-switch>
      <hui-language-switch variant="inline" mode="code" size="sm" manual></hui-language-switch>
      <hui-language-switch variant="inline" mode="flag" size="lg" manual .languages=${LANGS}></hui-language-switch>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector('hui-language-switch');
    await sw.updateComplete;
    const group = sw.shadowRoot.querySelector('[role="radiogroup"]');
    const radios = [...group.querySelectorAll('[role="radio"]')];
    await expect(radios.length).toBe(3);
    await expect(radios[0].getAttribute('aria-checked')).toBe('true');
    await expect(radios[1].tabIndex).toBe(-1);

    const events = [];
    sw.addEventListener('hui-language-change', (e) => events.push(e.detail));
    radios[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(sw.value).toBe('en');
    await expect(sw.shadowRoot.activeElement).toBe(radios[1]);
    await expect(radios[1].tabIndex).toBe(0);
    await userEvent.keyboard('{End}');
    await expect(sw.value).toBe('ja');
    await expect(events.map((d) => d.code)).toEqual(['en', 'ja']);
    // manual → không gọi setLocale
    await expect(events[0].locale).toBe(null);
    await expect(getLocaleName()).toBe('vi');
  },
};

export const Cancelable = {
  name: 'Hủy đổi ngôn ngữ (preventDefault)',
  render: () => html`<hui-language-switch variant="inline" .languages=${LANGS}></hui-language-switch>`,
  play: async ({ canvasElement }) => {
    const sw = canvasElement.querySelector('hui-language-switch');
    await sw.updateComplete;
    sw.addEventListener('hui-language-change', (e) => e.preventDefault());
    const radios = [...sw.shadowRoot.querySelectorAll('[role="radio"]')];
    radios[1].click();
    await expect(sw.value).toBe('vi');
    await expect(radios[0].getAttribute('aria-checked')).toBe('true');
    await expect(getLocaleName()).toBe('vi');
  },
};

export const Modes = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 16px; padding-bottom: 140px;">
      <hui-language-switch .languages=${LANGS} manual></hui-language-switch>
      <hui-language-switch .languages=${LANGS} mode="flag" manual></hui-language-switch>
      <hui-language-switch .languages=${LANGS} mode="label" size="sm" manual></hui-language-switch>
      <hui-language-switch .languages=${LANGS} mode="code" size="lg" manual></hui-language-switch>
      <hui-language-switch disabled></hui-language-switch>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [, flagOnly] = canvasElement.querySelectorAll('hui-language-switch');
    await flagOnly.updateComplete;
    const label = flagOnly.shadowRoot.querySelector('[part="trigger"] [part="label"]');
    // Chỉ cờ: tên vẫn có trong DOM cho trình đọc màn hình
    await expect(label.classList.contains('ls__sr')).toBe(true);
    await expect(label.getAttribute('lang')).toBe('vi');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-ls {
        --hui-language-switch-radius: 999px;
        --hui-language-switch-border-color: var(--hui-primary-3);
        --hui-language-switch-active-bg: var(--hui-primary);
        --hui-language-switch-active-color: var(--hui-text-inverse);
        --hui-language-switch-flag-size: 1.5em;
      }
      .brand-ls::part(item) { padding-inline: 14px; }
      .brand-ls::part(label) { letter-spacing: 0.04em; }
    </style>
    <hui-language-switch class="brand-ls" variant="inline" mode="code" manual></hui-language-switch>
  `,
};
