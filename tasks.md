# Task Tracking: HUI-Lib
Quy ước đánh dấu:
- `[ ]` Pending
- `[~]` In progress
- `[x]` Completed
- `[/]` Skipped
- `[?]` Chờ quyết định (xem mục "Câu hỏi cần chốt khi review")

## Setup & Foundation
- [x] Khởi tạo project (package.json, vite.config.js)
- [x] Tạo project docs (README.md, project_structure.md, requirements.md, analyst.md)
- [x] Tạo design tokens & CSS reset
- [x] Tạo utils (dom helpers, event helpers)

## Core Components (Phase 1)
- [x] `hui-button` — Nút bấm
- [x] `hui-input` — Ô nhập liệu
- [x] `hui-modal` — Hộp thoại popup
- [x] `hui-card` — Thẻ chứa nội dung
- [x] `hui-badge` — Nhãn trạng thái
- [x] `hui-alert` — Thông báo
- [x] `hui-tooltip` — Gợi ý hover
- [x] `hui-spinner` — Loading indicator

## Basic Components (Phase 2 — API tham khảo Ant Design + MUI)
- [x] `hui-switch` — Công tắc bật/tắt
- [x] `hui-tag` — Nhãn/Chip (closable, checkable)
- [x] `hui-divider` — Đường phân cách
- [x] `hui-avatar` + `hui-avatar-group` — Ảnh đại diện

---

# KẾ HOẠCH THƯ VIỆN UI ĐẦY ĐỦ (bản review — chưa thực thi)

**Mục tiêu:** đủ component để dựng hoàn chỉnh 3 loại trang: landing page / website giới thiệu,
trang đăng nhập–đăng ký–form, và trang quản trị (admin dashboard: bảng, lọc, biểu mẫu, thông báo).

**Kiến trúc đã chốt:** Web Components zero-dependency. Mọi component kế thừa `HuiElement`
(`src/core/hui-element.js`). Tài liệu kỹ thuật (attr/prop, `::part`, slot, biến CSS, selector) gom ở `hui-demo`.

**Tổng quan:** 13 hạng mục nền móng · ~75 component · chia 5 giai đoạn (G0 → G4).
Thứ tự đề xuất: G0 → G1 → (dựng thử trang mẫu) → G2 → G3 → G4.

## Definition of Done — áp dụng cho MỌI component
Một component chỉ được đánh `[x]` khi đạt đủ:
1. Kế thừa `HuiElement`; property khai báo trong `static properties` (attribute ↔ property 2 chiều).
2. Kích thước `sm | md | lg` dùng chung `--hui-size-*` (component có kích thước).
3. Màu chỉ lấy từ token → tự chạy dark mode, không hard-code màu.
4. Override được từ ngoài: biến `--hui-<tên>-*` (dạng `var(--x, mặc định)`, KHÔNG khai báo trên `:host`),
   `part` cho từng phần chính, slot cho nội dung thay được.
5. Bàn phím + ARIA theo mẫu WAI-ARIA APG (ghi rõ phím hỗ trợ trong docs).
6. Sự kiện: control dạng nhập liệu dùng tên native `input` / `change`; còn lại tiền tố `hui-` (`hui-open`, `hui-close`...).
7. Stories: Default, mọi variant/size, trạng thái (disabled/loading/error), story "Override từ ngoài".
   Docs có bảng: Attributes · Properties · Events · Slots · Parts · CSS Variables · Bàn phím.
8. Test (vitest browser): render, attr ↔ prop, sự kiện, bàn phím chính, a11y addon không lỗi.
9. Export trong `src/index.js` + `package.json` exports.
10. Comment ngắn gọn; chỉ giải thích chi tiết ở logic phức tạp.

---

## G0 — NỀN MÓNG (làm trước, mọi component sau phụ thuộc)

- [x] **F1. `HuiElement` base class** — `src/core/hui-element.js`
  - `static properties` (String/Number/Boolean/Object/Array, default, reflect, attribute kebab-case)
  - `render()` một lần + `updated(changed)` gom microtask · `static styles` → adoptedStyleSheets dùng chung
  - `listen()` tự gỡ listener · `emit()` · `setState()` (`:state()`) · form API khi `formAssociated`
- [x] **F2. Quy ước override + tài liệu sống `hui-demo`** — biến CSS, `::part`/`exportparts`, slot/`::slotted`,
  `:host()`, `:state()`, bảng tra pseudo-class/element. Story: `Guide/HuiDemo`.
- [x] **F3. `hui-icon` + 30 icon SVG** — `registerIcon()` thêm icon dự án; `size`, `spin`, `rotate`, `label`.
- [~] **F4. Theme toàn cục + dark mode** — bỏ chép token vào `:host` từng component, token gắn 1 lần ở document,
  `[data-theme="dark"]` + `prefers-color-scheme`. *(Đang làm ở phiên riêng — cần merge.)*
- [ ] **F5. Hệ màu & token mở rộng**
  - Bảng 10 sắc độ cho primary/success/warning/danger/info (`--hui-primary-1` … `-10`, giống Ant)
  - Token ngữ nghĩa: `--hui-bg-container`, `--hui-bg-elevated`, `--hui-bg-spotlight`, `--hui-text-tertiary`,
    `--hui-border-secondary`, `--hui-fill-*`, `--hui-control-height-*`, `--hui-motion-*`
  - `hui-config-provider`: đặt theme / size / locale cho cả vùng con (biến CSS + context)
- [ ] **F6. Đa ngôn ngữ (locale)** — `HUI.setLocale('vi' | 'en')`, gói chuỗi mặc định (Empty, Pagination,
  Modal OK/Cancel, DatePicker, Upload, Table…); component đọc chuỗi qua `getLocale()`.
- [ ] **F7. Engine định vị popup** — `src/utils/floating.js`
  - 12 placement (top/topStart/topEnd/…), `offset`, `flip` khi tràn màn hình, `shift`, mũi tên (arrow)
  - Tự cập nhật khi scroll/resize; dùng Popover API (top-layer) nếu có, fallback `position: fixed`
  - Tách logic từ `hui-tooltip` hiện tại → Tooltip/Popover/Dropdown/Select/DatePicker dùng chung
- [ ] **F8. Overlay manager** — `src/utils/overlay.js`
  - Ngăn xếp overlay: phím Esc chỉ đóng lớp trên cùng · click ngoài để đóng
  - Focus trap + trả focus về phần tử cũ khi đóng · khóa scroll `body` (bù thanh cuộn)
  - Dùng cho Modal, Drawer, Dropdown, Popover, Popconfirm, Image preview, Tour
- [ ] **F9. Motion** — `src/utils/motion.js`: fade, zoom, slide-up/down/left/right, collapse (height auto),
  dùng Web Animations API; tôn trọng `prefers-reduced-motion`.
- [ ] **F10. `HuiFormElement`** (lớp con của HuiElement cho mọi control nhập liệu)
  - `value`, `name`, `required`, `disabled`, `readonly`, `status` (error/warning), `size` kế thừa từ `hui-form`
  - Validate: `required`, `minlength/maxlength`, `min/max`, `pattern`, `setCustomValidity()`
  - `formResetCallback`, `formStateRestoreCallback`, `<fieldset disabled>`
- [ ] **F11. Chuyển component cũ sang `HuiElement`/`HuiFormElement`** (giữ nguyên API, chỉ đổi lõi)
  - [x] button · [ ] input · [ ] select · [ ] checkbox · [ ] switch · [ ] modal · [ ] card · [ ] badge
  - [ ] alert · [ ] tooltip (dùng F7) · [ ] spinner · [ ] tag · [ ] divider · [ ] avatar/avatar-group
- [ ] **F12. Hạ tầng test & typing**
  - Vitest browser test mẫu cho button → nhân rộng; a11y addon chuyển `test: 'error'`
  - Sinh `custom-elements.json` (CEM analyzer) → tự sinh `.d.ts` cho Vue (`GlobalComponents`) và React (JSX)
- [ ] **F13. Sửa build/package**
  - `package.json` exports khai báo `require` (`*.js`) nhưng Vite chỉ build ES → bỏ `require` hoặc build thêm CJS
  - Tự sinh danh sách exports theo thư mục `src/components/*`
  - Verify `dist/` + import lẻ từng component trong một trang HTML sạch

---

## G1 — CỐT LÕI ĐỂ DỰNG WEBSITE (ưu tiên cao)

### G1.1 Typography
- [ ] **`hui-title`** — `level` 1–5, `type` (secondary/success/warning/danger), `ellipsis`
- [ ] **`hui-text`** — `type`, `strong`, `italic`, `underline`, `delete`, `code`, `mark`, `keyboard`,
  `ellipsis` (+ `rows` nhiều dòng, tooltip khi bị cắt), `copyable` (nút copy + sự kiện `hui-copy`)
- [ ] **`hui-link`** — `href`, `target`, `external` (icon ↗), `underline` (none/hover/always), `disabled`
- [ ] **`hui-paragraph`** — đoạn văn, `ellipsis` + nút "Xem thêm"

### G1.2 Layout
- [ ] **`hui-flex`** — `vertical`, `gap` (sm/md/lg/số), `align`, `justify`, `wrap`
- [ ] **`hui-space`** — `size`, `direction`, `wrap`, `split` (slot ngăn cách), `compact` (gộp viền nút/input liền nhau)
- [ ] **`hui-row` + `hui-col`** — lưới 24 cột, `gutter` [ngang, dọc], `span`/`offset`/`order`,
  responsive bằng attribute `span-xs` … `span-xxl` (breakpoint 576/768/992/1200/1600)
- [ ] **`hui-container`** — `max-width` theo breakpoint, `fluid`
- [ ] **`hui-layout` + `hui-header` / `hui-sider` / `hui-content` / `hui-footer`**
  - `hui-sider`: `width`, `collapsed`, `collapsible`, `collapsed-width`, `breakpoint` tự thu gọn, sự kiện `hui-collapse`
- [ ] **`hui-section`** (cho landing page) — vùng nội dung có `padding` chuẩn, nền tùy chọn, slot tiêu đề/mô tả

### G1.3 Nhập liệu
- [ ] **`hui-input` nâng cấp** — `type="password"` có nút ẩn/hiện, `show-count`, `maxlength`,
  slot `prefix`/`suffix`/`addon-before`/`addon-after`, `allow-clear`, `status`, `variant` (outlined/filled/borderless)
- [ ] **`hui-textarea`** — `rows`, `autosize` (min/max rows), `show-count`, `maxlength`, `resize`
- [ ] **`hui-input-number`** — `min`/`max`/`step`/`precision`, nút tăng giảm, phím ↑/↓, `formatter`/`parser`
  (vd: phân tách hàng nghìn, đơn vị ₫), `prefix`/`suffix`
- [ ] **`hui-radio` + `hui-radio-group`** — `value`, `options` (property), `direction`,
  `option-type="button"` (dạng nút liền), `button-style` (outline/solid); phím mũi tên chuyển lựa chọn (APG radio)
- [ ] **`hui-checkbox-group`** — `value[]`, `options`, chọn tất cả (`indeterminate`)
- [ ] **`hui-select` nâng cấp** — `mode` (multiple/tags), `show-search` + lọc, `allow-clear`, `max-tag-count`,
  `options` qua property, nhóm option, `loading`, `not-found` slot, virtual list khi > 100 option, dùng F7
- [ ] **`hui-slider`** — `min`/`max`/`step`, `range` (2 tay nắm), `marks`, `vertical`, tooltip giá trị, phím mũi tên/PageUp/Home
- [ ] **`hui-form` + `hui-form-item`**
  - `hui-form`: `layout` (vertical/horizontal/inline), `label-width`, `label-align`, `size`, `disabled` cho toàn form,
    `required-mark` (true/false/optional)
  - Rules: `required`, `type` (email/url/number), `min`/`max`, `pattern`, `validator` (hàm, hỗ trợ async), `message`
  - API: `validate()`, `validateFields(names)`, `reset()`, `getValues()`, `setValues()`, `scrollToError()`
  - `hui-form-item`: `label`, `name`, `help`, `extra`, `tooltip`, hiển thị lỗi + trạng thái màu
  - Sự kiện: `hui-submit` (đã validate ok), `hui-submit-failed`, `hui-values-change`

### G1.4 Phản hồi
- [ ] **`hui-message`** (toast nhỏ giữa trên) — `HUI.message.success|error|warning|info|loading(text, opts)`,
  `duration`, `max` số lượng, trả về hàm đóng / promise; `aria-live`
- [ ] **`hui-notification`** — `HUI.notification.open({ title, description, type, placement, duration, actions })`,
  6 vị trí, nút đóng, tạm dừng đếm giờ khi hover
- [ ] **`hui-modal` nâng cấp** — `HUI.modal.confirm|info|success|error|warning()` trả Promise,
  `ok-loading` khi `onOk` async, slot `footer`, `width`, `centered`, `mask-closable`, `destroy-on-close`; dùng F8/F9
- [ ] **`hui-drawer`** — `placement` (left/right/top/bottom), `size`, `mask`, `closable`, slot `header`/`footer`/`extra`,
  drawer lồng nhau; dùng F8/F9
- [ ] **`hui-progress`** — `type` (line/circle/dashboard), `percent`, `status` (active/success/exception), `steps`,
  `stroke-color` (gradient), `size`, hiển thị chữ %
- [ ] **`hui-skeleton`** — `avatar`, `title`, `paragraph` (số dòng), `active` (shimmer), `loading` (bọc nội dung thật);
  biến thể `hui-skeleton-button` / `-input` / `-image`
- [ ] **`hui-popconfirm`** — `title`, `description`, `ok-text`/`cancel-text`, `ok-type`, async OK, icon; dùng F7
- [ ] **`hui-result`** — `status` success/error/info/warning/404/403/500 (minh họa SVG), slot `extra`
- [ ] **`hui-empty`** — ảnh mặc định + `description`, slot hành động; dùng cho Table/List/Select

### G1.5 Điều hướng
- [ ] **`hui-tabs` + `hui-tab-panel`** — `type` (line/card/editable-card), `placement` (top/bottom/left/right),
  `active-key`, `centered`, tab có icon, đóng/thêm tab, cuộn khi tràn, lazy render panel; phím mũi tên/Home/End (APG tabs)
- [ ] **`hui-menu` + `hui-menu-item` / `hui-sub-menu` / `hui-menu-group` / `hui-menu-divider`**
  - `mode` (horizontal/vertical/inline), `collapsed` (chỉ icon + tooltip), `selected-keys`, `open-keys`, `accordion`
  - Item: `icon`, `disabled`, `danger`, `href`; sự kiện `hui-select`, `hui-open-change`; điều hướng bàn phím (APG menu)
- [ ] **`hui-dropdown`** — `trigger` (hover/click/contextmenu), `placement`, `arrow`, nội dung slot hoặc `menu` (property),
  `hui-dropdown-button` (nút chính + mũi tên); dùng F7/F8
- [ ] **`hui-breadcrumb` + `hui-breadcrumb-item`** — `separator`, item có `href`/icon/dropdown, rút gọn khi quá dài
- [ ] **`hui-pagination`** — `total`, `current`, `page-size`, `page-size-options`, `show-size-changer`, `show-quick-jumper`,
  `show-total`, `simple`, `size`, `hide-on-single-page`; sự kiện `change`
- [ ] **`hui-navbar`** (cho website) — logo slot, menu ngang, nút hamburger → drawer trên mobile, `sticky`, nền trong suốt khi ở đầu trang

### G1.6 Hiển thị dữ liệu
- [ ] **`hui-popover`** — `title`, nội dung slot, `trigger`, `placement`, `open` (controlled); dùng F7
- [ ] **`hui-tooltip` nâng cấp** — dùng F7, `color`, `arrow`, delay mở/đóng
- [ ] **`hui-collapse` + `hui-collapse-panel`** — `accordion`, `bordered`, `ghost`, `expand-icon-position`,
  panel `disabled`/`collapsible`; animation F9; APG accordion
- [ ] **`hui-list` + `hui-list-item` / `hui-list-item-meta`** — header/footer, avatar + title + description, slot actions,
  `bordered`, `split`, `loading`, `grid` (dạng lưới thẻ), tích hợp `hui-pagination`
- [ ] **`hui-descriptions` + item** — `bordered`, `column` (responsive), `layout` (horizontal/vertical), `size`
- [ ] **`hui-statistic`** — `value`, `precision`, `prefix`/`suffix`, phân tách nghìn, `hui-statistic-countdown`
- [ ] **`hui-card` nâng cấp** — `hoverable`, slot `cover`/`actions`/`extra`, `loading` (skeleton), `hui-card-meta`, `type="inner"`
- [ ] **`hui-badge` nâng cấp** — `hui-badge-ribbon`, `status` dot (processing nhấp nháy)

**🔖 Mốc kiểm chứng sau G1:** dựng 3 trang mẫu chỉ bằng HUI trong `examples/`:
`landing.html` (navbar, hero, section, card, footer), `auth.html` (form đăng nhập/đăng ký + validate + message),
`admin.html` (layout + sider menu + breadcrumb + list/descriptions + pagination + drawer + notification).
Thiếu gì khi dựng → bổ sung vào backlog trước khi sang G2.

---

## G2 — BỔ SUNG PHONG PHÚ (ưu tiên trung bình)
- [ ] **`hui-steps` + `hui-step`** — `current`, `direction`, `status` (wait/process/finish/error), `type` (default/navigation/dot), `clickable`
- [ ] **`hui-timeline` + item** — `mode` (left/right/alternate), màu/icon từng mốc, `pending`, `reverse`
- [ ] **`hui-segmented`** — chọn 1 trong nhiều (dạng thanh trượt), `options`, `block`, icon
- [ ] **`hui-button-group`** + **`hui-toggle-button-group`** (MUI ToggleButton) — chọn đơn/nhiều
- [ ] **`hui-rate`** — `count`, `allow-half`, `allow-clear`, ký tự tùy chỉnh (slot), `readonly`, tooltip từng sao
- [ ] **`hui-upload`** — kéo thả (`hui-upload-dragger`), `list-type` (text/picture/picture-card), progress, `accept`, `max-count`,
  `multiple`, `before-upload` (hàm), `custom-request`, xem trước ảnh, xóa file; sự kiện `change`
- [ ] **`hui-autocomplete`** — gợi ý theo `options`, lọc, async (`hui-search` + `loading`), dùng F7
- [ ] **`hui-image`** — `preview` (phóng to, xoay, lật, zoom bằng cuộn), `hui-image-group` xem dạng album, `fallback`, `lazy`, `placeholder`
- [ ] **`hui-carousel`** — `autoplay`, `dots`, `arrows`, `effect` (scroll/fade), vuốt trên mobile, `slides-per-view`
- [ ] **`hui-float-button`** + **`-group`** (MUI SpeedDial) + **`hui-back-top`**
- [ ] **`hui-anchor`** — mục lục bám theo cuộn trang, `offset-top`, highlight mục hiện tại
- [ ] **`hui-affix`** — ghim phần tử khi cuộn (`offset-top`/`offset-bottom`)
- [ ] **`hui-bottom-navigation`** (MUI) — thanh điều hướng đáy cho mobile
- [ ] **`hui-chip`** — xem xét gộp vào `hui-tag` (thêm avatar/icon, `variant` filled/outlined) thay vì component riêng `[?]`
- [ ] **`hui-kbd`**, **`hui-highlight`** (đánh dấu từ khóa tìm kiếm) — tiện ích nhỏ cho tài liệu/tìm kiếm

---

## G3 — COMPONENT PHỨC TẠP (làm sau khi G0 vững)
- [ ] **`hui-virtual-list`** (tiện ích nền cho Table/Select/Tree): render phần đang nhìn thấy, chiều cao dòng cố định/động
- [ ] **`hui-table`**
  - `columns` (property: title, dataIndex, width, align, fixed, ellipsis, render hàm/slot), `data-source`, `row-key`
  - Sắp xếp (đơn/đa cột), lọc (menu checkbox/ô tìm), phân trang tích hợp, `loading`, `empty`
  - Chọn dòng (checkbox/radio, chọn tất cả trang), mở rộng dòng (expandable), dữ liệu dạng cây
  - Header cố định (`scroll-y`), cột cố định trái/phải (`scroll-x`), `sticky`, kéo đổi độ rộng cột
  - Dòng tổng (summary), `size`, `bordered`, virtual scroll cho 10k+ dòng
  - Sự kiện: `hui-change` (pagination/filters/sorter), `hui-row-click`, `hui-selection-change`
- [ ] **Bộ ngày giờ** (tự viết tiện ích ngày dựa trên `Intl.DateTimeFormat`, không thêm thư viện) `[?]`
  - [ ] `hui-calendar` — dạng thẻ/toàn màn hình, render ô ngày qua callback/slot, chế độ tháng/năm
  - [ ] `hui-date-picker` — `picker` (date/week/month/quarter/year), `format`, `disabled-date`, `show-time`, `presets`, locale vi
  - [ ] `hui-range-picker` — chọn khoảng, 2 bảng lịch, presets ("7 ngày qua"...)
  - [ ] `hui-time-picker` — giờ/phút/giây, `step`, 12/24h
- [ ] **`hui-tree`** — `checkable` (cha–con liên kết), `draggable`, tải con bất đồng bộ, `show-line`, tìm kiếm + highlight, virtual; APG tree
- [ ] **`hui-tree-select`** — Select dạng cây (đơn/đa chọn), dùng `hui-tree` + F7
- [ ] **`hui-cascader`** — chọn nhiều cấp (tỉnh/huyện/xã), `multiple`, tìm kiếm, tải động
- [ ] **`hui-transfer`** — 2 danh sách chuyển qua lại, tìm kiếm, chọn tất cả, render tùy chỉnh
- [ ] **`hui-color-picker`** — bảng màu, HEX/RGB/HSB, alpha, `presets`
- [ ] **`hui-mentions`** — gõ `@` gợi ý người dùng
- [ ] **`hui-tour`** — hướng dẫn từng bước, highlight phần tử đích, dùng F7/F8
- [ ] **`hui-watermark`** — chữ/ảnh chìm, chống xóa bằng MutationObserver
- [ ] **`hui-qrcode`** — sinh QR (tự viết encoder hoặc chấp nhận 1 thư viện nhỏ) `[?]`
- [ ] **`hui-splitter`** — chia panel kéo đổi kích thước, thu gọn panel

---

## G4 — TÍCH HỢP, TÀI LIỆU & PHÁT HÀNH
- [ ] **Vue plugin** `hui-lib/vue` — tự cấu hình `isCustomElement`, hỗ trợ `v-model` (`value` + `input`/`change`), types `GlobalComponents`
- [ ] **React** — types JSX cho React 19 (dùng trực tiếp được); tùy chọn wrapper cho React 18
- [ ] **Nuxt** — hướng dẫn client-only + CSS `hui-*:not(:defined)` chống nháy layout khi SSR
- [ ] **Trang tài liệu** — deploy Storybook; trang "Getting started", "Theming", "Override" (lấy từ hui-demo)
- [ ] **Template mẫu** — landing page, admin dashboard, trang đăng nhập (từ mốc G1, hoàn thiện thêm G2/G3)
- [ ] **Phát hành npm** — semver, CHANGELOG, kiểm tra kích thước bundle từng component (giới hạn ~10KB gzip/component thường)

---

## Quyết định đã chốt (review 2026-10-19)
1. **Tên sự kiện:** control nhập liệu dùng native `input`/`change`; còn lại tiền tố `hui-`.
   `hui-button` giữ `hui-click` (tương thích code cũ), đồng thời `click` native vẫn nổi bọt bình thường.
2. **Lưới responsive:** attribute `span-xs` … `span-xxl` trên `hui-col`.
3. **Ngày giờ / QR code:** tự viết 100%, giữ zero-dependency.
4. **Bộ icon:** bộ tự vẽ nhỏ + hướng dẫn nạp Lucide/Material Symbols qua `registerIcon`.
5. **`hui-chip`:** gộp vào `hui-tag` (thêm avatar/icon, `variant` filled/outlined).
6. **G1:** có `hui-navbar` và `hui-section`.

**Thứ tự thực thi G0:** F13 → F6 → F9 → F7 → F8 → F10 → F12 làm trước (độc lập).
F5 và F11 làm sau khi merge nhánh theming `claude/reverent-driscoll-02acb7` (nhánh đó sửa `tokens.css`, `dom.js`
và cả 13 component cũ — trùng phạm vi F5/F11).

---

## Build & Export
- [x] Tạo `src/index.js` tổng hợp
- [x] Config Vite build (per-component + bundle)
- [x] Build thành công (`vite build` OK sau khi thêm HuiElement/hui-icon)
- [ ] Verify dist/ + import lẻ trong trang HTML sạch (xem F13)

## Demo & Verification
- [x] `hui-demo` — tài liệu sống về override & selector (story `Guide/HuiDemo`)
- [ ] Trang mẫu `examples/` (mốc sau G1)
- [ ] Verify import riêng lẻ và tổng hợp
