import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const partOf = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const box = 'height: 320px; overflow: auto; border: 1px solid var(--hui-border-secondary); border-radius: 8px;';
const row = 'padding: 12px 16px; border-bottom: 1px solid var(--hui-border-secondary);';

/** Thêm `count` dòng vào danh sách */
function appendRows(list, count) {
  const start = list.children.length;
  for (let i = 0; i < count; i++) {
    const li = document.createElement('li');
    li.style.cssText = row;
    li.textContent = `Bài viết #${start + i + 1}`;
    list.append(li);
  }
}

export default {
  title: 'Molecules/HuiInfiniteScroll',
  component: 'hui-infinite-scroll',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Infinite Scroll** — đặt ở cuối danh sách; mốc đi vào vùng nhìn thấy (cộng \`threshold\` px) thì tải thêm.
Tải xong mà mốc vẫn còn trong vùng nhìn thấy (danh sách chưa đủ dài) → tự tải tiếp.

**Cách 1 — hàm:** \`el.loadMore = async () => { …thêm item…; return còn_dữ_liệu }\` → tự bật/tắt \`loading\`,
lỗi thì hiện nút **Thử lại**, trả về \`false\` = hết dữ liệu.
**Cách 2 — sự kiện:** nghe \`hui-load-more\`, tự đặt \`loading\` trong lúc tải và \`has-more="false"\` khi hết.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`loading\` | — | Đang tải (hiện hui-spinner) |
| \`has-more\` | \`true\` | \`"false"\` → ngừng theo dõi, hiện "Hết dữ liệu" |
| \`error\` | — | Hiện lỗi + nút Thử lại |
| \`threshold\` | \`200\` | Bắt đầu tải trước khi tới mốc bao nhiêu px |
| \`root\` | — | Selector khung cuộn chứa danh sách (bỏ trống = cửa sổ) |
| \`disabled\` | — | Tạm ngừng theo dõi |
| \`end-text\` · \`loading-text\` · \`error-text\` | theo locale | Đổi chữ |

**Thuộc tính JS:** \`loadMore\` (async function) · **Phương thức:** \`refresh()\` (kiểm tra lại mốc), \`retry()\`
**Sự kiện:** \`hui-load-more\` {retry} (cancelable — \`preventDefault()\` để không gọi loadMore), \`hui-error\` {error}
**Trạng thái CSS:** \`:state(loading)\`, \`:state(ended)\`, \`:state(error)\`
**Slots:** \`loading\`, \`end\`, \`error\` · **Parts:** \`base\` (role="status"), \`loading\`, \`spinner\`, \`end\`, \`error\`, \`retry\`

| Biến CSS | Mặc định |
|----------|----------|
| \`--hui-infinite-scroll-padding\` | \`--hui-space-lg\` |
| \`--hui-infinite-scroll-color\` | \`--hui-text-tertiary\` |
| \`--hui-infinite-scroll-font-size\` | \`--hui-font-sm\` |
| \`--hui-infinite-scroll-error-color\` | \`--hui-danger\` |

**Bàn phím:** nút Thử lại là hui-button (Tab + Enter/Space). Vùng trạng thái \`role="status"\` đọc "Đang tải thêm…" / "Hết dữ liệu".
        `,
      },
    },
  },
};

export const Default = {
  name: 'Hàm loadMore (khung cuộn riêng)',
  render: () => html`
    <div class="feed" style=${box}>
      <ul class="list" style="list-style: none; margin: 0; padding: 0;"></ul>
      <hui-infinite-scroll root=".feed" threshold="100"></hui-infinite-scroll>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const feed = canvasElement.querySelector('.feed');
    const list = canvasElement.querySelector('.list');
    const inf = canvasElement.querySelector('hui-infinite-scroll');
    let calls = 0;
    let events = 0;
    inf.addEventListener('hui-load-more', () => events++);
    inf.loadMore = async () => {
      calls++;
      await wait(60);
      appendRows(list, 10);
      return calls < 4; // 4 trang rồi hết
    };
    inf.refresh();
    // Trang đầu tự tải (mốc đang hiện), đủ cao rồi thì dừng chờ cuộn
    await waitFor(() => expect(list.children.length).toBeGreaterThanOrEqual(10));
    await waitFor(() => expect(inf.loading).toBe(false));
    const loaded = list.children.length;
    // Cuộn xuống cuối → tải thêm
    feed.scrollTop = feed.scrollHeight;
    await waitFor(() => expect(list.children.length).toBeGreaterThan(loaded));
    // Cuộn tiếp tới khi hết dữ liệu
    for (let i = 0; i < 6 && inf.hasMore !== 'false'; i++) {
      feed.scrollTop = feed.scrollHeight;
      await wait(150);
    }
    await waitFor(() => expect(inf.hasMore).toBe('false'));
    await expect(list.children.length).toBe(40);
    await expect(calls).toBe(4);
    await expect(events).toBe(4);
    await expect(partOf(inf, 'end').hidden).toBe(false);
    await expect(partOf(inf, 'end').textContent).toContain('Hết dữ liệu');
    await expect(partOf(inf, 'base').getAttribute('role')).toBe('status');
  },
};

export const EventMode = {
  name: 'Sự kiện hui-load-more',
  render: () => html`
    <div class="feed" style=${box}>
      <ul class="list" style="list-style: none; margin: 0; padding: 0;"></ul>
      <hui-infinite-scroll root=".feed"></hui-infinite-scroll>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('.list');
    const inf = canvasElement.querySelector('hui-infinite-scroll');
    let page = 0;
    inf.addEventListener('hui-load-more', async () => {
      inf.loading = true;
      await wait(50);
      appendRows(list, 8);
      page++;
      if (page >= 3) inf.hasMore = false;
      inf.loading = false;
    });
    inf.refresh();
    // Danh sách chưa đủ dài → tự tải tiếp tới khi lấp đầy hoặc hết
    await waitFor(() => expect(list.children.length).toBeGreaterThanOrEqual(8));
    await waitFor(() => expect(page).toBeGreaterThanOrEqual(1));
    await expect(partOf(inf, 'loading').hidden).toBe(!inf.loading);
  },
};

export const ErrorAndRetry = {
  name: 'Lỗi + Thử lại',
  render: () => html`
    <div class="feed" style=${box}>
      <ul class="list" style="list-style: none; margin: 0; padding: 0;"></ul>
      <hui-infinite-scroll root=".feed"></hui-infinite-scroll>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('.list');
    const inf = canvasElement.querySelector('hui-infinite-scroll');
    let fail = true;
    let errors = 0;
    inf.addEventListener('hui-error', () => errors++);
    inf.loadMore = async () => {
      await wait(30);
      if (fail) throw new Error('Mạng lỗi');
      appendRows(list, 20);
      return false;
    };
    inf.refresh();
    await waitFor(() => expect(inf.error).toBe(true));
    await expect(errors).toBe(1);
    await expect(partOf(inf, 'error').hidden).toBe(false);
    const retry = partOf(inf, 'retry');
    await expect(retry.textContent).toBe('Thử lại');
    fail = false;
    retry.click();
    await waitFor(() => expect(list.children.length).toBe(20));
    await waitFor(() => expect(inf.hasMore).toBe('false'));
    await expect(inf.error).toBe(false);
  },
};

export const States = {
  name: 'Trạng thái tĩnh',
  render: () => html`
    <div style="display: grid; gap: 12px;">
      <hui-infinite-scroll loading disabled></hui-infinite-scroll>
      <hui-infinite-scroll error disabled></hui-infinite-scroll>
      <hui-infinite-scroll has-more="false" end-text="Bạn đã xem hết 120 sản phẩm"></hui-infinite-scroll>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [loading, error, end] = canvasElement.querySelectorAll('hui-infinite-scroll');
    await expect(partOf(loading, 'loading').hidden).toBe(false);
    await expect(loading.getAttribute('aria-busy')).toBe('');
    await expect(partOf(error, 'error').hidden).toBe(false);
    await expect(partOf(end, 'end').textContent).toContain('120 sản phẩm');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-infinite-scroll.brand {
        --hui-infinite-scroll-color: var(--hui-primary);
        --hui-infinite-scroll-font-size: var(--hui-font-base);
        --hui-infinite-scroll-padding: 24px;
      }
      hui-infinite-scroll.brand::part(end) {
        background: var(--hui-primary-1);
        border-radius: var(--hui-radius-lg);
      }
    </style>
    <hui-infinite-scroll class="brand" has-more="false">
      <span slot="end">Bạn đã xem hết — quay lại sau nhé!</span>
    </hui-infinite-scroll>
  `,
};
