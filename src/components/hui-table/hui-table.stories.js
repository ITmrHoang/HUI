/**
 * Storybook Stories — HUI Table (Organism)
 * Cột theo type, sắp xếp đơn / đa cột, lọc, phân trang, server mode, chọn dòng, mở rộng + cây (treegrid),
 * cột cố định + cuộn, kéo đổi độ rộng, dòng tổng, cuộn ảo 10.000 dòng, trạng thái, override từ ngoài.
 */

import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

// =====================================================
// DỮ LIỆU MẪU (tự sinh, cố định — không mạng, không phụ thuộc ngày hiện tại)
// =====================================================

const FIRST = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Khánh', 'Linh', 'Minh', 'Nam', 'Oanh', 'Phúc', 'Quân', 'Sơn', 'Thảo', 'Uyên', 'Việt', 'Xuân', 'Yến', 'Đức'];
const LAST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const DEPTS = ['Kỹ thuật', 'Kinh doanh', 'Marketing', 'Nhân sự', 'Tài chính'];
const STATUS = ['active', 'leave', 'probation'];
const STATUS_LABELS = { active: 'Đang làm', leave: 'Nghỉ phép', probation: 'Thử việc' };
const STATUS_COLORS = { active: 'success', leave: 'warning', probation: 'info' };

/** n nhân viên, giá trị suy ra từ chỉ số (ổn định giữa các lần chạy) */
function people(n) {
  return Array.from({ length: n }, (_, i) => {
    const id = i + 1;
    const name = `${LAST[i % LAST.length]} ${FIRST[(i * 7) % FIRST.length]}`;
    return {
      id,
      name,
      email: `nv${String(id).padStart(3, '0')}@hui.vn`,
      dept: DEPTS[i % DEPTS.length],
      salary: 12000000 + ((id * 7919) % 30) * 1000000,
      bonus: ((id * 37) % 40) / 2,
      // Giữa trưa UTC → ngày hiển thị giống nhau ở mọi múi giờ
      joined: `20${String(18 + (id % 7)).padStart(2, '0')}-${String((id % 12) + 1).padStart(2, '0')}-15T12:00:00Z`,
      status: STATUS[id % STATUS.length],
      remote: id % 3 === 0,
      progress: (id * 13) % 101,
      site: `/nhan-vien/${id}`,
    };
  });
}

const STAFF = people(23);

const BASIC_COLUMNS = [
  { key: 'name', title: 'Họ tên' },
  { key: 'email', title: 'Email' },
  { key: 'dept', title: 'Phòng ban' },
];

const TYPED_COLUMNS = [
  { key: 'name', title: 'Nhân viên', type: 'avatar', descKey: 'email', width: 230 },
  { key: 'status', title: 'Trạng thái', type: 'tag', colors: STATUS_COLORS, labels: STATUS_LABELS },
  { key: 'salary', title: 'Lương', type: 'currency' },
  { key: 'bonus', title: 'Thưởng', type: 'percent' },
  { key: 'joined', title: 'Ngày vào', type: 'date' },
  { key: 'progress', title: 'KPI', type: 'progress', width: 150 },
  { key: 'remote', title: 'Từ xa', type: 'boolean' },
  { key: 'site', title: 'Hồ sơ', type: 'link', format: () => 'Xem' },
  {
    key: 'actions', title: 'Thao tác', type: 'actions',
    actions: [{ key: 'edit', label: 'Sửa', icon: 'edit' }, { key: 'delete', icon: 'delete', danger: true, ariaLabel: 'Xóa' }],
  },
];

/** Tạo <hui-table> bằng DOM: attribute + property (mảng / hàm) */
function makeTable(attrs = {}, props = {}, inner = '') {
  const el = document.createElement('hui-table');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) el.setAttribute(k, '');
    else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, String(v));
  }
  if (inner) el.innerHTML = inner;
  Object.assign(el, props);
  return el;
}

function stage(...children) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display: grid; gap: 28px; font-family: var(--hui-font-family); color: var(--hui-text);';
  wrap.append(...children);
  return wrap;
}

function section(title, ...children) {
  const box = document.createElement('section');
  box.style.cssText = 'display: grid; gap: 10px; min-width: 0;';
  const h = document.createElement('h3');
  h.textContent = title;
  h.style.cssText = 'margin: 0; font-size: 15px;';
  box.append(h, ...children);
  return box;
}

// =====================================================
// TIỆN ÍCH CHO PLAY
// =====================================================

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
async function settle(el) {
  await el.updateComplete;
  await nextFrame();
  await el.updateComplete;
  await nextFrame();
}
const $ = (el, sel) => el.shadowRoot.querySelector(sel);
const $$ = (el, sel) => [...el.shadowRoot.querySelectorAll(sel)];
const bodyRows = (el) => $$(el, 'tbody tr.row');
const cellText = (tr, i) => tr.cells[i].textContent.trim();
const headCell = (el, key) => $(el, `th[data-key="${key}"]`);
const sortBtn = (el, key) => $(el, `button[data-sort="${key}"]`);
/** Vùng bấm của hui-checkbox (input thật bị ẩn bằng pointer-events: none) */
const inputOf = (cb) => cb.shadowRoot.querySelector('[part~="control"]');
const press = (target, key, opts = {}) => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...opts }));
const activeIn = (el) => el.shadowRoot.activeElement;
/** Ghi lại sự kiện của bảng */
function record(el, ...names) {
  const log = Object.fromEntries(names.map((n) => [n, []]));
  for (const n of names) el.addEventListener(n, (e) => log[n].push(e.detail));
  return log;
}
async function openFilter(el, key) {
  const btn = $(el, `button[data-filter="${key}"]`);
  await userEvent.click(btn);
  const panel = btn.closest('hui-popover').querySelector('.filter-panel');
  await waitFor(() => expect(panel.querySelector('.filter-footer')).toBeTruthy());
  return { btn, panel };
}

/** "Server" giả lập: lọc / sắp xếp / cắt trang như API thật, trễ `latency` ms, ghi lại params */
function fakeServer(rows, log, latency = 120) {
  return async (params, { signal }) => {
    log.push(JSON.parse(JSON.stringify(params)));
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, latency);
      signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
    });
    let list = rows.slice();
    if (params.dept) list = list.filter((r) => params.dept.includes(r.dept));
    if (params.sort) {
      const dir = params.order === 'desc' ? -1 : 1;
      list.sort((a, b) => (a[params.sort] > b[params.sort] ? dir : a[params.sort] < b[params.sort] ? -dir : 0));
    }
    const page = params.page || 1;
    const size = params.pageSize || 10;
    return { data: list.slice((page - 1) * size, page * size), total: list.length };
  };
}

// =====================================================
// META + DOCS
// =====================================================

export default {
  title: 'Organisms/HuiTable',
  component: 'hui-table',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Table** — bảng dữ liệu đầy đủ (Ant Table + MUI DataGrid), zero-dependency, \`<table>\` thật (hoặc \`role="grid"\` / \`"treegrid"\`).
Khai báo \`columns\` có **\`type\`** là hiển thị đẹp ngay (tiền, %, ngày, tag, avatar, progress, boolean, link, actions) — định dạng qua \`core/format.js\` theo locale.

**Hai chế độ dữ liệu** (DataController):
- **CLIENT** — gán \`data\`: bảng tự lọc → sắp xếp → cắt trang (dữ liệu cây lọc / sắp xếp đệ quy).
- **SERVER** — attribute \`server\` + \`fetchFn\` / \`src\`: bảng **không** tự xử lý; mỗi lần đổi trang / sắp xếp / lọc → ghi
  \`{ page, pageSize, sort, order, sorts?, …lọc: [values] }\` vào \`params\` (DataController tải lại) và phát \`hui-change\`.
  Tổng số lấy từ \`{ data, total }\` của fetchFn, \`total-path\` (src) hoặc attribute \`total\`.

### Cách sử dụng
\`\`\`html
<hui-table id="staff" row-key="id" selection="checkbox" page-size="10" hover sort-multiple caption="Danh sách nhân viên"></hui-table>
<script>
  staff.columns = [
    { key: 'name', title: 'Nhân viên', type: 'avatar', descKey: 'email', fixed: 'left', sorter: true },
    { key: 'dept', title: 'Phòng ban', filters: [{ text: 'Kỹ thuật', value: 'Kỹ thuật' }], filterSearch: true },
    { key: 'salary', title: 'Lương', type: 'currency', sorter: (a, b) => a.salary - b.salary, defaultSortOrder: 'descend' },
    { key: 'status', title: 'Trạng thái', type: 'tag', colors: { active: 'success' }, labels: { active: 'Đang làm' } },
    { title: 'Liên hệ', children: [{ key: 'email', title: 'Email', ellipsis: true }, { key: 'phone', title: 'Điện thoại' }] },
    { key: 'actions', type: 'actions', fixed: 'right', actions: [{ key: 'edit', label: 'Sửa', icon: 'edit' }] },
  ];
  staff.data = [...];
  staff.summary = (rows) => ({ name: 'Tổng', salary: rows.reduce((s, r) => s + r.salary, 0) });
  staff.addEventListener('hui-change', (e) => console.log(e.detail.pagination, e.detail.filters, e.detail.sorter));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`row-key\` | string | \`id\` | Trường làm key (hỗ trợ \`a.b\`) |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` — đệm ô |
| \`bordered\` / \`striped\` / \`hover\` | boolean | \`false\` | Kẻ viền mọi ô / sọc dòng chẵn / tô dòng khi rê chuột |
| \`sticky\` | boolean | \`false\` | Tiêu đề dính theo trang (\`--hui-table-sticky-offset\` cho navbar cố định); không dùng cùng \`scroll-x\` |
| \`scroll-y\` | string | — | Chiều cao tối đa (số = px) → tiêu đề cố định, cuộn trong khung; dòng tổng dính đáy |
| \`scroll-x\` | string | — | Bề rộng tối thiểu của bảng (số = px \\| \`max-content\`) → cuộn ngang, cột \`fixed\` + bóng |
| \`layout\` | string | tự chọn | \`auto\` \\| \`fixed\` (tự \`fixed\` khi có ellipsis / fixed / resize / virtual / scroll-x số) |
| \`caption\` / \`label\` | string | — | \`<caption>\` / \`aria-label\` khi không có caption |
| \`sort-multiple\` | boolean | \`false\` | Shift + bấm tiêu đề = thêm cột sắp xếp (hiện số ưu tiên) |
| \`server\` | boolean | \`false\` | SERVER mode (xem trên) |
| \`page\` / \`page-size\` | number | \`1\` / \`10\` | Trang hiện tại (reflect) / số dòng mỗi trang |
| \`pagination\` | string | \`bottom\` | \`bottom\` \\| \`top\` \\| \`none\` (none = không phân trang) |
| \`total\` | number | — | Tổng số dòng (SERVER, khi API không trả \`{ data, total }\`) |
| \`selection\` | string | — | \`checkbox\` \\| \`radio\` — cột chọn dòng |
| \`select-all\` | string | \`page\` | \`page\` \\| \`all\` \\| \`none\` — phạm vi ô chọn tất cả (all = mọi dòng sau lọc, client) |
| \`default-expand-all\` | boolean | \`false\` | Mở sẵn mọi dòng ở lần nhận dữ liệu đầu |
| \`children-key\` / \`indent-size\` | string / number | \`children\` / \`20\` | Trường dòng con (cây) / độ thụt mỗi cấp (px) |
| \`virtual\` | boolean | \`false\` | Cuộn ảo (cần \`scroll-y\`, mặc định 400px) → \`role="grid"\` + \`aria-rowcount\` / \`aria-rowindex\` |
| \`row-height\` | number | 40 / 48 / 56 | Chiều cao cố định mỗi dòng khi cuộn ảo (theo size) |
| \`resizable\` | boolean | \`false\` | Mọi cột kéo đổi độ rộng được (hoặc \`resizable\` từng cột) |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng mở dòng |
| \`src\` / \`data-path\` / \`total-path\` / \`params\` / \`debounce\` / \`loading\` / \`empty-text\` | | | DataController |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`columns\` | Array | Xem bảng cột bên dưới |
| \`data\` | Array | Dữ liệu (CLIENT) hoặc trang hiện tại (SERVER) |
| \`fetchFn\` | Function | \`async (params, { signal }) => Array \\| { data, total }\` |
| \`selectedKeys\` / \`expandedKeys\` | Array | Key đang chọn / đang mở (dòng mở rộng + nút cây) |
| \`rowSelectable(row)\` / \`rowExpandable(row)\` | Function | Dòng nào chọn được / có nút mở rộng |
| \`expandRender(row, index)\` | Function | Nội dung dòng mở rộng (Node \\| chuỗi) — hoặc \`<template slot="expand">\` |
| \`summary(pageRows, allRows)\` | Function | Dòng tổng: mảng ô \\| object theo key cột \\| mảng các dòng; ô \`{ value, colSpan }\` để gộp |
| \`paginationProps\` | object | Gán thẳng cho hui-pagination: \`{ showSizeChanger, showTotal, pageSizeOptions, simple, hideOnSinglePage }\` |
| \`tableState\` | object | **Chỉ đọc** — \`{ pagination, filters, sorter, sorters }\` |
| \`selectedRows\` / \`processedRows\` / \`pageRows\` | Array | **Chỉ đọc** |

### Cột (\`columns[]\`)
| Trường | Mô tả |
|--------|-------|
| \`key\` \\| \`dataIndex\` | Đường dẫn giá trị (\`"a.b"\` hoặc mảng) — cũng là key cột |
| \`title\` | Chuỗi, Node hoặc hàm trả về Node |
| \`type\` | \`text\` · \`number\` · \`currency\` (\`currency\` / \`format\`: mã tiền) · \`percent\` · \`date\` / \`datetime\` / \`time\` / \`relative\` · \`tag\` (\`colors\`, \`labels\`) · \`avatar\` (\`srcKey\`, \`descKey\`) · \`progress\` · \`boolean\` · \`link\` (\`href\`: \`"/u/{id}"\` \\| hàm, \`target\`) · \`actions\` (\`actions: [{ key, label, icon, danger, ariaLabel, disabled }]\` → \`hui-action\`) |
| \`format\` | Hàm \`(value, row) => string\` hoặc tham số theo type (số chữ số, mã tiền, kiểu ngày) |
| \`render(value, row, index)\` | Tự vẽ ô → Node \\| chuỗi (ưu tiên hơn type) |
| \`width\` / \`minWidth\` / \`maxWidth\` / \`align\` / \`ellipsis\` / \`className\` | Bố cục ô (số căn phải mặc định) |
| \`fixed\` | \`left\` \\| \`right\` — cố định khi cuộn ngang (cột chọn / mở rộng tự cố định theo cột đầu) |
| \`sorter\` | \`true\` (so sánh theo type) \\| \`(a, b) => number\`; \`sortDirections\`, \`defaultSortOrder\` (\`ascend\`/\`asc\`, \`descend\`/\`desc\`) |
| \`filters\` / \`onFilter(value, row)\` | \`[{ text, value }]\`; mặc định so khớp bằng nhau (giá trị mảng: chứa); \`filterMultiple: false\` = radio; \`defaultFilteredValue\` |
| \`filterSearch\` | \`true\` (tìm bỏ dấu) \\| \`(input, option) => boolean\` |
| \`children\` | Cột con → tiêu đề gộp nhiều hàng |
| \`resizable\` | Cột này kéo đổi độ rộng được |
| \`editable\` / \`editor\` / \`options\` | Sửa tại chỗ bằng hui-editable: \`true\` \\| \`(row) => boolean\`; \`editor\`: text \\| number \\| select \\| textarea \\| date…; \`options\` cho select. Lưu xong → bảng ghi vào dòng + tính lại sắp xếp / dòng tổng |
| \`exportable\` / \`exportValue(value, row)\` | Có xuất CSV không (cột actions tự bỏ) / chữ riêng khi xuất |

> Cột tương thích với \`columns\` của hui-data-view (\`sortable\`, \`compare\`, \`actions\`, \`colors\`, \`labels\`, \`srcKey\`).

### Methods
| Method | Mô tả |
|--------|-------|
| \`sortBy(key, order, multiple?)\` / \`clearSorter()\` | Sắp xếp bằng code (\`order\`: asc \\| desc \\| null) |
| \`setFilter(key, values)\` / \`clearFilters()\` | Lọc bằng code |
| \`goToPage(n)\` | Chuyển trang |
| \`selectAllRows()\` / \`clearSelection()\` | Chọn / bỏ chọn (theo \`select-all\`) |
| \`toggleExpand(key, open?)\` / \`expandAll()\` / \`collapseAll()\` | Mở / thu dòng |
| \`scrollToRow(keyOrIndex, align?)\` | Cuộn tới dòng (cả cuộn ảo) |
| \`exportCsv({ filename?, rows?, formatted?, columns?, separator? })\` | Trả về chuỗi CSV (\`rows\`: all \\| page \\| selected; \`formatted\`: chữ như trên bảng); có \`filename\` → tải file (UTF-8 BOM, chống chèn công thức) |
| \`reload()\` | (DataController) tải lại |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-change\` | \`{ pagination: { current, pageSize, total }, filters, sorter, sorters, action }\` | Đổi trang / sắp xếp / lọc (client + server) |
| \`hui-sort\` | \`{ sorter, sorters }\` | Đổi sắp xếp (\`sorter\` = object, hoặc mảng khi sort-multiple) |
| \`hui-filter\` | \`{ key, values, filters }\` | Bấm Lọc / Đặt lại / \`setFilter()\` |
| \`hui-selection-change\` | \`{ keys, rows }\` | Chọn / bỏ chọn |
| \`hui-expand\` | \`{ key, row, expanded, expandedKeys }\` | Mở / thu dòng |
| \`hui-row-click\` | \`{ row, index, key, originalEvent }\` | Bấm dòng (bỏ qua control trong ô); chế độ grid: Enter trên ô thường |
| \`hui-action\` | \`{ action, row, item, index, key, originalEvent }\` | Nút cột \`actions\` |
| \`hui-column-resize\` | \`{ key, width }\` | Kéo / phím mũi tên trên tay kéo |
| \`hui-cell-edit\` | \`{ row, key, value, oldValue, index, waitUntil(promise) }\` | Lưu ô sửa tại chỗ — \`preventDefault()\` / promise lỗi = từ chối, ô trở lại giá trị cũ |
| \`hui-load\` / \`hui-error\` | \`{ data, total }\` / \`{ error }\` | DataController |

### Slots
| Slot | Mô tả |
|------|-------|
| \`caption\` | Chú thích bảng (thay attribute caption) |
| \`<template slot="expand">\` | Khuôn dòng mở rộng (data-bind / data-format như hui-data-view); nội dung nằm ở light DOM → CSS trang áp dụng được |

### Bàn phím & ARIA
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Bảng thường: tới nút sắp xếp, nút lọc, checkbox, nút mở dòng, nút trong ô |
| \`Enter\` / \`Space\` | Đổi sắp xếp (\`Shift\` = thêm cột), mở bộ lọc, chọn dòng, mở / thu dòng |
| \`Esc\` | Đóng bộ lọc (focus về nút lọc) |
| \`←\` \`→\` trên tay kéo | Đổi độ rộng cột 10px (\`Shift\` = 50px) |
| **Chế độ grid** (virtual / dữ liệu cây) | Chỉ 1 điểm dừng Tab (roving tabindex) |
| \`↑\` \`↓\` \`←\` \`→\` | Đi giữa các ô (cuộn ảo tự cuộn tới dòng chưa vẽ) |
| \`Home\` / \`End\` · \`Ctrl+Home\` / \`Ctrl+End\` · \`PageUp\` / \`PageDown\` | Đầu / cuối hàng · ô đầu / cuối bảng · ±10 dòng |
| \`→\` / \`←\` trên ô cây | Mở nhánh / thu nhánh (đã thu → lên dòng cha) — APG treegrid |
| \`Space\` / \`Enter\` | Ô chọn: chọn dòng; tiêu đề: sắp xếp; ô cây / mở rộng: mở thu; ô khác: vào control trong ô (\`F2\` cũng được, \`Esc\` để ra) |
| \`Alt+↓\` | Mở bộ lọc của cột |

Tiêu đề sắp xếp được là \`<button>\` trong \`<th>\`; cột đang sắp xếp chính có \`aria-sort\`; thông báo sắp xếp qua vùng \`role="status"\`.
Nút lọc \`aria-haspopup="dialog"\` + \`aria-expanded\`; nút mở dòng \`aria-expanded\` + \`aria-controls\`; cây: \`aria-level\` / \`aria-setsize\` / \`aria-posinset\` / \`aria-expanded\` trên \`<tr>\`;
chọn dòng ở chế độ grid: \`aria-selected\` + \`aria-multiselectable\`; host \`aria-busy\` khi đang tải.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-table-bg\` / \`--hui-table-color\` / \`--hui-table-font-size\` | Nền ô / màu chữ / cỡ chữ |
| \`--hui-table-radius\` / \`--hui-table-border-color\` | Bo góc khung / màu đường kẻ |
| \`--hui-table-header-bg\` / \`--hui-table-header-color\` / \`--hui-table-header-font-weight\` | Hàng tiêu đề |
| \`--hui-table-cell-padding\` | Đệm ô (ghi đè size) |
| \`--hui-table-row-hover-bg\` / \`--hui-table-row-selected-bg\` / \`--hui-table-row-selected-hover-bg\` / \`--hui-table-stripe-bg\` | Nền dòng theo trạng thái |
| \`--hui-table-expanded-bg\` / \`--hui-table-summary-bg\` | Nền dòng mở rộng / dòng tổng |
| \`--hui-table-fixed-shadow\` | Màu bóng cột cố định khi cuộn ngang |
| \`--hui-table-sticky-offset\` | Khoảng cách tiêu đề dính tới mép trên (attribute \`sticky\`) |
| \`--hui-table-sorter-color\` / \`--hui-table-sorter-active-color\` | Mũi tên sắp xếp / nút lọc |
| \`--hui-table-resize-color\` / \`--hui-table-focus-ring\` | Tay kéo đổi độ rộng / viền focus |

| Part | Phần tử |
|------|---------|
| \`base\`, \`scroller\`, \`table\`, \`caption\`, \`thead\`, \`header-row\`, \`tbody\`, \`footer\`, \`pagination\`, \`state\`, \`loading\` | Khung |
| \`th\` (+ \`th-group\`, \`th-fixed\`), \`sort-button\`, \`sorter\`, \`sort-priority\`, \`filter-button\` (+ \`filter-button-active\`), \`resize-handle\` | Tiêu đề |
| \`filter-panel\`, \`filter-search\`, \`filter-list\`, \`filter-footer\` | Bộ lọc |
| \`row\` (+ \`row-selected\`, \`row-expanded\`), \`cell\` (+ \`cell-fixed\`), \`selection-cell\`, \`expand-button\`, \`expanded-row\`, \`expanded-cell\` | Thân |
| \`summary-row\`, \`summary-cell\`, \`action\` (+ \`action-danger\`), \`link\` | Khác |

\`\`\`css
hui-table.brand {
  --hui-table-header-bg: var(--hui-primary-1);
  --hui-table-row-selected-bg: var(--hui-warning-1);
}
hui-table.brand::part(th) { text-transform: uppercase; letter-spacing: .04em; }
hui-table.brand::part(row-selected) { font-weight: 600; }
\`\`\`
`,
      },
    },
  },
};

// =====================================================
// 1. CƠ BẢN
// =====================================================

export const Basic = {
  render: () => stage(makeTable({ caption: 'Danh sách nhân viên', 'page-size': 5 }, { columns: BASIC_COLUMNS, data: STAFF.slice(0, 12) })),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-table');
    const log = record(el, 'hui-change', 'hui-row-click');
    await settle(el);

    // <table> thật: caption + tiêu đề + 5 dòng trang 1
    const table = $(el, 'table');
    await expect(table.getAttribute('role')).toBeNull();
    await expect($(el, 'caption').hidden).toBe(false);
    await expect($(el, 'caption').textContent).toContain('Danh sách nhân viên');
    await expect($$(el, 'thead th').length).toBe(3);
    await expect($$(el, 'thead th')[0].getAttribute('scope')).toBe('col');
    await expect(bodyRows(el).length).toBe(5);
    await expect(cellText(bodyRows(el)[0], 0)).toBe(STAFF[0].name);

    // Phân trang: tổng 12 → trang 2 hiện dòng 6–10
    const pager = $(el, 'hui-pagination');
    await expect($(el, '[part~="footer"]').hidden).toBe(false);
    await expect(pager.total).toBe(12);
    el.goToPage(3);
    await settle(el);
    await expect(bodyRows(el).length).toBe(2);
    await expect(cellText(bodyRows(el)[0], 1)).toBe(STAFF[10].email);
    await expect(el.getAttribute('page')).toBe('3');
    await expect(log['hui-change'].at(-1).pagination).toEqual({ current: 3, pageSize: 5, total: 12 });
    await expect(log['hui-change'].at(-1).action).toBe('paginate');

    // Bấm trang 1 trên hui-pagination
    pager.dispatchEvent(new CustomEvent('change', { detail: { current: 1, pageSize: 5 } }));
    await settle(el);
    await expect(el.page).toBe(1);

    // hui-row-click (không phát khi bấm control bên trong ô)
    await userEvent.click(bodyRows(el)[1].cells[0]);
    await expect(log['hui-row-click'].length).toBe(1);
    await expect(log['hui-row-click'][0].row.id).toBe(2);
    await expect(log['hui-row-click'][0].index).toBe(1);

    // Sự kiện nội bộ (change của hui-pagination) không lọt ra ngoài
    let leaked = 0;
    el.addEventListener('change', () => leaked++);
    pager.dispatchEvent(new CustomEvent('change', { detail: { current: 2, pageSize: 5 }, bubbles: true, composed: true }));
    await settle(el);
    await expect(leaked).toBe(0);

    // pagination="top" → thanh phân trang nằm trên bảng; "none" → hiện mọi dòng
    el.setAttribute('pagination', 'top');
    await settle(el);
    const footer = $(el, '[part~="footer"]');
    await expect(footer.nextElementSibling).toBe($(el, '[part~="scroller"]'));
    el.setAttribute('pagination', 'none');
    await settle(el);
    await expect(footer.hidden).toBe(true);
    await expect(bodyRows(el).length).toBe(12);
  },
};

// =====================================================
// 2. CỘT THEO TYPE
// =====================================================

export const TypedColumns = {
  render: () => stage(makeTable({ hover: true, 'pagination': 'none', 'scroll-x': 'max-content' }, { columns: TYPED_COLUMNS, data: STAFF.slice(0, 6) })),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-table');
    const log = record(el, 'hui-action', 'hui-row-click');
    await settle(el);
    const tr = bodyRows(el)[0];
    const row = STAFF[0];

    // avatar + dòng phụ (email)
    await expect(tr.cells[0].querySelector('hui-avatar').getAttribute('name')).toBe(row.name);
    await expect(tr.cells[0].textContent).toContain(row.email);
    // tag: nhãn + màu theo giá trị
    const tag = tr.cells[1].querySelector('hui-tag');
    await expect(tag.textContent).toBe(STATUS_LABELS[row.status]);
    await expect(tag.getAttribute('color')).toBe(STATUS_COLORS[row.status]);
    // tiền / phần trăm (căn phải) / ngày
    await expect(cellText(tr, 2)).toContain('₫');
    await expect(tr.cells[2].style.textAlign).toBe('right');
    await expect(cellText(tr, 3)).toContain('%');
    await expect(cellText(tr, 4)).toMatch(/2019/);
    // progress / boolean (nhãn cho trình đọc màn hình) / link
    await expect(Number(tr.cells[5].querySelector('hui-progress').getAttribute('percent'))).toBe(row.progress);
    await expect(tr.cells[6].querySelector('hui-icon').getAttribute('label')).toBe(row.remote ? 'Có' : 'Không');
    const link = tr.cells[7].querySelector('a');
    await expect(link.getAttribute('href')).toBe(row.site);
    await expect(link.textContent).toBe('Xem');

    // actions → hui-action, không phát hui-row-click
    const del = tr.cells[8].querySelector('button[data-action="delete"]');
    await expect(del.getAttribute('aria-label')).toBe('Xóa');
    await userEvent.click(del);
    await expect(log['hui-action'].length).toBe(1);
    await expect(log['hui-action'][0]).toMatchObject({ action: 'delete', key: 1, index: 0 });
    await expect(log['hui-action'][0].row).toBe(row);
    await expect(log['hui-row-click'].length).toBe(0);
  },
};

// =====================================================
// 3. SẮP XẾP + LỌC
// =====================================================

const SORT_FILTER_COLUMNS = [
  { key: 'name', title: 'Họ tên', sorter: true, filterSearch: true, filters: [...new Set(STAFF.map((r) => r.name.split(' ')[0]))].map((v) => ({ text: v, value: v })), onFilter: (v, r) => r.name.startsWith(v) },
  { key: 'dept', title: 'Phòng ban', filters: DEPTS.map((d) => ({ text: d, value: d })), filterSearch: true },
  { key: 'status', title: 'Trạng thái', type: 'tag', labels: STATUS_LABELS, colors: STATUS_COLORS, filterMultiple: false, filters: STATUS.map((s) => ({ text: STATUS_LABELS[s], value: s })) },
  { key: 'salary', title: 'Lương', type: 'currency', sorter: (a, b) => a.salary - b.salary },
  { key: 'joined', title: 'Ngày vào', type: 'date', sorter: true, sortDirections: ['descend', 'ascend'] },
];

export const SortingFiltering = {
  render: () => stage(makeTable({ 'sort-multiple': true, 'page-size': 8, hover: true }, { columns: SORT_FILTER_COLUMNS, data: STAFF })),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-table');
    const log = record(el, 'hui-sort', 'hui-filter', 'hui-change');
    await settle(el);
    const salaries = () => bodyRows(el).map((tr) => Number(cellText(tr, 3).replace(/\D/g, '')));
    const sorted = (arr, dir) => [...arr].sort((a, b) => (a - b) * dir);

    // Lương: tăng → giảm → bỏ (aria-sort trên <th>)
    await userEvent.click(sortBtn(el, 'salary'));
    await settle(el);
    await expect(headCell(el, 'salary').getAttribute('aria-sort')).toBe('ascending');
    await expect(salaries()).toEqual(sorted(salaries(), 1));
    await expect(Math.min(...STAFF.map((r) => r.salary))).toBe(salaries()[0]);
    await expect(log['hui-sort'].at(-1).sorter).toEqual([{ key: 'salary', order: 'asc' }]);
    await expect(log['hui-change'].at(-1).action).toBe('sort');
    await expect($(el, '[role="status"]')).toBeTruthy();

    await userEvent.click(sortBtn(el, 'salary'));
    await settle(el);
    await expect(headCell(el, 'salary').getAttribute('aria-sort')).toBe('descending');
    await expect(salaries()).toEqual(sorted(salaries(), -1));

    await userEvent.click(sortBtn(el, 'salary'));
    await settle(el);
    await expect(headCell(el, 'salary').hasAttribute('aria-sort')).toBe(false);
    await expect(cellText(bodyRows(el)[0], 0)).toBe(STAFF[0].name);

    // sortDirections ['descend', 'ascend'] → lần bấm đầu là giảm dần
    await userEvent.click(sortBtn(el, 'joined'));
    await settle(el);
    await expect(headCell(el, 'joined').getAttribute('aria-sort')).toBe('descending');

    // Shift + bấm = thêm cột (sort-multiple) → hiện số ưu tiên; aria-sort chỉ ở cột chính
    sortBtn(el, 'name').dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, shiftKey: true }));
    await settle(el);
    await expect(el.tableState.sorters).toEqual([{ key: 'joined', order: 'desc' }, { key: 'name', order: 'asc' }]);
    await expect(headCell(el, 'name').hasAttribute('aria-sort')).toBe(false);
    await expect(headCell(el, 'name').querySelector('.sort-priority').textContent).toBe('2');
    await expect(headCell(el, 'name').querySelector('.sort-priority').hidden).toBe(false);
    // Bấm thường = chỉ sắp xếp theo cột đó (đổi hướng tiếp theo của cột: asc → desc)
    await userEvent.click(sortBtn(el, 'name'));
    await settle(el);
    await expect(el.tableState.sorters).toEqual([{ key: 'name', order: 'desc' }]);
    await expect(headCell(el, 'name').getAttribute('aria-sort')).toBe('descending');
    await expect(headCell(el, 'name').querySelector('.sort-priority').hidden).toBe(true);
    el.clearSorter();
    await settle(el);

    // Lọc phòng ban (checkbox + ô tìm bỏ dấu) → chỉ áp dụng khi bấm Lọc
    el.goToPage(2);
    await settle(el);
    const { btn, panel } = await openFilter(el, 'dept');
    await expect(btn.getAttribute('aria-expanded')).toBe('true');
    const search = panel.querySelector('hui-input');
    const searchInput = search.shadowRoot.querySelector('input');
    await userEvent.type(searchInput, 'ky thuat');
    const options = [...panel.querySelectorAll('hui-checkbox')];
    await waitFor(() => expect(options.filter((o) => !o.hidden).length).toBe(1));
    const tech = options.find((o) => !o.hidden);
    await expect(tech.getAttribute('label')).toBe('Kỹ thuật');
    await userEvent.click(inputOf(tech));
    await expect(bodyRows(el).some((tr) => cellText(tr, 1) !== 'Kỹ thuật')).toBe(true); // chưa áp dụng
    await userEvent.click(panel.querySelector('.filter-ok'));
    await settle(el);
    await expect(bodyRows(el).length).toBeGreaterThan(0);
    await expect(bodyRows(el).every((tr) => cellText(tr, 1) === 'Kỹ thuật')).toBe(true);
    await expect(el.page).toBe(1); // lọc → về trang 1
    await expect(log['hui-filter'].at(-1)).toMatchObject({ key: 'dept', values: ['Kỹ thuật'] });
    await expect(log['hui-change'].at(-1).filters).toEqual({ dept: ['Kỹ thuật'] });
    await expect(btn.getAttribute('part')).toContain('filter-button-active');
    await waitFor(() => expect(activeIn(el)).toBe(btn)); // focus trả về nút lọc

    // Lọc 1 lựa chọn (radio) trên cột trạng thái
    const st = await openFilter(el, 'status');
    const group = st.panel.querySelector('hui-radio-group');
    await waitFor(() => expect(group.shadowRoot.querySelectorAll('hui-radio').length).toBe(3));
    await userEvent.click(group.shadowRoot.querySelectorAll('hui-radio')[0]);
    await userEvent.click(st.panel.querySelector('.filter-ok'));
    await settle(el);
    await expect(el.tableState.filters).toEqual({ dept: ['Kỹ thuật'], status: ['active'] });
    const expected = STAFF.filter((r) => r.dept === 'Kỹ thuật' && r.status === 'active').length;
    await expect(bodyRows(el).length).toBe(expected);

    // Đặt lại cột phòng ban
    const again = await openFilter(el, 'dept');
    await userEvent.click(again.panel.querySelector('.filter-reset'));
    await settle(el);
    await expect(el.tableState.filters).toEqual({ status: ['active'] });
    el.clearFilters();
    await settle(el);
    await expect(el.pageRows.length).toBe(8);
  },
};

// =====================================================
// 4. SERVER MODE
// =====================================================

export const ServerMode = {
  render: () => {
    const log = [];
    const el = makeTable({ server: true, 'page-size': 5, hover: true, caption: 'Dữ liệu tải từ fetchFn (giả lập, không mạng)' }, {
      columns: [
        { key: 'id', title: 'ID', type: 'number', width: 80, sorter: true },
        { key: 'name', title: 'Họ tên', sorter: true },
        { key: 'dept', title: 'Phòng ban', filters: DEPTS.map((d) => ({ text: d, value: d })) },
        { key: 'salary', title: 'Lương', type: 'currency', sorter: true },
      ],
      paginationProps: { showTotal: true },
    });
    el.fetchFn = fakeServer(STAFF, log);
    el._log = log;
    return stage(el);
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-table');
    const log = el._log;
    const events = record(el, 'hui-change');
    await waitFor(() => expect(el.dataState).toBe('ready'));
    await settle(el);
    await expect(log[0]).toEqual({ page: 1, pageSize: 5 });
    await expect(log.length).toBe(1);
    await expect(bodyRows(el).length).toBe(5);
    await expect($(el, 'hui-pagination').total).toBe(STAFF.length);

    // Sắp xếp: bảng KHÔNG tự sắp xếp — ghi params, đợi server trả về
    await userEvent.click(sortBtn(el, 'salary'));
    await expect(events['hui-change'].at(-1).sorter).toEqual({ key: 'salary', order: 'asc' });
    await waitFor(() => expect(log.at(-1)).toEqual({ page: 1, pageSize: 5, sort: 'salary', order: 'asc' }));
    await waitFor(() => expect(el.dataState).toBe('loading'));
    await expect(el.hasAttribute('aria-busy')).toBe(true);
    await waitFor(() => expect(el.dataState).toBe('ready'));
    await settle(el);
    const first = [...STAFF].sort((a, b) => a.salary - b.salary)[0];
    await expect(cellText(bodyRows(el)[0], 0)).toBe(String(first.id));

    // Trang 2 → params.page = 2
    el.goToPage(2);
    await waitFor(() => expect(log.at(-1)).toMatchObject({ page: 2, sort: 'salary' }));
    await waitFor(() => expect(el.dataState).toBe('ready'));
    await expect(events['hui-change'].at(-1).pagination.current).toBe(2);

    // Lọc → params có mảng giá trị, về trang 1
    el.setFilter('dept', ['Marketing']);
    await waitFor(() => expect(log.at(-1)).toMatchObject({ page: 1, dept: ['Marketing'] }));
    await waitFor(() => expect(el.dataState).toBe('ready'));
    await settle(el);
    await expect(bodyRows(el).every((tr) => cellText(tr, 2) === 'Marketing')).toBe(true);
    await expect($(el, 'hui-pagination').total).toBe(STAFF.filter((r) => r.dept === 'Marketing').length);
  },
};

// =====================================================
// 5. CHỌN DÒNG
// =====================================================

export const Selection = {
  render: () => stage(
    section('Checkbox — dòng "Nghỉ phép" không chọn được',
      makeTable({ selection: 'checkbox', 'page-size': 5, hover: true, id: 'sel-checkbox' }, {
        columns: BASIC_COLUMNS.concat([{ key: 'status', title: 'Trạng thái', type: 'tag', labels: STATUS_LABELS, colors: STATUS_COLORS }]),
        data: STAFF.slice(0, 10),
        rowSelectable: (row) => row.status !== 'leave',
      })),
    section('Radio',
      makeTable({ selection: 'radio', pagination: 'none', id: 'sel-radio' }, { columns: BASIC_COLUMNS, data: STAFF.slice(0, 4), selectedKeys: [2] })),
  ),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sel-checkbox');
    const log = record(el, 'hui-selection-change', 'hui-row-click');
    await settle(el);
    const boxes = () => bodyRows(el).map((tr) => tr.querySelector('hui-checkbox[data-select]'));
    const all = $(el, 'hui-checkbox[data-select-all]');
    await expect(all.getAttribute('aria-label')).toBe('Chọn tất cả');
    await expect(boxes()[0].getAttribute('aria-label')).toBe(`Chọn dòng ${STAFF[0].name}`);

    // Chọn 1 dòng → part row-selected, ô chọn tất cả "một phần"
    const pick = STAFF.slice(0, 5).findIndex((r) => r.status !== 'leave');
    await userEvent.click(inputOf(boxes()[pick]));
    await settle(el);
    await expect(log['hui-selection-change'].at(-1).keys).toEqual([STAFF[pick].id]);
    await expect(log['hui-selection-change'].at(-1).rows[0]).toBe(STAFF[pick]);
    await expect(bodyRows(el)[pick].getAttribute('part')).toContain('row-selected');
    await expect(all.indeterminate).toBe(true);
    await expect(log['hui-row-click'].length).toBe(0);

    // Dòng không chọn được bị khóa
    const leaveIdx = STAFF.slice(0, 5).findIndex((r) => r.status === 'leave');
    await expect(boxes()[leaveIdx].disabled).toBe(true);

    // Chọn tất cả (trang hiện tại, bỏ qua dòng khóa)
    await userEvent.click(inputOf(all));
    await settle(el);
    const selectable = STAFF.slice(0, 5).filter((r) => r.status !== 'leave').map((r) => r.id);
    await expect([...el.selectedKeys].sort((a, b) => a - b)).toEqual(selectable);
    await expect(all.checked).toBe(true);
    await expect(boxes()[leaveIdx].checked).toBe(false);

    // Sang trang 2: lựa chọn được giữ, ô chọn tất cả của trang mới trống
    el.goToPage(2);
    await settle(el);
    await expect(all.checked).toBe(false);
    await expect(all.indeterminate).toBe(false);
    await expect(el.selectedRows.length).toBe(selectable.length);
    el.clearSelection();
    await settle(el);
    await expect(el.selectedKeys).toEqual([]);

    // Radio: bấm chọn 1 dòng; Space trên radio cũng chọn
    const radioTable = canvasElement.querySelector('#sel-radio');
    const rlog = record(radioTable, 'hui-selection-change');
    await settle(radioTable);
    const radios = () => bodyRows(radioTable).map((tr) => tr.querySelector('hui-radio[data-select]'));
    await expect(radios()[1].checked).toBe(true);
    await userEvent.click(radios()[3]);
    await settle(radioTable);
    await expect(rlog['hui-selection-change'].at(-1).keys).toEqual([4]);
    await expect(radios()[1].checked).toBe(false);
    radios()[0].focus();
    press(radios()[0], ' ');
    await settle(radioTable);
    await expect(radioTable.selectedKeys).toEqual([1]);
    await expect(radios()[0].checked).toBe(true);
  },
};

// =====================================================
// 6. MỞ RỘNG DÒNG + DỮ LIỆU CÂY
// =====================================================

const TREE = [
  {
    id: 'kt', name: 'Khối Kỹ thuật', head: 12, budget: 5200000000, children: [
      { id: 'kt-fe', name: 'Frontend', head: 5, budget: 2100000000, children: [
        { id: 'kt-fe-web', name: 'Web', head: 3, budget: 1300000000 },
        { id: 'kt-fe-app', name: 'Mobile', head: 2, budget: 800000000 },
      ] },
      { id: 'kt-be', name: 'Backend', head: 7, budget: 3100000000 },
    ],
  },
  { id: 'kd', name: 'Khối Kinh doanh', head: 9, budget: 3800000000, children: [
    { id: 'kd-mb', name: 'Miền Bắc', head: 4, budget: 1700000000 },
    { id: 'kd-mn', name: 'Miền Nam', head: 5, budget: 2100000000 },
  ] },
  { id: 'hc', name: 'Hành chính', head: 3, budget: 600000000 },
];

const EXPAND_CSS = `
  .hui-table-expand .detail { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0; font-size: 13px; }
  .hui-table-expand .detail b { color: var(--hui-primary); }
`;

export const ExpandableAndTree = {
  render: () => {
    const style = document.createElement('style');
    style.textContent = EXPAND_CSS;
    const byFn = makeTable({ pagination: 'none', id: 'exp-fn' }, {
      columns: BASIC_COLUMNS.slice(0, 2).concat([{ key: 'salary', title: 'Lương', type: 'currency' }]),
      data: STAFF.slice(0, 4),
      rowExpandable: (row) => row.id !== 3,
      expandRender: (row) => {
        const p = document.createElement('p');
        p.className = 'detail';
        p.innerHTML = '<span>Phòng ban: <b></b></span><span>Email: <i></i></span>';
        p.querySelector('b').textContent = row.dept;
        p.querySelector('i').textContent = row.email;
        return p;
      },
    });
    const byTpl = makeTable({ pagination: 'none', id: 'exp-tpl', 'default-expand-all': true }, {
      columns: BASIC_COLUMNS.slice(0, 1).concat([{ key: 'joined', title: 'Ngày vào', type: 'date' }]),
      data: STAFF.slice(4, 6),
    }, '<template slot="expand"><p class="detail"><span>Mã nhân viên: <b data-bind="id"></b></span><span>Lương: <span data-bind="salary" data-format="currency"></span></span></p></template>');
    const tree = makeTable({ pagination: 'none', id: 'exp-tree', selection: 'checkbox', caption: 'Cơ cấu tổ chức (treegrid)' }, {
      columns: [
        { key: 'name', title: 'Đơn vị', sorter: true },
        { key: 'head', title: 'Nhân sự', type: 'number', sorter: true },
        { key: 'budget', title: 'Ngân sách', type: 'currency' },
      ],
      data: TREE,
    });
    return stage(style, section('expandRender + rowExpandable', byFn), section('<template slot="expand"> + default-expand-all', byTpl), section('Dữ liệu cây (children)', tree));
  },
  play: async ({ canvasElement }) => {
    // --- expandRender ---
    const el = canvasElement.querySelector('#exp-fn');
    const log = record(el, 'hui-expand');
    await settle(el);
    await expect(bodyRows(el)[2].querySelector('button[data-toggle]')).toBeNull(); // rowExpandable = false
    const toggle = bodyRows(el)[0].querySelector('button[data-toggle]');
    await expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await expect(toggle.getAttribute('aria-label')).toBe('Mở dòng');
    await userEvent.click(toggle);
    await settle(el);
    await expect(log['hui-expand'].at(-1)).toMatchObject({ key: 1, expanded: true, expandedKeys: [1] });
    const detailRow = $(el, 'tr.expanded-row');
    await expect(detailRow).toBeTruthy();
    await expect(toggle.getAttribute('aria-controls')).toBe(detailRow.id);
    await expect(toggle.getAttribute('aria-expanded')).toBe('true');
    // Nội dung ở light DOM (slot) → CSS trang áp dụng được
    const light = el.querySelector(':scope > .hui-table-expand');
    await expect(light.textContent).toContain(STAFF[0].dept);
    await expect(detailRow.querySelector('slot').assignedElements()[0]).toBe(light);
    await expect(detailRow.cells[0].colSpan).toBe(4);
    // Thu lại → gỡ dòng + nội dung light DOM
    await userEvent.click(toggle);
    await settle(el);
    await expect($(el, 'tr.expanded-row')).toBeNull();
    await expect(el.querySelector(':scope > .hui-table-expand')).toBeNull();

    // --- template slot="expand" + default-expand-all ---
    const tpl = canvasElement.querySelector('#exp-tpl');
    await settle(tpl);
    await expect($$(tpl, 'tr.expanded-row').length).toBe(2);
    await expect(tpl.querySelector(':scope > .hui-table-expand b').textContent).toBe(String(STAFF[4].id));
    await expect(tpl.querySelector(':scope > .hui-table-expand [data-bind="salary"]').textContent).toContain('₫');

    // --- cây: role treegrid + aria-level / setsize / posinset / expanded ---
    const tree = canvasElement.querySelector('#exp-tree');
    await settle(tree);
    await expect($(tree, 'table').getAttribute('role')).toBe('treegrid');
    await expect($(tree, 'table').getAttribute('aria-multiselectable')).toBe('true');
    let rows = bodyRows(tree);
    await expect(rows.length).toBe(3);
    await expect(rows[0].getAttribute('aria-level')).toBe('1');
    await expect(rows[0].getAttribute('aria-expanded')).toBe('false');
    await expect(rows[0].getAttribute('aria-setsize')).toBe('3');
    await expect(rows[2].hasAttribute('aria-expanded')).toBe(false); // lá
    await expect(rows[0].getAttribute('aria-selected')).toBe('false');

    // Bấm nút cây → hiện con (thụt lề), cấp 2
    await userEvent.click(rows[0].querySelector('button[data-toggle]'));
    await settle(tree);
    rows = bodyRows(tree);
    await expect(rows.length).toBe(5);
    await expect(rows[1].getAttribute('aria-level')).toBe('2');
    await expect(rows[1].getAttribute('aria-posinset')).toBe('1');
    await expect(cellText(rows[1], 1)).toBe('Frontend');

    // Bàn phím (APG treegrid): 1 điểm dừng Tab; → mở / ← thu / ← lên dòng cha
    const treeCell = (i) => bodyRows(tree)[i].querySelector('td[data-tree]');
    await expect($$(tree, '[tabindex="0"]').length).toBe(1);
    treeCell(1).focus();
    await expect(treeCell(1).tabIndex).toBe(0);
    press(treeCell(1), 'ArrowRight'); // mở Frontend
    await settle(tree);
    await expect(bodyRows(tree).length).toBe(7);
    await expect(bodyRows(tree)[2].getAttribute('aria-level')).toBe('3');
    press(treeCell(1), 'ArrowDown');
    await expect(activeIn(tree)).toBe(treeCell(2));
    press(treeCell(2), 'ArrowLeft'); // lá → lên dòng cha
    await expect(activeIn(tree)).toBe(treeCell(1));
    press(treeCell(1), 'ArrowLeft'); // đang mở → thu
    await settle(tree);
    await expect(bodyRows(tree).length).toBe(5);
    press(treeCell(1), 'ArrowLeft'); // đã thu, có cha → lên dòng cha
    await expect(activeIn(tree)).toBe(treeCell(0));
    // Home → ô chọn; Space → chọn dòng (aria-selected)
    press(treeCell(0), 'Home');
    const selCell = bodyRows(tree)[0].cells[0];
    await expect(activeIn(tree)).toBe(selCell);
    press(selCell, ' ');
    await settle(tree);
    await expect(bodyRows(tree)[0].getAttribute('aria-selected')).toBe('true');
    await expect(tree.selectedKeys).toEqual(['kt']);

    // Sắp xếp cây: sắp xếp theo từng cấp
    tree.sortBy('head', 'asc');
    await settle(tree);
    await expect(bodyRows(tree).map((tr) => cellText(tr, 1))).toEqual(['Hành chính', 'Khối Kinh doanh', 'Khối Kỹ thuật', 'Frontend', 'Backend']);
  },
};

// =====================================================
// 7. CỘT CỐ ĐỊNH + CUỘN
// =====================================================

const WIDE_COLUMNS = [
  { key: 'name', title: 'Họ tên', fixed: 'left', width: 170, ellipsis: true },
  { key: 'email', title: 'Email', width: 200 },
  { key: 'dept', title: 'Phòng ban', width: 140 },
  { title: 'Thu nhập', children: [
    { key: 'salary', title: 'Lương', type: 'currency', width: 150 },
    { key: 'bonus', title: 'Thưởng', type: 'percent', width: 110 },
  ] },
  { key: 'joined', title: 'Ngày vào', type: 'date', width: 140 },
  { key: 'status', title: 'Trạng thái', type: 'tag', labels: STATUS_LABELS, colors: STATUS_COLORS, width: 130 },
  { key: 'progress', title: 'KPI', type: 'progress', width: 160 },
  { key: 'remote', title: 'Từ xa', type: 'boolean', width: 90 },
  { key: 'actions', title: 'Thao tác', type: 'actions', fixed: 'right', width: 120, actions: [{ key: 'edit', label: 'Sửa', icon: 'edit' }] },
];

export const FixedColumnsScroll = {
  render: () => stage(makeTable({ 'scroll-x': 1500, 'scroll-y': 320, selection: 'checkbox', pagination: 'none', bordered: true, hover: true }, { columns: WIDE_COLUMNS, data: STAFF })),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-table');
    await settle(el);
    const scroller = $(el, '[part~="scroller"]');
    const base = $(el, '[part~="base"]');
    const nameTh = headCell(el, 'name');
    await expect(nameTh.getAttribute('part')).toContain('th-fixed');
    await expect(getComputedStyle(nameTh).position).toBe('sticky');
    // Tiêu đề gộp: 2 hàng, nhóm "Thu nhập" colspan 2
    await expect($$(el, 'thead tr').length).toBe(2);
    await expect($(el, 'th.th--group').colSpan).toBe(2);
    await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);

    // Cuộn ngang → cột trái vẫn ở mép trái, hiện bóng
    await expect(base.classList.contains('ping-start')).toBe(false);
    await expect(base.classList.contains('ping-end')).toBe(true);
    scroller.scrollLeft = 400;
    await waitFor(() => expect(base.classList.contains('ping-start')).toBe(true));
    const sRect = scroller.getBoundingClientRect();
    const selTh = $(el, 'th.th--select');
    await waitFor(() => expect(Math.abs(selTh.getBoundingClientRect().left - sRect.left)).toBeLessThan(3));
    await waitFor(() => expect(Math.abs(nameTh.getBoundingClientRect().left - selTh.getBoundingClientRect().right)).toBeLessThan(2));
    const firstNameCell = bodyRows(el)[0].cells[1];
    await expect(Math.abs(firstNameCell.getBoundingClientRect().left - nameTh.getBoundingClientRect().left)).toBeLessThan(2);
    // Cột phải dính mép phải
    const actTh = headCell(el, 'actions');
    await expect(Math.abs(actTh.getBoundingClientRect().right - sRect.right)).toBeLessThan(18); // trừ thanh cuộn dọc

    // Cuộn dọc → tiêu đề dính trên cùng
    scroller.scrollTop = 300;
    await nextFrame();
    await waitFor(() => expect(Math.abs($(el, 'thead tr').cells[0].getBoundingClientRect().top - sRect.top)).toBeLessThan(3));
    // Hàng tiêu đề thứ 2 dính ngay dưới hàng 1
    const row1Bottom = $(el, 'th.th--group').getBoundingClientRect().bottom;
    await waitFor(() => expect(Math.abs(headCell(el, 'salary').getBoundingClientRect().top - row1Bottom)).toBeLessThan(3));

    // Cuộn hết sang phải → mất bóng phải
    scroller.scrollLeft = scroller.scrollWidth;
    await waitFor(() => expect(base.classList.contains('ping-end')).toBe(false));
  },
};

// =====================================================
// 8. KÉO ĐỔI ĐỘ RỘNG CỘT
// =====================================================

export const ResizeColumns = {
  render: () => stage(makeTable({ resizable: true, pagination: 'none', bordered: true }, {
    columns: [
      { key: 'name', title: 'Họ tên', width: 180, minWidth: 100 },
      { key: 'email', title: 'Email', ellipsis: true },
      { key: 'dept', title: 'Phòng ban', resizable: false },
    ],
    data: STAFF.slice(0, 5),
  })),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-table');
    const log = record(el, 'hui-column-resize');
    await settle(el);
    const nameTh = headCell(el, 'name');
    const handle = nameTh.querySelector('[part~="resize-handle"]');
    await expect(handle.getAttribute('role')).toBe('separator');
    await expect(handle.getAttribute('aria-label')).toBe('Đổi độ rộng cột Họ tên');
    await expect(headCell(el, 'dept').querySelector('[part~="resize-handle"]')).toBeNull();
    const w0 = nameTh.getBoundingClientRect().width;

    // Bàn phím: → +10px, Shift+→ +50px, ← giảm nhưng không dưới minWidth
    handle.focus();
    press(handle, 'ArrowRight');
    await nextFrame();
    await expect(log['hui-column-resize'].at(-1)).toEqual({ key: 'name', width: Math.round(w0) + 10 });
    await waitFor(() => expect(Math.round(nameTh.getBoundingClientRect().width)).toBe(Math.round(w0) + 10));
    press(handle, 'ArrowRight', { shiftKey: true });
    await expect(log['hui-column-resize'].at(-1).width).toBe(Math.round(w0) + 60);
    await expect(handle.getAttribute('aria-valuenow')).toBe(String(Math.round(w0) + 60));
    for (let i = 0; i < 10; i++) press(handle, 'ArrowLeft', { shiftKey: true });
    await expect(log['hui-column-resize'].at(-1).width).toBe(100);

    // Kéo chuột (pointer): +80px; không đổi sắp xếp, cột khác giữ độ rộng
    const emailTh = headCell(el, 'email');
    const emailW = emailTh.getBoundingClientRect().width;
    const r = handle.getBoundingClientRect();
    const opts = { bubbles: true, composed: true, pointerId: 7, button: 0, clientY: r.top + 5 };
    handle.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: r.left }));
    handle.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: r.left + 40 }));
    handle.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: r.left + 80 }));
    handle.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: r.left + 80 }));
    await expect(log['hui-column-resize'].at(-1)).toEqual({ key: 'name', width: 180 });
    await waitFor(() => expect(Math.round(nameTh.getBoundingClientRect().width)).toBe(180));
    await expect(Math.abs(emailTh.getBoundingClientRect().width - emailW)).toBeLessThan(2);
  },
};

// =====================================================
// 9. DÒNG TỔNG
// =====================================================

export const Summary = {
  render: () => stage(makeTable({ 'page-size': 5, 'scroll-y': 260, caption: 'Dòng tổng theo trang + toàn bộ' }, {
    columns: [
      { key: 'name', title: 'Họ tên' },
      { key: 'dept', title: 'Phòng ban' },
      { key: 'salary', title: 'Lương', type: 'currency' },
      { key: 'bonus', title: 'Thưởng', type: 'percent' },
    ],
    data: STAFF,
    summary: (rows, all) => [
      { name: 'Tổng trang', salary: rows.reduce((s, r) => s + r.salary, 0), bonus: rows.reduce((s, r) => s + r.bonus, 0) / rows.length },
      [{ value: `Toàn bộ (${all.length} người)`, colSpan: 2 }, all.reduce((s, r) => s + r.salary, 0), ''],
    ],
  })),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-table');
    await settle(el);
    const foot = () => $$(el, 'tfoot tr');
    const money = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
    await expect(foot().length).toBe(2);
    await expect(foot()[0].getAttribute('part')).toBe('summary-row');
    const pageSum = STAFF.slice(0, 5).reduce((s, r) => s + r.salary, 0);
    await expect(foot()[0].cells[2].textContent).toBe(money(pageSum));
    await expect(foot()[0].cells[3].textContent).toContain('%');
    // Ô gộp colSpan 2
    await expect(foot()[1].cells[0].colSpan).toBe(2);
    await expect(foot()[1].cells[0].textContent).toBe(`Toàn bộ (${STAFF.length} người)`);
    await expect(foot()[1].cells[1].textContent).toBe(money(STAFF.reduce((s, r) => s + r.salary, 0)));
    // Đổi trang → tổng trang tính lại
    el.goToPage(2);
    await settle(el);
    await expect(foot()[0].cells[2].textContent).toBe(money(STAFF.slice(5, 10).reduce((s, r) => s + r.salary, 0)));
    // scroll-y → dòng tổng dính đáy khung
    await expect(getComputedStyle(foot()[0].cells[0]).position).toBe('sticky');
  },
};

// =====================================================
// 10. CUỘN ẢO 10.000 DÒNG
// =====================================================

const BIG = people(10000);

export const Virtual10k = {
  render: () => stage(makeTable({ virtual: true, 'scroll-y': 420, pagination: 'none', selection: 'checkbox', size: 'sm', striped: true, caption: '10.000 dòng — chỉ vẽ phần đang thấy' }, {
    columns: [
      { key: 'id', title: '#', type: 'number', width: 80, sorter: true },
      { key: 'name', title: 'Họ tên', sorter: true },
      { key: 'dept', title: 'Phòng ban', filters: DEPTS.map((d) => ({ text: d, value: d })) },
      { key: 'salary', title: 'Lương', type: 'currency', sorter: true },
    ],
    data: BIG,
  })),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-table');
    await settle(el);
    const table = $(el, 'table');
    const scroller = $(el, '[part~="scroller"]');
    await expect(table.getAttribute('role')).toBe('grid');
    await expect(table.getAttribute('aria-rowcount')).toBe('10001');
    await waitFor(() => expect(bodyRows(el).length).toBeGreaterThan(5));
    await expect(bodyRows(el).length).toBeLessThan(60);
    await expect(bodyRows(el)[0].getAttribute('aria-rowindex')).toBe('2');
    await expect(Math.round(bodyRows(el)[0].getBoundingClientRect().height)).toBe(40);
    // Chiều cao cuộn = 10.000 × 40px (+ tiêu đề + caption)
    await expect(scroller.scrollHeight).toBeGreaterThan(400000);

    // Cuộn tới cuối → vẽ dòng cuối
    scroller.scrollTop = scroller.scrollHeight;
    await waitFor(() => expect(bodyRows(el).at(-1).getAttribute('aria-rowindex')).toBe('10001'));
    await expect(cellText(bodyRows(el).at(-1), 1)).toBe('10.000');
    await expect(bodyRows(el).length).toBeLessThan(60);

    // Sắp xếp giảm dần theo # → dòng đầu là 10.000
    el.sortBy('id', 'desc');
    el.scrollToRow(0);
    await waitFor(() => expect(cellText(bodyRows(el)[0], 1)).toBe('10.000'));

    // Bàn phím (role=grid): 1 điểm dừng Tab; ↓ từ tiêu đề vào thân; Ctrl+End → ô cuối (tự cuộn)
    await expect($$(el, '[tabindex="0"]').length).toBe(1);
    // Control trong ô bị hạ khỏi thứ tự Tab (kể cả input trong shadow root của hui-checkbox)
    await waitFor(() => expect(inputOf($(el, 'hui-checkbox[data-select-all]')).parentElement.querySelector('input').tabIndex).toBe(-1));
    await expect(bodyRows(el)[0].querySelector('hui-checkbox').shadowRoot.querySelector('input').tabIndex).toBe(-1);
    await expect($(el, 'button[data-sort="id"]').tabIndex).toBe(-1);
    const firstTh = $(el, 'thead th');
    firstTh.focus();
    press(firstTh, 'ArrowRight');
    await expect(activeIn(el)).toBe(headCell(el, 'id'));
    press(activeIn(el), 'ArrowDown');
    await expect(activeIn(el).closest('tr').getAttribute('aria-rowindex')).toBe('2');
    press(activeIn(el), 'End', { ctrlKey: true });
    await waitFor(() => expect(activeIn(el)?.closest('tr')?.getAttribute('aria-rowindex')).toBe('10001'));
    await expect(cellText(activeIn(el).closest('tr'), 1)).toBe('1');
    press(activeIn(el), 'Home');
    await expect(activeIn(el).dataset.select).toBe('');
    press(activeIn(el), ' ');
    await settle(el);
    await expect(el.selectedKeys).toEqual([1]);
    await expect(activeIn(el).closest('tr').getAttribute('aria-selected')).toBe('true');
  },
};

// =====================================================
// 11. SỬA TẠI CHỖ + XUẤT CSV
// =====================================================

export const EditableAndExport = {
  render: () => {
    const rows = STAFF.slice(0, 4).map((r) => ({ ...r }));
    rows.push({ ...STAFF[4], id: 99, name: 'Lê "Bé", Ba' }); // tên có dấu phẩy + ngoặc kép → kiểm tra CSV
    const el = makeTable({ pagination: 'none', hover: true, caption: 'Bấm vào ô Họ tên / Phòng ban / Lương để sửa' }, {
      columns: [
        { key: 'name', title: 'Họ tên', editable: true },
        { key: 'dept', title: 'Phòng ban', editable: true, options: DEPTS },
        { key: 'salary', title: 'Lương', type: 'currency', editable: (row) => row.status !== 'leave', sorter: true },
        { key: 'status', title: 'Trạng thái', type: 'tag', labels: STATUS_LABELS, colors: STATUS_COLORS },
        { key: 'actions', title: 'Thao tác', type: 'actions', actions: [{ key: 'delete', icon: 'delete', danger: true, ariaLabel: 'Xóa' }] },
      ],
      data: rows,
      summary: (list) => ({ name: 'Tổng lương', salary: list.reduce((s, r) => s + (Number(r.salary) || 0), 0) }),
    });
    // Từ chối lương âm (preventDefault → ô trở lại giá trị cũ)
    el.addEventListener('hui-cell-edit', (e) => {
      if (e.detail.key === 'salary' && e.detail.value < 0) e.preventDefault();
    });
    const btn = document.createElement('hui-button');
    btn.setAttribute('icon', 'download');
    btn.setAttribute('variant', 'outline');
    btn.textContent = 'Xuất CSV';
    btn.addEventListener('click', () => el.exportCsv({ filename: 'nhan-vien.csv' }));
    const bar = document.createElement('div');
    bar.append(btn);
    return stage(bar, el);
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-table');
    const log = record(el, 'hui-cell-edit', 'hui-row-click');
    await settle(el);
    // hui-editable được hui-table tải động khi có cột editable → chờ định nghĩa xong
    await customElements.whenDefined('hui-editable');
    const editorOf = (row, key) => bodyRows(el)[row].querySelector(`hui-editable[data-edit="${key}"]`);
    const view = (ed) => ed.shadowRoot.querySelector('[part="view"]');
    const control = (ed) => ed.shadowRoot.querySelector('[part="control"]');
    const money = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
    const total = () => $(el, 'tfoot td:nth-child(3)').textContent;

    // Ô lương hiển thị theo type (tiền) + khóa ở dòng "Nghỉ phép"
    const editable = el.data.findIndex((r) => r.status !== 'leave');
    const salaryEd = editorOf(editable, 'salary');
    await expect(salaryEd.displayValue).toBe(money(el.data[editable].salary));
    const locked = el.data.findIndex((r) => r.status === 'leave');
    await expect(editorOf(locked, 'salary')).toBeNull();

    // Sửa lương → hui-cell-edit (số), dữ liệu + dòng tổng cập nhật
    await userEvent.click(view(salaryEd));
    await waitFor(() => expect(salaryEd.editing).toBe(true));
    control(salaryEd).focus();
    await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
    await userEvent.type(control(salaryEd), '50000000{Enter}');
    await waitFor(() => expect(log['hui-cell-edit'].length).toBe(1));
    await expect(log['hui-cell-edit'][0]).toMatchObject({ key: 'salary', value: 50000000, index: editable });
    await waitFor(() => expect(el.data[editable].salary).toBe(50000000));
    await settle(el);
    await expect(total()).toBe(money(el.data.reduce((s, r) => s + r.salary, 0)));
    await expect(log['hui-row-click'].length).toBe(0);

    // Từ chối (preventDefault) → giữ giá trị cũ
    await userEvent.click(view(salaryEd));
    control(salaryEd).focus();
    await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
    await userEvent.type(control(salaryEd), '-5{Enter}');
    await waitFor(() => expect(log['hui-cell-edit'].length).toBe(2));
    await waitFor(() => expect(salaryEd.value).toBe('50000000'));
    await expect(el.data[editable].salary).toBe(50000000);

    // Ô chọn (options) → giá trị mới ghi vào dòng
    const deptEd = editorOf(0, 'dept');
    await userEvent.click(view(deptEd));
    await userEvent.selectOptions(control(deptEd), 'Tài chính');
    await waitFor(() => expect(el.data[0].dept).toBe('Tài chính'));

    // CSV: tiêu đề, bỏ cột actions, chữ như trên bảng, thoát dấu phẩy / ngoặc kép
    const csv = el.exportCsv();
    const lines = csv.split('\r\n');
    await expect(lines[0]).toBe('Họ tên,Phòng ban,Lương,Trạng thái');
    await expect(lines.length).toBe(el.data.length + 1);
    await expect(lines[1]).toContain('Tài chính');
    await expect(csv).toContain('"Lê ""Bé"", Ba"');
    await expect(csv).toContain(STATUS_LABELS[el.data[0].status]);
    // Giá trị gốc + chọn cột
    const raw = el.exportCsv({ formatted: false, columns: ['name', 'salary'] }).split('\r\n');
    await expect(raw[0]).toBe('Họ tên,Lương');
    await expect(raw[editable + 1]).toBe(`${el.data[editable].name},50000000`);
    // Theo thứ tự đang sắp xếp
    el.sortBy('salary', 'desc');
    await settle(el);
    await expect(el.exportCsv({ formatted: false, columns: ['salary'] }).split('\r\n')[1]).toBe('50000000');
  },
};

// =====================================================
// 12. TRẠNG THÁI: đang tải / rỗng / lỗi
// =====================================================

export const States = {
  render: () => {
    const loading = makeTable({ loading: true, pagination: 'none', id: 'st-loading' }, { columns: BASIC_COLUMNS, data: [] });
    const empty = makeTable({ 'empty-text': 'Chưa có nhân viên nào', id: 'st-empty' }, { columns: BASIC_COLUMNS, data: [] });
    const error = makeTable({ id: 'st-error' }, { columns: BASIC_COLUMNS });
    let calls = 0;
    error.fetchFn = async () => {
      calls++;
      if (calls === 1) throw new Error('Mất kết nối máy chủ');
      return STAFF.slice(0, 3);
    };
    const refreshing = makeTable({ loading: true, pagination: 'none', id: 'st-refresh' }, { columns: BASIC_COLUMNS, data: STAFF.slice(0, 3) });
    return stage(section('Đang tải (chưa có dữ liệu)', loading), section('Rỗng', empty), section('Lỗi + Thử lại', error), section('Đang tải lại (giữ dữ liệu cũ)', refreshing));
  },
  play: async ({ canvasElement }) => {
    const loading = canvasElement.querySelector('#st-loading');
    await settle(loading);
    await expect($(loading, '[part~="state"] hui-skeleton')).toBeTruthy();
    await expect(loading.getAttribute('aria-busy')).toBe('true');
    await expect($(loading, '.state-cell').colSpan).toBe(3);

    const empty = canvasElement.querySelector('#st-empty');
    await settle(empty);
    await expect($(empty, '[part~="state"] hui-empty').getAttribute('description')).toBe('Chưa có nhân viên nào');
    await expect($(empty, '[part~="footer"]').hidden).toBe(true);

    const error = canvasElement.querySelector('#st-error');
    await waitFor(() => expect(error.dataState).toBe('error'));
    await settle(error);
    await waitFor(() => expect($(error, '[part~="state"] hui-result')).not.toBeNull());
    const result = $(error, '[part~="state"] hui-result');
    await expect(result.getAttribute('sub-title')).toBe('Mất kết nối máy chủ');
    await userEvent.click(result.querySelector('hui-button'));
    await waitFor(() => expect(error.dataState).toBe('ready'));
    await settle(error);
    await expect(bodyRows(error).length).toBe(3);

    const refreshing = canvasElement.querySelector('#st-refresh');
    await settle(refreshing);
    await expect(bodyRows(refreshing).length).toBe(3);
    await expect($(refreshing, '[part~="loading"]').hidden).toBe(false);
    refreshing.loading = false;
    await settle(refreshing);
    await expect($(refreshing, '[part~="loading"]').hidden).toBe(true);
  },
};

// =====================================================
// 13. KÍCH THƯỚC + KIỂU
// =====================================================

export const SizesAndStyles = {
  render: () => stage(
    ...['sm', 'md', 'lg'].map((size) => section(`size="${size}"${size === 'md' ? ' · striped · hover' : size === 'lg' ? ' · bordered' : ''}`,
      makeTable({ size, pagination: 'none', id: `size-${size}`, striped: size === 'md', hover: size === 'md', bordered: size === 'lg' }, { columns: BASIC_COLUMNS, data: STAFF.slice(0, 3) }))),
    section('sticky — tiêu đề dính theo trang', makeTable({ sticky: true, pagination: 'none', id: 'sticky' }, { columns: BASIC_COLUMNS, data: STAFF.slice(0, 4) })),
  ),
  play: async ({ canvasElement }) => {
    const pad = (id) => parseFloat(getComputedStyle(bodyRows(canvasElement.querySelector(`#size-${id}`))[0].cells[0]).paddingTop);
    for (const id of ['sm', 'md', 'lg']) await settle(canvasElement.querySelector(`#size-${id}`));
    await expect(pad('sm')).toBeLessThan(pad('md'));
    await expect(pad('md')).toBeLessThan(pad('lg'));
    const md = canvasElement.querySelector('#size-md');
    await expect(bodyRows(md)[1].classList.contains('row--even')).toBe(true);
    const lg = canvasElement.querySelector('#size-lg');
    await expect(parseFloat(getComputedStyle(bodyRows(lg)[0].cells[0]).borderInlineEndWidth)).toBe(1);
    const sticky = canvasElement.querySelector('#sticky');
    await settle(sticky);
    await expect(getComputedStyle($(sticky, 'thead th')).position).toBe('sticky');
    await expect(getComputedStyle($(sticky, '[part~="scroller"]')).overflowY).toBe('visible');
  },
};

// =====================================================
// 14. OVERRIDE TỪ NGOÀI
// =====================================================

const BRAND_CSS = `
  hui-table.brand {
    --hui-table-header-bg: var(--hui-primary-1);
    --hui-table-header-color: var(--hui-primary-7);
    --hui-table-row-selected-bg: var(--hui-warning-1);
    --hui-table-border-color: var(--hui-primary-2);
    --hui-table-radius: 14px;
    --hui-table-cell-padding: 10px 18px;
    --hui-table-sorter-active-color: var(--hui-warning);
  }
  hui-table.brand::part(th) { text-transform: uppercase; letter-spacing: .04em; font-size: 12px; }
  hui-table.brand::part(row-selected) { font-weight: 600; }
  hui-table.brand::part(pagination) { --hui-pagination-active-border-color: var(--hui-warning); }
`;

export const CustomizeFromOutside = {
  render: () => {
    const style = document.createElement('style');
    style.textContent = BRAND_CSS;
    const el = makeTable({ class: 'brand', selection: 'checkbox', 'page-size': 4, hover: true }, {
      columns: [{ key: 'name', title: 'Họ tên', sorter: true }, { key: 'dept', title: 'Phòng ban' }, { key: 'salary', title: 'Lương', type: 'currency', sorter: true }],
      data: STAFF.slice(0, 8),
      selectedKeys: [2],
    });
    return stage(style, el);
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-table');
    await settle(el);
    const th = headCell(el, 'name');
    await expect(getComputedStyle(th).textTransform).toBe('uppercase');
    await expect(getComputedStyle(th).paddingLeft).toBe('18px');
    await expect(getComputedStyle($(el, '[part~="scroller"]')).borderTopLeftRadius).toBe('14px');
    const selected = bodyRows(el)[1];
    await expect(selected.getAttribute('part')).toContain('row-selected');
    await expect(getComputedStyle(selected).fontWeight).toBe('600');
    // Nền dòng chọn lấy từ biến của bạn (lớp tint của ô)
    const probe = document.createElement('div');
    probe.style.background = 'var(--hui-warning-1)';
    el.append(probe);
    const expected = getComputedStyle(probe).backgroundColor;
    probe.remove();
    await expect(getComputedStyle(selected.cells[1]).backgroundImage).toContain(expected);
  },
};
