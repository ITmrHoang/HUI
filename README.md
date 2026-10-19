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
[admin](https://itmrhoang.github.io/h-ui/examples/admin.html)

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
npm run build:cdn        # dist/cdn/h-ui.min.js
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
