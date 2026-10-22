/**
 * Storybook Stories — HUI Hover Card (Molecule)
 * Rê chuột / focus vào tên, avatar → thẻ thông tin nổi (kiểu GitHub / X), có trễ mở / đóng.
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-avatar/index.js';
import '../hui-button/index.js';

const pointer = (el, type, pointerType = 'mouse') => el.dispatchEvent(new PointerEvent(type, { pointerType, bubbles: type === 'pointerdown' }));
const card = (hc) => hc.shadowRoot.querySelector('[part="card"]');
const wrap = (hc) => hc.shadowRoot.querySelector('[part="trigger"]');

const profile = (name, handle, bio, color = 'primary') => html`
  <div slot="content" style="display: grid; gap: 10px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <hui-avatar name=${name} size="lg" color=${color}></hui-avatar>
      <div style="min-width: 0;">
        <div style="font-weight: 600; color: var(--hui-text);">${name}</div>
        <div style="color: var(--hui-text-tertiary);">@${handle}</div>
      </div>
    </div>
    <p style="margin: 0;">${bio}</p>
    <div style="display: flex; gap: 16px; font-size: 12px;"><span><b>1.2k</b> người theo dõi</span><span><b>86</b> đang theo dõi</span></div>
    <hui-button size="sm" variant="primary">Theo dõi</hui-button>
  </div>
`;

export default {
  title: 'Molecules/HuiHoverCard',
  component: 'hui-hover-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Hover Card** — rê chuột / focus bàn phím vào trigger → hiện thẻ thông tin nổi. Thẻ nằm trên top-layer (Popover API)
nên không bị \`overflow: hidden\` cắt.

\`\`\`html
<hui-hover-card open-delay="300" arrow>
  <a href="/u/lan">@lan.nguyen</a>
  <div slot="content">…avatar, tên, mô tả, nút theo dõi…</div>
</hui-hover-card>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`placement\` | string | \`'bottom-start'\` | top / bottom / left / right kèm -start / -end |
| \`open-delay\` | number | \`400\` | Trễ mở (ms) |
| \`close-delay\` | number | \`250\` | Trễ đóng (ms) — rê từ trigger sang thẻ vẫn giữ mở |
| \`offset\` | number | \`8\` | Khoảng cách (px) |
| \`arrow\` | boolean | \`false\` | Mũi tên |
| \`open\` | boolean | \`false\` | Trạng thái mở |
| \`disabled\` | boolean | \`false\` | Không mở |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Methods
\`show()\`, \`hide()\` — mở / đóng ngay không trễ.

### Events
| Event | Detail |
|-------|--------|
| \`hui-open-change\` | \`{ open }\` |

### Slots
_(default)_ trigger · \`content\` nội dung thẻ

### Parts
\`trigger\`, \`card\`, \`arrow\`

### CSS Variables
\`--hui-hover-card-bg\`, \`-color\`, \`-padding\`, \`-radius\`, \`-shadow\`, \`-border-color\`, \`-width\` (320px)

### Bàn phím & trợ năng
| Thao tác | Hành động |
|----------|-----------|
| Tab tới trigger | Mở sau \`open-delay\` (chỉ khi focus bằng bàn phím) |
| Tab tiếp | Vào các nút / link trong thẻ; rời hẳn → đóng |
| \`Esc\` | Đóng; focus đang trong thẻ → trả về trigger |
| Chạm (cảm ứng) | Lần 1 mở thẻ (chặn điều hướng link), lần 2 đi theo link; chạm ra ngoài → đóng |

Trigger có \`aria-describedby\` trỏ tới nội dung thẻ (cùng light DOM nên đọc được) và \`aria-expanded\` theo trạng thái.
        `,
      },
    },
  },
  argTypes: {
    placement: { control: 'select', options: ['top', 'top-start', 'bottom', 'bottom-start', 'bottom-end', 'left', 'right'] },
  },
};

export const Default = {
  render: (args) => html`
    <p style="padding-bottom: 240px; color: var(--hui-text-secondary);">
      Bài viết của
      <hui-hover-card placement=${args.placement} ?arrow=${args.arrow} open-delay="200" close-delay="150">
        <a href="#lan" style="color: var(--hui-primary); font-weight: 600;">@lan.nguyen</a>
        ${profile('Nguyễn Thu Lan', 'lan.nguyen', 'Product designer tại H-UI. Viết về design system và trải nghiệm người dùng.')}
      </hui-hover-card>
      đã được chia sẻ 120 lần.
    </p>
  `,
  args: { placement: 'bottom-start', arrow: true },
  play: async ({ canvasElement }) => {
    const hc = canvasElement.querySelector('hui-hover-card');
    await hc.updateComplete;
    const link = hc.querySelector('a');
    const content = hc.querySelector('[slot="content"]');
    await expect(content.id).toBeTruthy();
    await expect(link.getAttribute('aria-describedby')).toBe(content.id);
    await expect(link.getAttribute('aria-expanded')).toBe('false');

    // Rê qua nhanh → không mở
    pointer(wrap(hc), 'pointerenter');
    await new Promise((r) => setTimeout(r, 80));
    pointer(wrap(hc), 'pointerleave');
    await new Promise((r) => setTimeout(r, 250));
    await expect(hc.open).toBe(false);

    // Dừng lại → mở
    const events = [];
    hc.addEventListener('hui-open-change', (e) => events.push(e.detail.open));
    pointer(wrap(hc), 'pointerenter');
    await waitFor(() => expect(hc.open).toBe(true));
    await expect(card(hc).hidden).toBe(false);
    await expect(link.getAttribute('aria-expanded')).toBe('true');

    // Rê sang thẻ → vẫn mở
    pointer(wrap(hc), 'pointerleave');
    pointer(card(hc), 'pointerenter');
    await new Promise((r) => setTimeout(r, 250));
    await expect(hc.open).toBe(true);

    // Focus trong thẻ + Esc → đóng, focus về trigger
    content.querySelector('hui-button').focus();
    await userEvent.keyboard('{Escape}');
    await expect(hc.open).toBe(false);
    await expect(document.activeElement).toBe(link);
    await expect(events).toEqual([true, false]);
  },
};

export const Touch = {
  name: 'Cảm ứng: chạm để mở',
  render: () => html`
    <div style="padding-bottom: 240px;">
      <hui-hover-card no-animation>
        <a href="#profile" id="touch-link"><hui-avatar name="Trần Minh" color="success"></hui-avatar></a>
        ${profile('Trần Minh', 'minh.tran', 'Kỹ sư frontend, yêu thích Web Components.', 'success')}
      </hui-hover-card>
      <button id="outside">Vùng ngoài</button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const hc = canvasElement.querySelector('hui-hover-card');
    await hc.updateComplete;
    const link = canvasElement.querySelector('#touch-link');
    // Sự kiện click giả lập: defaultPrevented sau khi dispatch = link có bị chặn điều hướng không
    const tap = () => {
      pointer(link, 'pointerdown', 'touch');
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
      link.dispatchEvent(ev);
      return ev.defaultPrevented;
    };
    // Chạm lần 1: mở thẻ, chặn điều hướng
    await expect(tap()).toBe(true);
    await expect(hc.open).toBe(true);
    // Chạm lần 2: component không chặn nữa (kiểm tra ở document, rồi tự chặn để story không rời trang)
    let preventedByCard = null;
    document.addEventListener('click', (e) => { preventedByCard = e.defaultPrevented; e.preventDefault(); }, { once: true });
    tap();
    await expect(preventedByCard).toBe(false);
    await expect(hc.open).toBe(true);

    // Chạm ra ngoài → đóng
    canvasElement.querySelector('#outside').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerType: 'touch' }));
    await expect(hc.open).toBe(false);
  },
};

export const Placements = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; padding: 200px 0;">
      ${['top', 'right', 'bottom', 'left'].map((p) => html`
        <hui-hover-card placement=${p} arrow open-delay="100">
          <hui-button variant="outline">${p}</hui-button>
          <div slot="content">Thẻ ở phía <b>${p}</b> — tự lật khi không đủ chỗ.</div>
        </hui-hover-card>
      `)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const hc = canvasElement.querySelector('hui-hover-card');
    await hc.updateComplete;
    hc.show();
    await expect(hc.open).toBe(true);
    await waitFor(() => expect(card(hc).dataset.side).toBe('top'));
    hc.hide();
    await expect(hc.open).toBe(false);
  },
};

export const Disabled = {
  render: () => html`
    <hui-hover-card disabled open-delay="0">
      <span tabindex="0">Không mở (disabled)</span>
      <div slot="content">Không hiện</div>
    </hui-hover-card>
  `,
  play: async ({ canvasElement }) => {
    const hc = canvasElement.querySelector('hui-hover-card');
    await hc.updateComplete;
    hc.show();
    await expect(hc.open).toBe(false);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-hc {
        --hui-hover-card-bg: var(--hui-bg-spotlight);
        --hui-hover-card-color: var(--hui-text-light-solid);
        --hui-hover-card-border-color: transparent;
        --hui-hover-card-radius: 6px;
        --hui-hover-card-width: 240px;
        --hui-hover-card-padding: 10px 12px;
      }
      .brand-hc::part(card) { font-size: 12px; }
    </style>
    <div style="padding: 24px 0 120px;">
      <hui-hover-card class="brand-hc" arrow open>
        <abbr title="" style="cursor: help;">SLA</abbr>
        <div slot="content"><b>Service Level Agreement</b> — cam kết thời gian phản hồi trong 2 giờ làm việc.</div>
      </hui-hover-card>
    </div>
  `,
};
