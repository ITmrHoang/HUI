/**
 * Storybook Stories — HUI Review List (danh sách đánh giá)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { svgImage } from '../hui-image/story-images.js';
import './index.js';

const photo = (hue, label) => ({
  src: svgImage({ w: 1200, h: 900, hue, label }),
  thumb: svgImage({ w: 160, h: 160, hue, label }),
  alt: `Ảnh thực tế ${label}`,
});

const NAMES = ['Nguyễn An', 'Trần Bình', 'Lê Chi', 'Phạm Dũng', 'Hoàng Em', 'Vũ Giang', 'Đặng Hà', 'Bùi Khoa', 'Đỗ Lan', 'Hồ Minh', 'Ngô Nga', 'Dương Phúc'];
const RATINGS = [5, 4, 5, 3, 5, 2, 4, 5, 1, 4, 5, 3];
const CONTENTS = [
  'Áo vải dày dặn, đường may kỹ. Mặc đi làm cả ngày vẫn thoáng mát, sẽ mua thêm màu khác.',
  'Hàng đúng mô tả, giao nhanh. Size hơi rộng một chút so với bảng size.',
  'Rất hài lòng! Đóng gói cẩn thận, có kèm thiệp cảm ơn.',
  'Chất lượng tạm ổn so với giá, màu ngoài đời nhạt hơn ảnh.',
  'Mua lần thứ 3 rồi, vẫn chất lượng như cũ.',
  'Giao thiếu một món, shop hỗ trợ gửi bù nhưng hơi chậm.',
  'Form đẹp, mặc lên tôn dáng.\nGiặt máy không bị xù.',
  'Tuyệt vời, đáng tiền.',
  'Sản phẩm bị lỗi khóa kéo, đang chờ đổi trả.',
  'Ổn áp, sẽ ủng hộ shop tiếp.',
  'Màu đẹp hơn mong đợi, chất vải mềm.',
  'Giao hàng chậm 3 ngày so với dự kiến.',
];

const REVIEWS = NAMES.map((name, i) => ({
  id: `r${i + 1}`,
  author: { name, avatar: i % 3 === 0 ? svgImage({ w: 96, h: 96, hue: (i * 40) % 360, label: name[0] }) : undefined },
  rating: RATINGS[i],
  date: new Date(Date.UTC(2026, 9, 18 - i * 2, 9)).toISOString(),
  title: i % 2 === 0 ? ['Rất đáng mua', 'Ổn', 'Hài lòng', 'Tạm được', 'Chất lượng', 'Chưa hài lòng'][i % 6] : undefined,
  content: CONTENTS[i],
  images: i === 0 ? [photo(200, '1'), photo(30, '2'), photo(140, '3')] : i === 4 ? [photo(280, 'A')] : [],
  helpful: [12, 3, 8, 0, 25, 1, 4, 0, 6, 2, 9, 0][i],
  verified: i % 4 !== 3,
}));

const reviewsOf = (el) => [...el.shadowRoot.querySelectorAll('[part="review"]')];
const ratingsOf = (el) => reviewsOf(el).map((li) => Number(li.querySelector('hui-rating-display').getAttribute('value')));

export default {
  title: 'Organisms/HuiReviewList',
  component: 'hui-review-list',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Review List** — Danh sách đánh giá trang sản phẩm: khối **tổng hợp** (\`hui-rating-summary\`: điểm trung bình + thanh
phân bố, **bấm thanh để lọc theo số sao**), **sắp xếp** (mới nhất / điểm cao / điểm thấp / hữu ích), **phân trang** hoặc
"Xem thêm", ảnh đính kèm mở **hui-lightbox**, nút **"Hữu ích (12)"** cập nhật ngay (lạc quan). Dữ liệu qua DataController.

\`\`\`html
<hui-review-list src="/api/products/42/reviews" data-path="items" page-size="5"></hui-review-list>
<script>
  list.addEventListener('hui-helpful', async (e) => {
    const ok = await api.vote(e.detail.review.id, e.detail.helpful);
    // Muốn hoàn tác đồng bộ: gọi e.preventDefault() ngay trong listener
  });
</script>
\`\`\`

### Dữ liệu mỗi đánh giá
\`{ id, author: { name, avatar }, rating, date, title, content, images: [url | { src, thumb, alt, caption }], helpful, verified }\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`sort\` | string | \`newest\` | \`newest\` \\| \`highest\` \\| \`lowest\` \\| \`helpful\` |
| \`filter-stars\` | number | — | Lọc theo số sao (1–5) |
| \`paging\` | string | \`pagination\` | \`pagination\` \\| \`load-more\` \\| \`none\` |
| \`page-size\` / \`page\` | number | \`5\` / \`1\` | Số đánh giá mỗi trang / trang hiện tại |
| \`count\` | number | \`5\` | Số mức sao |
| \`no-summary\` / \`no-sort\` | boolean | \`false\` | Ẩn khối tổng hợp / ô sắp xếp |
| \`label\` | string | "Đánh giá của khách hàng" | Nhãn ARIA |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |
| \`src\` / \`data-path\` / \`params\` / \`loading\` / \`empty-text\` | | | DataController |

### Properties
\`data\`, \`fetchFn\` (DataController) · \`summary\` \`{ average, total, distribution }\` từ server (bỏ trống = tự tính) ·
\`filtered\` (chỉ đọc, sau lọc + sắp xếp) · \`votedKeys\` (chỉ đọc) · \`reload()\`.

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-helpful\` | \`{ review, helpful, count }\` | Bấm "Hữu ích" — cancelable (preventDefault → hoàn tác) |
| \`hui-filter\` | \`{ stars }\` | Đổi lọc số sao (null = bỏ lọc) |
| \`hui-sort-change\` | \`{ sort }\` | Đổi sắp xếp |
| \`hui-page-change\` | \`{ page, pageSize }\` | Đổi trang / xem thêm |
| \`hui-load\` / \`hui-error\` | | DataController |

### Parts
\`base\`, \`summary\`, \`toolbar\`, \`count\`, \`clear\`, \`sort\`, \`state\`, \`list\`, \`review\`, \`avatar\`, \`author\`, \`verified\`, \`rating\`,
\`date\`, \`title\`, \`content\`, \`images\`, \`thumb\`, \`helpful\` (+ \`helpful-active\`), \`empty\`, \`footer\`, \`pagination\`, \`load-more\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-review-list-gap\` / \`--hui-review-list-divider\` | Khoảng cách / đường kẻ giữa đánh giá |
| \`--hui-review-list-thumb-size\` / \`--hui-review-list-thumb-radius\` | Ảnh thu nhỏ |
| \`--hui-review-list-verified-color\` | Nhãn "Đã mua hàng" |
| \`--hui-review-list-helpful-active-color\` | Nút "Hữu ích" đã bấm |
| \`--hui-rating-summary-*\` | Khối tổng hợp (kế thừa xuyên shadow) |

### Bàn phím
| Phím | Hành động |
|------|-----------|
| Tab | Thanh phân bố (lọc) → ô sắp xếp → ảnh → nút Hữu ích → phân trang |
| Enter / Space | Lọc theo thanh / mở ảnh trong lightbox / bật-tắt Hữu ích (\`aria-pressed\`) |
| ← / → / Esc | Trong lightbox: chuyển ảnh / đóng |

Số kết quả là \`role="status"\` (đọc lại khi lọc). Mỗi đánh giá là \`<article>\` gắn tên người viết.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`<div style="max-width: 760px;"><hui-review-list id="rl-default" .data=${REVIEWS}></hui-review-list></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rl-default');
    await el.updateComplete;
    await waitFor(() => expect(reviewsOf(el).length).toBe(5));
    await expect(el.shadowRoot.querySelector('[part="count"]').textContent).toBe('12 đánh giá');
    // Mới nhất trước
    await expect(reviewsOf(el)[0].querySelector('[part="author"]').textContent).toBe('Nguyễn An');
    // Tổng hợp tự tính từ data
    const summary = el.shadowRoot.querySelector('[part="summary"]');
    await expect(summary.summary.total).toBe(12);
    await expect(summary.summary.counts.get(5)).toBe(5);
    await expect(summary.summary.average).toBeCloseTo(46 / 12, 5);
    // Nhãn "Đã mua hàng" + nút Hữu ích
    await expect(reviewsOf(el)[0].querySelector('[part="verified"]').textContent).toContain('Đã mua hàng');
    await expect(reviewsOf(el)[0].querySelector('[part~="helpful"]').textContent).toBe('Hữu ích (12)');
  },
};

/** Bấm thanh phân bố để lọc theo số sao, "Bỏ lọc" để xem tất cả */
export const FilterByStars = {
  render: () => html`<div style="max-width: 760px;"><hui-review-list id="rl-filter" .data=${REVIEWS}></hui-review-list></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rl-filter');
    const events = [];
    el.addEventListener('hui-filter', (e) => events.push(e.detail.stars));
    await el.updateComplete;
    const summary = el.shadowRoot.querySelector('[part="summary"]');
    await summary.updateComplete;
    const rows = summary.shadowRoot.querySelectorAll('[part~="row"]');
    await userEvent.click(rows[0]); // 5 sao
    await el.updateComplete;
    await expect(events).toEqual([5]);
    await expect(el.filterStars).toBe(5);
    await expect(el.shadowRoot.querySelector('[part="count"]').textContent).toBe('5 đánh giá 5 sao');
    await expect(ratingsOf(el).every((r) => r === 5)).toBe(true);
    // 1 sao
    await userEvent.click(rows[4]);
    await el.updateComplete;
    await expect(ratingsOf(el)).toEqual([1]);
    // Bỏ lọc
    const clear = el.shadowRoot.querySelector('[part="clear"]');
    await expect(clear.hidden).toBe(false);
    await userEvent.click(clear);
    await el.updateComplete;
    await expect(events).toEqual([5, 1, null]);
    await expect(el.shadowRoot.querySelector('[part="count"]').textContent).toBe('12 đánh giá');
  },
};

/** Sắp xếp: mới nhất / điểm cao / điểm thấp / hữu ích */
export const Sorting = {
  render: () => html`<div style="max-width: 760px;"><hui-review-list id="rl-sort" no-summary .data=${REVIEWS}></hui-review-list></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rl-sort');
    const sorts = [];
    el.addEventListener('hui-sort-change', (e) => sorts.push(e.detail.sort));
    await el.updateComplete;
    const select = el.shadowRoot.querySelector('[part="sort"]');
    await expect([...select.options].map((o) => o.textContent)).toEqual(['Mới nhất', 'Điểm cao nhất', 'Điểm thấp nhất', 'Hữu ích nhất']);
    await userEvent.selectOptions(select, 'lowest');
    await el.updateComplete;
    await expect(ratingsOf(el)).toEqual([1, 2, 3, 3, 4]);
    await userEvent.selectOptions(select, 'helpful');
    await el.updateComplete;
    await expect(reviewsOf(el)[0].querySelector('[part="author"]').textContent).toBe('Hoàng Em'); // 25 lượt
    await expect(sorts).toEqual(['lowest', 'helpful']);
    await expect(el.shadowRoot.querySelector('[part="summary"]').hidden).toBe(true);
  },
};

/** "Hữu ích" — đổi ngay (lạc quan), preventDefault để hoàn tác */
export const Helpful = {
  render: () => html`<div style="max-width: 760px;"><hui-review-list id="rl-helpful" no-summary paging="none" .data=${REVIEWS.slice(0, 3)}></hui-review-list></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rl-helpful');
    const events = [];
    let reject = false;
    el.addEventListener('hui-helpful', (e) => {
      events.push({ id: e.detail.review.id, helpful: e.detail.helpful, count: e.detail.count });
      if (reject) e.preventDefault();
    });
    await el.updateComplete;
    const btn = () => reviewsOf(el)[0].querySelector('[part~="helpful"]');
    await userEvent.click(btn());
    await expect(btn().textContent).toBe('Hữu ích (13)');
    await expect(btn().getAttribute('aria-pressed')).toBe('true');
    await expect(btn().getAttribute('part')).toBe('helpful helpful-active');
    await expect(el.shadowRoot.activeElement).toBe(btn());
    await expect(el.votedKeys).toEqual(['r1']);
    // Bấm lại → bỏ
    await userEvent.click(btn());
    await expect(btn().textContent).toBe('Hữu ích (12)');
    // Bên ngoài từ chối → hoàn tác
    reject = true;
    await userEvent.click(btn());
    await expect(btn().textContent).toBe('Hữu ích (12)');
    await expect(btn().getAttribute('aria-pressed')).toBe('false');
    await expect(events).toEqual([
      { id: 'r1', helpful: true, count: 13 },
      { id: 'r1', helpful: false, count: 12 },
      { id: 'r1', helpful: true, count: 13 },
    ]);
    // Mục khác không bị ảnh hưởng
    await expect(reviewsOf(el)[1].querySelector('[part~="helpful"]').textContent).toBe('Hữu ích (3)');
  },
};

/** Phân trang (hui-pagination) */
export const Pagination = {
  render: () => html`<div style="max-width: 760px;"><hui-review-list id="rl-page" no-summary page-size="4" .data=${REVIEWS}></hui-review-list></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rl-page');
    const pages = [];
    el.addEventListener('hui-page-change', (e) => pages.push(e.detail));
    await el.updateComplete;
    const pager = el.shadowRoot.querySelector('[part="pagination"]');
    await customElements.whenDefined('hui-pagination'); // tải động khi có nhiều hơn 1 trang
    await pager.updateComplete;
    await expect(pager.total).toBe(12);
    await userEvent.click(pager.shadowRoot.querySelector('[data-id="page-3"]'));
    await el.updateComplete;
    await expect(el.page).toBe(3);
    await expect(pages).toEqual([{ page: 3, pageSize: 4 }]);
    await expect(reviewsOf(el).length).toBe(4);
    await expect(reviewsOf(el)[0].querySelector('[part="author"]').textContent).toBe('Đỗ Lan');
  },
};

/** paging="load-more" — "Xem thêm đánh giá" */
export const LoadMore = {
  render: () => html`<div style="max-width: 760px;"><hui-review-list id="rl-more" paging="load-more" page-size="3" .data=${REVIEWS}></hui-review-list></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rl-more');
    await el.updateComplete;
    const btn = el.shadowRoot.querySelector('[part="load-more"]');
    await expect(btn.textContent).toBe('Xem thêm đánh giá');
    await userEvent.click(btn);
    await el.updateComplete;
    await expect(reviewsOf(el).length).toBe(6);
    await expect(el.shadowRoot.querySelector('[part="pagination"]').hidden).toBe(true);
  },
};

/** Ảnh đính kèm → hui-lightbox (phóng to từ ảnh thu nhỏ) */
export const Images = {
  render: () => html`<div style="max-width: 760px;"><hui-review-list id="rl-img" no-summary paging="none" .data=${REVIEWS.slice(0, 1)}></hui-review-list></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rl-img');
    await el.updateComplete;
    const thumbs = el.shadowRoot.querySelectorAll('[part="thumb"]');
    await expect(thumbs.length).toBe(3);
    await expect(thumbs[1].getAttribute('aria-label')).toBe('Xem ảnh 2/3 của Nguyễn An');
    await userEvent.click(thumbs[1]);
    // hui-lightbox tải động khi bấm ảnh
    await waitFor(() => expect(document.querySelector('hui-lightbox[data-hui-lightbox-api]')?.open).toBe(true));
    const lb = document.querySelector('hui-lightbox[data-hui-lightbox-api]');
    await expect(lb.index).toBe(1);
    await expect(lb.items.length).toBe(3);
    lb.close();
    await waitFor(() => expect(lb.open).toBe(false));
  },
};

/** Trạng thái: đang tải (skeleton) / chưa có đánh giá / lọc không ra kết quả */
export const States = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 32px; max-width: 760px;">
      <hui-review-list id="rl-loading" loading></hui-review-list>
      <hui-review-list id="rl-empty" .data=${[]} empty-text="Chưa có đánh giá nào — hãy là người đầu tiên!"></hui-review-list>
      <hui-review-list id="rl-none" filter-stars="2" no-summary .data=${REVIEWS.filter((r) => r.rating !== 2)}></hui-review-list>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const loading = canvasElement.querySelector('#rl-loading');
    await loading.updateComplete;
    // hui-skeleton / hui-empty tải động → trạng thái được vẽ lại khi định nghĩa xong
    await waitFor(() => expect(loading.shadowRoot.querySelector('hui-skeleton')).not.toBeNull());
    await expect(loading.shadowRoot.querySelector('[part="toolbar"]').hidden).toBe(true);
    const empty = canvasElement.querySelector('#rl-empty');
    await empty.updateComplete;
    await waitFor(() => expect(empty.shadowRoot.querySelector('hui-empty')).not.toBeNull());
    const none = canvasElement.querySelector('#rl-none');
    await none.updateComplete;
    await expect(none.shadowRoot.querySelector('[part="empty"]').textContent).toBe('Chưa có đánh giá 2 sao');
  },
};

/** fetchFn + summary từ server */
export const FromServer = {
  render: () => html`<div style="max-width: 760px;"><hui-review-list id="rl-server"></hui-review-list></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rl-server');
    el.summary = { average: 4.6, total: 1280, distribution: { 5: 980, 4: 200, 3: 60, 2: 25, 1: 15 } };
    el.fetchFn = () => new Promise((r) => setTimeout(() => r(REVIEWS), 200));
    await waitFor(() => expect(el.dataState).toBe('ready'), { timeout: 3000 });
    await el.updateComplete;
    await expect(el.shadowRoot.querySelector('[part="summary"]').summary.total).toBe(1280);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .rl-brand {
        --hui-review-list-gap: 24px;
        --hui-review-list-divider: var(--hui-primary-2);
        --hui-review-list-thumb-size: 88px;
        --hui-review-list-thumb-radius: 12px;
        --hui-review-list-verified-color: var(--hui-info);
        --hui-review-list-helpful-active-color: var(--hui-success);
        --hui-rating-summary-color: var(--hui-danger);
      }
      .rl-brand::part(review) { padding-inline: 16px; border-radius: 12px; }
      .rl-brand::part(title) { font-size: 1.05rem; }
      .rl-brand::part(summary) { padding: 16px; border-radius: 12px; background: var(--hui-fill-tertiary); }
    </style>
    <div style="max-width: 760px;"><hui-review-list id="rl-brand" class="rl-brand" page-size="3" .data=${REVIEWS}></hui-review-list></div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rl-brand');
    await el.updateComplete;
    const thumb = el.shadowRoot.querySelector('[part="thumb"]');
    await expect(thumb.getBoundingClientRect().width).toBe(88);
  },
};
