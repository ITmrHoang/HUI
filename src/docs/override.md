Component H-UI dùng **Shadow DOM**: CSS của trang không chọc được vào class bên trong, và CSS bên trong không làm hỏng
trang. Thay vào đó mỗi component **chủ động mở cửa** cho bạn tùy biến. Trang này tóm tắt các cách đó — chi tiết kèm
giải thích từng dòng nằm trong component mẫu **Guide/HuiDemo — Override & Selectors** (`src/components/hui-demo/`).

> **English summary** — Customize from the outside, in this order of preference: design tokens → component CSS variables
> (`--hui-button-radius`) → `::part()` → slots → attribute selectors / `:state()`. Avoid `:host-context()` (not supported in
> Firefox/Safari): put CSS variables or `data-theme` on an ancestor instead.

## Chọn cách nào?

| Muốn | Dùng | Ví dụ |
|------|------|-------|
| Đổi màu / bo góc / font cả hệ thống | Token trên `:root` | `:root { --hui-primary: #e11d48 }` |
| Đổi mọi component cùng loại | Biến component trên `:root` | `:root { --hui-button-radius: 999px }` |
| Đổi trong một vùng | Biến component trên thẻ cha | `.toolbar { --hui-button-height: 28px }` |
| Đổi thuộc tính **không có** biến | `::part(tên)` | `hui-card::part(title) { letter-spacing: .02em }` |
| Chỉnh part của component **lồng bên trong** | `exportparts` (component đã xuất sẵn) | `hui-demo::part(button-base)` |
| Thay nội dung (icon, chữ, khối HTML) | `slot="tên"` | `<span slot="extra">…</span>` |
| Theo cấu hình người dùng gán | Selector attribute | `hui-button[variant='danger'] { … }` |
| Theo trạng thái **nội bộ** | `:state(tên)` | `hui-input:state(user-invalid)::part(container) { … }` |

## 1. Attribute & property

```html
<hui-button variant="primary" size="lg" loading>Lưu</hui-button>
<script>
  const sel = document.querySelector('hui-select');
  sel.options = [{ value: 'hn', label: 'Hà Nội' }, { value: 'hcm', label: 'TP. HCM' }]; // mảng → property
  sel.value = 'hn';
</script>
```

- Tên attribute = property dạng kebab-case: `maxCount` ↔ `max-count`.
- Boolean: **có mặt là true** — `loading="false"` vẫn bật; tắt bằng `el.loading = false` / `removeAttribute`.
- Property đổi → phản chiếu (reflect) ra attribute → CSS `hui-button[loading]` thấy được.

## 2. Biến CSS (CSS custom properties) — cách chính

Component đọc `var(--hui-<comp>-<prop>, <mặc định>)` **ngay tại chỗ dùng** và **không** khai báo biến công khai trên
`:host`, nên bạn đặt biến ở **đâu cũng được** — `:root`, một thẻ cha, hay chính thẻ đó — biến tự kế thừa xuống.

```css
.pricing   { --hui-card-radius: 20px; --hui-card-padding: 28px; }
hui-button.cta { --hui-button-bg: linear-gradient(90deg, #6366f1, #db2777); --hui-button-color: #fff; }
```

Danh sách biến: mục **CSS Custom Properties** trong docs từng component.

## 3. `::part()` — chỉnh sâu những gì không có biến

```css
hui-card::part(title) { font-style: italic; }
hui-button::part(base):hover { transform: translateY(-1px); }       /* ✅ pseudo-class trạng thái */
hui-input::part(input)::placeholder { color: var(--hui-primary-4); } /* ✅ pseudo-element */
hui-button[variant='danger']::part(base) { font-weight: 700; }       /* ✅ điều kiện đặt TRƯỚC ::part */
```

Không được: chọn con bên trong part (`::part(base) span`), pseudo-class cấu trúc (`:nth-child`), ghép class
(`::part(base).active`). Component lồng nhau xuất part bằng `exportparts` — tên part được ghi trong docs component.

## 4. Slot — thay nội dung

```html
<hui-card title="Đơn hàng #1024">
  <hui-tag slot="extra" color="success">Đã giao</hui-tag>
  Nội dung (slot mặc định)
  <hui-button slot="actions" size="sm">Chi tiết</hui-button>
</hui-card>
```

Phần tử trong slot vẫn thuộc **light DOM** → CSS trang style trực tiếp và thắng `::slotted()` bên trong.

## 5. `:state()` — trạng thái nội bộ (custom states)

| State | Có ở | Ý nghĩa |
|-------|------|---------|
| `:state(filled)` | mọi form control | Đã có giá trị (floating label…) |
| `:state(invalid)` | mọi form control | Đang sai luật (required, pattern…) |
| `:state(user-invalid)` | mọi form control | Sai **và** người dùng đã chạm vào → nên dùng để tô đỏ |
| `:state(loading)` `:state(empty)` `:state(error)` `:state(ready)` | component dữ liệu (table, data-view, card-grid…) | Trạng thái tải |

```css
hui-input:state(user-invalid)::part(container) { box-shadow: 0 0 0 3px var(--hui-danger-light); }
.field:has(hui-input:state(user-invalid)) .hint { color: var(--hui-danger); }   /* :has() chọn cha theo con */
hui-table:state(loading) { opacity: .6; }
```

Hỗ trợ: Chrome 125+, Safari 17.4+, Firefox 126+ (trình duyệt cũ bỏ qua rule, không lỗi).

## 6. Theo ngữ cảnh: đừng dùng `:host-context()`

`:host-context(.theme-x)` **không** chạy trên Firefox & Safari. H-UI không dựa vào nó — theo ngữ cảnh bằng **biến CSS**
(đặt trên vùng cha, tự kế thừa) hoặc `data-theme` / `hui-config-provider`:

```css
/* ❌ không viết được từ ngoài, và không chạy trên Firefox / Safari */
/* :host-context(.sidebar) .btn { … } */

/* ✅ */
.sidebar { --hui-button-height: 32px; --hui-button-radius: 6px; }
```

## 7. Độ ưu tiên (specificity) cần nhớ

- CSS **ngoài** nhắm vào thẻ host thắng `:host { … }` bên trong (trừ `!important` — thư viện tránh dùng).
- Token khai báo trong `:where()` → độ ưu tiên 0 → mọi selector của bạn đều thắng.
- `style=""` trên thẻ thắng mọi selector.

## 8. Sự kiện

Sự kiện tên `hui-*`, `detail` chứa dữ liệu, bubble + composed. Nhiều sự kiện **cancelable**:

```js
kanban.addEventListener('hui-change', (e) => { if (e.detail.to === 'done' && !canClose) e.preventDefault(); });
editable.addEventListener('hui-save', (e) => e.detail.waitUntil(api.save(e.detail.value))); // lỗi → tự hoàn tác
```
