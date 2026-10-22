# H-UI

[![CI](https://github.com/ITmrHoang/h-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/ITmrHoang/h-ui/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@itmrhoang/h-ui.svg)](https://www.npmjs.com/package/@itmrhoang/h-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 🇻🇳 Tiếng Việt ở dưới · 🇬🇧 English below

**Storybook / tài liệu:** https://itmrhoang.github.io/h-ui/ ·
**Trang mẫu:** [landing](https://itmrhoang.github.io/h-ui/examples/landing.html) ·
[dashboard](https://itmrhoang.github.io/h-ui/examples/dashboard.html) ·
[catalog](https://itmrhoang.github.io/h-ui/examples/catalog.html) ·
[story](https://itmrhoang.github.io/h-ui/examples/story.html) ·
[auth](https://itmrhoang.github.io/h-ui/examples/auth.html) ·
[admin](https://itmrhoang.github.io/h-ui/examples/admin.html) ·
[kanban](https://itmrhoang.github.io/h-ui/examples/kanban.html) ·
[ecommerce](https://itmrhoang.github.io/h-ui/examples/ecommerce.html) ·
[blog](https://itmrhoang.github.io/h-ui/examples/blog.html) ·
[table](https://itmrhoang.github.io/h-ui/examples/table.html) — [tất cả trang mẫu](https://itmrhoang.github.io/h-ui/examples/index.html)

---

## 🇻🇳 Tiếng Việt

**H-UI** là thư viện **Web Components** không phụ thuộc framework (zero-dependency), lấy cảm hứng từ Ant Design + MUI:
110+ component (form native, điều hướng, phản hồi, card, data-view, chart, cuộn từng bước, hiệu ứng…),
theme + dark mode bằng biến CSS, locale vi/en. Chạy với HTML thuần, Vue, React, Angular, Nuxt, PHP…

### Cài đặt

```bash
npm i @itmrhoang/h-ui
```

### Dùng

**Import lẻ (khuyên dùng — chỉ tải đúng thứ cần dùng):**

```js
import '@itmrhoang/h-ui/hui-button';
import '@itmrhoang/h-ui/hui-input';
import { message } from '@itmrhoang/h-ui/hui-message';
```

```html
<hui-button variant="primary" icon="check">Lưu</hui-button>
```

**Import toàn bộ** (tải hết thư viện, ~200 KB gzip): `import '@itmrhoang/h-ui';`

> Import từ gói gốc (`import { HuiButton } from '@itmrhoang/h-ui'`) cũng tải **toàn bộ** thư viện — mỗi file component tự
> đăng ký thẻ nên bundler không cắt bỏ được. Muốn nhẹ, dùng đường dẫn lẻ như trên.

### Dùng qua CDN (không cần cài, không cần bundler)

```html
<!-- Một file, có tất cả component + window.HUI -->
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.css"> <!-- CSS reset, tùy chọn -->

<hui-button onclick="HUI.message.success('Xin chào')">Bấm thử</hui-button>
```

Bản trọn gói khá lớn (~525 KB gzip). Có thể tải **theo nhóm** — luôn tải `h-ui-core.min.js` trước, rồi chỉ những
nhóm cần dùng (cùng phiên bản):

```html
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui-core.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui-data.min.js"></script>
```

| File | Nội dung | gzip |
|---|---|---:|
| `h-ui-core.min.js` | Lớp nền, `window.HUI` (message, notification, setLocale…), button, icon, input, select, checkbox, radio, switch, tag, badge, avatar, card, modal, drawer, tooltip, popover, dropdown, menu, tabs, collapse, layout/grid/flex/space, typography, pagination, alert, result, empty, skeleton… | ~168 KB |
| `h-ui-form.min.js` | form, date/time/range-picker, calendar, upload, autocomplete, search, cascader, tree-select, color-picker, slider, rate, otp, phone-input, mentions, contact-form, filter-bar… | ~106 KB |
| `h-ui-data.min.js` | table, data-view, tree, transfer, chart, timeline, kanban, statistic, stat-card, kpi-row, list, descriptions, card-grid, virtual-list… | ~129 KB |
| `h-ui-marketing.min.js` | hero, feature, pricing, testimonial, faq, navbar, footer, gallery, lightbox, carousel, video, hiệu ứng cuộn / chữ… | ~131 KB |
| `h-ui-shop.min.js` | product-card, cart-drawer, add-to-cart, quantity, variant-picker, coupon, review-list… | ~27 KB |

Các nhóm dùng chung code của core lúc chạy (không nhân đôi, không đăng ký thẻ 2 lần) nên nạp nhiều nhóm cùng lúc vẫn an toàn.
Không trộn `h-ui.min.js` với bản nhóm. File CDN chứa UTF-8 (tiếng Việt) — trang cần `<meta charset="utf-8">`
(hoặc thêm `charset="utf-8"` vào thẻ `<script>`).

Hoặc chỉ tải component cần dùng (ES module):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/hui-button.esm.js"></script>
```

### Theme

```css
:root { --hui-primary: #e11d48; }          /* đổi màu chính — hover/active/10 sắc độ tự tính */
html[data-theme="dark"] { /* dark mode có sẵn */ }
```

Override từng component: biến `--hui-<component>-*`, `::part(...)`, slot — xem trang **Guide/HuiDemo** trong Storybook.

### Dùng với Vue / React / Nuxt

Thư viện không phụ thuộc framework: `@itmrhoang/h-ui/vue` và `@itmrhoang/h-ui/react` **không import `vue`/`react`** lúc chạy.

**Chống nháy khi SSR / tải chậm** — ẩn (vẫn giữ chỗ) thẻ `hui-*` cho tới khi JS định nghĩa xong.
CSS không có wildcard cho `:not(:defined)` nên file này liệt kê sẵn mọi tên thẻ:

```js
import '@itmrhoang/h-ui/undefined.css';   // :is(hui-button, hui-input, …):not(:defined) { visibility: hidden }
```

#### Vue 3

```js
// vite.config.js — bắt buộc: báo cho compiler biết hui-* là custom element (không phải component Vue)
import vue from '@vitejs/plugin-vue';
import { huiCompilerOptions } from '@itmrhoang/h-ui/vue';   // = { isCustomElement: (tag) => tag.startsWith('hui-') }
export default { plugins: [vue({ template: { compilerOptions: huiCompilerOptions } })] };
```

```js
// main.js
import { createApp } from 'vue';
import HuiVue, { loadHui } from '@itmrhoang/h-ui/vue';
import App from './App.vue';

await loadHui();                       // toàn bộ — hoặc loadHui(['hui-button', 'hui-input', 'hui-radio-group'])
createApp(App).use(HuiVue, { components: false }).mount('#app');
// Gọn hơn: createApp(App).use(HuiVue).mount('#app') — plugin tự tải toàn bộ (bất đồng bộ, xem lưu ý dưới)
```

Plugin làm 3 việc: tải component (`components: 'all' | false | ['hui-button', () => import(...)]`), đăng ký
directive `v-hui-model` (`directive: false` để tắt), gắn `isCustomElement` khi dùng bản Vue biên dịch template lúc chạy.
`app.config.globalProperties.$huiReady` / `inject('hui:ready')` là Promise xong khi đã tải.

```vue
<template>
  <hui-input v-model="email" placeholder="Email" />                <!-- v-model gốc: el.value + sự kiện input -->
  <hui-select v-model.lazy="city" :options="cities" />             <!-- control chỉ phát change → .lazy -->
  <hui-switch v-hui-model:notify="form" />                         <!-- checked + change -->
  <hui-checkbox-group v-hui-model="[form, 'tags']" :options="tagOptions" />
  <hui-button variant="primary" @hui-click="save">Lưu</hui-button>  <!-- sự kiện riêng: @hui-xxx -->
</template>
```

| Cách | Khi nào |
|---|---|
| `v-model` | control phát `input` (hui-input, textarea, slider, rate…) — Vue gán `el.value`, nghe `input` |
| `v-model.lazy` | control chỉ phát `change` (hui-select, cascader, tree-select, upload, transfer…) |
| `v-hui-model:key="reactiveObj"` / `v-hui-model="[obj, 'key']"` | mọi control kể cả `checked` (hui-switch, hui-checkbox, hui-radio); nghe cả `input` + `change`; modifier `.lazy` `.trim` `.number` `.checked` `.value` |

> Component tải **bất đồng bộ** (plugin / `loadHui`): truyền mảng/object qua `:options` khi thẻ chưa được define thì Vue
> gán thành attribute. Hãy `await loadHui()` trước `mount()` (như trên), import tĩnh (`import '@itmrhoang/h-ui/hui-select'`),
> hoặc ép gán property: `:options.prop="cities"`.

Gợi ý kiểu (Volar): import plugin là có `GlobalComponents` cho mọi thẻ (props, `@sự-kiện`, `v-model`);
không dùng plugin thì thêm `"@itmrhoang/h-ui/types/vue"` vào `compilerOptions.types` của tsconfig.

#### Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vue: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('hui-') } },
  css: ['@itmrhoang/h-ui/undefined.css', '@itmrhoang/h-ui/style.css'],
});
```

```ts
// plugins/h-ui.client.ts — chỉ chạy ở trình duyệt (custom element cần DOM); Nuxt chờ plugin async xong mới hydrate
import HuiVue, { loadHui } from '@itmrhoang/h-ui/vue';

export default defineNuxtPlugin(async (nuxtApp) => {
  await loadHui();                     // hoặc loadHui(['hui-button', 'hui-input'])
  nuxtApp.vueApp.use(HuiVue, { components: false });
});
```

Server render thẻ `hui-*` như thẻ lạ (attribute + nội dung slot), Shadow DOM chỉ dựng ở client → `undefined.css`
giữ chỗ cho tới khi định nghĩa xong. Component nặng/chỉ có nghĩa ở client (chart, modal…) có thể bọc `<ClientOnly>`.

> Nuxt/SSR: khi hydrate, `v-model` gốc của Vue 3.5 đọc `el.defaultValue` của ô có `type="text"` — `hui-input` chưa có
> property này nên sẽ lỗi. Trong trang SSR hãy dùng `v-hui-model` cho `hui-input` (vd `<hui-input v-hui-model:email="form" />`).

#### React 19

React 19 hỗ trợ custom element sẵn — dùng thẳng thẻ, không cần wrapper:

```tsx
import '@itmrhoang/h-ui/hui-input';    // import tĩnh: thẻ được define TRƯỚC khi React render
import '@itmrhoang/h-ui/hui-select';

<hui-input value={q} placeholder="Tìm" onInput={(e) => setQ(e.currentTarget.value)}
  onhui-search={(e) => search(e.detail.value)} />
<hui-select options={cities} mode="multiple" className="w-60" onChange={(e) => setCity(e.currentTarget.value)} />
```

| Prop | React 19 làm gì |
|---|---|
| tên trùng property của element (`value`, `options`, `disabled`…) | gán **property** (mảng/object/boolean giữ nguyên kiểu); chưa define thì thành attribute |
| `onClick`, `onInput`, `onChange`, `onKeyDown`… | sự kiện tổng hợp của React (`onChange` = sự kiện `change` của element) |
| `on` + **tên sự kiện nguyên văn**: `onhui-search`, `onhui-change`, `onclose`, `onclear` | `addEventListener('hui-search', …)` — phân biệt hoa/thường, nên `onHuiSearch` **không** chạy |
| `className` | attribute `class` |

Kiểu JSX: thêm `"@itmrhoang/h-ui/types/react"` vào `compilerOptions.types` (props, giá trị enum, `onhui-*` có `e.detail`).
Next.js: import component trong file `'use client'`; SSR chỉ in prop kiểu chuỗi/số làm attribute, phần còn lại gán khi hydrate.

#### React 18 trở xuống

React 18 coi mọi prop của custom element là attribute chuỗi (`disabled={false}` thành `disabled="false"`) và không nghe
sự kiện riêng. Dùng `createComponent` (truyền React vào — thư viện không phụ thuộc react):

```jsx
import * as React from 'react';
import { createComponent } from '@itmrhoang/h-ui/react';
import '@itmrhoang/h-ui/hui-input';

export const HuiInput = createComponent(React, 'hui-input', { events: ['input', 'change', 'hui-search'] });

<HuiInput ref={ref} value={q} disabled={false} onInput={(e) => setQ(e.detail.value)} onHuiSearch={(e) => search(e.detail.value)} />
```

- Prop → gán **property** của element sau mỗi render (bỏ prop → về giá trị mặc định); `className`, `style`, `id`, `slot`,
  `data-*`, `aria-*` và sự kiện React khác (`onClick`…) chuyển nguyên cho React.
- `events`: mảng tên sự kiện → prop `on` + PascalCase (`hui-search` → `onHuiSearch`), hoặc map tự đặt
  `{ onPick: 'change' }`. `ref` trỏ tới chính thẻ `hui-*`.

### TypeScript

- Có sẵn `.d.ts` + `custom-elements.json` (gợi ý thẻ/attribute trong VS Code).
- Vue: thêm `"@itmrhoang/h-ui/types/vue"` vào `compilerOptions.types`; khai báo `isCustomElement: (t) => t.startsWith('hui-')`.
- React 19: thêm `"@itmrhoang/h-ui/types/react"`.

### Phát triển

```bash
npm ci
npm run storybook        # http://localhost:6006
npm run dev              # trang mẫu: http://localhost:5173/examples/landing.html
npm test                 # unit test (Chromium thật)
npm run test:stories     # test mọi story
npm run build            # dist/ + custom-elements.json + types
npm run build:cdn        # dist/cdn/h-ui.min.js + bản theo nhóm (core/form/data/marketing/shop)
npm run check:cdn        # kiểm tra các bản CDN chạy được trong Chromium
npm run size             # kích thước gzip khi import lẻ từng component
```

### Phát hành (CI/CD)

| Workflow | Khi nào | Làm gì |
|---|---|---|
| **CI** | mọi push / PR | build, kiểm tra types, test unit + story, kiểm tra bản build tĩnh, báo kích thước |
| **Deploy Storybook** | push `main` | Storybook + trang mẫu → GitHub Pages |
| **Release** | push `main` | có changeset → mở PR *"chore: version packages"*; merge PR đó → `npm publish` + tag `vX.Y.Z` + GitHub Release |

Ghi thay đổi cho lần phát hành sau: `npx changeset` (chọn patch / minor / major + mô tả), commit file trong `.changeset/`.

---

## 🇬🇧 English

**H-UI** is a framework-agnostic, zero-dependency **Web Components** library inspired by Ant Design + MUI:
110+ components, CSS-variable theming with dark mode, vi/en locales. Works with plain HTML, Vue, React, Angular, Nuxt…

```bash
npm i @itmrhoang/h-ui
```

```js
import '@itmrhoang/h-ui/hui-button';   // per-component import (recommended)
```

CDN (single file, exposes `window.HUI`):

```html
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.min.js"></script>
```

Docs & live examples: https://itmrhoang.github.io/h-ui/ · License: [MIT](LICENSE)
