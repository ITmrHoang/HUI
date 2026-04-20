# Project Structure: HUI-Lib

```text
d:\HoangProject\ui-lib\
├── package.json               # Quản lý thư viện và script chạy
├── vite.config.js             # Cấu hình đóng gói thư viện (Library mode)
├── .gitignore                 # Bỏ qua node_modules, dist, storybook-static
├── README.md                  # Hướng dẫn sử dụng (Anh/Việt)
├── requirements.md            # Yêu cầu dự án
├── project_structure.md       # Cấu trúc dự án
├── analyst.md                 # Phân tích kỹ thuật
│
├── .storybook/                # Cấu hình Storybook (tự động gen docs cho components)
│   ├── main.js                # Config chính: stories pattern, addons, framework
│   └── preview.js             # Config preview: controls, a11y
│
├── .agents/                   # Agent rules (AI coding assistant)
│   └── rules/
│       ├── GEMINI.md          # Quy tắc tổng quát cho Agent
│       ├── storybook_rule.md  # Bắt buộc viết story khi tạo component mới
│       └── ...
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
│       │   ├── hui-button.js         # Web Component logic
│       │   ├── hui-button.css        # CSS Shadow DOM
│       │   ├── hui-button.stories.js # Storybook stories + docs
│       │   └── index.js              # Entry export
│       │
│       ├── hui-input/
│       │   ├── hui-input.js          # Input: icon-left/right, clearable, slots
│       │   ├── hui-input.css         # CSS + icon styles + clear animation
│       │   ├── hui-input.stories.js  # Storybook stories + docs
│       │   └── index.js
│       │
│       ├── hui-select/
│       │   ├── hui-select.js         # Select: string/object options, fetchFn, compareFn
│       │   ├── hui-select.css        # CSS dropdown, search, loading
│       │   ├── hui-select.stories.js # Storybook stories + docs
│       │   └── index.js
│       │
│       ├── hui-checkbox/
│       │   ├── hui-checkbox.js         # Checkbox: các trạng thái checked, indeterminate
│       │   ├── hui-checkbox.css        # CSS style box, check tick, variants
│       │   ├── hui-checkbox.stories.js # Storybook stories + docs
│       │   └── index.js
│       │
│       ├── hui-modal/
│       │   ├── hui-modal.js          # Modal: sizes, closable, ESC, overlay
│       │   ├── hui-modal.stories.js  # Storybook stories + docs
│       │   └── index.js
│       │
│       └── hui-demo/ ...
│
└── dist/                      # Code sau Build (sinh ra sau lệnh vite build)
    ├── index.js               # File UMD (nhúng qua thẻ script)
    ├── index.esm.js           # File ESM (nhúng qua lệnh import)
    ├── hui-button.js          # File riêng phần tử
    ├── style.css              # File CSS chứa Design Token chung
    └── ...
```

## Scripts

| Lệnh | Mô tả |
|-------|-------|
| `npm run dev` | Chạy dev server Vite |
| `npm run build` | Build thư viện ra dist/ |
| `npm run storybook` | Chạy Storybook dev (port 6006) |
| `npm run build-storybook` | Build Storybook static |
