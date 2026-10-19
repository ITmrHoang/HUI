/**
 * Storybook Stories — HUI Announcement Bar (Molecule)
 * Dải thông báo đầu trang: đóng + nhớ trạng thái, xoay nhiều thông báo, chữ chạy.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';
import '../hui-icon/index.js';

const MESSAGES = [
  'Miễn phí vận chuyển cho đơn từ 500.000₫',
  'Flash sale 12.12 — giảm đến 50% toàn bộ phụ kiện',
  'Đổi trả miễn phí trong 30 ngày',
];

const closeBtn = (bar) => bar.shadowRoot.querySelector('[part="close"]');

export default {
  title: 'Molecules/HuiAnnouncementBar',
  component: 'hui-announcement-bar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Announcement Bar** — dải thông báo đầu trang (khuyến mãi, sự kiện).

\`\`\`html
<hui-announcement-bar type="primary" variant="filled" closable dismiss-key="sale-1212" sticky>
  <span slot="prefix">🔥</span>
  Flash sale 12.12 — giảm đến 50%
  <a slot="action" href="/sale">Mua ngay</a>
</hui-announcement-bar>

<hui-announcement-bar id="bar" marquee></hui-announcement-bar>
<script>document.querySelector('#bar').messages = ['Tin 1', 'Tin 2'];</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`type\` | string | \`'info'\` | \`info\` / \`success\` / \`warning\` / \`danger\` / \`primary\` |
| \`variant\` | string | \`'soft'\` | \`soft\` (nền nhạt) / \`filled\` (nền đậm) |
| \`closable\` | boolean | \`false\` | Hiện nút đóng |
| \`dismiss-key\` | string | — | Nhớ việc đóng trong localStorage \`hui-dismiss:<key>\` (storage bị chặn → vẫn hiện bình thường) |
| \`messages\` | JSON array | — | Mảng chuỗi xoay vòng (property nhận cả Node) |
| \`interval\` | number | \`5000\` | Thời gian mỗi thông báo (ms) |
| \`marquee\` | boolean | \`false\` | Chữ chạy liên tục, dừng khi hover / focus |
| \`speed\` | number | \`60\` | Tốc độ chữ chạy (px/giây) |
| \`sticky\` | boolean | \`false\` | Dính mép trên khi cuộn |
| \`no-animation\` | boolean | \`false\` | Tắt trượt / chữ chạy / thu gọn khi đóng |

### Properties & methods
| Tên | Mô tả |
|-----|-------|
| \`messages\` | \`(string \\| Node)[]\` |
| \`currentIndex\` | Chỉ số thông báo đang hiện |
| \`dismissed\` | Đã bị đóng (phiên này hoặc nhớ từ localStorage) |
| \`close()\` | Đóng như bấm ✕ (có hiệu ứng thu gọn) |
| \`show()\` | Hiện lại + xóa trạng thái đã nhớ |
| \`next()\` / \`prev()\` | Chuyển thông báo |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-close\` | \`{ dismissKey }\` | Bấm đóng — cancelable (\`preventDefault()\` để giữ lại) |
| \`hui-change\` | \`{ index }\` | Thông báo đang hiện đổi |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Nội dung (khi không dùng \`messages\`) |
| \`prefix\` | Icon / nhãn phía trước |
| \`action\` | Nút / link hành động |

### Parts
\`base\`, \`inner\`, \`prefix\`, \`content\`, \`track\`, \`message\`, \`action\`, \`close\`

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-announcement-bar-bg\` | theo type/variant | Nền |
| \`--hui-announcement-bar-color\` | theo type/variant | Chữ |
| \`--hui-announcement-bar-border-color\` | theo type/variant | Viền dưới |
| \`--hui-announcement-bar-padding\` | \`--hui-space-sm\` \`--hui-space-lg\` | Đệm |
| \`--hui-announcement-bar-font-size\` | \`--hui-font-sm\` | Cỡ chữ |
| \`--hui-announcement-bar-gap\` | \`--hui-space-md\` | Khoảng cách prefix / nội dung / action |
| \`--hui-announcement-bar-max-width\` | none | Rộng tối đa hàng nội dung |
| \`--hui-announcement-bar-z-index\` | \`--hui-z-sticky\` | z-index khi sticky |
| \`--hui-announcement-bar-marquee-gap\` | \`--hui-space-xl\` | Khoảng cách các tin khi marquee |

### Bàn phím & trợ năng
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Tới link/nút trong action, rồi nút đóng (focus vào dải → tạm dừng xoay / chữ chạy) |
| \`Enter\` / \`Space\` | Bấm nút đóng |

Khung có \`role="region"\` + \`aria-label\` theo locale; thông báo không hiện được ẩn khỏi trình đọc màn hình.
\`prefers-reduced-motion\`: không trượt, không chữ chạy (hiện tĩnh, xuống dòng).
        `,
      },
    },
  },
  argTypes: {
    type: { control: 'inline-radio', options: ['info', 'success', 'warning', 'danger', 'primary'] },
    variant: { control: 'inline-radio', options: ['soft', 'filled'] },
    closable: { control: 'boolean' },
    marquee: { control: 'boolean' },
    sticky: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-announcement-bar type=${args.type} variant=${args.variant} ?closable=${args.closable} ?marquee=${args.marquee}>
      <hui-icon slot="prefix" name="info"></hui-icon>
      Hệ thống bảo trì từ 22:00 – 23:00 tối nay.
      <a slot="action" href="#" style="color: inherit; font-weight: 600;">Chi tiết</a>
    </hui-announcement-bar>
  `,
  args: { type: 'info', variant: 'soft', closable: true, marquee: false },
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('hui-announcement-bar');
    await bar.updateComplete;
    await expect(bar.shadowRoot.querySelector('[part="base"]').getAttribute('role')).toBe('region');
    await expect(closeBtn(bar).getAttribute('aria-label')).toBeTruthy();

    // preventDefault giữ lại
    bar.addEventListener('hui-close', (e) => e.preventDefault(), { once: true });
    closeBtn(bar).click();
    await expect(bar.hidden).toBe(false);

    let fired = false;
    bar.addEventListener('hui-close', () => { fired = true; }, { once: true });
    closeBtn(bar).click();
    await expect(fired).toBe(true);
    await waitFor(() => expect(bar.hidden).toBe(true));
    await expect(bar.dismissed).toBe(true);
    bar.show();
    await expect(bar.hidden).toBe(false);
  },
};

export const TypesAndVariants = {
  render: () => html`
    <div style="display: grid; gap: 8px;">
      ${['soft', 'filled'].map((variant) => ['info', 'success', 'warning', 'danger', 'primary'].map((type) => html`
        <hui-announcement-bar type=${type} variant=${variant} closable>
          type="${type}" variant="${variant}" — Ưu đãi cuối tuần cho thành viên mới
        </hui-announcement-bar>
      `))}
    </div>
  `,
};

export const DismissRemembered = {
  render: () => html`<div id="host"></div>`,
  play: async ({ canvasElement }) => {
    const KEY = 'story-promo';
    localStorage.removeItem(`hui-dismiss:${KEY}`);
    const host = canvasElement.querySelector('#host');
    const make = () => {
      const bar = document.createElement('hui-announcement-bar');
      bar.setAttribute('closable', '');
      bar.setAttribute('dismiss-key', KEY);
      bar.textContent = 'Đóng tôi rồi tải lại trang — tôi sẽ không hiện nữa.';
      host.append(bar);
      return bar;
    };
    const first = make();
    await first.updateComplete;
    await expect(first.hidden).toBe(false);
    closeBtn(first).click();
    await waitFor(() => expect(first.hidden).toBe(true));
    await expect(localStorage.getItem(`hui-dismiss:${KEY}`)).not.toBe(null);

    // "Tải lại trang": thẻ mới cùng key → ẩn ngay
    first.remove();
    const second = make();
    await expect(second.hidden).toBe(true);
    await expect(second.dismissed).toBe(true);

    // show() xóa trạng thái đã nhớ
    second.show();
    await expect(localStorage.getItem(`hui-dismiss:${KEY}`)).toBe(null);
    await expect(second.hidden).toBe(false);
    localStorage.removeItem(`hui-dismiss:${KEY}`);
  },
};

export const StorageUnavailable = {
  name: 'Storage bị chặn',
  render: () => html`<div id="host"></div>`,
  play: async ({ canvasElement }) => {
    const proto = Storage.prototype;
    const { getItem, setItem } = proto;
    proto.getItem = () => { throw new Error('SecurityError'); };
    proto.setItem = () => { throw new Error('SecurityError'); };
    try {
      const bar = document.createElement('hui-announcement-bar');
      bar.setAttribute('closable', '');
      bar.setAttribute('dismiss-key', 'blocked');
      bar.textContent = 'localStorage bị chặn → vẫn hiện và đóng được bình thường';
      canvasElement.querySelector('#host').append(bar);
      await bar.updateComplete;
      await expect(bar.hidden).toBe(false);
      closeBtn(bar).click();
      await waitFor(() => expect(bar.hidden).toBe(true));
      bar.show();
    } finally {
      proto.getItem = getItem;
      proto.setItem = setItem;
    }
  },
};

export const RotatingMessages = {
  render: () => html`
    <hui-announcement-bar type="primary" variant="filled" closable interval="3000" .messages=${MESSAGES}>
      <span slot="prefix" aria-hidden="true">🎁</span>
    </hui-announcement-bar>
  `,
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('hui-announcement-bar');
    await bar.updateComplete;
    const msgs = [...bar.shadowRoot.querySelectorAll('[part="message"]')];
    await expect(msgs.length).toBe(3);
    await expect(bar.currentIndex).toBe(0);
    await expect(msgs[1].getAttribute('aria-hidden')).toBe('true');

    let detail = null;
    bar.addEventListener('hui-change', (e) => { detail = e.detail; }, { once: true });
    bar.next();
    await expect(detail).toEqual({ index: 1 });
    await expect(msgs[1].classList.contains('ab__message--current')).toBe(true);
    await expect(msgs[1].hasAttribute('aria-hidden')).toBe(false);
    bar.prev();
    bar.prev();
    await expect(bar.currentIndex).toBe(2);
  },
};

export const Marquee = {
  render: () => html`
    <hui-announcement-bar type="warning" marquee speed="80" .messages=${MESSAGES}>
      <span slot="prefix" aria-hidden="true">📢</span>
    </hui-announcement-bar>
  `,
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('hui-announcement-bar');
    await bar.updateComplete;
    const track = bar.shadowRoot.querySelector('[part="track"]');
    await waitFor(() => expect(track.getAnimations().length).toBe(1));
    const anim = track.getAnimations()[0];
    // Hover → dừng, rời chuột → chạy tiếp
    bar.dispatchEvent(new MouseEvent('mouseenter'));
    await expect(anim.playState).toBe('paused');
    bar.dispatchEvent(new MouseEvent('mouseleave'));
    await expect(anim.playState).toBe('running');

    // no-animation → hiện tĩnh
    bar.noAnimation = true;
    await bar.updateComplete;
    await waitFor(() => expect(track.getAnimations().length).toBe(0));
    await expect(bar.shadowRoot.querySelector('.ab--marquee-static')).toBeTruthy();
  },
};

export const MarqueeSlotContent = {
  render: () => html`
    <hui-announcement-bar type="danger" variant="filled" marquee closable>
      ⚡ Giờ vàng: giảm thêm 10% khi thanh toán qua ví điện tử — áp dụng đến 23:59 hôm nay ⚡
    </hui-announcement-bar>
  `,
};

export const Sticky = {
  render: () => html`
    <div style="height: 220px; overflow: auto; border: 1px solid var(--hui-border);">
      <hui-announcement-bar sticky type="success" closable>Cuộn khung này — dải thông báo dính ở trên.</hui-announcement-bar>
      <div style="height: 600px; padding: 16px;">Nội dung trang…</div>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-bar {
        --hui-announcement-bar-bg: linear-gradient(90deg, var(--hui-primary), var(--hui-secondary, var(--hui-info)));
        --hui-announcement-bar-color: var(--hui-text-light-solid);
        --hui-announcement-bar-border-color: transparent;
        --hui-announcement-bar-padding: 12px 24px;
        --hui-announcement-bar-font-size: var(--hui-font-base);
        --hui-announcement-bar-max-width: 960px;
      }
      .brand-bar::part(close) { border-radius: 50%; }
      .brand-bar::part(action) { font-weight: 600; }
    </style>
    <hui-announcement-bar class="brand-bar" closable>
      <span slot="prefix" aria-hidden="true">✨</span>
      Ra mắt bộ sưu tập Thu Đông 2026
      <hui-button slot="action" size="sm" variant="secondary">Khám phá</hui-button>
    </hui-announcement-bar>
  `,
};
