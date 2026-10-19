import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Atoms/HuiTypewriter',
  component: 'hui-typewriter',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Typewriter** — gõ chữ từng ký tự, xoá rồi gõ câu tiếp theo, con trỏ nhấp nháy.

\`\`\`html
<h1>H-UI giúp bạn làm web <hui-typewriter words='["nhanh hơn","đẹp hơn","dễ hơn"]' loop></hui-typewriter></h1>
<hui-typewriter words="Xin chào|Hello|Bonjour" speed="60" loop></hui-typewriter>
<hui-typewriter>Không có words → gõ nội dung bên trong thẻ</hui-typewriter>
\`\`\`

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`words\` | — | JSON \`'["a","b"]'\`, chuỗi \`"a|b|c"\` hoặc mảng (gán bằng JS). Trống → nội dung trong thẻ |
| \`speed\` | 70 | ms mỗi ký tự khi gõ |
| \`delete-speed\` | 40 | ms mỗi ký tự khi xoá |
| \`pause\` | 1500 | Dừng sau khi gõ xong một câu (ms) |
| \`start-delay\` | 0 | Chờ trước khi bắt đầu (ms) |
| \`loop\` | — | Gõ lại từ đầu sau câu cuối (không có: dừng ở câu cuối) |
| \`cursor\` | \`|\` | Ký tự con trỏ |
| \`no-cursor\` | — | Ẩn con trỏ |
| \`no-animation\` | — | Hiện ngay câu đầu, không gõ |

**Thuộc tính JS:** \`wordList\` (đọc), \`currentText\` (đọc) · **Phương thức:** \`start()\` (gõ lại từ đầu), \`stop()\`

**Sự kiện:** \`hui-word\` {word, index} — gõ xong 1 câu · \`hui-complete\` — gõ xong câu cuối (khi không loop)

**Part:** \`base\`, \`text\`, \`cursor\` · **Slot:** không (nội dung trong thẻ chỉ dùng làm chữ dự phòng)

**Biến CSS:** \`--hui-typewriter-color\`, \`--hui-typewriter-cursor-color\` (mặc định \`--hui-primary\`), \`--hui-typewriter-cursor-blink\` (1s)

**A11y:** trình đọc màn hình nhận toàn bộ danh sách câu một lần (bản sao ẩn), phần đang gõ \`aria-hidden\` → không bị đọc từng ký tự.
Tự tạm dừng khi cuộn ra khỏi màn hình. Giảm chuyển động / \`html[data-hui-no-animation]\` → hiện câu đầu, con trỏ không nháy.
        `,
      },
    },
  },
  argTypes: {
    speed: { control: { type: 'range', min: 10, max: 200, step: 10 } },
    deleteSpeed: { control: { type: 'range', min: 10, max: 200, step: 10 } },
    pause: { control: 'number' },
    loop: { control: 'boolean' },
    cursor: { control: 'text' },
  },
};

const headline = 'font: 700 32px/1.3 var(--hui-font-family); color: var(--hui-text); margin: 0;';

export const Default = {
  render: (args) => html`
    <h2 style=${headline}>
      H-UI giúp làm web
      <hui-typewriter words='["nhanh hơn","đẹp hơn","dễ tiếp cận hơn"]'
        speed=${args.speed} delete-speed=${args.deleteSpeed} pause=${args.pause} cursor=${args.cursor} ?loop=${args.loop}></hui-typewriter>
    </h2>
  `,
  args: { speed: 40, deleteSpeed: 30, pause: 1200, loop: true, cursor: '|' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-typewriter');
    const sr = el.shadowRoot.querySelector('.sr-only');
    await expect(sr.textContent).toBe('nhanh hơn, đẹp hơn, dễ tiếp cận hơn');
    await expect(el.shadowRoot.querySelector('.tw__visual').getAttribute('aria-hidden')).toBe('true');
    await waitFor(() => expect(el.currentText).toBe('nhanh hơn'), { timeout: 3000 });
  },
};

/** Gõ nội dung trong thẻ, con trỏ tuỳ biến / ẩn */
export const Variants = {
  render: () => html`
    <div style="display: grid; gap: 16px; font: 18px var(--hui-font-family); color: var(--hui-text);">
      <div>Nội dung trong thẻ: <hui-typewriter speed="50">Không cần attribute words.</hui-typewriter></div>
      <div>Con trỏ "_": <hui-typewriter words="npm i @itmrhoang/h-ui|import 'h-ui'" cursor="_" loop style="font-family: var(--hui-font-mono)"></hui-typewriter></div>
      <div>Không con trỏ: <hui-typewriter words="Không có con trỏ|Chỉ có chữ" no-cursor loop></hui-typewriter></div>
      <div>Bắt đầu sau 1s: <hui-typewriter words="Chờ một chút…" start-delay="1000"></hui-typewriter></div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [own, , hidden] = canvasElement.querySelectorAll('hui-typewriter');
    await expect(own.wordList).toEqual(['Không cần attribute words.']);
    await expect(hidden.shadowRoot.querySelector('.tw__cursor').hidden).toBe(true);
    await waitFor(() => expect(own.currentText).toBe('Không cần attribute words.'), { timeout: 4000 });
  },
};

/** no-animation: hiện ngay câu đầu */
export const NoAnimation = {
  render: () => html`<p style="font: 18px var(--hui-font-family); color: var(--hui-text)">
    <hui-typewriter words="Hiện ngay|Không gõ" no-animation loop></hui-typewriter></p>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-typewriter');
    await expect(el.currentText).toBe('Hiện ngay');
  },
};

/** Sự kiện hui-word / hui-complete + start() / stop() */
export const EventsAndApi = {
  render: () => html`
    <p style="font: 18px var(--hui-font-family); color: var(--hui-text)"><hui-typewriter id="tw" words="Một|Hai" speed="15" delete-speed="10" pause="60"></hui-typewriter></p>
    <p id="log" style="font: 13px var(--hui-font-mono); color: var(--hui-text-secondary)">—</p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tw');
    const log = canvasElement.querySelector('#log');
    const words = [];
    el.addEventListener('hui-word', (e) => { words.push(e.detail.word); log.textContent = words.join(' → '); });
    el.addEventListener('hui-complete', () => { log.textContent += ' ✓'; });
    el.start();
    await waitFor(() => expect(log.textContent).toBe('Một → Hai ✓'), { timeout: 4000 });
    await expect(el.currentText).toBe('Hai');
    el.words = ['Gán', 'bằng mảng'];
    await waitFor(() => expect(el.currentText).toBe('Gán'), { timeout: 3000 });
    el.stop();
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .tw-custom { --hui-typewriter-color: var(--hui-success); --hui-typewriter-cursor-color: var(--hui-warning); --hui-typewriter-cursor-blink: 0.6s; }
      .tw-custom::part(cursor) { font-weight: 700; }
      .tw-custom::part(text) { text-decoration: underline wavy var(--hui-success-3); }
    </style>
    <p style="font: 600 22px var(--hui-font-family); color: var(--hui-text)">
      <hui-typewriter class="tw-custom" words="Biến CSS|::part(text)|::part(cursor)" loop></hui-typewriter>
    </p>
  `,
};
