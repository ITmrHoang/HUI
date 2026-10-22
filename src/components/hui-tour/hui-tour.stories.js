import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';
import '../hui-card/index.js';

const COVER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#db2777"/></linearGradient></defs><rect width="400" height="160" fill="url(#g)"/><circle cx="330" cy="40" r="60" fill="#fff" opacity="0.15"/><text x="24" y="96" font-family="Arial" font-size="34" font-weight="700" fill="#fff">Chào mừng!</text></svg>'
)}`;

export default {
  title: 'Organisms/HuiTour',
  component: 'hui-tour',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Tour** — hướng dẫn từng bước: lớp phủ tối có ô sáng (spotlight) quanh phần tử đích, chạy mượt giữa các bước,
khung nội dung tự định vị (12 vị trí, tự lật) — cả hai trên top-layer. Đích ngoài màn hình → cuộn mượt tới rồi mới định vị.
Cuộn trang / đổi kích thước → bám theo.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`steps\` (property / JSON) | \`[]\` | Danh sách bước (xem bảng dưới) |
| \`open\` | — | Đang mở |
| \`current\` | \`0\` | Bước hiện tại (từ 0) |
| \`mask\` | \`true\` | \`false\` = không phủ tối |
| \`gap\` / \`radius\` | \`6\` / \`8\` | Đệm quanh đích / bo góc spotlight (px) |
| \`offset\` | \`12\` | Khoảng cách spotlight ↔ khung |
| \`placement\` | \`bottom\` | Vị trí khung mặc định (top/bottom/left/right + -start/-end) |
| \`type\` | \`default\` | \`default\` · \`primary\` |
| \`indicator\` | \`text\` | \`text\` ("1/4") · \`dots\` · \`none\` |
| \`arrow\` | \`true\` | \`false\` = ẩn mũi tên |
| \`skippable\` | — | Hiện nút "Bỏ qua" |
| \`disable-interaction\` | — | Chặn thao tác lên phần tử đích |
| \`no-keyboard\` / \`no-animation\` | — | Tắt ←/→ · tắt chuyển động (giảm chuyển động của OS luôn được tôn trọng) |

**Bước (\`steps[i]\`):** \`target\` (selector · Element · \`() => Element\` — dùng Element/hàm cho phần tử trong Shadow DOM;
không có / không tìm thấy → khung ở giữa màn hình), \`title\`, \`description\` (chuỗi hoặc Node), \`placement\`, \`cover\` (URL ảnh hoặc Node),
\`nextLabel\`, \`prevLabel\`, \`scrollIntoView\` (mặc định true), \`mask\` (false = bước này không phủ tối), \`type\`, \`arrow\`,
\`onEnter({current, step, tour})\` (async, chạy trước khi hiện bước — vd mở menu để đích xuất hiện),
\`beforeNext({current, step, tour})\` (async, trả \`false\` để chặn sang bước sau; nút Tiếp hiện loading khi chờ).

**Sự kiện:** \`hui-change\` {current, previous} · \`hui-finish\` {current} · \`hui-close\` {current, reason: close | escape | skip | finish}
**Phương thức:** \`start(index?)\`, \`next()\`, \`prev()\`, \`goTo(index)\`, \`close()\`, \`reposition()\`
**Parts:** mask, spotlight, panel, arrow, close, cover, title, description, footer, indicator, skip-button, prev-button, next-button
**Biến CSS:** \`--hui-tour-mask-color\`, \`-width\`, \`-bg\`, \`-color\`, \`-title-color\`, \`-radius\`, \`-shadow\`, \`-padding\`, \`-primary-bg\`, \`-duration\`, \`-spotlight-ring\`

**Bàn phím:** \`→\` bước sau · \`←\` bước trước (bỏ qua khi đang gõ trong ô nhập) · \`Esc\` đóng · \`Tab\` đi qua các nút trong khung.
**Focus:** mỗi bước focus vào khung (\`role="dialog"\`, có \`aria-labelledby\`/\`aria-describedby\`); đóng → trả focus về phần tử trước đó.
Đích vẫn bấm được qua ô sáng (trừ khi \`disable-interaction\`); vùng tối chặn click.
        `,
      },
    },
  },
};

const bar = 'display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 16px; border: 1px solid var(--hui-border); border-radius: var(--hui-radius-lg); background: var(--hui-bg-container);';

/** Shadow DOM mẫu: đích nằm bên trong shadow root của một thẻ tùy biến */
if (!customElements.get('demo-tour-shadow')) {
  customElements.define('demo-tour-shadow', class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = '<div style="padding:8px 12px;border:1px dashed var(--hui-border);border-radius:8px;font:13px var(--hui-font-family);color:var(--hui-text-secondary)">Shadow DOM: <button class="inner" style="font:inherit">Nút trong shadow</button></div>';
    }
  });
}

const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;

export const Default = {
  render: () => html`
    <div style=${bar}>
      <hui-button id="tour-start" @click=${() => document.getElementById('tour-default').start()}>Bắt đầu hướng dẫn</hui-button>
      <hui-button id="tour-upload" variant="secondary" icon="upload">Tải lên</hui-button>
      <hui-button id="tour-save" variant="outline">Lưu</hui-button>
      <demo-tour-shadow id="tour-shadow"></demo-tour-shadow>
    </div>
    <hui-tour id="tour-default" .steps=${[
      { target: '#tour-upload', title: 'Tải file lên', description: 'Bấm vào đây để chọn file từ máy tính.' },
      { target: '#tour-save', title: 'Lưu thay đổi', description: 'Nhớ lưu sau khi chỉnh sửa.', placement: 'top' },
      {
        target: () => document.getElementById('tour-shadow').shadowRoot.querySelector('.inner'),
        title: 'Đích trong Shadow DOM',
        description: 'Truyền hàm trả về Element để trỏ vào phần tử bên trong shadow root.',
        placement: 'right',
      },
      { title: 'Xong rồi!', description: 'Bước không có target → khung nằm giữa màn hình.' },
    ]}></hui-tour>
  `,
  play: async ({ canvasElement }) => {
    const tour = canvasElement.querySelector('hui-tour');
    const panel = tour.shadowRoot.querySelector('[part="panel"]');
    const spotlight = tour.shadowRoot.querySelector('[part="spotlight"]');
    const startBtn = canvasElement.querySelector('#tour-start');
    const changes = [];
    const closes = [];
    tour.addEventListener('hui-change', (e) => changes.push(e.detail));
    tour.addEventListener('hui-close', (e) => closes.push(e.detail));

    startBtn.shadowRoot.querySelector('button').focus();
    startBtn.shadowRoot.querySelector('button').click();
    await waitFor(() => expect(panel.hidden).toBe(false));
    await expect(tour.open).toBe(true);
    await expect(panel.getAttribute('role')).toBe('dialog');
    await expect(tour.shadowRoot.querySelector('[part="title"]').textContent).toBe('Tải file lên');
    await expect(tour.shadowRoot.querySelector('[part="indicator"]').textContent).toBe('1/4');
    await expect(tour.shadowRoot.querySelector('[part="prev-button"]').hidden).toBe(true);
    await waitFor(() => expect(tour.shadowRoot.activeElement).toBe(panel));

    // Spotlight ôm đích (+ gap 6px mỗi phía)
    const upload = canvasElement.querySelector('#tour-upload');
    await waitFor(() => {
      const r = upload.getBoundingClientRect();
      const s = spotlight.getBoundingClientRect();
      expect(near(s.left, r.left - 6) && near(s.width, r.width + 12) && near(s.height, r.height + 12)).toBe(true);
    });
    // Ô sáng cho click xuyên tới đích, vùng tối thì chặn
    const r = upload.getBoundingClientRect();
    await expect(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)).toBe(upload);
    await expect(document.elementFromPoint(r.right + 200, r.bottom + 120)).toBe(tour);

    // Nút Tiếp
    tour.shadowRoot.querySelector('[part="next-button"]').shadowRoot.querySelector('button').click();
    await waitFor(() => expect(tour.current).toBe(1));
    await waitFor(() => expect(changes).toEqual([{ current: 1, previous: 0 }]));
    await expect(tour.getAttribute('current')).toBe('1');
    await expect(tour.shadowRoot.querySelector('[part="prev-button"]').hidden).toBe(false);

    // → sang đích trong Shadow DOM
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await waitFor(() => expect(tour.current).toBe(2));
    const inner = canvasElement.querySelector('#tour-shadow').shadowRoot.querySelector('.inner');
    await waitFor(() => {
      const ir = inner.getBoundingClientRect();
      const s = spotlight.getBoundingClientRect();
      expect(near(s.left, ir.left - 6) && near(s.top, ir.top - 6)).toBe(true);
    }, { timeout: 3000 });
    await expect(panel.dataset.side).toBe('right');

    // ← quay lại
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await waitFor(() => expect(tour.current).toBe(1));

    // Bước cuối không có target → nút Hoàn thành, khung ở giữa
    tour.goTo(3);
    await waitFor(() => expect(panel.dataset.side).toBe('center'));
    await expect(tour.shadowRoot.querySelector('[part="next-button"]').textContent).toBe('Hoàn thành');

    // Esc đóng + trả focus về nút Bắt đầu
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(panel.hidden).toBe(true), { timeout: 2000 });
    await expect(tour.open).toBe(false);
    await expect(closes).toEqual([{ current: 3, reason: 'escape' }]);
    await waitFor(() => expect(document.activeElement).toBe(startBtn));
    await expect(changes.map((c) => c.current)).toEqual([1, 2, 1, 3]);
  },
};

/** Hoàn thành ở bước cuối: hui-finish rồi hui-close (reason finish); kiểu primary + chấm chỉ báo + nút Bỏ qua */
export const PrimaryAndFinish = {
  render: () => html`
    <div style=${bar}>
      <hui-button id="tp-start" @click=${() => document.getElementById('tour-primary').start()}>Bắt đầu (primary)</hui-button>
      <hui-button id="tp-a" variant="secondary">Bước A</hui-button>
      <hui-button id="tp-b" variant="secondary">Bước B</hui-button>
    </div>
    <hui-tour id="tour-primary" type="primary" indicator="dots" skippable .steps=${[
      { target: '#tp-a', title: 'Kiểu primary', description: 'Nền màu chính, chữ trắng.' },
      { target: '#tp-b', title: 'Bước cuối', description: 'Bấm "Xong" để hoàn tất.', nextLabel: 'Xong', type: 'default' },
    ]}></hui-tour>
  `,
  play: async ({ canvasElement }) => {
    const tour = canvasElement.querySelector('hui-tour');
    const panel = tour.shadowRoot.querySelector('[part="panel"]');
    const events = [];
    tour.addEventListener('hui-finish', () => events.push('finish'));
    tour.addEventListener('hui-close', (e) => events.push(`close:${e.detail.reason}`));
    tour.start();
    await waitFor(() => expect(panel.hidden).toBe(false));
    await expect(panel.classList.contains('panel--primary')).toBe(true);
    await expect(tour.shadowRoot.querySelectorAll('.dot').length).toBe(2);
    await expect(tour.shadowRoot.querySelector('[part="skip-button"]').hidden).toBe(false);
    tour.next();
    await waitFor(() => expect(tour.current).toBe(1));
    // step.type ghi đè type của tour; bước cuối ẩn Bỏ qua
    await expect(panel.classList.contains('panel--primary')).toBe(false);
    await expect(tour.shadowRoot.querySelector('[part="skip-button"]').hidden).toBe(true);
    const next = tour.shadowRoot.querySelector('[part="next-button"]');
    await expect(next.textContent).toBe('Xong');
    next.shadowRoot.querySelector('button').click();
    await waitFor(() => expect(panel.hidden).toBe(true), { timeout: 2000 });
    await expect(events).toEqual(['finish', 'close:finish']);
  },
};

/** beforeNext bất đồng bộ chặn sang bước sau; onEnter chạy trước khi hiện bước */
export const AsyncSteps = {
  render: () => html`
    <div style=${bar}>
      <hui-button @click=${() => document.getElementById('tour-async').start()}>Bắt đầu</hui-button>
      <label id="ta-agree" style="display: inline-flex; gap: 6px; align-items: center; font: 14px var(--hui-font-family); color: var(--hui-text);">
        <input type="checkbox" /> Tôi đã đọc điều khoản
      </label>
      <span id="ta-later" style="font: 14px var(--hui-font-family); color: var(--hui-text-secondary);"></span>
    </div>
    <hui-tour id="tour-async" .steps=${[
      {
        target: '#ta-agree',
        title: 'Đồng ý điều khoản',
        description: 'Tích ô này rồi bấm Tiếp (beforeNext kiểm tra bất đồng bộ).',
        beforeNext: () => new Promise((resolve) => setTimeout(() => resolve(document.querySelector('#ta-agree input').checked), 60)),
      },
      {
        target: () => document.getElementById('ta-later-btn'),
        title: 'Phần tử tạo trong onEnter',
        description: 'onEnter tạo nút này trước khi bước hiện ra.',
        onEnter: async () => {
          await new Promise((r) => setTimeout(r, 30));
          const host = document.getElementById('ta-later');
          if (!document.getElementById('ta-later-btn')) host.innerHTML = '<button id="ta-later-btn" type="button">Nút mới</button>';
        },
      },
    ]}></hui-tour>
  `,
  play: async ({ canvasElement }) => {
    const tour = canvasElement.querySelector('hui-tour');
    const next = tour.shadowRoot.querySelector('[part="next-button"]');
    tour.start();
    await waitFor(() => expect(tour.shadowRoot.querySelector('[part="panel"]').hidden).toBe(false));
    await tour.next();
    await expect(tour.current).toBe(0); // chưa tích → bị chặn
    await expect(next.loading).toBe(false);
    canvasElement.querySelector('#ta-agree input').checked = true;
    await tour.next();
    await waitFor(() => expect(tour.current).toBe(1));
    await waitFor(() => expect(canvasElement.querySelector('#ta-later-btn')).not.toBe(null));
    await waitFor(() => expect(tour.shadowRoot.querySelector('[part="title"]').textContent).toBe('Phần tử tạo trong onEnter'));
    tour.close();
    await waitFor(() => expect(tour.open).toBe(false));
  },
};

/** Đích nằm ngoài màn hình → cuộn mượt tới rồi mới định vị (cuộn trang thì spotlight bám theo) */
export const ScrollIntoView = {
  render: () => html`
    <div style="display: grid; gap: 12px;">
      <div style=${bar}>
        <hui-button id="ts-start" @click=${() => document.getElementById('tour-scroll').start()}>Bắt đầu</hui-button>
        <span style="font: 13px var(--hui-font-family); color: var(--hui-text-secondary);">Bước 2 nằm cách 1600px phía dưới</span>
      </div>
      <div style="height: 1600px; display: grid; place-items: center; border: 1px dashed var(--hui-border); border-radius: 12px; color: var(--hui-text-tertiary); font: 13px var(--hui-font-family);">(khoảng trống)</div>
      <hui-card id="ts-far" style="max-width: 320px;" title="Thẻ ở cuối trang">Đích nằm ngoài màn hình ban đầu.</hui-card>
    </div>
    <hui-tour id="tour-scroll" .steps=${[
      { target: '#ts-start', title: 'Bắt đầu ở đây', description: 'Bấm Tiếp để cuộn tới thẻ ở cuối trang.' },
      { target: '#ts-far', title: 'Đã cuộn tới', description: 'Trang cuộn mượt rồi spotlight mới chuyển tới.', placement: 'top' },
    ]}></hui-tour>
  `,
  play: async ({ canvasElement }) => {
    const tour = canvasElement.querySelector('hui-tour');
    const far = canvasElement.querySelector('#ts-far');
    const spotlight = tour.shadowRoot.querySelector('[part="spotlight"]');
    tour.start();
    await waitFor(() => expect(tour.shadowRoot.querySelector('[part="panel"]').hidden).toBe(false));
    tour.next();
    await waitFor(() => expect(tour.current).toBe(1));
    await waitFor(() => {
      const r = far.getBoundingClientRect();
      expect(r.top >= 0 && r.bottom <= document.documentElement.clientHeight).toBe(true);
    }, { timeout: 4000 });
    await waitFor(() => {
      const r = far.getBoundingClientRect();
      const s = spotlight.getBoundingClientRect();
      expect(near(s.top, r.top - 6) && near(s.left, r.left - 6)).toBe(true);
    }, { timeout: 4000 });
    tour.close();
    await waitFor(() => expect(tour.open).toBe(false));
    window.scrollTo(0, 0);
  },
};

/** Ảnh bìa, không phủ tối (mask="false"), không mũi tên */
export const CoverAndNoMask = {
  render: () => html`
    <div style=${bar}>
      <hui-button @click=${() => document.getElementById('tour-cover').start()}>Ảnh bìa + không mask</hui-button>
      <hui-button id="tc-a" variant="secondary">Đích</hui-button>
    </div>
    <hui-tour id="tour-cover" mask="false" arrow="false" .steps=${[
      { target: '#tc-a', cover: COVER, title: 'Có ảnh bìa', description: 'cover nhận URL / data URI hoặc Node.', placement: 'bottom-start' },
    ]}></hui-tour>
  `,
  play: async ({ canvasElement }) => {
    const tour = canvasElement.querySelector('hui-tour');
    tour.start();
    await waitFor(() => expect(tour.shadowRoot.querySelector('[part="panel"]').hidden).toBe(false));
    await expect(tour.shadowRoot.querySelector('[part="cover"] img').getAttribute('src')).toBe(COVER);
    await expect(tour.shadowRoot.querySelector('[part="arrow"]').hidden).toBe(true);
    await expect(tour.shadowRoot.querySelector('[part="indicator"]').hidden).toBe(true); // 1 bước → không cần chỉ báo
    // Không phủ tối → vùng ngoài vẫn bấm được (không bị chặn)
    const row = canvasElement.querySelector('#tc-a').parentElement;
    const br = row.getBoundingClientRect();
    await expect(document.elementFromPoint(br.right - 4, br.top + 4)).not.toBe(tour);
    tour.shadowRoot.querySelector('[part="close"]').click();
    await waitFor(() => expect(tour.open).toBe(false));
  },
};

/** Mở sẵn bằng attribute + steps JSON (selector) */
export const DeclarativeOpen = {
  render: () => html`
    <div style=${bar}><hui-button id="td-a" variant="secondary">Đích khai báo bằng JSON</hui-button></div>
    <hui-tour open placement="right" steps='[{"target":"#td-a","title":"Khai báo bằng HTML","description":"steps là JSON, target là selector."}]'></hui-tour>
  `,
  play: async ({ canvasElement }) => {
    const tour = canvasElement.querySelector('hui-tour');
    await waitFor(() => expect(tour.shadowRoot.querySelector('[part="panel"]').hidden).toBe(false));
    await expect(tour.shadowRoot.querySelector('[part="panel"]').dataset.side).toBe('right');
    tour.close();
    await waitFor(() => expect(tour.shadowRoot.querySelector('[part="panel"]').hidden).toBe(true), { timeout: 2000 });
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-tour.brand {
        --hui-tour-mask-color: rgba(76, 5, 25, 0.55);
        --hui-tour-width: 280px;
        --hui-tour-radius: 18px;
        --hui-tour-duration: 600ms;
        --hui-tour-spotlight-ring: 0 0 0 3px #f472b6;
      }
      hui-tour.brand::part(panel) { border: 2px solid #f472b6; }
      hui-tour.brand::part(title) { color: #db2777; }
    </style>
    <div style=${bar}>
      <hui-button @click=${() => document.getElementById('tour-brand').start()}>Tour tùy biến</hui-button>
      <hui-button id="tb-a" variant="secondary">Một</hui-button>
      <hui-button id="tb-b" variant="secondary">Hai</hui-button>
    </div>
    <hui-tour id="tour-brand" class="brand" radius="999" gap="10" .steps=${[
      { target: '#tb-a', title: 'Biến CSS + ::part', description: 'Màu mask, viền spotlight, bo tròn, chậm hơn.' },
      { target: '#tb-b', title: 'Chuyển động 600ms', description: 'Spotlight trượt sang đích mới.' },
    ]}></hui-tour>
  `,
  play: async ({ canvasElement }) => {
    const tour = canvasElement.querySelector('hui-tour');
    tour.start();
    const panel = tour.shadowRoot.querySelector('[part="panel"]');
    await waitFor(() => expect(panel.hidden).toBe(false));
    await expect(getComputedStyle(panel).borderTopColor).toBe('rgb(244, 114, 182)');
    await expect(getComputedStyle(tour.shadowRoot.querySelector('[part="spotlight"]')).boxShadow).toContain('rgba(76, 5, 25, 0.55)');
    tour.close();
    await waitFor(() => expect(tour.open).toBe(false));
  },
};
