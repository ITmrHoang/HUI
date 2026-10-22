/**
 * Storybook Stories — HUI Cookie Consent (Organism)
 * Banner đồng ý cookie: Chấp nhận / Từ chối / Tùy chỉnh theo nhóm, lưu lựa chọn trong localStorage.
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { readConsent } from './index.js';

/** Khung có transform → banner position:fixed nằm gọn trong khung (chỉ để xem trong Storybook) */
const frame = (content, height = 260) => html`
  <div style="position: relative; height: ${height}px; transform: translateZ(0); overflow: hidden;
    border: 1px dashed var(--hui-border); border-radius: 12px; background: var(--hui-bg-secondary);">
    <div style="padding: 16px; color: var(--hui-text-secondary);">Nội dung trang…</div>
    ${content}
  </div>
`;

const clear = (key) => { try { localStorage.removeItem(key); } catch { /* bỏ qua */ } };
const part = (el, name) => el.shadowRoot.querySelector(`[part="${name}"]`);
const btn = (el, name) => part(el, name).shadowRoot.querySelector('button');

const CATEGORIES = [
  { id: 'necessary', label: 'Cần thiết', description: 'Đăng nhập, giỏ hàng, bảo mật.', required: true },
  { id: 'preferences', label: 'Tùy chọn', description: 'Ghi nhớ ngôn ngữ, khu vực.', checked: true },
  { id: 'analytics', label: 'Phân tích', description: 'Thống kê lượt truy cập ẩn danh.' },
  { id: 'marketing', label: 'Tiếp thị', description: 'Quảng cáo phù hợp với bạn.' },
];

export default {
  title: 'Organisms/HuiCookieConsent',
  component: 'hui-cookie-consent',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Cookie Consent** — banner đồng ý cookie. Tự hiện khi chưa có lựa chọn trong localStorage; chọn xong không hiện lại.

\`\`\`html
<hui-cookie-consent position="bottom-right" policy-href="/chinh-sach-cookie"></hui-cookie-consent>
<a href="#" onclick="document.querySelector('hui-cookie-consent').open(); return false">Cài đặt cookie</a>
<script type="module">
  import { readConsent } from '@itmrhoang/h-ui/hui-cookie-consent';
  if (readConsent()?.analytics) loadAnalytics();
  document.addEventListener('hui-consent', (e) => { if (e.detail.categories.analytics) loadAnalytics(); });
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`position\` | string | \`'bottom'\` | \`bottom\` (dải ngang) / \`bottom-left\` / \`bottom-right\` (hộp góc) |
| \`storage-key\` | string | \`'hui-cookie-consent'\` | Khóa localStorage (bị chặn → chỉ nhớ trong phiên) |
| \`categories\` | JSON array | Cần thiết / Phân tích / Tiếp thị | \`[{ id, label, description, required, checked }]\` |
| \`heading\` | string | theo locale | Tiêu đề |
| \`message\` | string | theo locale | Mô tả (slot mặc định ưu tiên hơn) |
| \`policy-href\` | string | — | Link chính sách cookie |
| \`consent-version\` | string | — | Đổi phiên bản → hỏi lại người đã chọn |
| \`hide-reject\` / \`hide-customize\` | boolean | \`false\` | Ẩn nút Từ chối / Tùy chỉnh |
| \`delay\` | number | \`0\` | Trễ trước khi tự hiện (ms) |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng trượt |

### Properties & methods
| Tên | Mô tả |
|-----|-------|
| \`open()\` | Hiện banner + focus nút đầu tiên (trả focus về chỗ cũ sau khi chọn) |
| \`reset()\` | Xóa lựa chọn đã lưu rồi hiện lại |
| \`openPreferences()\` | Mở hộp tùy chỉnh |
| \`acceptAll()\` / \`rejectAll()\` | Chọn bằng JS |
| \`consent\` | \`{ id: boolean }\` đã lưu hoặc \`null\` |
| \`isOpen\` | Banner đang hiện |
| \`readConsent(key?)\` | Hàm export: đọc lựa chọn đã lưu không cần thẻ |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-consent\` | \`{ categories, accepted, action }\` | \`action\`: \`accept-all\` / \`reject-all\` / \`custom\` |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Mô tả |
| \`title\` | Tiêu đề |
| \`icon\` | Icon / hình minh họa |
| \`actions\` | Nút bổ sung trước cụm nút mặc định |

### Parts
\`base\`, \`icon\`, \`body\`, \`title\`, \`message\`, \`policy\`, \`actions\`, \`accept-button\`, \`reject-button\`, \`customize-button\`,
\`dialog\`, \`category\`, \`category-label\`, \`category-description\`, \`switch\`, \`save-button\`

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-cookie-consent-bg\` | \`--hui-bg-elevated\` | Nền |
| \`--hui-cookie-consent-color\` | \`--hui-text-secondary\` | Chữ mô tả |
| \`--hui-cookie-consent-title-color\` | \`--hui-text\` | Tiêu đề |
| \`--hui-cookie-consent-radius\` | \`--hui-radius-xl\` | Bo góc (hộp góc) |
| \`--hui-cookie-consent-shadow\` | \`--hui-shadow-xl\` | Bóng |
| \`--hui-cookie-consent-border-color\` | \`--hui-border\` | Viền |
| \`--hui-cookie-consent-padding\` | \`--hui-space-lg\` \`--hui-space-xl\` | Đệm |
| \`--hui-cookie-consent-max-width\` | 1200px (bottom) / 400px (góc) | Rộng tối đa |
| \`--hui-cookie-consent-offset\` | \`--hui-space-lg\` | Cách mép màn hình (hộp góc) |
| \`--hui-cookie-consent-z-index\` | \`--hui-z-modal\` | z-index |

### Bàn phím & trợ năng
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Đi qua link chính sách và các nút |
| \`Enter\` / \`Space\` | Bấm nút |
| Trong hộp tùy chỉnh | Focus bị giữ trong hộp, \`Esc\` đóng, \`Space\` bật/tắt từng nhóm |

Banner là \`role="dialog"\` không modal (\`aria-labelledby\` tiêu đề, \`aria-describedby\` mô tả). Tự hiện khi tải trang thì
**không** chiếm focus; \`open()\` mới đưa focus vào. Nhóm \`required\` luôn bật, switch bị khóa.
        `,
      },
    },
  },
  argTypes: {
    position: { control: 'inline-radio', options: ['bottom', 'bottom-left', 'bottom-right'] },
  },
};

export const Default = {
  render: (args) => {
    clear('story-cc-default');
    return frame(html`<hui-cookie-consent storage-key="story-cc-default" position=${args.position} policy-href="#"></hui-cookie-consent>`);
  },
  args: { position: 'bottom' },
  play: async ({ canvasElement }) => {
    const cc = canvasElement.querySelector('hui-cookie-consent');
    await cc.updateComplete;
    const base = part(cc, 'base');
    await expect(cc.isOpen).toBe(true);
    await expect(base.getAttribute('role')).toBe('dialog');
    await expect(base.getAttribute('aria-labelledby')).toBe(part(cc, 'title').id);

    let detail = null;
    cc.addEventListener('hui-consent', (e) => { detail = e.detail; }, { once: true });
    await userEvent.click(btn(cc, 'accept-button'));
    await expect(detail.action).toBe('accept-all');
    await expect(detail.categories).toEqual({ necessary: true, analytics: true, marketing: true });
    await expect(readConsent('story-cc-default')).toEqual(detail.categories);
    await waitFor(() => expect(base.hidden).toBe(true));
    clear('story-cc-default');
  },
};

export const Positions = {
  render: () => {
    ['story-cc-l', 'story-cc-r'].forEach(clear);
    return html`
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
        ${frame(html`<hui-cookie-consent storage-key="story-cc-l" position="bottom-left"><span slot="icon" aria-hidden="true">🍪</span></hui-cookie-consent>`, 340)}
        ${frame(html`<hui-cookie-consent storage-key="story-cc-r" position="bottom-right" hide-customize></hui-cookie-consent>`, 340)}
      </div>
    `;
  },
};

export const RememberedChoice = {
  name: 'Nhớ lựa chọn / reset()',
  render: () => frame(html`<div id="host"></div>`),
  play: async ({ canvasElement }) => {
    const KEY = 'story-cc-remember';
    clear(KEY);
    const host = canvasElement.querySelector('#host');
    const make = () => {
      const el = document.createElement('hui-cookie-consent');
      el.setAttribute('storage-key', KEY);
      el.setAttribute('no-animation', '');
      host.append(el);
      return el;
    };
    const first = make();
    await first.updateComplete;
    await expect(first.isOpen).toBe(true);
    first.rejectAll();
    await expect(readConsent(KEY)).toEqual({ necessary: true, analytics: false, marketing: false });
    await expect(first.isOpen).toBe(false);
    first.remove();

    // "Tải lại trang": thẻ mới cùng khóa → không hiện
    const second = make();
    await second.updateComplete;
    await expect(second.isOpen).toBe(false);
    await expect(second.consent).toEqual({ necessary: true, analytics: false, marketing: false });

    // Đổi phiên bản chính sách → hỏi lại
    second.remove();
    const third = make();
    third.setAttribute('consent-version', '2');
    await third.updateComplete;
    await waitFor(() => expect(third.isOpen).toBe(true));
    third.acceptAll();

    // reset() → xóa và hiện lại, focus vào nút đầu tiên
    third.reset();
    await expect(readConsent(KEY)).toBe(null);
    await expect(third.isOpen).toBe(true);
    await waitFor(() => expect(third.shadowRoot.activeElement).toBeTruthy());
    third.remove();
    clear(KEY);
  },
};

export const Customize = {
  name: 'Tùy chỉnh theo nhóm',
  render: () => {
    clear('story-cc-custom');
    return frame(html`<hui-cookie-consent storage-key="story-cc-custom" position="bottom-right" .categories=${CATEGORIES}></hui-cookie-consent>`, 340);
  },
  play: async ({ canvasElement }) => {
    const cc = canvasElement.querySelector('hui-cookie-consent');
    await cc.updateComplete;
    await userEvent.click(btn(cc, 'customize-button'));
    const dialog = part(cc, 'dialog');
    await waitFor(() => expect(dialog.isOpen).toBe(true));
    const switches = [...cc.shadowRoot.querySelectorAll('[part="switch"]')];
    await expect(switches.length).toBe(4);
    // Nhóm bắt buộc: bật + khóa; checked mặc định theo dữ liệu
    await expect(switches[0].checked).toBe(true);
    await expect(switches[0].disabled).toBe(true);
    await expect(switches[1].checked).toBe(true);
    await expect(switches[2].checked).toBe(false);

    switches[2].shadowRoot.querySelector('button').click(); // bật Phân tích
    switches[1].shadowRoot.querySelector('button').click(); // tắt Tùy chọn
    let detail = null;
    cc.addEventListener('hui-consent', (e) => { detail = e.detail; }, { once: true });
    btn(cc, 'save-button').click();
    await expect(detail.action).toBe('custom');
    await expect(detail.categories).toEqual({ necessary: true, preferences: false, analytics: true, marketing: false });
    await expect(detail.accepted).toEqual(['necessary', 'analytics']);
    await waitFor(() => expect(dialog.isOpen).toBe(false));

    // Mở lại hộp: switch giữ lựa chọn đã lưu
    cc.openPreferences();
    await waitFor(() => expect(dialog.isOpen).toBe(true));
    const again = [...cc.shadowRoot.querySelectorAll('[part="switch"]')];
    await expect(again[2].checked).toBe(true);
    dialog.close();
    clear('story-cc-custom');
  },
};

export const StorageUnavailable = {
  name: 'Storage bị chặn',
  render: () => frame(html`<div id="host"></div>`),
  play: async ({ canvasElement }) => {
    const proto = Storage.prototype;
    const { getItem, setItem, removeItem } = proto;
    const boom = () => { throw new Error('SecurityError'); };
    proto.getItem = boom;
    proto.setItem = boom;
    proto.removeItem = boom;
    try {
      const el = document.createElement('hui-cookie-consent');
      el.setAttribute('no-animation', '');
      canvasElement.querySelector('#host').append(el);
      await el.updateComplete;
      await expect(el.isOpen).toBe(true);
      el.acceptAll();
      await expect(el.isOpen).toBe(false);
      await expect(el.consent).toEqual({ necessary: true, analytics: true, marketing: true });
      el.remove();
    } finally {
      proto.getItem = getItem;
      proto.setItem = setItem;
      proto.removeItem = removeItem;
    }
  },
};

export const CustomizeFromOutside = {
  render: () => {
    clear('story-cc-brand');
    return html`
      <style>
        .brand-cc {
          --hui-cookie-consent-bg: var(--hui-primary-1);
          --hui-cookie-consent-border-color: var(--hui-primary-3);
          --hui-cookie-consent-title-color: var(--hui-primary-7);
          --hui-cookie-consent-radius: 24px;
          --hui-cookie-consent-max-width: 360px;
          --hui-cookie-consent-offset: 24px;
        }
        .brand-cc::part(title) { font-size: 1.125rem; }
        .brand-cc::part(accept-button) { --hui-button-radius: 999px; }
      </style>
      ${frame(html`
        <hui-cookie-consent class="brand-cc" storage-key="story-cc-brand" position="bottom-left" heading="Bánh quy? 🍪" hide-reject>
          Chúng tôi chỉ dùng cookie cần thiết và thống kê ẩn danh.
        </hui-cookie-consent>
      `, 340)}
    `;
  },
};
