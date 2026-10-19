import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { lightbox } from './index.js';
import '../hui-image/index.js';
import { svgSet } from '../hui-image/story-images.js';

const ITEMS = svgSet(6).map(({ src, alt, caption }) => ({ src, alt, caption }));
const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const dialogOf = (el) => el.shadowRoot.querySelector('dialog');

/** Đóng & chờ hết animation */
async function closeAndWait(el) {
  el.close();
  await waitFor(() => expect(dialogOf(el).open).toBe(false));
}

export default {
  title: 'Organisms/HuiLightbox',
  component: 'hui-lightbox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Lightbox** — trình xem ảnh toàn màn hình trên top-layer (\`<dialog>.showModal()\`) + \`utils/overlay.js\` (focus trap, khóa cuộn, Esc theo thứ tự lớp).
Mở phóng từ ảnh thu nhỏ (FLIP) khi có \`origin\`, ngược lại zoom + mờ dần. \`hui-image[preview]\` và \`hui-gallery\` dùng sẵn component này.

\`\`\`js
import { lightbox } from '@itmrhoang/h-ui/hui-lightbox';
lightbox.open([{ src, alt, caption }, 'b.jpg'], 0, { origin: thumbEl, loop: true });
\`\`\`

| Attribute / Property | Mặc định | Mô tả |
|-----------|----------|-------|
| \`items\` | \`[]\` | \`[{ src, alt, caption, download? }]\` hoặc mảng URL (property hoặc JSON attribute) |
| \`index\` | \`0\` | Ảnh đang xem |
| \`open\` | — | Đang mở (mở bằng \`show(index, { origin })\`, đóng bằng \`close()\`) |
| \`loop\` | — | Ảnh cuối → ảnh đầu |
| \`zoom-max\` | \`4\` | Mức zoom tối đa |
| \`no-download\` | — | Ẩn nút tải ảnh |
| \`label\` | locale | Nhãn ARIA hộp thoại |
| \`no-animation\` | — | Tắt hiệu ứng |

**Methods:** \`show(index, {origin})\`, \`close()\`, \`next()\`, \`prev()\`, \`goTo(i)\`, \`zoomIn()\`, \`zoomOut()\`, \`zoomTo(scale, point)\`, \`resetZoom()\`, \`rotate()\`
· **Chỉ đọc:** \`currentItem\`, \`count\`, \`zoom\`, \`imageElement\`

**Hàm:** \`lightbox.open(items, index, { origin, loop, noDownload, zoomMax })\` → thẻ dùng chung · \`lightbox.close()\` · \`lightbox.element\`

**Events:** \`hui-open\` {index} · \`hui-close\` {index} · \`hui-change\` {index, item}

**Parts:** dialog, mask, stage, image, toolbar, counter, zoom-in, zoom-out, rotate, download, close, prev, next, caption, loader, error
· **States:** \`:state(open)\`, \`:state(zoomed)\`, \`:state(loading)\`

**CSS:** \`--hui-lightbox-mask-bg\`, \`-color\`, \`-button-bg\`, \`-button-hover-bg\`, \`-button-size\`, \`-padding\`, \`-caption-max-width\`, \`-duration\`, \`-focus-color\`

**Bàn phím:** ← / → chuyển ảnh · Home / End · \`+\` / \`-\` zoom · \`0\` về vừa khung · \`R\` xoay · Esc đóng · Tab chạy vòng trong lightbox.
**Chuột / cảm ứng:** lăn chuột zoom quanh con trỏ · nhấp đúp zoom 2,5× / về 1× · kéo để di chuyển khi đang zoom · vuốt ngang chuyển ảnh · chụm 2 ngón zoom · chạm vùng trống để đóng.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-lightbox id="lb" .items=${ITEMS}></hui-lightbox>
    <div style="display: flex; gap: 8px; flex-wrap: wrap">
      ${ITEMS.map((it, i) => html`
        <button type="button" style="padding: 0; border: 0; background: none; cursor: zoom-in"
          @click=${(e) => document.getElementById('lb').show(i, { origin: e.currentTarget.querySelector('img') })}>
          <img src=${it.src} alt=${it.alt} width="120" height="80" style="display: block; object-fit: cover; border-radius: 8px">
        </button>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const lb = canvasElement.querySelector('#lb');
    const opened = [];
    const changes = [];
    lb.addEventListener('hui-open', (e) => opened.push(e.detail.index));
    lb.addEventListener('hui-change', (e) => changes.push(e.detail.index));

    canvasElement.querySelectorAll('button')[1].click();
    await waitFor(() => expect(dialogOf(lb).open).toBe(true));
    await expect(opened).toEqual([1]);
    await expect(part(lb, 'counter').textContent).toBe('2 / 6');
    await expect(part(lb, 'caption').textContent).toBe(ITEMS[1].caption);
    await expect(part(lb, 'image').getAttribute('src')).toBe(ITEMS[1].src);
    await expect(part(lb, 'download').getAttribute('href')).toBe(ITEMS[1].src);
    // Focus vào nút đóng (focus trap của overlay)
    await waitFor(() => expect(lb.shadowRoot.activeElement).toBe(part(lb, 'close')));

    // Bàn phím
    await userEvent.keyboard('{ArrowRight}');
    await expect(lb.index).toBe(2);
    await expect(changes).toEqual([2]);
    await waitFor(() => expect(part(lb, 'counter').textContent).toBe('3 / 6'));
    await userEvent.keyboard('{Home}');
    await expect(lb.index).toBe(0);
    await waitFor(() => expect(part(lb, 'prev').disabled).toBe(true));

    // Zoom bằng nút, phím và đặt lại
    part(lb, 'zoom-in').click();
    await expect(lb.zoom).toBeCloseTo(1.5);
    await expect(part(lb, 'zoom-out').disabled).toBe(false);
    await userEvent.keyboard('+');
    await expect(lb.zoom).toBeCloseTo(2.25);
    await userEvent.keyboard('0');
    await expect(lb.zoom).toBe(1);
    lb.zoomTo(99);
    await expect(lb.zoom).toBe(4);
    await expect(part(lb, 'zoom-in').disabled).toBe(true);
    lb.resetZoom();

    // Xoay
    part(lb, 'rotate').click();
    await expect(part(lb, 'image').style.transform).toContain('rotate(90deg)');

    // Esc đóng
    await userEvent.keyboard('{Escape}');
    await expect(lb.open).toBe(false);
    await waitFor(() => expect(dialogOf(lb).open).toBe(false));
  },
};

export const ImperativeApi = {
  render: () => html`
    <p style="margin: 0 0 12px">Gọi <code>lightbox.open(items, index, { origin, loop })</code> — không cần đặt thẻ trong HTML.</p>
    <div class="api-thumbs" style="display: flex; gap: 8px; flex-wrap: wrap">
      ${ITEMS.map((it, i) => html`
        <hui-image style="width: 140px" src=${it.src} alt=${it.alt} ratio="4/3" rounded
          @click=${(e) => lightbox.open(ITEMS, i, { origin: e.currentTarget, loop: true })}></hui-image>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const thumbs = canvasElement.querySelectorAll('hui-image');
    thumbs[5].click();
    const lb = lightbox.element;
    await waitFor(() => expect(dialogOf(lb).open).toBe(true));
    await expect(lb.index).toBe(5);
    await expect(lb.loop).toBe(true);
    // loop: ảnh cuối → ảnh đầu
    lb.next();
    await expect(lb.index).toBe(0);
    lb.prev();
    await expect(lb.index).toBe(5);
    await expect(document.body.style.overflow).toBe('hidden'); // khóa cuộn trang
    lightbox.close();
    await waitFor(() => expect(dialogOf(lb).open).toBe(false));
    await expect(document.body.style.overflow).toBe('');
  },
};

export const SwipeAndDoubleClick = {
  render: () => html`
    <hui-lightbox id="lb-gesture" no-download .items=${ITEMS.slice(0, 3)}></hui-lightbox>
    <button type="button" @click=${() => document.getElementById('lb-gesture').show(0)}>Mở lightbox (không nút tải)</button>
  `,
  play: async ({ canvasElement }) => {
    const lb = canvasElement.querySelector('#lb-gesture');
    lb.show(0);
    await waitFor(() => expect(dialogOf(lb).open).toBe(true));
    await expect(part(lb, 'download').hidden).toBe(true);
    const img = part(lb, 'image');
    await waitFor(() => expect(img.complete && img.naturalWidth > 0).toBe(true));
    const stage = part(lb, 'stage');
    const r = stage.getBoundingClientRect();
    const y = r.top + r.height / 2;
    const fire = (type, x, id = 1) => stage.dispatchEvent(new PointerEvent(type, {
      bubbles: true, composed: true, pointerId: id, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true,
    }));
    // Vuốt trái → ảnh sau
    fire('pointerdown', r.left + r.width * 0.7);
    fire('pointermove', r.left + r.width * 0.5);
    fire('pointermove', r.left + r.width * 0.3);
    fire('pointerup', r.left + r.width * 0.3);
    await expect(lb.index).toBe(1);

    // Nhấp đúp lên ảnh → zoom 2,5×, nhấp đúp lần nữa → về 1×
    const ir = img.getBoundingClientRect();
    img.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true, clientX: ir.left + ir.width / 2, clientY: ir.top + ir.height / 2 }));
    await expect(lb.zoom).toBe(2.5);
    img.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true, clientX: ir.left + 5, clientY: ir.top + 5 }));
    await expect(lb.zoom).toBe(1);

    // Lăn chuột lên → phóng to
    stage.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -200, clientX: r.left + r.width / 2, clientY: y }));
    await expect(lb.zoom).toBeGreaterThan(1);
    await closeAndWait(lb);
  },
};

export const LoadError = {
  render: () => html`
    <hui-lightbox id="lb-err" .items=${[{ src: 'data:image/png;base64,AAAA', alt: 'Ảnh lỗi', caption: 'Ảnh không tải được' }]}></hui-lightbox>
    <button type="button" @click=${() => document.getElementById('lb-err').show(0)}>Mở ảnh lỗi</button>
  `,
  play: async ({ canvasElement }) => {
    const lb = canvasElement.querySelector('#lb-err');
    lb.show(0);
    await waitFor(() => expect(part(lb, 'error').hidden).toBe(false));
    // 1 ảnh → không có bộ đếm / nút chuyển
    await expect(part(lb, 'counter').hidden).toBe(true);
    await expect(part(lb, 'next').hidden).toBe(true);
    await closeAndWait(lb);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-lightbox.brand {
        --hui-lightbox-mask-bg: color-mix(in srgb, var(--hui-primary-10) 92%, transparent);
        --hui-lightbox-button-bg: var(--hui-primary);
        --hui-lightbox-button-hover-bg: var(--hui-primary-hover);
        --hui-lightbox-button-size: 46px;
        --hui-lightbox-caption-max-width: 40ch;
      }
      hui-lightbox.brand::part(caption) { font-size: var(--hui-font-lg); font-style: italic; }
      hui-lightbox.brand::part(image) { border-radius: 12px; box-shadow: var(--hui-shadow-xl); }
    </style>
    <hui-lightbox id="lb-brand" class="brand" loop .items=${ITEMS}></hui-lightbox>
    <button type="button" @click=${() => document.getElementById('lb-brand').show(0)}>Mở lightbox tùy biến</button>
  `,
};
