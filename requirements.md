# Dự án: HUI-Lib (Hoang UI Component Library)

## 1. Bối cảnh dự án
Tạo một thư viện giao diện (UI Component Library) độc lập, không phụ thuộc vào framework cụ thể nào (React, Vue, Angular). Mục tiêu là để có thể tái sử dụng dễ dàng trên nhiều dự án khác nhau với hiệu suất cao nhất.

## 2. Yêu cầu kỹ thuật
- **Công nghệ lõi:** Web Components thuần bằng Vanilla JavaScript (`customElements`, `Shadow DOM`).
- **Build tool:** Vite kết hợp Rollup.
- **Tính trích xuất (Tree-Shaking):** Người dùng có thể import từng component lẻ (vd: `import 'hui-lib/hui-button'`) hoặc import toàn bộ thư viện.
- **CSS:** Design Tokens (Biến CSS), Reset CSS nội bộ trong Shadow DOM để không bị ảnh hưởng bởi CSS bên ngoài. Hỗ trợ import CSS dạng chuỗi (raw string) vào Shadow DOM.
- **Tiêu chuẩn mã nguồn:** Các file `.js` và `.css` phải được tách riêng cho dễ quản lý. Thêm comment giải thích bằng Tiếng Việt rõ ràng vào các logic cốt lõi. Bám sát chuẩn Accessibility.

## 3. Danh sách Component (Phase 1)
1. `hui-button`: Nút bấm đa năng (Variants, Sizes, Ripple effect, Loading state).
2. `hui-input`: Ô nhập liệu (Validation, Prefix/Suffix, Clearable).
3. `hui-modal`: Hộp thoại popup (Overlay, Esc to close).
4. `hui-card`: Khung chứa nội dung.
5. `hui-badge`: Nhãn trạng thái nhỏ.
6. `hui-alert`: Hộp thông báo khối lớn.
7. `hui-tooltip`: Gợi ý khi di chuột.
8. `hui-spinner`: Icon vòng xoay đang tải.

## 4. Nhật ký thay đổi (ChangeLog & Yêu cầu bổ sung)
- **[UPDATED] 2026-03-19:** Yêu cầu tách riêng file CSS ra khỏi JS, import dạng chuỗi. Thêm giải thích chi tiết trong code bằng tiếng Việt cho Vite config, HTML tags, CSS rules. Bổ sung `README.md` song ngữ Anh-Việt.
