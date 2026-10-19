import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

const pane = 'height: 100%; padding: 16px; box-sizing: border-box;';
const handlesOf = (el) => [...el.shadowRoot.querySelectorAll('[role="separator"]')];
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

/** Kéo thanh `handle` thêm `dx`/`dy` px bằng PointerEvent */
function drag(handle, dx, dy = 0) {
  const r = handle.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const opts = { bubbles: true, composed: true, pointerId: 7, button: 0, pointerType: 'mouse', isPrimary: true };
  handle.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: x, clientY: y, buttons: 1 }));
  handle.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: x + dx / 2, clientY: y + dy / 2, buttons: 1 }));
  handle.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: x + dx, clientY: y + dy, buttons: 1 }));
  handle.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: x + dx, clientY: y + dy }));
}

export default {
  title: 'Organisms/HuiSplitter',
  component: 'hui-splitter',
  subcomponents: { HuiSplitterPanel: 'hui-splitter-panel' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Splitter** — chia vùng kéo đổi kích thước (2 vùng trở lên, ngang hoặc dọc, lồng nhau được).
Kích thước lưu theo **%** phần khả dụng → khung co giãn thì các vùng co giãn theo. Thanh kéo theo mẫu
[WAI-ARIA Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/): \`role="separator"\` + \`aria-valuenow\` (% vùng trước).

**hui-splitter**

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`direction\` | \`horizontal\` | \`horizontal\` (vùng xếp ngang) · \`vertical\` (xếp dọc — đặt chiều cao, vd \`--hui-splitter-height\`) |
| \`step\` | \`5\` | Bước % khi bấm phím mũi tên |
| \`persist-key\` | — | Lưu kích thước vào localStorage (\`hui-splitter:<key>\`) |
| \`disabled\` | — | Khóa kéo |

**hui-splitter-panel**

| Attribute | Mô tả |
|-----------|-------|
| \`size\` | Kích thước ban đầu: % (\`30\` / \`30%\`) hoặc px (\`240px\`); bỏ trống = chia đều phần còn lại |
| \`min\` · \`max\` | Giới hạn: % hoặc px |
| \`collapsible\` | Cho thu gọn về 0 (Enter, Home, hoặc kéo nhỏ hơn nửa \`min\`) |
| \`collapsed\` | Đang thu gọn (đặt sẵn để khởi đầu thu gọn; vùng thu gọn bị \`inert\`) |

**Thuộc tính JS:** \`sizes\` (mảng %, gán được) · **Phương thức:** \`collapse(i)\`, \`expand(i)\`, \`toggleCollapse(i)\`, \`reset()\`
**Sự kiện:** \`hui-resize\` {sizes, collapsed} (thả chuột / phím / thu gọn / reset), \`hui-resizing\` {sizes} (đang kéo)
**Trạng thái CSS:** \`hui-splitter:state(dragging)\`, \`hui-splitter-panel:state(collapsed)\`
**Parts:** \`base\`, \`panels\`, \`handle\` (+ \`handle-active\` khi kéo), \`grip\`; panel: \`base\`

| Biến CSS | Mặc định | Mô tả |
|----------|----------|-------|
| \`--hui-splitter-gutter\` | \`1px\` | Bề dày khe chia |
| \`--hui-splitter-gutter-color\` | \`--hui-border-secondary\` | Màu khe |
| \`--hui-splitter-handle-size\` | \`9px\` | Vùng bắt chuột |
| \`--hui-splitter-active-color\` | \`--hui-primary\` | Màu khi hover / kéo / focus |
| \`--hui-splitter-height\` | \`auto\` | Chiều cao khung |
| \`--hui-splitter-panel-padding\` | \`0\` | Đệm trong vùng |

**Bàn phím (trên thanh kéo):** ←/→ (↑/↓ khi vertical) đổi \`step\`% · Home: thu nhỏ hết cỡ (thu gọn nếu collapsible) ·
End: phóng to hết cỡ · Enter: thu gọn / mở lại · Double-click: về kích thước ban đầu.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-splitter style="--hui-splitter-height: 260px; border: 1px solid var(--hui-border-secondary); border-radius: 8px; overflow: hidden;">
      <hui-splitter-panel size="30%" min="15%" max="60%"><div style=${pane}><strong>Thư mục</strong><p>min 15%, max 60%</p></div></hui-splitter-panel>
      <hui-splitter-panel min="20%"><div style=${pane}><strong>Nội dung</strong><p>Kéo thanh giữa hoặc Tab tới thanh rồi dùng ←/→.</p></div></hui-splitter-panel>
    </hui-splitter>
  `,
  play: async ({ canvasElement }) => {
    const sp = canvasElement.querySelector('hui-splitter');
    const [left, right] = sp.querySelectorAll('hui-splitter-panel');
    await nextFrame();
    const [handle] = handlesOf(sp);
    await expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    await expect(handle.getAttribute('aria-valuenow')).toBe('30');
    await expect(handle.getAttribute('aria-valuemin')).toBe('15');
    await expect(handle.getAttribute('aria-valuemax')).toBe('60');
    await expect(handle.getAttribute('aria-controls')).toBe(left.id);
    await expect(sp.sizes).toEqual([30, 70]);
    // Bề rộng thật khớp tỉ lệ
    const total = left.getBoundingClientRect().width + right.getBoundingClientRect().width;
    await expect(near(left.getBoundingClientRect().width / total, 0.3, 0.01)).toBe(true);
    // Thanh kéo nằm đúng khe giữa 2 vùng
    const hr = handle.getBoundingClientRect();
    await expect(Math.abs(hr.left + hr.width / 2 - (left.getBoundingClientRect().right + 0.5))).toBeLessThan(2);

    const events = [];
    sp.addEventListener('hui-resize', (e) => events.push(e.detail.sizes));
    // Bàn phím
    handle.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(sp.sizes[0]).toBe(35);
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await expect(sp.sizes[0]).toBe(25);
    await userEvent.keyboard('{End}');
    await expect(sp.sizes[0]).toBe(60);
    await userEvent.keyboard('{Home}');
    await expect(sp.sizes[0]).toBe(15);
    await expect(events.length).toBe(5);
    // Kéo chuột: +10% bề rộng khả dụng
    const avail = total;
    drag(handle, avail * 0.1);
    await waitFor(() => expect(near(sp.sizes[0], 25)).toBe(true));
    await expect(events.length).toBe(6);
    // Kéo quá max → kẹp ở max
    drag(handle, avail);
    await expect(sp.sizes[0]).toBe(60);
    // Double-click → về ban đầu
    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await expect(sp.sizes).toEqual([30, 70]);
  },
};

export const Collapsible = {
  render: () => html`
    <hui-splitter style="--hui-splitter-height: 240px; border: 1px solid var(--hui-border-secondary);">
      <hui-splitter-panel size="25" min="20" collapsible><div style=${pane}>Sidebar (collapsible) — Enter trên thanh kéo để thu gọn</div></hui-splitter-panel>
      <hui-splitter-panel><div style=${pane}>Nội dung chính</div></hui-splitter-panel>
      <hui-splitter-panel size="25" min="15" collapsible collapsed><div style=${pane}>Panel phải (khởi đầu thu gọn)</div></hui-splitter-panel>
    </hui-splitter>
  `,
  play: async ({ canvasElement }) => {
    const sp = canvasElement.querySelector('hui-splitter');
    const panels = [...sp.querySelectorAll('hui-splitter-panel')];
    await nextFrame();
    const [h1, h2] = handlesOf(sp);
    await expect(sp.sizes).toEqual([25, 75, 0]);
    await expect(panels[2].inert).toBe(true);
    // Enter thu gọn sidebar trái
    h1.focus();
    await userEvent.keyboard('{Enter}');
    await expect(sp.sizes[0]).toBe(0);
    await expect(panels[0].collapsed).toBe(true);
    await expect(panels[0].matches(':state(collapsed)')).toBe(true);
    await expect(panels[0].inert).toBe(true);
    // Enter lần nữa → mở lại đúng kích thước cũ
    await userEvent.keyboard('{Enter}');
    await expect(sp.sizes[0]).toBe(25);
    await expect(panels[0].inert).toBe(false);
    // Thanh thứ 2: vùng trước không collapsible → Enter mở panel phải
    h2.focus();
    await userEvent.keyboard('{Enter}');
    await expect(sp.sizes[2]).toBe(25);
    await expect(panels[2].collapsed).toBe(false);
    // Kéo nhỏ hơn nửa min → thu gọn
    sp.collapse(2);
    await expect(sp.sizes[2]).toBe(0);
    sp.expand(2);
    await expect(sp.sizes[2]).toBe(25);
  },
};

export const Vertical = {
  render: () => html`
    <hui-splitter direction="vertical" style="--hui-splitter-height: 360px; border: 1px solid var(--hui-border-secondary);">
      <hui-splitter-panel size="60%" min="20%"><div style=${pane}>Trình soạn thảo</div></hui-splitter-panel>
      <hui-splitter-panel min="80px"><div style=${pane}>Terminal (min 80px)</div></hui-splitter-panel>
    </hui-splitter>
  `,
  play: async ({ canvasElement }) => {
    const sp = canvasElement.querySelector('hui-splitter');
    const [top, bottom] = sp.querySelectorAll('hui-splitter-panel');
    await nextFrame();
    const [handle] = handlesOf(sp);
    await expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    await expect(near(top.getBoundingClientRect().height / (top.getBoundingClientRect().height + bottom.getBoundingClientRect().height), 0.6, 0.01)).toBe(true);
    handle.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(sp.sizes[0]).toBe(65);
    await userEvent.keyboard('{End}');
    // Vùng dưới tối thiểu 80px
    await expect(bottom.getBoundingClientRect().height).toBeGreaterThanOrEqual(79);
  },
};

export const NestedAndPersist = {
  name: 'Lồng nhau + persist-key',
  render: () => html`
    <hui-splitter persist-key="story-ide" style="--hui-splitter-height: 320px; border: 1px solid var(--hui-border-secondary);">
      <hui-splitter-panel size="22%" min="10%" collapsible><div style=${pane}>Explorer</div></hui-splitter-panel>
      <hui-splitter-panel>
        <hui-splitter direction="vertical" style="height: 100%;">
          <hui-splitter-panel size="70%"><div style=${pane}>Editor</div></hui-splitter-panel>
          <hui-splitter-panel><div style=${pane}>Output</div></hui-splitter-panel>
        </hui-splitter>
      </hui-splitter-panel>
    </hui-splitter>
  `,
  play: async ({ canvasElement }) => {
    const outer = canvasElement.querySelector('hui-splitter');
    await nextFrame();
    const [handle] = handlesOf(outer);
    handle.focus();
    await userEvent.keyboard('{ArrowRight}');
    const saved = JSON.parse(localStorage.getItem('hui-splitter:story-ide'));
    await expect(saved).toEqual(outer.sizes);
    // Gắn lại (vd tải lại trang) → đọc lại kích thước đã lưu
    const parent = outer.parentElement;
    outer.remove();
    const fresh = document.createElement('hui-splitter');
    fresh.setAttribute('persist-key', 'story-ide');
    fresh.innerHTML = '<hui-splitter-panel size="22%"></hui-splitter-panel><hui-splitter-panel></hui-splitter-panel>';
    parent.append(fresh);
    await waitFor(() => expect(fresh.sizes).toEqual(saved));
    localStorage.removeItem('hui-splitter:story-ide');
  },
};

export const Disabled = {
  render: () => html`
    <hui-splitter disabled style="--hui-splitter-height: 160px; border: 1px solid var(--hui-border-secondary);">
      <hui-splitter-panel><div style=${pane}>Khóa kéo</div></hui-splitter-panel>
      <hui-splitter-panel><div style=${pane}>disabled</div></hui-splitter-panel>
    </hui-splitter>
  `,
  play: async ({ canvasElement }) => {
    const sp = canvasElement.querySelector('hui-splitter');
    await nextFrame();
    const [handle] = handlesOf(sp);
    await expect(handle.getAttribute('tabindex')).toBe('-1');
    await expect(handle.getAttribute('aria-disabled')).toBe('true');
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await expect(sp.sizes).toEqual([50, 50]);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-splitter.brand {
        --hui-splitter-gutter: 6px;
        --hui-splitter-gutter-color: var(--hui-fill);
        --hui-splitter-active-color: var(--hui-success);
        --hui-splitter-handle-size: 14px;
        --hui-splitter-height: 220px;
        --hui-splitter-panel-padding: 16px;
      }
      hui-splitter.brand::part(grip) { height: 40px; }
      hui-splitter.brand hui-splitter-panel:state(collapsed) { background: var(--hui-fill-secondary); }
    </style>
    <hui-splitter class="brand">
      <hui-splitter-panel size="40" collapsible>Gutter 6px, màu nhấn success</hui-splitter-panel>
      <hui-splitter-panel>::part(grip) cao 40px</hui-splitter-panel>
    </hui-splitter>
  `,
};
