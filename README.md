# HUI-Lib — Hoang UI Component Library

[![npm version](https://badge.fury.io/js/hui-lib.svg)](https://badge.fury.io/js/hui-lib)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🇬🇧 **English documentation below.**  
> 🇻🇳 **Tài liệu hướng dẫn Tiếng Việt ở bên dưới.**

---

## 🇬🇧 English Documentation

**HUI-Lib** is a lightweight, framework-agnostic UI Component Library built entirely on **Vanilla JavaScript Web Components (Custom Elements + Shadow DOM)**. 

### Features
- 🚀 **Zero Dependencies**: Pure JavaScript, no React/Vue/Angular required.
- 📦 **Tree-Shakable**: Built with Vite & Rollup to allow individual component imports.
- 🎨 **Encapsulated Styling**: Uses Shadow DOM to prevent CSS leaks and isolate styles.
- ♿️ **Accessible & Modern**: Uses modern CSS variables (Design Tokens) and provides fully accessible components.

### Installation

```bash
npm install hui-lib
# or
yarn add hui-lib
# or
pnpm add hui-lib
```

### Usage

**1. Import the entire library (Global Bundle)**

```html
<!-- index.html -->
<link rel="stylesheet" href="node_modules/hui-lib/dist/style.css">
<script type="module" src="node_modules/hui-lib/dist/index.esm.js"></script>

<body>
  <hui-button variant="primary">Submit</hui-button>
  <hui-input placeholder="Enter text"></hui-input>
</body>
```

**2. Import individual components (Tree-shaking)**

For a smaller bundle size, import only what you need:

```javascript
// main.js (Your bundler like Vite/Webpack will resolve this)
import 'hui-lib/hui-button'; // Registers <hui-button>
import 'hui-lib/hui-input';  // Registers <hui-input>
```

```html
<!-- Usage in HTML remains the same -->
<hui-button variant="danger" size="lg">Delete</hui-button>
```

---

## 🇻🇳 Tài liệu Tiếng Việt

**HUI-Lib** là một thư viện UI Component nhẹ, siêu tốc, và hoàn toàn độc lập. Thư viện được xây dựng dựa trên công nghệ lõi của trình duyệt web là **Web Components (Custom Elements + Shadow DOM)**.

### Điểm nổi bật
- 🚀 **Không lệ thuộc (Zero Dependencies)**: Chạy bằng JavaScript thuần, bạn có thể dùng nó ở HTML tĩnh, React, Vue, Angular, hay PHP mà không lo xung đột.
- 📦 **Hỗ trợ cắt xén code thừa (Tree-Shakable)**: Được build bằng trình đóng gói Vite tối tân, bạn chỉ tải về đúng những component bạn xài.
- 🎨 **Không sợ vỡ Layout (Encapsulated Styling)**: Mọi file CSS được bao bọc an toàn trong Shadow DOM. Style web bạn không tràn vào làm hỏng library, và library không làm hỏng web bạn.
- ♿️ **Thiết kế hiện đại**: Thay đổi giao diện nhanh chóng qua biến số CSS (CSS Variables / Design Tokens).

### Cài đặt

```bash
npm install hui-lib
# hoặc
yarn add hui-lib
# hoặc
pnpm add hui-lib
```

### Hướng dẫn sử dụng

**Cách 1: Nhúng toàn bộ thư viện (Dành cho web HTML tĩnh hoặc CDN)**

Gắn trực tiếp file CSS và JS đã đóng gói vào file HTML của bạn. Nó sẽ load toàn bộ các nút bấm, ô nhập, v.v...

```html
<!-- index.html -->
<link rel="stylesheet" href="node_modules/hui-lib/dist/style.css">
<script type="module" src="node_modules/hui-lib/dist/index.esm.js"></script>

<body>
  <hui-button variant="primary">Xác nhận</hui-button>
  <hui-input placeholder="Nhập tên của bạn"></hui-input>
</body>
```

**Cách 2: Import lẻ từng món (Dành cho dự án dùng Vite/Webpack/React/Vue)**

Cách này giúp ứng dụng của bạn tải cực nhanh vì không phải ôm đồm những thứ không xài tới.

```javascript
// File main.js / entry point của bạn
import 'hui-lib/hui-button'; // Chỉ khởi tạo và đăng ký thẻ <hui-button>
import 'hui-lib/hui-input';  // Chỉ khởi tạo thẻ <hui-input>
```

```html
<!-- Cách gọi thẻ HTML ra dùng không đổi -->
<hui-button variant="danger" size="lg">Xóa dữ liệu</hui-button>
```

### Danh sách thẻ hiện có (Phase 1)
- `<hui-button>`: Nút bấm đa dạng hình thể, có hiệu ứng nhấn Ripple (gợn sóng), xoay vòng loading.
- `<hui-input>`: Ô nhập văn bản hỗ trợ kiểm duyệt lỗi (error/success), gắn viền báo hiệu, và nút xóa nhanh nội dung.

*(Đang tiếp tục cập nhật...)*

---
**Author**: Hoang
**License**: MIT 
