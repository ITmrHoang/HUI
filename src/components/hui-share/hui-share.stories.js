/**
 * Storybook Stories — HUI Share
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import { buildShareUrl } from './hui-share.js';
import './index.js';

const URL = 'https://example.com/bai-viet/huong-dan';
const items = (el) => [...el.shadowRoot.querySelectorAll('[data-network]')];

/** Chặn popup thật trong test: hủy hui-share và ghi lại network */
const capture = (el) => {
  const log = [];
  el.addEventListener('hui-share', (e) => { log.push(e.detail); e.preventDefault(); });
  return log;
};

export default {
  title: 'Molecules/HuiShare',
  component: 'hui-share',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Share** — Dãy nút chia sẻ **Facebook / Zalo / X / LinkedIn / Email / sao chép liên kết**. Bấm → mở cửa sổ popup
(\`window.open\` với \`noopener\`); \`native\` → dùng **Web Share API** (bảng chia sẻ của hệ điều hành, hợp với mobile) khi trình duyệt hỗ trợ.
Icon là ký tự đơn giản tự vẽ ("f", "Z", "X", "in") — thư viện **không kèm logo thương hiệu**; muốn logo thật, dự án tự
\`registerIcon('share-facebook', '…')\`.

\`\`\`html
<hui-share url="https://example.com/post" title="Tiêu đề bài viết"></hui-share>
<hui-share networks="facebook,zalo,copy" variant="outline" show-label></hui-share>
<hui-share native></hui-share>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`url\` | string | \`location.href\` | URL chia sẻ |
| \`title\` | string | \`document.title\` | Tiêu đề (property \`shareTitle\`; attribute được gỡ khỏi thẻ để không hiện tooltip native) |
| \`text\` | string | — | Mô tả ngắn (Web Share / nội dung email) |
| \`networks\` | string | \`facebook,zalo,x,linkedin,email,copy\` | Danh sách mạng, theo thứ tự hiển thị |
| \`native\` | boolean | \`false\` | Dùng \`navigator.share\` khi có (thay dãy nút bằng 1 nút "Chia sẻ") |
| \`variant\` | string | \`filled\` | \`filled\` \\| \`outline\` \\| \`ghost\` |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`shape\` | string | \`circle\` | \`circle\` \\| \`rounded\` \\| \`square\` |
| \`show-label\` | boolean | \`false\` | Hiện tên mạng cạnh icon |
| \`vertical\` | boolean | \`false\` | Xếp dọc |
| \`popup-size\` | string | \`600x540\` | Kích thước popup |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`templates\` | Object mẫu URL ghi đè theo mạng: \`{ zalo: 'https://…?u={url}' }\` — biến \`{url}\` \`{title}\` \`{text}\` \`{body}\` |
| \`share(network)\` | Chia sẻ bằng code, trả \`Promise<boolean>\` |
| \`networkList\` / \`usesNative\` | (chỉ đọc) mạng đang bật / có dùng Web Share không |
| \`buildShareUrl(network, data, templates)\` | Hàm export tạo URL chia sẻ |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-share\` | \`{ network, url, shareUrl }\` | Trước khi chia sẻ — \`preventDefault()\` để tự xử lý (vd gửi analytics, mở modal riêng) |
| \`hui-copy\` | \`{ value }\` | Đã sao chép liên kết |

### Slots
Không có.

### Parts
\`base\` (role="group"), \`item\` (+ \`item-facebook\` \\| \`item-zalo\` \\| \`item-x\` \\| \`item-linkedin\` \\| \`item-email\` \\| \`item-copy\` \\| \`item-native\`), \`icon\`, \`label\`, \`status\`.

### CSS Variables
\`--hui-share-gap\`, \`--hui-share-size\`, \`--hui-share-radius\`, \`--hui-share-color\` (màu nhấn chung), \`--hui-share-text-color\`,
\`--hui-share-<network>-color\` (facebook, zalo, x, linkedin, email, copy, native).

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Di chuyển giữa các nút |
| \`Enter\` | Chia sẻ qua mạng đang focus (link) |
| \`Enter\` / \`Space\` | Sao chép / chia sẻ native (button) |

Mỗi mạng là link thật (\`<a href>\`) → Ctrl/⌘ + click mở tab mới như bình thường. Nút chỉ icon có \`aria-label\` "Chia sẻ lên Facebook".
Sao chép xong → \`role="status"\` đọc "Đã sao chép liên kết".
        `,
      },
    },
  },
  argTypes: {
    networks: { control: 'text' },
    variant: { control: 'inline-radio', options: ['filled', 'outline', 'ghost'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    shape: { control: 'inline-radio', options: ['circle', 'rounded', 'square'] },
    showLabel: { control: 'boolean' },
    vertical: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-share
      url=${URL}
      title="Hướng dẫn H-UI"
      networks=${args.networks}
      variant=${args.variant}
      size=${args.size}
      shape=${args.shape}
      ?show-label=${args.showLabel}
      ?vertical=${args.vertical}
    ></hui-share>
  `,
  args: { networks: 'facebook,zalo,x,linkedin,email,copy', variant: 'filled', size: 'md', shape: 'circle', showLabel: false, vertical: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-share');
    await expect(el.hasAttribute('title')).toBe(false);
    await expect(el.shareTitle).toBe('Hướng dẫn H-UI');
    const list = items(el);
    await expect(list.map((i) => i.dataset.network)).toEqual(['facebook', 'zalo', 'x', 'linkedin', 'email', 'copy']);
    await expect(list[0].getAttribute('aria-label')).toBe('Chia sẻ lên Facebook');
    await expect(list[0].getAttribute('href')).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL)}`);
    await expect(list[0].getAttribute('rel')).toContain('noopener');
    await expect(list[4].getAttribute('href')).toMatch(/^mailto:\?subject=/);
    await expect(el.shadowRoot.querySelector('[part="base"]').getAttribute('role')).toBe('group');

    const log = capture(el);
    await userEvent.click(list[2]);
    await expect(log[0].network).toBe('x');
    await expect(log[0].shareUrl).toContain('x.com/intent/tweet');
    await expect(log[0].shareUrl).toContain(encodeURIComponent('Hướng dẫn H-UI'));
  },
};

/** Sao chép liên kết — icon đổi ✓, thông báo cho trình đọc màn hình */
export const CopyLink = {
  render: () => html`<hui-share url=${URL} networks="copy" show-label variant="outline"></hui-share>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-share');
    const clip = navigator.clipboard;
    const log = [];
    if (clip) clip.writeText = async (text) => { log.push(text); };
    try {
      let copied = null;
      el.addEventListener('hui-copy', (e) => { copied = e.detail.value; });
      const btn = items(el)[0];
      await expect(btn.tagName).toBe('BUTTON');
      btn.focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(copied).toBe(URL));
      if (clip) await expect(log).toEqual([URL]);
      await expect(btn.querySelector('hui-icon').getAttribute('name')).toBe('check');
      await expect(el.shadowRoot.querySelector('[part="status"]').textContent).toBe('Đã sao chép liên kết');
    } finally {
      if (clip) delete clip.writeText;
    }
  },
};

export const VariantsAndSizes = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${['filled', 'outline', 'ghost'].map((v) => html`
        <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
          ${['sm', 'md', 'lg'].map((s) => html`<hui-share url=${URL} variant=${v} size=${s} networks="facebook,zalo,x,linkedin"></hui-share>`)}
        </div>
      `)}
      <div style="display: flex; gap: 24px; flex-wrap: wrap;">
        <hui-share url=${URL} shape="rounded" networks="facebook,x,email"></hui-share>
        <hui-share url=${URL} shape="square" variant="outline" networks="facebook,x,email"></hui-share>
      </div>
    </div>
  `,
};

/** Có chữ, xếp dọc (sidebar bài viết) */
export const LabelsAndVertical = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap;">
      <hui-share id="labels" url=${URL} show-label networks="facebook,zalo,linkedin,copy"></hui-share>
      <hui-share url=${URL} vertical variant="ghost" show-label networks="facebook,zalo,x,email,copy"></hui-share>
      <hui-share url=${URL} vertical size="sm" networks="facebook,zalo,x,copy"></hui-share>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#labels');
    const first = items(el)[0];
    await expect(first.querySelector('[part="label"]').textContent).toBe('Facebook');
    await expect(first.hasAttribute('aria-label')).toBe(false);
  },
};

/** Web Share API — trình duyệt có navigator.share thì hiện 1 nút "Chia sẻ" */
export const NativeShare = {
  render: () => html`<hui-share id="native" url=${URL} title="Bài viết hay" text="Mời bạn đọc" native show-label></hui-share>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#native');
    const had = Object.prototype.hasOwnProperty.call(navigator, 'share');
    const calls = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { calls.push(d); } });
    try {
      el.native = false;
      await el.updateComplete;
      el.native = true; // dựng lại sau khi giả lập navigator.share
      await el.updateComplete;
      const list = items(el);
      await expect(list.map((i) => i.dataset.network)).toEqual(['native']);
      await userEvent.click(list[0]);
      await waitFor(() => expect(calls[0]).toEqual({ title: 'Bài viết hay', text: 'Mời bạn đọc', url: URL }));
    } finally {
      if (!had) delete navigator.share;
    }
    await expect(buildShareUrl('linkedin', { url: 'https://a.b/c?d=1' })).toBe('https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fa.b%2Fc%3Fd%3D1');
    await expect(buildShareUrl('zalo', { url: 'u' }, { zalo: 'https://z.example/?link={url}' })).toBe('https://z.example/?link=u');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .share-mono {
        --hui-share-color: var(--hui-primary);
        --hui-share-size: 40px;
        --hui-share-gap: 4px;
        --hui-share-radius: 10px;
      }
      hui-share.share-brand::part(item) { box-shadow: var(--hui-shadow-sm); }
      hui-share.share-brand::part(item-copy) { margin-inline-start: 12px; }
      hui-share.share-brand::part(label) { text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
    </style>
    <div style="display: grid; gap: 16px;">
      <hui-share class="share-mono" url=${URL}></hui-share>
      <hui-share class="share-brand" url=${URL} show-label variant="outline" networks="facebook,linkedin,copy"
        style="--hui-share-facebook-color: var(--hui-primary-7); --hui-share-linkedin-color: var(--hui-success-8);"></hui-share>
    </div>
  `,
};
