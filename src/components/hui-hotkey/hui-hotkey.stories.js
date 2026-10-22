/**
 * Storybook Stories — HUI Hotkey
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { registerHotkey, parseHotkey } from './index.js';
import { isMacPlatform } from '../hui-kbd/index.js';
import '../hui-kbd/index.js';

/** Phát keydown như người dùng bấm (mod = ⌘ trên Mac, Ctrl nơi khác) */
function press(target, key, { mod = false, shift = false, alt = false } = {}) {
  const mac = isMacPlatform();
  const code = /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : /^\d$/.test(key) ? `Digit${key}` : key;
  const e = new KeyboardEvent('keydown', {
    key, code, bubbles: true, composed: true, cancelable: true,
    ctrlKey: mod && !mac, metaKey: mod && mac, shiftKey: shift, altKey: alt,
  });
  target.dispatchEvent(e);
  return e;
}

const logLine = (canvas, text) => {
  const log = canvas.querySelector('.log');
  if (log) log.textContent = text;
};

export default {
  title: 'Atoms/HuiHotkey',
  component: 'hui-hotkey',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Hotkey** — Phím tắt khai báo, **không hiển thị** (\`display: contents\`, bọc được nội dung khác mà không đổi bố cục).
\`mod\` = ⌘ trên Mac / Ctrl trên Windows, Linux. Bỏ qua phím khi đang **gõ trong ô nhập** (trừ khi \`allow-in-inputs\`)
và khi đang gõ bộ gõ tiếng Việt / IME (\`isComposing\`).

\`\`\`html
<hui-hotkey keys="mod+s" prevent-default @hui-hotkey=\${save}></hui-hotkey>
<hui-hotkey keys="g i" @hui-hotkey=\${() => go('/inbox')}></hui-hotkey>
<hui-hotkey keys="mod+k, /" @hui-hotkey=\${openSearch}></hui-hotkey>
\`\`\`

Hàm JS dùng không cần thẻ:
\`\`\`js
import { registerHotkey } from '@itmrhoang/h-ui/hui-hotkey';
const off = registerHotkey('mod+shift+p', (e, { combo }) => openPalette(), { preventDefault: true });
off(); // hủy đăng ký
\`\`\`

### Cú pháp keys
| Ví dụ | Ý nghĩa |
|-------|---------|
| \`ctrl+s\`, \`alt+shift+n\` | Tổ hợp: \`ctrl\` \`alt\`(\`option\`) \`shift\` \`meta\`(\`cmd\`, \`win\`) |
| \`mod+k\` | ⌘K trên Mac, Ctrl+K nơi khác |
| \`g i\` | Chuỗi phím bấm lần lượt (trong \`sequence-timeout\`) |
| \`mod+k, /\` | Nhiều lựa chọn, cách nhau dấu phẩy |
| \`esc\` \`enter\` \`space\` \`up\` \`down\` \`left\` \`right\` \`plus\` \`comma\` \`?\` | Tên phím đặc biệt (ký tự cần Shift như \`?\` không cần ghi shift) |

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`keys\` | string | — | Phím tắt (cú pháp trên) |
| \`target\` | string | \`document\` | \`document\` \\| \`window\` \\| \`parent\` \\| CSS selector — phạm vi lắng nghe (\`parent\`: chỉ khi focus nằm trong phần tử cha) |
| \`allow-in-inputs\` | boolean | \`false\` | Vẫn nhận phím khi đang gõ trong input/textarea/select/contenteditable |
| \`prevent-default\` | boolean | \`false\` | Chặn hành vi mặc định (vd hộp "Lưu trang" của Ctrl+S) |
| \`sequence-timeout\` | number | \`1000\` | Thời gian chờ giữa 2 phím của chuỗi (ms) |
| \`event\` | string | \`keydown\` | \`keydown\` \\| \`keyup\` |
| \`disabled\` | boolean | \`false\` | Tạm tắt |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-hotkey\` | \`{ keys, combo, originalEvent }\` | Phím tắt được bấm (\`combo\` = lựa chọn nào khớp). Cancelable: \`preventDefault()\` cũng chặn mặc định của phím |

### Hàm export
\`registerHotkey(keys, handler, { target, allowInInputs, preventDefault, sequenceTimeout, capture, eventType })\` → hàm hủy;
\`parseHotkey(keys)\`, \`matchCombo(event, combo)\`, \`isTypingTarget(event)\`.

Component không có giao diện → không có part / biến CSS; hiển thị phím cho người dùng thấy bằng \`<hui-kbd keys="mod+s">\`.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <div style="display: grid; gap: 12px; max-width: 420px; font-family: var(--hui-font-family); color: var(--hui-text);">
      <p style="margin: 0;">Bấm <hui-kbd keys="mod+s"></hui-kbd> để lưu (trang không mở hộp "Lưu trang").</p>
      <hui-hotkey keys="mod+s" prevent-default
        @hui-hotkey=${(e) => logLine(e.target.closest('div'), `Đã lưu lúc ${new Date().toLocaleTimeString()} (${e.detail.combo})`)}></hui-hotkey>
      <input placeholder="Gõ vào đây: phím tắt bị bỏ qua" style="padding: 6px 8px;" aria-label="Ô thử" />
      <output class="log" style="color: var(--hui-text-secondary);">Chưa bấm</output>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const hk = canvasElement.querySelector('hui-hotkey');
    let count = 0;
    hk.addEventListener('hui-hotkey', () => { count += 1; });
    const e = press(document.body, 's', { mod: true });
    await expect(count).toBe(1);
    await expect(e.defaultPrevented).toBe(true);
    // s thường (không mod) không khớp
    press(document.body, 's');
    await expect(count).toBe(1);
    // Đang gõ trong input → bỏ qua
    press(canvasElement.querySelector('input'), 's', { mod: true });
    await expect(count).toBe(1);
    // allow-in-inputs
    hk.allowInInputs = true;
    await hk.updateComplete;
    press(canvasElement.querySelector('input'), 's', { mod: true });
    await expect(count).toBe(2);
    // disabled
    hk.disabled = true;
    await hk.updateComplete;
    press(document.body, 's', { mod: true });
    await expect(count).toBe(2);
    await expect(getComputedStyle(hk).display).toBe('contents');
  },
};

/** Chuỗi phím kiểu Gmail / GitHub: "g i" rồi "g d" */
export const Sequences = {
  render: () => html`
    <div style="display: grid; gap: 8px; font-family: var(--hui-font-family); color: var(--hui-text);">
      <p style="margin: 0;"><hui-kbd keys="g i"></hui-kbd> Hộp thư · <hui-kbd keys="g d"></hui-kbd> Bản nháp · <hui-kbd keys="?"></hui-kbd> Trợ giúp</p>
      <hui-hotkey keys="g i" @hui-hotkey=${(e) => logLine(e.target.parentElement, 'Đi tới: Hộp thư')}></hui-hotkey>
      <hui-hotkey keys="g d" @hui-hotkey=${(e) => logLine(e.target.parentElement, 'Đi tới: Bản nháp')}></hui-hotkey>
      <hui-hotkey keys="?" @hui-hotkey=${(e) => logLine(e.target.parentElement, 'Mở trợ giúp')}></hui-hotkey>
      <output class="log" style="color: var(--hui-text-secondary);">Bấm g rồi i</output>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const log = canvasElement.querySelector('.log');
    press(document.body, 'g');
    press(document.body, 'i');
    await expect(log.textContent).toBe('Đi tới: Hộp thư');
    press(document.body, 'g');
    press(document.body, 'x'); // sai giữa chừng → bỏ chuỗi
    press(document.body, 'd');
    await expect(log.textContent).toBe('Đi tới: Hộp thư');
    press(document.body, 'g');
    press(document.body, 'd');
    await expect(log.textContent).toBe('Đi tới: Bản nháp');
    press(document.body, '?', { shift: true });
    await expect(log.textContent).toBe('Mở trợ giúp');
  },
};

/** target="parent": chỉ nhận khi focus nằm trong vùng chứa (vd phím tắt riêng của một trình soạn thảo) */
export const ScopedTarget = {
  render: () => html`
    <div style="display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 220px)); font-family: var(--hui-font-family); color: var(--hui-text);">
      <div id="zone" tabindex="0" style="padding: 16px; border: 1px dashed var(--hui-primary); border-radius: 8px;">
        Focus vào đây rồi bấm <hui-kbd keys="alt+n"></hui-kbd>
        <hui-hotkey keys="alt+n" target="parent" @hui-hotkey=${(e) => logLine(e.target.closest('#zone').parentElement, 'Tạo mục mới trong vùng')}></hui-hotkey>
      </div>
      <div id="outside" tabindex="0" style="padding: 16px; border: 1px dashed var(--hui-border); border-radius: 8px;">Ngoài vùng</div>
      <output class="log" style="grid-column: 1 / -1; color: var(--hui-text-secondary);">—</output>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const log = canvasElement.querySelector('.log');
    press(canvasElement.querySelector('#outside'), 'n', { alt: true });
    await expect(log.textContent).toBe('—');
    press(canvasElement.querySelector('#zone'), 'n', { alt: true });
    await expect(log.textContent).toBe('Tạo mục mới trong vùng');
  },
};

/** Hàm registerHotkey() — không cần thẻ, trả về hàm hủy đăng ký */
export const JsHelper = {
  render: () => html`
    <p style="font-family: var(--hui-font-family); color: var(--hui-text);">
      <code>registerHotkey('mod+shift+p', handler)</code> — xem tab Docs. Bấm <hui-kbd keys="mod+shift+p"></hui-kbd>.
    </p>
  `,
  play: async () => {
    await expect(parseHotkey('mod+k, g i', false)).toEqual([
      [{ ctrl: true, alt: false, shift: false, meta: false, key: 'k' }],
      [{ ctrl: false, alt: false, shift: false, meta: false, key: 'g' }, { ctrl: false, alt: false, shift: false, meta: false, key: 'i' }],
    ]);
    let hits = [];
    const off = registerHotkey('mod+shift+p, esc', (e, info) => hits.push(info.combo), { preventDefault: true });
    const e = press(document.body, 'P', { mod: true, shift: true });
    await expect(e.defaultPrevented).toBe(true);
    press(document.body, 'Escape');
    await waitFor(() => expect(hits).toEqual(['mod+shift+p', 'esc']));
    off();
    press(document.body, 'Escape');
    await expect(hits.length).toBe(2);
    hits = [];
  },
};
