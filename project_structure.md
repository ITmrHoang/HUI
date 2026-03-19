# Project Structure: HUI-Lib

```text
d:\HoangProject\ui-lib\
├── package.json               # Quản lý thư viện và script chạy
├── vite.config.js             # Cấu hình đóng gói thư viện (Library mode)
├── README.md                  # Hướng dẫn sử dụng (Anh/Việt)
├── requirements.md            # Yêu cầu dự án
├── project_structure.md       # Cấu trúc dự án
├── analyst.md                 # Phân tích kỹ thuật
│
├── src/                       # Thư mục mã nguồn chính gốc
│   ├── index.js               # Điểm chốt gom toàn bộ thư viện (Global Bundle)
│   │
│   ├── styles/                # CSS dùng chung
│   │   ├── reset.css          # Làm sạch CSS mặc định trình duyệt
│   │   └── tokens.css         # Chứa biến màu sắc, shadow, font (Design Tokens)
│   │
│   ├── utils/                 # Tệp phụ trợ dùng chung
│   │   ├── dom.js             # Hàm tạo tag HTML, tiêm CSS
│   │   └── events.js          # Hàm quản lý sự kiện tùy chỉnh (CustomEvent, debounce)
│   │
│   └── components/            # Thư mục chứa các component
│       ├── hui-button/
│       │   ├── hui-button.js  # Mã nguồn Javascript (Web Component)
│       │   ├── hui-button.css # CSS riêng ảo hóa cho Shadow DOM
│       │   └── index.js       # File xuất xưởng riêng của nút bấm
│       │
│       ├── hui-input/ ...
│       ├── hui-modal/ ...
│       └── ...
│
└── dist/                      # Thư mục chứa code sau khi Build (Sẽ sinh ra sau lệnh vite build)
    ├── index.js               # File UMD (nhúng qua thẻ script)
    ├── index.esm.js           # File ESM (nhúng qua lệnh import)
    ├── hui-button.js          # File riêng phần tử
    ├── style.css              # File CSS chứa Design Token chung
    └── ...
```
