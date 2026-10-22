---
"@itmrhoang/h-ui": minor
---

Thêm nhóm component phức tạp (G3):

- `hui-table`: sắp xếp/lọc, phân trang, chọn dòng, mở rộng + dữ liệu cây, cột cố định, kéo đổi độ rộng, dòng tổng, virtual 10k+ dòng, sửa ô, xuất CSV
- Ngày giờ (không thư viện): `hui-calendar`, `hui-date-picker`, `hui-range-picker`, `hui-time-picker`
- `hui-tree`, `hui-tree-select`, `hui-cascader`, `hui-transfer`
- `hui-color-picker` (HEX/RGB/HSB/HSL, alpha, EyeDropper), `hui-mentions`
- `hui-tour`, `hui-watermark`, `hui-qrcode` (bộ mã hóa QR tự viết)
- Sửa: `createElement` bỏ qua thuộc tính `undefined`/`null` (option trong `hui-editable` không còn bị vô hiệu); DataController ghi `aria-busy="true"`; type sinh tự động nhận đúng lớp form kế thừa gián tiếp
