Giao diện H-UI điều khiển hoàn toàn bằng **design token** — biến CSS `--hui-*` được gắn **một lần** vào `<head>` và
tự kế thừa xuyên Shadow DOM tới mọi component. Đổi token = đổi giao diện cả hệ thống, không cần build lại.

> **English summary** — Theme via CSS custom properties (`--hui-primary`, `--hui-bg`, `--hui-radius`…). Dark mode with
> `<html data-theme="dark">` or automatically via `prefers-color-scheme`. Scope a theme to a subtree with
> `<hui-config-provider theme="dark" primary-color="#e11d48">`. Shades `-1…-10`, hover and active are derived with `color-mix()`.

## 1. Nhóm token

| Nhóm | Token | Ghi chú |
|------|-------|---------|
| Màu ngữ nghĩa | `--hui-primary` `--hui-secondary` `--hui-success` `--hui-warning` `--hui-danger` `--hui-info` | Màu **gốc** — mọi sắc độ suy ra từ đây |
| Bảng sắc độ (palette) | `--hui-primary-1` … `--hui-primary-10` (tương tự cho mọi màu ngữ nghĩa) | 1–5 nhạt dần về nền, **6 = màu gốc**, 7–10 đậm dần (giống Ant Design) |
| Trạng thái | `--hui-primary-hover` `--hui-primary-active` `--hui-primary-light` | Tự tính bằng `color-mix()` |
| Nền | `--hui-bg` `--hui-bg-secondary` `--hui-bg-container` `--hui-bg-elevated` `--hui-surface` `--hui-overlay` | container = card/bảng; elevated = popup, dropdown |
| Chữ | `--hui-text` `--hui-text-secondary` `--hui-text-tertiary` `--hui-text-muted` `--hui-text-disabled` `--hui-text-inverse` | |
| Viền / lớp phủ | `--hui-border` `--hui-border-secondary` `--hui-border-hover` `--hui-fill` `--hui-fill-secondary` `--hui-fill-tertiary` `--hui-focus-ring` | |
| Hình khối | `--hui-radius-sm` `--hui-radius` `--hui-radius-md` `--hui-radius-lg` `--hui-radius-xl` `--hui-radius-full` | |
| Khoảng cách | `--hui-space-xs` … `--hui-space-3xl` | |
| Chữ | `--hui-font-family` `--hui-font-mono` `--hui-font-xs` … `--hui-font-2xl` `--hui-font-h1` … `--hui-font-h5` `--hui-font-weight-*` | |
| Kích thước control | `--hui-control-height-sm` / `-md` / `-lg` | Chiều cao nút, ô nhập… |
| Bóng | `--hui-shadow-sm` … `--hui-shadow-xl` | Tự đậm hơn ở dark mode |
| Chuyển động | `--hui-motion-duration` `--hui-motion-duration-fast` / `-slow` `--hui-motion-ease-*` | `--hui-motion-duration: 0ms` = tắt mọi hiệu ứng |
| Lớp xếp chồng | `--hui-z-dropdown` `--hui-z-sticky` `--hui-z-modal` `--hui-z-message` `--hui-z-notification` `--hui-z-tooltip` | |

## 2. Đổi màu thương hiệu

```css
:root {
  --hui-primary: #e11d48;     /* hover / active / 10 sắc độ tự tính lại */
  --hui-radius: 10px;
  --hui-font-family: 'Inter', system-ui, sans-serif;
}
```

Mọi token khai báo trong `:where(...)` → **độ ưu tiên 0**, nên CSS của bạn (dù chỉ `:root {}`) luôn thắng.

> ⚠ Sắc độ suy ra (`-1…-10`, hover…) chỉ được **tính lại** trên `:root`, phần tử có `data-theme` và `hui-config-provider`
> (vì `var()` được tính tại phần tử khai báo). Muốn đổi màu chính cho **một vùng**, dùng
> `<hui-config-provider primary-color="…">` hoặc đặt thêm `data-theme="light"` lên vùng đó.

## 3. Dark mode

```html
<html data-theme="dark">                          <!-- ép tối toàn trang -->
<section data-theme="dark">…</section>            <!-- chỉ một vùng -->
<html>                                            <!-- không có data-theme → theo prefers-color-scheme của HĐH -->
<html data-theme="light">                         <!-- ép sáng, tắt tự động -->
```

**Nút đổi theme** có sẵn — nhớ lựa chọn trong `localStorage` (`hui-theme`), hiệu ứng lan vòng tròn (View Transitions):

```html
<hui-theme-toggle></hui-theme-toggle>                      <!-- icon: sáng → tối → hệ thống -->
<hui-theme-toggle variant="segmented"></hui-theme-toggle>
```

Tránh "nháy" theme khi tải trang — đặt sớm trong `<head>`:

```html
<script>
  try { const m = localStorage.getItem('hui-theme'); if (m === 'light' || m === 'dark') document.documentElement.dataset.theme = m; } catch {}
</script>
```

Hoặc bằng JS: `import { applyTheme, getStoredTheme } from '@itmrhoang/h-ui/hui-theme-toggle'; applyTheme(getStoredTheme() || 'system');`

Ghi đè riêng cho dark mode:

```css
html[data-theme='dark'] { --hui-bg: #0b0b10; --hui-primary: #818cf8; }
@media (prefers-color-scheme: dark) { html:not([data-theme]) { --hui-bg: #0b0b10; } }
```

## 4. hui-config-provider — theme cho một vùng

Giống `ConfigProvider` của Ant Design: gắn `data-theme` + biến CSS lên chính thẻ (`display: contents`), mọi component bên trong nhận theo.

```html
<hui-config-provider theme="dark" primary-color="#e11d48" radius="4" size="lg">
  <hui-button>Nút đỏ, bo 4px, cỡ lớn, nền tối</hui-button>
</hui-config-provider>
```

| Attribute | Token | Ghi chú |
|-----------|-------|---------|
| `theme` | `data-theme` | `light` \| `dark` \| `''` (theo trang) |
| `primary-color` `success-color` `warning-color` `danger-color` `info-color` | `--hui-primary` … | Sắc độ tự tính lại |
| `radius` | `--hui-radius-sm/-/md/lg` | Số px gốc, các mức tính theo |
| `size` | — | `sm` \| `md` \| `lg` — kích thước mặc định của control bên trong |
| `font-family` | `--hui-font-family` | |
| `.tokens` (property) | bất kỳ | `provider.tokens = { '--hui-space-md': '1rem' }` |

## 5. Biến riêng của từng component

Mỗi component mở biến `--hui-<component>-<thuộc tính>` (danh sách ở mục **CSS Custom Properties** trong docs từng component):

```css
:root          { --hui-button-radius: 999px; }          /* mọi nút bo tròn */
.toolbar       { --hui-button-height: 28px; }           /* chỉ nút trong .toolbar */
hui-card.promo { --hui-card-bg: var(--hui-primary-1); }  /* một card */
```

Xem tiếp **Docs/Override** cho `::part()`, slot, `:state()`.
