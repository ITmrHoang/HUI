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
- **Chuẩn hóa Tên Sự Kiện:** Từ version cập nhật, các sự kiện phát ra bắt buộc phải bám sát API DOM Native gốc (như `change`, `input`, `blur`, `focus`, `clear`) chứ **KHÔNG** dùng tiền tố riêng biệt (`hui-change`, `hui-input`) như cũ, nhằm giữ tính "tự nhiên" khi developer thao tác với Web Components.

## 5. Quy chuẩn Thiết kế Component Nhập liệu (Form Elements)
- **Kiểm soát Kích thước Tuyệt đối (Box-Sizing):** 
  - Giao diện Form Component (`hui-input`, `hui-select`) tuân thủ khắt khe hệ tham chiếu 3 size: `sm` (26px), `md` (32px), `lg` (38px).
  - Không mở rộng Component bằng `margin`. Toàn bộ thiết kế phải dùng `padding` nội bộ và giới hạn chiều cao bằng biến `--hui-size-..`. 
- **Thiết kế Floating Label (vị trí `inside`):**
  - Hiệu ứng nổi bọt (Floating Label) không đổi `font-size` để tránh giật lag layout, thay vào đó áp dụng **Hardware Acceleration** qua chuỗi lệnh `transform: translateY(-50%) scale(0.82)`.
  - Có thiết lập gốc biến dạng `transform-origin: left center` để chống co thụt chữ. Điều này giúp né va chạm vật lý "descender" (đè chữ `g`, `y` dính vào văn bản nhập) ở kích thước khắc nghiệt nhất (`sm = 26px`).
- **Logic DOM cho Label Inline:** 
  - Khối Input phải bọc phần Lõi (`container`) và Thông báo Lỗi (`message`) vào chung 1 cục (gọi là `right-group` dọc) khi nằm ngang hàng với Label ở chế độ `inline`. Không để `flex: row` xổ tràn màn hình làm vỡ giao diện dọc.
- **Storybook Args Binding:** 
  - Bắt buộc phải gắn đầy đủ các custom Attributes (VD: `label-position=${args['label-position']}`) vào bên trong khối `render: (args) => html...` của Storybook thì thanh Controls mới thao tác điều khiển được component ở thời gian thực. Không khai báo ngầm định nếu không muốn tính năng test bị liệt.
