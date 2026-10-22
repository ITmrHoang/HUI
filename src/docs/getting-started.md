**H-UI** là thư viện **Web Components** zero-dependency (lấy cảm hứng từ Ant Design + MUI): 110+ component —
form native, điều hướng, phản hồi, card, bảng dữ liệu, cây, ngày giờ, thương mại điện tử, hiệu ứng… Mỗi component là một
thẻ HTML chuẩn (`<hui-button>`, `<hui-table>`…), nên dùng được với **HTML thuần, Vue, React, Angular, Nuxt, PHP** —
không cần framework.

> **English summary** — Install with `npm i @itmrhoang/h-ui`, import per component (`@itmrhoang/h-ui/hui-button`) or the
> whole bundle, or drop a single `<script>` from jsDelivr. Typed via `.d.ts` + `custom-elements.json`.

## 1. Cài đặt (Install)

```bash
npm i @itmrhoang/h-ui
```

## 2. Import

**Import lẻ từng component (khuyên dùng — tree-shaking theo đường dẫn):** mỗi file tự đăng ký thẻ của nó
(`customElements.define`) và tự gắn design token vào `<head>` một lần.

```js
import '@itmrhoang/h-ui/hui-button';
import '@itmrhoang/h-ui/hui-input';
import { message } from '@itmrhoang/h-ui/hui-message';   // API dạng hàm
```

```html
<hui-button variant="primary" icon="check">Lưu</hui-button>
<hui-input label="Email" type="email" required></hui-input>
```

**Import toàn bộ** (~200 KB gzip, gồm CSS reset + directive `data-hui-animate`):

```js
import '@itmrhoang/h-ui';
import '@itmrhoang/h-ui/style.css'; // CSS reset — tùy chọn
```

> ⚠ `import { HuiButton } from '@itmrhoang/h-ui'` cũng tải **toàn bộ** thư viện (mỗi file có side-effect đăng ký thẻ nên
> bundler không cắt được). Muốn nhẹ, luôn import theo đường dẫn lẻ.

| Entry | Dùng cho |
|-------|----------|
| `@itmrhoang/h-ui` | Bundle tổng: mọi component + `message`, `notification`, `modal`, `setLocale`… |
| `@itmrhoang/h-ui/hui-<tên>` | Một component (vd `hui-table`, `hui-date-picker`) |
| `@itmrhoang/h-ui/core` | Lớp nền `HuiElement`, `HuiFormElement`, `DataController`, `setLocale`, `t`, `format*`, floating/overlay… để tự viết component |
| `@itmrhoang/h-ui/effects` | Hiệu ứng tách riêng: `attachTilt`, `attachGlow`, `attachRipple`, `attachMagnetic`, `confetti`, `burst`, `shake`, `viewTransition` |
| `@itmrhoang/h-ui/style.css` | CSS reset (tùy chọn) |
| `@itmrhoang/h-ui/custom-elements.json` | Manifest cho IDE / công cụ |

## 3. Dùng qua CDN (không cần bundler)

**Một file duy nhất** (IIFE, mọi component + `window.HUI`):

```html
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.css"> <!-- reset, tùy chọn -->

<hui-button onclick="HUI.message.success('Xin chào')">Bấm thử</hui-button>
<script>
  HUI.setLocale('en'); // đổi ngôn ngữ chuỗi mặc định
</script>
```

**Tải theo nhóm** (nhẹ hơn bản trọn gói ~525 KB gzip) — luôn tải `h-ui-core.min.js` trước, rồi chỉ những nhóm cần
(`h-ui-form`, `h-ui-data`, `h-ui-marketing`, `h-ui-shop`; cùng phiên bản, không trộn với `h-ui.min.js`):

```html
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui-core.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui-data.min.js"></script>
```

**Chỉ tải component cần dùng** (ES module — trình duyệt tự tải các chunk dùng chung):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/hui-button.esm.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/hui-table.esm.js"></script>
```

> Ghim phiên bản cụ thể khi lên production, vd `@itmrhoang/h-ui@0.3.0` thay cho `@0`.

## 4. Hiệu ứng (effects entry)

```js
import { attachTilt, attachGlow, enableEffects, confetti } from '@itmrhoang/h-ui/effects';

attachTilt(document.querySelector('.card'), { max: 10 });   // trả về hàm gỡ hiệu ứng
enableEffects();                                             // bật directive trên HTML:
```

```html
<div data-hui-tilt="10">…</div>   <div data-hui-glow>…</div>
<button data-hui-ripple>…</button> <a data-hui-magnetic="0.4">…</a>
```

Hiệu ứng tự tắt khi người dùng bật "giảm chuyển động" (`prefers-reduced-motion`), khi `<html data-hui-no-animation>`, hoặc
token `--hui-motion-duration: 0ms`. `hui-card effect="tilt glow"` tự import động module này.

## 5. TypeScript & IDE

- Gói có sẵn `.d.ts` cho từng entry (`HTMLElementTagNameMap` → `document.querySelector('hui-table')` có kiểu `HuiTable`).
- `custom-elements.json` → VS Code gợi ý thẻ / attribute (Custom Elements Manifest).
- **Vue 3**: thêm `"@itmrhoang/h-ui/types/vue"` vào `compilerOptions.types` và khai báo thẻ custom:

```js
// vite.config.js
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('hui-') } } })
```

```html
<hui-select :options="opts" :value="city" @change="city = $event.detail.value"></hui-select>
```

- **React 19**: thêm `"@itmrhoang/h-ui/types/react"`; React 19 tự gán **property** cho custom element:
  `<hui-table columns={cols} data={rows} onhui-change={fn} />`.
- **Angular**: `schemas: [CUSTOM_ELEMENTS_SCHEMA]`, `[options]="opts" (change)="fn($event)"`.
- Hướng dẫn đầy đủ cho Vue / Nuxt / React (SSR, `v-model`, React 18): xem README, mục *Dùng với Vue / React / Nuxt*.

## 6. Quy ước chung

| Chủ đề | Quy ước |
|--------|---------|
| Attribute ↔ property | `max-count` ↔ `maxCount`; boolean: **có mặt = true** (`disabled="false"` vẫn là true — xóa attribute để tắt) |
| Mảng / object | Gán bằng **property** (`el.options = [...]`); attribute nhận JSON khi cần |
| Sự kiện | Tên `hui-*` (`hui-click`, `hui-change`, `hui-select`…) + `input` / `change` cho form control; `e.detail` chứa dữ liệu; nhiều sự kiện **cancelable** (`preventDefault()`) |
| Form | Mọi control (`hui-input`, `hui-select`, `hui-date-picker`, `hui-transfer`…) gửi được qua `<form>` (ElementInternals), có `name`, `required`, `reset` |
| Dữ liệu | Component dữ liệu nhận `data` / `src` (+ `data-path`) / `fetchFn(params, { signal })`, tự có skeleton – empty – error |
| Hiệu ứng | Bật mặc định; `no-animation` để tắt từng thẻ; luôn tôn trọng `prefers-reduced-motion` |
| Chống nháy (FOUC) | `hui-button:not(:defined) { visibility: hidden; }` — hữu ích với SSR / Nuxt |

## 7. Trang mẫu (examples)

Trang HTML hoàn chỉnh dùng thư viện — mở mã nguồn trang để xem cách ghép component:
[Tất cả trang mẫu](https://itmrhoang.github.io/h-ui/examples/index.html) ·
[Kanban](https://itmrhoang.github.io/h-ui/examples/kanban.html) ·
[E-commerce](https://itmrhoang.github.io/h-ui/examples/ecommerce.html) ·
[Blog](https://itmrhoang.github.io/h-ui/examples/blog.html) ·
[Bảng dữ liệu](https://itmrhoang.github.io/h-ui/examples/table.html) ·
[Landing](https://itmrhoang.github.io/h-ui/examples/landing.html) ·
[Dashboard](https://itmrhoang.github.io/h-ui/examples/dashboard.html) ·
[Admin](https://itmrhoang.github.io/h-ui/examples/admin.html)

Tiếp theo: **Docs/Theming** (màu, dark mode) → **Docs/Override** (tùy biến giao diện) → **Docs/Accessibility & i18n**.
