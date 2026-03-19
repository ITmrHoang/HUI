# Technical Analyst: HUI-Lib

## 1. Kiến trúc Core
Dự án sử dụng chuẩn **Web Components** của Mạng lồng web (W3C), cụ thể:
- **`HTMLElement`**: Tạo thẻ tùy chỉnh thay vì phụ thuộc mô hình Virtual DOM của Vue/React. Hiệu năng render gốc cực nhanh. Tên thẻ bắt buộc chứa dấu gạch ngang (`hui-xxx`).
- **`Shadow DOM`**: Kỹ thuật cách ly cây DOM nội bộ khỏi trang web bên ngoài. Cụ thể thư viện gắn bằng `attachShadow({ mode: 'open' })` để khóa không cho class CSS bên ngoài làm hỏng thiết kế bên trong thẻ của thư viện.

## 2. Hệ thống Build & Đóng gói (Bundler)
Sử dụng **Vite** với Rollup dưới nền tảng đóng gói, cấu hình `build.lib` (Library Mode):
- **Phân tách mã (Code Splitting):** Đi song song 2 luồng. Luồng 1 xuất ra bundle khổng lồ `index.esm.js`. Luồng 2 tự động quét thư mục xuất ra từng file `hui-button.js` riêng biệt để lập trình viên sử dụng cái nào thì Import cái đó (Tree-shaking tối đa).
- **Trích xuất CSS nội bộ:** Các file `.css` (ví dụ `hui-button.css`) được nhập (import) trục tiếp vào script thông qua hậu tố `?raw` (Inline raw string) của Vite. Đoạn string CSS đó sẽ được tiêm thẳng vào bằng thẻ `<style>` trong Shadow DOM lúc runtime.

## 3. Quản lý trạng thái nội bộ (Reactivity)
Vì không sử dụng Vue Component, cơ chế phản ứng UI phải làm chủ công (Manual):
- Thuộc tính HTML (ví dụ `<hui-button loading>`) được theo dõi sát sao qua `static get observedAttributes()`.
- Phương thức `attributeChangedCallback` sẽ chủ động khơi gọi hàm tạo dựng hình `_render()` để vẽ lại nút bấm.
- Nhằm tránh làm tắc nghẽn giao diện (Memory Leak / Repaint nhiều lần), mỗi lần trước khi `_render()` ta đều kiểm tra và dỡ bỏ element cũ (`if (this._element) this._element.remove()`).

## 4. Quản lý sự kiện giao tiếp
Giao tiếp giữa bên trong Component và ứng dụng bên ngoài qua hàm trung gian `emitEvent()`:
- Ứng dụng gốc `CustomEvent` với cấu hình `{ bubbles: true, composed: true }`. Đặc tính `composed: true` vô cùng quan trọng để giúp sự kiện xuyên không qua được Lớp bong bóng khí Shadow DOM bay ra ngoài trang web thật (ví dụ hàm onClick sẽ thoát được).
