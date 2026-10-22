/**
 * Storybook Stories — HUI Upload (chọn / kéo thả tệp, xem trước, tải lên có tiến trình)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const sh = (el, sel) => el.shadowRoot.querySelector(sel);
const shAll = (el, sel) => [...el.shadowRoot.querySelectorAll(sel)];
const fileInput = (el) => sh(el, 'input[type="file"]');

/** Ảnh PNG 1×1 (tự sinh, không dùng mạng) */
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
const png = (name = 'anh.png') => new File([PNG], name, { type: 'image/png' });
const txt = (name = 'ghi-chu.txt', size = 20) => new File(['x'.repeat(size)], name, { type: 'text/plain' });

/** Chọn tệp như người dùng: gán files cho <input type=file> rồi phát change */
const pick = (el, files) => {
  const input = fileInput(el);
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

/** customRequest giả: chạy progress 0 → 100 rồi trả { url } (hoặc lỗi nếu tên có "loi") */
const fakeRequest = (step = 25, delay = 15) => (file, { onProgress, signal }) => new Promise((resolve, reject) => {
  let p = 0;
  const timer = setInterval(() => {
    p += step;
    onProgress(Math.min(p, 100));
    if (p >= 100) {
      clearInterval(timer);
      if (/loi/.test(file.name)) reject(new Error('Máy chủ từ chối'));
      else resolve({ url: `https://example.invalid/${encodeURIComponent(file.name)}` });
    }
  }, delay);
  signal.addEventListener('abort', () => {
    clearInterval(timer);
    reject(new DOMException('Aborted', 'AbortError'));
  });
});

export default {
  title: 'Organisms/HuiUpload',
  component: 'hui-upload',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Upload** — chọn / kéo thả tệp, xem trước ảnh, tải lên có tiến trình từng tệp (Ant Upload + Upload.Dragger). Tham gia \`<form>\`.

3 cách xử lý tệp:
1. \`action="/api/upload"\` — XHR multipart (field = \`name\` hoặc "file"), có progress, \`headers\` / \`extra-data\` / \`with-credentials\`.
2. \`customRequest(file, { onProgress, signal, headers, data })\` — tự viết (fetch, S3 presigned URL…), trả Promise.
3. Không có cả hai → **chỉ gom tệp**: giá trị form = các \`File\` (FormData nhiều entry cùng \`name\`).

\`\`\`html
<hui-upload name="photos" list-type="picture-card" accept="image/*" multiple max-count="6" max-size="2MB"></hui-upload>
<hui-upload dragger action="/api/upload" hint="PDF, tối đa 10MB" accept=".pdf" max-size="10MB"></hui-upload>
\`\`\`

### Attributes / Properties
| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| \`accept\` | string | — | Như \`<input accept>\` (\`.png,.jpg\`, \`image/*\`) — kiểm cả khi kéo thả |
| \`multiple\` | boolean | — | Chọn nhiều tệp |
| \`max-count\` | number | — | Số tệp tối đa (\`1\` = tệp mới thay tệp cũ) |
| \`max-size\` | string | — | Dung lượng tối đa mỗi tệp: byte hoặc \`"500KB"\`, \`"5MB"\` |
| \`list-type\` | \`text \\| picture \\| picture-card\` | \`text\` | Kiểu danh sách |
| \`dragger\` | boolean | — | Vùng kéo thả lớn |
| \`action\` / \`method\` / \`with-credentials\` | — | — / \`POST\` / — | Tải lên bằng XHR |
| \`headers\` | object | — | Header gửi kèm (property / JSON) |
| \`extraData\` | \`object \\| (file) => object\` | — | Field gửi kèm (property) |
| \`customRequest\` | function | — | Tự tải lên (property) |
| \`beforeUpload\` | \`(file, files) => boolean \\| File \\| Blob \\| Promise\` | — | false = bỏ qua; trả Blob = thay tệp (vd nén ảnh) |
| \`fileList\` | \`object[]\` | — | Danh sách tệp (gán được tệp có sẵn trên server: \`{ name, url, status: 'done' }\`) |
| \`hint\` / \`button-text\` | string | — | Dòng gợi ý / chữ nút |
| \`no-list\` | boolean | — | Ẩn danh sách |
| \`name\` / \`disabled\` / \`readonly\` / \`required\` | — | — | Như form control |

Methods: \`removeFile(uid)\`, \`submit()\` (tải lên các tệp đang chờ / lỗi).
Mỗi tệp: \`{ uid, name, size, type, status: 'ready' | 'uploading' | 'done' | 'error', percent, file, url, thumbUrl, response, error }\`.

### Events
| Event | Detail |
|-------|--------|
| \`change\` | \`{ file, fileList }\` — thêm / xóa / đổi trạng thái |
| \`hui-upload-progress\` | \`{ file, percent }\` |
| \`hui-upload-success\` | \`{ file, response }\` |
| \`hui-upload-error\` | \`{ file, error }\` |
| \`hui-reject\` | \`{ file, reason: 'accept' \\| 'size' \\| 'count' \\| 'before', message }\` |
| \`hui-remove\` | \`{ file }\` — cancelable |
| \`hui-preview\` | \`{ file }\` — cancelable (mặc định mở hui-lightbox) |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Thay nút / nội dung vùng kéo thả |
| \`hint\` | Dòng gợi ý (thay attribute \`hint\`) |

### Parts
\`base\`, \`trigger\` (+ \`dragger\`), \`hint\`, \`list\`, \`item\` (+ \`item-ready|uploading|done|error\`), \`thumbnail\`, \`name\`, \`meta\`,
\`progress\`, \`actions\`, \`action\` (+ \`preview\`, \`retry\`, \`remove\`) · State: \`:state(dragover)\`

### CSS Variables
\`--hui-upload-dragger-bg | dragger-border-color | dragger-active-bg | dragger-padding | radius | card-size | thumb-size | item-hover-bg | error-color\`

### Bàn phím / A11y
Nút chọn tệp / vùng kéo thả / ô "+" nhận Tab, \`Enter\`/\`Space\` mở hộp chọn tệp. Mỗi tệp có nút xem / tải lại / xóa
(có nhãn kèm tên tệp); xóa xong focus chuyển sang tệp kế bên. Trạng thái tải lên được đọc qua vùng \`aria-live\`.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`<hui-upload hint="Tệp bất kỳ, tối đa 5MB" max-size="5MB" multiple></hui-upload>`,
};

/** Không tải lên: chỉ gom tệp → FormData nhiều entry cùng name; reset form xóa hết */
export const CollectFiles = {
  render: () => html`
    <form id="up-f">
      <hui-upload name="docs" multiple required></hui-upload>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#up-f');
    const el = form.querySelector('hui-upload');
    expect(form.checkValidity()).toBe(false);
    const changes = [];
    el.addEventListener('change', (e) => changes.push(e.detail.fileList.length));
    pick(el, [txt('a.txt'), txt('b.txt')]);
    await waitFor(() => expect(shAll(el, '[part~="item"]').length).toBe(2));
    expect(changes).toEqual([2]);
    const files = new FormData(form).getAll('docs');
    expect(files.map((f) => f.name)).toEqual(['a.txt', 'b.txt']);
    expect(files[0]).toBeInstanceOf(File);
    expect(form.checkValidity()).toBe(true);
    expect(el.fileList[0].status).toBe('ready');

    // xóa tệp đầu → focus sang nút xóa của tệp còn lại
    await userEvent.click(shAll(el, '[data-action="remove"]')[0]);
    expect(el.value.map((f) => f.name)).toEqual(['b.txt']);
    expect(el.shadowRoot.activeElement?.dataset.action).toBe('remove');
    form.reset();
    expect(el.fileList).toEqual([]);
    expect(new FormData(form).getAll('docs')).toEqual([]);
  },
};

/** accept / max-size / max-count loại tệp kèm lý do */
export const Validation = {
  render: () => html`<hui-upload id="up-v" accept=".png,image/jpeg" max-size="100B" multiple max-count="2"></hui-upload>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#up-v');
    const rejects = [];
    el.addEventListener('hui-reject', (e) => rejects.push(`${e.detail.reason}:${e.detail.file.name}`));
    pick(el, [txt('x.txt'), new File(['x'.repeat(500)], 'big.png', { type: 'image/png' }), png('1.png'), png('2.png'), png('3.png')]);
    await waitFor(() => expect(el.fileList.length).toBe(2));
    expect(rejects).toEqual(['accept:x.txt', 'size:big.png', 'count:3.png']);
    expect(sh(el, '[role="status"]').textContent).not.toBe('');
  },
};

/** customRequest: tiến trình từng tệp, thành công / lỗi, tải lại */
export const CustomRequest = {
  render: () => html`<hui-upload id="up-c" multiple .customRequest=${fakeRequest()}></hui-upload>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#up-c');
    const log = [];
    let progressEvents = 0;
    el.addEventListener('hui-upload-progress', () => progressEvents++);
    el.addEventListener('hui-upload-success', (e) => log.push(`ok:${e.detail.file.name}`));
    el.addEventListener('hui-upload-error', (e) => log.push(`err:${e.detail.file.name}:${e.detail.error.message}`));
    pick(el, [txt('bao-cao.txt'), txt('loi.txt')]);
    await waitFor(() => expect(sh(el, '[part~="item-uploading"]')).toBeTruthy());
    expect(sh(el, '[part~="progress"]').hidden).toBe(false);
    await waitFor(() => expect(log.length).toBe(2), { timeout: 2000 });
    expect(log).toContain('ok:bao-cao.txt');
    expect(log).toContain('err:loi.txt:Máy chủ từ chối');
    expect(progressEvents).toBeGreaterThan(4);
    const done = el.fileList.find((f) => f.name === 'bao-cao.txt');
    expect(done.status).toBe('done');
    expect(done.url).toContain('bao-cao.txt');
    expect(sh(el, '[part~="item-done"] a[part="name"]')).toBeTruthy();
    // tải lại tệp lỗi
    const retry = sh(el, '[part~="item-error"] [data-action="retry"]');
    expect(retry).toBeTruthy();
    // lần thử lại: máy chủ nhận
    el.customRequest = (file, { onProgress }) => {
      onProgress({ loaded: 1, total: 1 });
      return Promise.resolve({ url: `https://example.invalid/${file.name}` });
    };
    await userEvent.click(retry);
    await waitFor(() => expect(el.fileList.every((f) => f.status === 'done')).toBe(true), { timeout: 2000 });
  },
};

/** action + XHR (XMLHttpRequest giả lập): headers, field name, progress, phản hồi JSON */
export const XhrAction = {
  render: () => html`<hui-upload id="up-x" name="avatar" action="/api/upload" max-count="1"></hui-upload>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#up-x');
    const sent = [];
    const Original = window.XMLHttpRequest;
    class FakeXHR {
      constructor() {
        this.upload = {};
        this.headers = {};
        this.status = 0;
        this.responseText = '';
      }
      open(method, url) { this.method = method; this.url = url; }
      setRequestHeader(k, v) { this.headers[k] = v; }
      abort() { this.onabort?.(); }
      send(body) {
        sent.push(this);
        this.body = body;
        setTimeout(() => this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 }), 5);
        setTimeout(() => {
          this.status = 200;
          this.responseText = JSON.stringify({ url: '/files/a.png', id: 7 });
          this.onload?.();
        }, 20);
      }
    }
    window.XMLHttpRequest = FakeXHR;
    try {
      el.headers = { Authorization: 'Bearer test-token' };
      el.extraData = { folder: 'avatars' };
      let response = null;
      el.addEventListener('hui-upload-success', (e) => { response = e.detail.response; });
      pick(el, [png('a.png')]);
      await waitFor(() => expect(response).toEqual({ url: '/files/a.png', id: 7 }));
      expect(sent[0].method).toBe('POST');
      expect(sent[0].url).toBe('/api/upload');
      expect(sent[0].headers.Authorization).toBe('Bearer test-token');
      expect(sent[0].body.get('avatar').name).toBe('a.png');
      expect(sent[0].body.get('folder')).toBe('avatars');
      // max-count=1: chọn tệp mới thay tệp cũ
      pick(el, [png('b.png')]);
      await waitFor(() => expect(el.fileList.map((f) => f.name)).toEqual(['b.png']));
      await waitFor(() => expect(el.fileList[0].status).toBe('done'));
    } finally {
      window.XMLHttpRequest = Original;
    }
  },
};

/** picture-card: ảnh xem trước (object URL, thu hồi khi xóa), ô "+" ẩn khi đủ max-count */
export const PictureCard = {
  render: () => html`<hui-upload id="up-p" list-type="picture-card" accept="image/*" multiple max-count="2"></hui-upload>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#up-p');
    const revoked = [];
    const origRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = (u) => {
      revoked.push(u);
      origRevoke.call(URL, u);
    };
    try {
      const trigger = sh(el, '[part~="trigger"]');
      expect(trigger.getAttribute('role')).toBe('button');
      pick(el, [png('1.png'), png('2.png')]);
      await waitFor(() => expect(shAll(el, 'img').length).toBe(2));
      const src = shAll(el, 'img')[0].src;
      expect(src.startsWith('blob:')).toBe(true);
      expect(sh(el, '.up__card-slot').hidden).toBe(true); // đủ 2 tệp
      let previewed = null;
      el.addEventListener('hui-preview', (e) => {
        e.preventDefault();
        previewed = e.detail.file.name;
      });
      shAll(el, '[data-action="preview"]')[1].click();
      expect(previewed).toBe('2.png');
      shAll(el, '[data-action="remove"]')[0].click();
      expect(revoked).toContain(src);
      expect(sh(el, '.up__card-slot').hidden).toBe(false);
    } finally {
      URL.revokeObjectURL = origRevoke;
    }
  },
};

/** Kéo thả vào vùng dragger; beforeUpload chặn / đổi tệp */
export const DraggerDrop = {
  render: () => html`<hui-upload id="up-d" dragger multiple hint="Kéo thả tệp .txt vào đây"></hui-upload>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#up-d');
    el.beforeUpload = (file) => (file.name.startsWith('skip') ? false : new File([file], `renamed-${file.name}`, { type: file.type }));
    const zone = sh(el, '[part~="dragger"]');
    const dt = new DataTransfer();
    dt.items.add(txt('a.txt'));
    dt.items.add(txt('skip.txt'));
    zone.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    expect(zone.classList.contains('up__trigger--over')).toBe(true);
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    expect(zone.classList.contains('up__trigger--over')).toBe(false);
    await waitFor(() => expect(el.fileList.map((f) => f.name)).toEqual(['renamed-a.txt']));
    // bàn phím: Enter trên vùng kéo thả mở hộp chọn tệp
    let opened = 0;
    fileInput(el).click = () => { opened++; };
    zone.focus();
    await userEvent.keyboard('{Enter}');
    expect(opened).toBe(1);
  },
};

/** Danh sách có sẵn (tệp đã ở server) + list-type picture */
export const ExistingFiles = {
  render: () => html`<hui-upload id="up-e" list-type="picture"></hui-upload>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#up-e');
    el.fileList = [
      { name: 'hop-dong.pdf', url: 'data:application/pdf;base64,JVBERi0=', status: 'done', size: 120000 },
      { name: 'that-bai.png', status: 'error', error: new Error('Quá thời gian') },
    ];
    await waitFor(() => expect(shAll(el, '[part~="item"]').length).toBe(2));
    expect(sh(el, '[part~="item-error"] [part="meta"]').textContent).toContain('Quá thời gian');
    expect(el.value).toEqual([]); // tệp có sẵn (không có File) không gửi form
  },
};

export const ListTypesAndStates = {
  render: () => html`
    <div style="display:grid;gap:20px;max-width:520px">
      <hui-upload list-type="text" .fileList=${[{ name: 'bao-cao-quy-3.xlsx', size: 48213, status: 'done' }, { name: 'dang-tai.docx', status: 'uploading', percent: 42 }]}></hui-upload>
      <hui-upload list-type="picture" button-text="Chọn ảnh" .fileList=${[{ name: 'anh.svg', url: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 4 4%22><rect width=%224%22 height=%224%22 fill=%22%231677ff%22/></svg>', status: 'done' }]}></hui-upload>
      <hui-upload list-type="picture-card" .fileList=${[{ name: 'loi.png', status: 'error' }]}></hui-upload>
      <hui-upload disabled hint="Đang khóa"></hui-upload>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .up-brand {
        --hui-upload-dragger-bg: var(--hui-primary-light);
        --hui-upload-dragger-border-color: var(--hui-primary);
        --hui-upload-radius: 16px;
        --hui-upload-dragger-padding: 40px 16px;
      }
      .up-brand::part(dragger) { border-width: 2px; }
      .up-brand::part(hint) { color: var(--hui-primary); }
    </style>
    <hui-upload class="up-brand" dragger multiple hint="Tối đa 10 tệp">
      <span slot="hint">PNG, JPG hoặc PDF — tối đa 10MB mỗi tệp</span>
    </hui-upload>
  `,
};
