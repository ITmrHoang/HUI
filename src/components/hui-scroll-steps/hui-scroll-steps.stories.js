/**
 * Storybook Stories — HUI Scroll Steps (Organism)
 * Cuộn từng bước full chiều cao: scroll-snap, chấm điều hướng, bộ đếm, nút Trước/Sau, wheel-step, #hash, hiệu ứng vào.
 * Mọi ví dụ dùng container="self" + height="600px" (hoặc nhỏ hơn) để trang docs không dài 500vh.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

// ---------- Tiện ích cho play ----------
const stepsOf = (canvas, sel = 'hui-scroll-steps') => canvas.querySelector(sel);
const partOf = (steps, name) => steps.shadowRoot.querySelector(`[part~="${name}"]`);
const dotsOf = (steps) => [...steps.shadowRoot.querySelectorAll('[part~="dot"]')];
const key = (el, k, opts = {}) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true, ...opts }));
const ready = (steps, n) => waitFor(() => expect(steps.count).toBe(n));

// ---------- Nội dung mẫu ----------
const muted = 'color: var(--hui-text-secondary); margin: 0; max-width: 560px;';
const h = (text, size = '2.5rem') => html`<h2 style="margin: 0; font-size: clamp(1.75rem, 4vw, ${size}); line-height: 1.15;">${text}</h2>`;
const eyebrow = (text) => html`<span style="font-size: 0.8rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hui-primary);">${text}</span>`;

/** Ảnh nền mẫu (SVG nội tuyến → không cần mạng) */
const BG_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="a" cx="20%" cy="30%" r="60%"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#0f172a" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="85%" cy="75%" r="55%"><stop offset="0" stop-color="#ec4899"/><stop offset="1" stop-color="#0f172a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="800" fill="#0f172a"/><rect width="1200" height="800" fill="url(#a)"/><rect width="1200" height="800" fill="url(#b)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.08">${Array.from({ length: 12 }, (_, i) => `<circle cx="600" cy="400" r="${60 + i * 50}"/>`).join('')}</g>
</svg>`)}`;

const productSteps = (attrs = {}) => html`
  <hui-scroll-steps
    id=${attrs.id || 'steps-product'}
    height=${attrs.height || '600px'}
    nav=${attrs.nav || 'right'}
    ?counter=${attrs.counter ?? true}
    ?arrows=${attrs.arrows ?? true}
    ?progress=${attrs.progress ?? true}
    ?wheel-step=${attrs.wheelStep}
    ?nav-labels=${attrs.navLabels}
    ?no-animation=${attrs.noAnimation}
    style="border: 1px solid var(--hui-border); border-radius: 12px; overflow: hidden;"
  >
    <hui-step-section label="Giới thiệu" animate="fade-up" background="linear-gradient(160deg, var(--hui-primary-1), var(--hui-bg))">
      ${eyebrow('HUI Watch 2')}
      ${h('Đồng hồ thông minh cho người bận rộn', '3rem')}
      <p style=${muted}>Pin 14 ngày, theo dõi giấc ngủ, nghe gọi trên cổ tay. Cuộn, lăn chuột, vuốt hoặc dùng phím ↑/↓ để chuyển bước.</p>
      <div style="display: flex; gap: 12px;"><hui-button>Mua ngay</hui-button><hui-button variant="outline">Xem video</hui-button></div>
    </hui-step-section>

    <hui-step-section label="Tính năng" animate="zoom-in" align="start">
      ${eyebrow('Tính năng')}
      ${h('Mọi thứ bạn cần, gọn trong 40mm')}
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
        ${['Theo dõi nhịp tim 24/7', 'GPS kép chính xác', 'Chống nước 5 ATM', 'Thanh toán NFC'].map((f) => html`
          <div style="padding: 20px; border-radius: 12px; background: var(--hui-bg-secondary); border: 1px solid var(--hui-border);">
            <strong>${f}</strong><p style="${muted} font-size: 0.875rem; margin-top: 6px;">Mô tả ngắn cho tính năng này.</p>
          </div>`)}
      </div>
    </hui-step-section>

    <hui-step-section label="Thông số" id="specs" align="start">
      ${eyebrow('Thông số — bước này dài hơn khung, cuộn bên trong')}
      ${h('Thông số kỹ thuật')}
      ${Array.from({ length: 16 }, (_, i) => html`
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--hui-border);">
          <span style="color: var(--hui-text-secondary);">Thông số ${i + 1}</span><strong>Giá trị ${i + 1}</strong>
        </div>`)}
    </hui-step-section>

    <hui-step-section label="Bảng giá" animate="fade-up" background="var(--hui-bg-secondary)">
      ${eyebrow('Bảng giá')}
      ${h('Chọn phiên bản phù hợp')}
      <div style="display: flex; flex-wrap: wrap; gap: 16px;">
        ${[['Sport', '3.990.000₫'], ['Classic', '5.490.000₫'], ['Titan', '8.990.000₫']].map(([n, p]) => html`
          <div style="flex: 1 1 160px; padding: 24px; border-radius: 12px; background: var(--hui-bg); border: 1px solid var(--hui-border);">
            <div style="color: var(--hui-text-secondary);">${n}</div><div style="font-size: 1.5rem; font-weight: 700;">${p}</div>
          </div>`)}
      </div>
    </hui-step-section>

    <hui-step-section label="Đặt hàng" theme="dark" animate="blur-in" background="var(--hui-bg)">
      ${h('Sẵn sàng nâng cấp?', '3rem')}
      <p style=${muted}>Miễn phí giao hàng toàn quốc, đổi trả trong 30 ngày.</p>
      <div><hui-button size="lg">Đặt hàng ngay</hui-button></div>
    </hui-step-section>
  </hui-scroll-steps>
`;

export default {
  title: 'Organisms/HuiScrollSteps',
  component: 'hui-scroll-steps',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Scroll Steps** — khung cuộn **từng bước, mỗi bước full chiều cao** (kiểu fullPage.js) cho landing page,
giới thiệu sản phẩm, onboarding. Lõi là **CSS scroll-snap** (\`mandatory\`) → nhẹ, không chặn cuộn/vuốt tự nhiên, trợ năng tốt;
\`wheel-step\` (tùy chọn) biến mỗi lần lăn chuột thành đúng 1 bước.

\`\`\`html
<!-- Cuộn trong chính component (mặc định cao 100dvh, đặt height để đổi) -->
<hui-scroll-steps counter arrows progress hash>
  <hui-step-section label="Giới thiệu" id="intro" animate="fade-up">…</hui-step-section>
  <hui-step-section label="Tính năng" id="features" background="linear-gradient(…)">…</hui-step-section>
  <hui-step-section label="Liên hệ" theme="dark">
    <video slot="background" src="bg.mp4" autoplay muted loop playsinline></video>
    …
  </hui-step-section>
</hui-scroll-steps>

<!-- Cả trang snap theo từng bước -->
<hui-scroll-steps container="window" wheel-step>…</hui-scroll-steps>
\`\`\`

### Cách hoạt động
- **container="self"** (mặc định): component là vùng cuộn cao \`100dvh\` (fallback \`100vh\`) hoặc theo \`height\`, \`scroll-snap-type: y mandatory\`.
- **container="window"**: các bước cao \`100dvh\` và snap theo **cuộn trang** — component gắn \`scroll-snap-type\` lên \`document.scrollingElement\`
  khi được gắn vào trang và trả lại giá trị cũ khi bị gỡ. Thanh chấm / nút / tiến độ cố định theo màn hình, chỉ hiện khi component trong màn hình.
  \`snap="mandatory"\` (mặc định) chỉ "hút" khi component phủ đường giữa màn hình (ngoài ra trang cuộn tự do), kèm 2 điểm snap
  "lối thoát" (1 màn hình phía trên + ngay sau component) → từ bước đầu/cuối vẫn lăn ra header/footer được. Mỗi trang 1 instance window.
- **direction="horizontal"** + self: các bước nằm ngang (100% chiều rộng mỗi bước), cuộn ngang trong chính component; lăn chuột dọc được đổi thành bước.
- **direction="horizontal"** + **container="window"** ("horizontal scroll section"): host cao N × \`100dvh\`, khung \`base\` ghim (sticky) cao 1 màn hình;
  trang cuộn dọc → các bước trượt ngang theo tiến độ cuộn, mỗi bước có 1 điểm snap dọc. Thanh chấm / nút nằm trong khung ghim.
  Tổ tiên của component không được có \`overflow: hidden / auto\` (sticky cần bám theo cuộn trang).
- **Bước cao hơn khung**: nội dung \`hui-step-section\` tự cuộn bên trong (tự phát hiện → attribute \`overflowing\`; ép bằng \`scrollable\`),
  bước đó dùng \`scroll-snap-stop: normal\`. Lăn chuột / phím mũi tên cuộn hết nội dung bên trong rồi mới sang bước kế.
  Phần tử thường (không phải \`hui-step-section\`) cũng được \`overflow-y: auto\`.
- **Bước đang xem**: IntersectionObserver (ngưỡng 60% khung) → attribute \`active\` + \`:state(active)\` trên bước, property \`current\`,
  sự kiện \`hui-step-change\`. Trong lúc \`goTo()\` cuộn mượt, các bước đi ngang qua không phát sự kiện.
- **wheel-step**: mỗi cử chỉ lăn = 1 bước, khóa ~700ms trong lúc chuyển; quán tính trackpad (chuỗi sự kiện giảm dần) bị bỏ qua.
  Ở bước đầu/cuối lăn ra ngoài → trang cuộn tiếp bình thường. Cảm ứng luôn vuốt tự nhiên.
- **hash**: mỗi bước có \`id\` (thiếu thì tự đặt \`step-1\`, \`step-2\`…); đổi bước → \`history.replaceState\`; \`hash="push"\` dùng \`pushState\`
  để nút Back quay lại bước trước. Mở trang có \`#id\` / \`hashchange\` / \`popstate\` → tới bước đó.

### hui-scroll-steps — Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`container\` | string | \`'self'\` | \`self\` \\| \`window\` |
| \`direction\` | string | \`'vertical'\` | \`vertical\` \\| \`horizontal\` — window + horizontal = khối ghim trượt ngang khi cuộn trang |
| \`height\` | string | — | Chiều cao khi self: số (px) hoặc độ dài CSS; mặc định \`100dvh\` |
| \`snap\` | string | \`'mandatory'\` | \`mandatory\` \\| \`proximity\` — window + mandatory chỉ "hút" khi component phủ giữa màn hình |
| \`wheel-step\` | boolean | \`false\` | Mỗi lần lăn chuột = đúng 1 bước |
| \`nav\` | string | \`'right'\` | \`left\` \\| \`right\` \\| \`bottom\` \\| \`none\` — thanh chấm |
| \`nav-labels\` | boolean | \`false\` | Luôn hiện nhãn cạnh chấm (mặc định khi hover/focus) |
| \`counter\` | boolean | \`false\` | Bộ đếm "2 / 5" |
| \`arrows\` | boolean | \`false\` | Nút Trước/Sau |
| \`progress\` | boolean | \`false\` | Thanh tiến độ mảnh ở mép trên |
| \`hash\` | string | — | Có mặt = đồng bộ #id (replaceState); \`"push"\` = pushState |
| \`no-animation\` | boolean | \`false\` | Tắt cuộn mượt + hiệu ứng vào của các bước |

### hui-scroll-steps — Properties & Methods
| Tên | Mô tả |
|-----|-------|
| \`current\` | **Chỉ đọc** — chỉ số bước đang xem (0-based) |
| \`count\` | **Chỉ đọc** — số bước |
| \`goTo(indexOrId, { smooth })\` | Tới bước theo chỉ số hoặc id; trả \`false\` khi không tìm thấy |
| \`next()\` / \`prev()\` | Bước kế / trước; trả \`false\` ở cuối / đầu |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-step-change\` | \`{ index, id, direction: 'forward' \\| 'backward', previous }\` | Đổi bước (cuộn, phím, chấm, API, hash) |

### hui-step-section — Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`label\` | string | — | Nhãn bước (chấm điều hướng + aria-label) |
| \`background\` | string | — | Nền CSS: màu, gradient, \`url(...)\` |
| \`align\` | string | \`'center'\` | \`start\` \\| \`center\` \\| \`end\` — căn nội dung theo chiều dọc |
| \`padding\` | string | \`'md'\` | \`none\` \\| \`sm\` \\| \`md\` \\| \`lg\` hoặc độ dài CSS |
| \`theme\` | string | — | \`dark\` \\| \`light\` — đặt \`data-theme\` để token đổi trong bước |
| \`scrollable\` | boolean | \`false\` | Ép cuộn bên trong (không đặt thì tự phát hiện → \`overflowing\`) |
| \`animate\` | string | — | Hiệu ứng vào cho các con khi bước được kích hoạt: \`fade\` \\| \`fade-up\` (mặc định khi để trống) \\| \`fade-down\` \\| \`fade-left\` \\| \`fade-right\` \\| \`zoom-in\` \\| \`zoom-out\` \\| \`flip-up\` \\| \`blur-in\` \\| \`slide-up\` |
| \`animate-once\` | string | \`'true'\` | \`"false"\` = chạy lại mỗi lần quay lại bước |
| \`stagger\` | number | \`80\` | ms giữa các con |
| \`duration\` | number | \`600\` | ms mỗi hiệu ứng |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng vào |
| \`active\` | boolean | — | **Chỉ đọc** — bước đang xem (cũng là \`:state(active)\`) |

Hiệu ứng vào tự tắt khi người dùng bật *giảm chuyển động*, \`<html data-hui-no-animation>\`, token \`--hui-motion-duration: 0ms\`,
\`no-animation\` trên bước hoặc trên \`hui-scroll-steps\`. Property JS của attribute \`animate\` là \`animateEffect\` (không đè \`Element.animate()\`).

### Slots
| Thẻ | Slot | Mô tả |
|-----|------|-------|
| \`hui-scroll-steps\` | (mặc định) | Các bước — \`hui-step-section\` hoặc phần tử bất kỳ |
| \`hui-step-section\` | (mặc định) | Nội dung bước |
| \`hui-step-section\` | \`background\` | Lớp nền tràn viền sau nội dung (video, ảnh — tự \`object-fit: cover\`) |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`↓\` / \`PageDown\` / \`Space\` | Bước kế (ngang: thêm \`→\`) |
| \`↑\` / \`PageUp\` / \`Shift+Space\` | Bước trước (ngang: thêm \`←\`) |
| \`Home\` / \`End\` | Bước đầu / cuối |
| \`Tab\` | Vào vùng cuộn, các chấm, nút Trước/Sau |

self: phím có tác dụng khi focus nằm trong component. window: khi component trong màn hình và không có ô nhập / control khác đang focus.
Bước cuộn được bên trong → mũi tên cuộn nội dung trước.

### ARIA
Vùng cuộn \`role="group"\` + \`aria-label\` theo locale; đặt \`aria-label\` trên thẻ → \`role="region"\` (landmark, tên do bạn đặt nên không trùng). Mỗi bước \`role="group"\` + \`aria-label="Nhãn (2/5)"\`.
Thanh chấm là \`role="group"\` \`aria-label="Điều hướng các bước"\` (không dùng landmark \`<nav>\` → nhiều scroll-steps trên một trang không bị trùng landmark), chấm đang xem có \`aria-current="step"\`. Bộ đếm \`aria-live="polite"\`.
Bước cao hơn khung: vùng nội dung tự có \`tabindex="0"\` để cuộn bằng bàn phím.
Locale keys (dự phòng tại chỗ): \`scrollSteps.label\`, \`scrollSteps.nav\`, \`scrollSteps.step\`, \`scrollSteps.prev\`, \`scrollSteps.next\`, \`scrollSteps.counter\`.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-scroll-steps-height\` | Chiều cao khi self (attribute \`height\` ưu tiên hơn) |
| \`--hui-scroll-steps-nav-offset\` / \`--hui-scroll-steps-nav-gap\` | Khoảng cách tới mép / giữa các chấm |
| \`--hui-scroll-steps-dot-size\` / \`--hui-scroll-steps-dot-color\` / \`--hui-scroll-steps-dot-active-color\` | Chấm |
| \`--hui-scroll-steps-label-bg\` / \`--hui-scroll-steps-label-color\` | Nhãn cạnh chấm |
| \`--hui-scroll-steps-control-size\` / \`--hui-scroll-steps-control-bg\` / \`--hui-scroll-steps-control-color\` | Nút Trước/Sau + bộ đếm |
| \`--hui-scroll-steps-progress-height\` / \`--hui-scroll-steps-progress-color\` | Thanh tiến độ |
| \`--hui-scroll-steps-focus-color\` | Viền focus |
| \`--hui-step-section-bg\` / \`--hui-step-section-color\` | Nền / chữ của bước |
| \`--hui-step-section-padding\` / \`--hui-step-section-max-width\` / \`--hui-step-section-gap\` | Khoảng đệm / bề rộng nội dung / khoảng cách các con |

**Parts (hui-scroll-steps):** \`base\`, \`viewport\`, \`nav\`, \`dot\`, \`dot-active\`, \`dot-label\`, \`controls\`, \`counter\`, \`prev\`, \`next\`, \`progress\`, \`progress-bar\`.
**Parts (hui-step-section):** \`base\`, \`background\`, \`content\`. Custom state: \`hui-step-section:state(active)\`, \`:state(overflowing)\`.
        `,
      },
    },
  },
  argTypes: {
    nav: { control: 'select', options: ['right', 'left', 'bottom', 'none'], table: { defaultValue: { summary: 'right' } } },
    counter: { control: 'boolean' },
    arrows: { control: 'boolean' },
    progress: { control: 'boolean' },
    wheelStep: { control: 'boolean', name: 'wheel-step' },
    navLabels: { control: 'boolean', name: 'nav-labels' },
    noAnimation: { control: 'boolean', name: 'no-animation' },
  },
};

/** Trang giới thiệu sản phẩm 5 bước (self, cao 600px): chấm + nhãn, bộ đếm, nút Trước/Sau, tiến độ, hiệu ứng vào */
export const Default = {
  args: { nav: 'right', counter: true, arrows: true, progress: true, wheelStep: false, navLabels: false, noAnimation: false },
  render: (args) => productSteps(args),
  play: async ({ canvasElement }) => {
    const steps = stepsOf(canvasElement);
    await ready(steps, 5);
    const sections = [...steps.querySelectorAll('hui-step-section')];
    const viewport = partOf(steps, 'viewport');

    // Mỗi bước cao đúng bằng khung
    await expect(steps.offsetHeight).toBe(600);
    await expect(viewport.clientHeight).toBe(steps.clientHeight); // 600 trừ viền 1px
    for (const s of sections) await expect(s.offsetHeight).toBe(viewport.clientHeight);
    await expect(steps.current).toBe(0);
    await expect(sections[0].hasAttribute('active')).toBe(true);
    await expect(sections[1].getAttribute('aria-label')).toBe('Tính năng (2/5)');
    await expect(partOf(steps, 'nav').getAttribute('aria-label')).toBe('Điều hướng các bước');

    // goTo(2) → bước 3 active + sự kiện
    let detail = null;
    steps.addEventListener('hui-step-change', (e) => { detail = e.detail; }, { once: true });
    steps.goTo(2);
    await waitFor(() => expect(sections[2].hasAttribute('active')).toBe(true));
    await expect(sections[0].hasAttribute('active')).toBe(false);
    await expect(detail).toEqual({ index: 2, id: 'specs', direction: 'forward', previous: 0 });
    await expect(partOf(steps, 'counter').textContent).toBe('3 / 5');
    await expect(dotsOf(steps)[2].getAttribute('aria-current')).toBe('step');

    // Phím ↓ → bước kế
    viewport.focus();
    key(viewport, 'ArrowDown');
    await waitFor(() => expect(steps.current).toBe(3));
    await expect(partOf(steps, 'counter').textContent).toBe('4 / 5');

    // Bấm chấm đầu tiên → về bước 1, lùi lại
    steps.addEventListener('hui-step-change', (e) => { detail = e.detail; }, { once: true });
    dotsOf(steps)[0].click();
    await waitFor(() => expect(steps.current).toBe(0));
    await expect(detail.direction).toBe('backward');
    await expect(partOf(steps, 'prev').disabled).toBe(true);
    await waitFor(() => expect(viewport.scrollTop).toBe(0), { timeout: 3000 });

    // End → bước cuối; nút "sau" bị khóa
    key(viewport, 'End');
    await waitFor(() => expect(steps.current).toBe(4));
    await expect(partOf(steps, 'next').disabled).toBe(true);
    await expect(steps.next()).toBe(false);
  },
};

/** Ngang: các bước nằm cạnh nhau, snap theo trục x; lăn chuột dọc = 1 bước, phím ←/→ */
export const Horizontal = {
  render: () => html`
    <hui-scroll-steps id="steps-h" direction="horizontal" height="480px" nav="bottom" arrows counter
      style="border: 1px solid var(--hui-border); border-radius: 12px; overflow: hidden;">
      ${['Khám phá', 'Kết nối', 'Sáng tạo', 'Chia sẻ'].map((label, i) => html`
        <hui-step-section label=${label} animate="fade-left"
          background=${`linear-gradient(135deg, var(--hui-${['primary', 'info', 'success', 'warning'][i]}-2), var(--hui-bg))`}>
          ${eyebrow(`Bước ${i + 1} / 4`)}
          ${h(label)}
          <p style=${muted}>Vuốt ngang, lăn chuột hoặc dùng phím ←/→ để chuyển bước.</p>
        </hui-step-section>`)}
    </hui-scroll-steps>
  `,
  play: async ({ canvasElement }) => {
    const steps = stepsOf(canvasElement);
    await ready(steps, 4);
    const viewport = partOf(steps, 'viewport');
    const sections = [...steps.querySelectorAll('hui-step-section')];
    await expect(sections[0].offsetWidth).toBe(viewport.clientWidth);
    await expect(steps.offsetHeight).toBe(480);
    await expect(sections[0].offsetHeight).toBe(viewport.clientHeight);

    key(viewport, 'ArrowRight');
    await waitFor(() => expect(steps.current).toBe(1));
    await waitFor(() => expect(Math.round(viewport.scrollLeft)).toBe(viewport.clientWidth), { timeout: 3000 });
    await expect(partOf(steps, 'prev').querySelector('hui-icon').getAttribute('name')).toBe('chevron-left');
  },
};

/** `wheel-step`: mỗi cử chỉ lăn chuột = đúng 1 bước (khóa trong lúc chuyển, bỏ quán tính trackpad) */
export const WheelStep = {
  render: () => productSteps({ id: 'steps-wheel', wheelStep: true, navLabels: true }),
  play: async ({ canvasElement }) => {
    const steps = stepsOf(canvasElement);
    await ready(steps, 5);
    const target = steps.querySelector('hui-step-section');
    const wheel = (deltaY) => target.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, composed: true, cancelable: true }));

    // Nhiều sự kiện liên tiếp trong cùng 1 cử chỉ → chỉ 1 bước
    wheel(30);
    wheel(60);
    wheel(100);
    wheel(80);
    await expect(steps.current).toBe(1);
    await new Promise((r) => setTimeout(r, 300));
    await expect(steps.current).toBe(1);

    // Lăn lên ở bước đầu (sau khi về 0) không bị chặn → trang cuộn tiếp
    steps.goTo(0, { smooth: false });
    await waitFor(() => expect(steps.current).toBe(0));
    await new Promise((r) => setTimeout(r, 800));
    const ev = new WheelEvent('wheel', { deltaY: -100, bubbles: true, composed: true, cancelable: true });
    target.dispatchEvent(ev);
    await expect(ev.defaultPrevented).toBe(false);
  },
};

/** Bước tối (`theme="dark"`) + lớp nền media qua slot `background` — chấm điều hướng tự đổi tông sáng */
export const DarkSectionWithMedia = {
  render: () => html`
    <hui-scroll-steps id="steps-dark" height="520px" counter style="border-radius: 12px; overflow: hidden;">
      <hui-step-section label="Đêm thành phố" theme="dark" animate="fade-up">
        <img slot="background" src=${BG_IMAGE} alt="" />
        ${eyebrow('Slot background')}
        ${h('Ảnh / video tràn viền phía sau nội dung', '2.75rem')}
        <p style="margin: 0; color: var(--hui-text-secondary);">theme="dark" đặt data-theme → token (chữ, nền, nút) đổi theo trong bước này.</p>
        <div><hui-button>Khám phá</hui-button></div>
      </hui-step-section>
      <hui-step-section label="Ban ngày" animate="fade-up" background="linear-gradient(180deg, #e0f2fe, var(--hui-bg))">
        ${h('Bước sáng tiếp theo')}
        <p style=${muted}>Chấm điều hướng trở về tông thường.</p>
      </hui-step-section>
      <hui-step-section label="Ảnh nền qua attribute" theme="dark" background=${`url("${BG_IMAGE}")`} align="end">
        ${h('background="url(...)"')}
      </hui-step-section>
    </hui-scroll-steps>
  `,
  play: async ({ canvasElement }) => {
    const steps = stepsOf(canvasElement);
    await ready(steps, 3);
    const sections = [...steps.querySelectorAll('hui-step-section')];
    await expect(sections[0].getAttribute('data-theme')).toBe('dark');
    await expect(partOf(steps, 'base').classList.contains('steps--on-dark')).toBe(true);
    await expect(sections[0].shadowRoot.querySelector('[part="background"]').hidden).toBe(false);
    steps.goTo(1);
    await waitFor(() => expect(partOf(steps, 'base').classList.contains('steps--on-dark')).toBe(false));
  },
};

/** Vị trí thanh chấm: `nav` right | left | bottom | none, `nav-labels` luôn hiện nhãn */
export const NavVariants = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
      ${[['right', true], ['left', true], ['bottom', false], ['none', false]].map(([nav, labels]) => html`
        <div>
          <p style="margin: 0 0 8px; color: var(--hui-text-secondary);">nav="${nav}"${labels ? ' nav-labels' : ''}${nav === 'none' ? ' counter arrows' : ''}</p>
          <hui-scroll-steps nav=${nav} ?nav-labels=${labels} ?counter=${nav === 'none'} ?arrows=${nav === 'none'} height="300px"
            style="border: 1px solid var(--hui-border); border-radius: 12px; overflow: hidden;">
            ${['Một', 'Hai', 'Ba', 'Bốn'].map((label, i) => html`
              <hui-step-section label=${label} padding="sm" background=${i % 2 ? 'var(--hui-bg-secondary)' : 'var(--hui-bg)'}>
                <strong style="font-size: 1.5rem; text-align: center;">${label}</strong>
              </hui-step-section>`)}
          </hui-scroll-steps>
        </div>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const all = [...canvasElement.querySelectorAll('hui-scroll-steps')];
    await waitFor(() => expect(all.every((s) => s.count === 4)).toBe(true));
    await expect(partOf(all[3], 'nav').hidden).toBe(true);
    await expect(dotsOf(all[0]).length).toBe(4);
    await expect(dotsOf(all[0])[1].querySelector('[part="dot-label"]').textContent).toBe('Hai');
    dotsOf(all[2])[3].click();
    await waitFor(() => expect(all[2].current).toBe(3));
  },
};

/** `hash`: mỗi bước có #id trên URL để chia sẻ link; `hash="push"` để nút Back quay lại bước trước */
export const Hash = {
  parameters: { docs: { story: { inline: false, iframeHeight: 520 } } },
  render: () => html`
    <hui-scroll-steps id="steps-hash" hash height="480px" counter arrows style="border: 1px solid var(--hui-border); border-radius: 12px; overflow: hidden;">
      <hui-step-section label="Mở đầu" id="hs-intro">${h('#hs-intro')}<p style=${muted}>Đổi bước → URL đổi theo (replaceState).</p></hui-step-section>
      <hui-step-section label="Chi tiết" id="hs-detail" background="var(--hui-bg-secondary)">${h('#hs-detail')}</hui-step-section>
      <hui-step-section label="Bảng giá" id="hs-pricing">${h('#hs-pricing')}</hui-step-section>
      <hui-step-section label="Không có id">${h('Tự đặt id="step-4"')}</hui-step-section>
    </hui-scroll-steps>
  `,
  play: async ({ canvasElement }) => {
    const steps = stepsOf(canvasElement);
    await ready(steps, 4);
    const base = location.pathname + location.search;
    try {
      await expect(steps.querySelectorAll('hui-step-section')[3].id).toBe('step-4');
      steps.goTo('hs-detail');
      await waitFor(() => expect(location.hash).toBe('#hs-detail'));

      // URL đổi từ ngoài (hashchange) → tới bước tương ứng
      history.replaceState(history.state, '', '#hs-pricing');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await waitFor(() => expect(steps.current).toBe(2));
    } finally {
      history.replaceState(history.state, '', base);
    }
  },
};

/** container="window": cả trang snap theo từng bước (xem trong iframe riêng) */
export const WindowContainer = {
  parameters: { docs: { story: { inline: false, iframeHeight: 520 } } },
  render: () => html`
    <hui-scroll-steps id="steps-window" container="window" counter progress>
      ${['Chương 1', 'Chương 2', 'Chương 3'].map((label, i) => html`
        <hui-step-section label=${label} animate="fade-up" background=${i % 2 ? 'var(--hui-bg-secondary)' : 'var(--hui-bg)'}>
          ${h(label)}<p style=${muted}>Mỗi bước cao 100dvh, trang tự snap. Thanh chấm cố định theo màn hình.</p>
        </hui-step-section>`)}
    </hui-scroll-steps>
  `,
  play: async ({ canvasElement }) => {
    const steps = stepsOf(canvasElement);
    await ready(steps, 3);
    const root = document.scrollingElement || document.documentElement;
    await expect(root.style.scrollSnapType).toBe('y mandatory');
    await expect(Math.abs(steps.querySelector("hui-step-section").offsetHeight - window.innerHeight)).toBeLessThanOrEqual(1);
  },
};

/**
 * container="window" + direction="horizontal": khối ghim (sticky) cao 1 màn hình, trang cuộn dọc → các bước trượt ngang
 * ("horizontal scroll section"). Header/footer ngoài component vẫn cuộn tới được dù snap="mandatory".
 */
export const WindowHorizontal = {
  parameters: { docs: { story: { inline: false, iframeHeight: 520 } } },
  render: () => html`
    <header id="steps-wh-header" style="height: 60vh; display: grid; place-items: center; background: var(--hui-bg-secondary);">
      ${h('Cuộn xuống ↓', '1.75rem')}
    </header>
    <hui-scroll-steps id="steps-wh" container="window" direction="horizontal" nav="bottom" counter progress>
      ${['Khám phá', 'Kết nối', 'Sáng tạo', 'Chia sẻ'].map((label, i) => html`
        <hui-step-section label=${label} animate="fade-left"
          background=${`linear-gradient(135deg, var(--hui-${['primary', 'info', 'success', 'warning'][i]}-2), var(--hui-bg))`}>
          ${eyebrow(`Bước ${i + 1} / 4`)}
          ${h(label)}
          <p style=${muted}>Trang cuộn dọc, các bước trượt ngang trong khối ghim.</p>
        </hui-step-section>`)}
    </hui-scroll-steps>
    <footer style="height: 240px; display: grid; place-items: center; background: var(--hui-bg-secondary);">
      <p style=${muted}>Footer — vẫn cuộn tới được</p>
    </footer>
  `,
  play: async ({ canvasElement }) => {
    const steps = stepsOf(canvasElement);
    await ready(steps, 4);
    const vh = window.innerHeight;
    const root = document.scrollingElement || document.documentElement;
    const sections = [...steps.querySelectorAll('hui-step-section')];
    const hostTop = () => window.scrollY + steps.getBoundingClientRect().top;

    // Host cao 4 màn hình, khung ghim sticky cao 1 màn hình, mỗi bước rộng bằng khung
    await expect(Math.abs(steps.offsetHeight - 4 * vh)).toBeLessThanOrEqual(2);
    await expect(getComputedStyle(partOf(steps, 'base')).position).toBe('sticky');
    await expect(Math.abs(sections[0].offsetHeight - vh)).toBeLessThanOrEqual(1);
    await expect(sections[0].offsetWidth).toBe(partOf(steps, 'viewport').clientWidth);

    // Ở header (component chưa phủ giữa màn hình) → trang không bị ép snap
    window.scrollTo(0, 0);
    await waitFor(() => expect(root.style.scrollSnapType).toBe('none'));

    // goTo(2) → trang cuộn dọc tới điểm snap của bước 2, khung dịch ngang để bước 2 nằm gọn trong màn hình
    const changes = [];
    steps.addEventListener('hui-step-change', (e) => changes.push(e.detail.index));
    steps.goTo(2, { smooth: false });
    await waitFor(() => expect(Math.abs(window.scrollY - (hostTop() + 2 * vh))).toBeLessThanOrEqual(2));
    await waitFor(() => expect(Math.abs(sections[2].getBoundingClientRect().left)).toBeLessThanOrEqual(1));
    await expect(steps.current).toBe(2);
    await waitFor(() => expect(root.style.scrollSnapType).toBe('y mandatory'));

    // Cuộn trang (không qua API) → bước đang xem đổi theo tiến độ cuộn
    window.scrollTo(0, hostTop() + vh);
    await waitFor(() => expect(steps.current).toBe(1));
    await waitFor(() => expect(Math.abs(sections[1].getBoundingClientRect().left)).toBeLessThanOrEqual(1));
    await expect(changes).toEqual([2, 1]);

    // Phím → / ← (focus ở trang) chuyển bước
    key(document.body, 'ArrowRight');
    await waitFor(() => expect(steps.current).toBe(2));

    // snap mandatory + điểm snap "lối thoát": từ bước đầu lăn lên → ra header (không bị kẹt ở bước đầu)
    steps.goTo(0, { smooth: false });
    await waitFor(() => expect(Math.abs(window.scrollY - hostTop())).toBeLessThanOrEqual(2));
    await waitFor(() => expect(root.style.scrollSnapType).toBe('y mandatory'));
    window.scrollBy({ top: -100, behavior: 'instant' });
    await waitFor(() => expect(window.scrollY).toBeLessThan(hostTop() - 100));
    await waitFor(() => expect(root.style.scrollSnapType).toBe('none'));

    // Từ bước cuối lăn xuống → sang footer
    steps.goTo(3, { smooth: false });
    await waitFor(() => expect(root.style.scrollSnapType).toBe('y mandatory'));
    const lastTop = window.scrollY;
    window.scrollBy({ top: 100, behavior: 'instant' });
    await waitFor(() => expect(window.scrollY).toBeGreaterThan(lastTop + 100));
    // Footer hiện ra trọn vẹn (footer ngắn hơn nửa màn hình → trang đã chạm đáy, snap không kéo ngược lại)
    await expect(canvasElement.querySelector('footer').getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight + 1);

    window.scrollTo(0, 0);
    await waitFor(() => expect(root.style.scrollSnapType).toBe('none'));
  },
};

/** Override từ ngoài: biến CSS + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      #steps-custom {
        --hui-scroll-steps-dot-size: 10px;
        --hui-scroll-steps-dot-active-color: var(--hui-success);
        --hui-scroll-steps-progress-color: var(--hui-success);
        --hui-scroll-steps-progress-height: 5px;
        /* success-8 (đậm hơn ở theme sáng, nhạt hơn ở theme tối) để chữ đạt tương phản AA */
        --hui-scroll-steps-control-bg: var(--hui-success-8);
        --hui-scroll-steps-control-color: var(--hui-text-inverse);
        --hui-step-section-max-width: 720px;
      }
      #steps-custom::part(dot-label) { background: var(--hui-success-8); color: var(--hui-text-inverse); font-weight: 600; }
      #steps-custom::part(counter) { border-color: transparent; font-weight: 600; }
      #steps-custom hui-step-section::part(content) { text-align: center; }
      #steps-custom hui-step-section:state(active) { --hui-step-section-color: var(--hui-success-8); }
    </style>
    <hui-scroll-steps id="steps-custom" height="420px" nav="left" nav-labels counter arrows progress
      style="border: 1px solid var(--hui-border); border-radius: 12px; overflow: hidden;">
      ${['Xanh lá', 'Đổi màu', 'Qua biến CSS'].map((label) => html`
        <hui-step-section label=${label} animate="zoom-in">${h(label)}<p style="margin: 0;">Bước đang xem đổi màu chữ qua :state(active).</p></hui-step-section>`)}
    </hui-scroll-steps>
  `,
  play: async ({ canvasElement }) => {
    const steps = stepsOf(canvasElement);
    await ready(steps, 3);
    const mark = steps.shadowRoot.querySelector('.steps__dot--active .steps__dot-mark');
    await expect(getComputedStyle(mark).width).toBe('10px');
    await expect(getComputedStyle(partOf(steps, 'progress')).height).toBe('5px');
  },
};
