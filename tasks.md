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
- [x] **F4. Theme toàn cục + dark mode** — bỏ chép token vào `:host` từng component, token gắn 1 lần ở document,
  `[data-theme="dark"]` + `prefers-color-scheme`. (Đã merge.)
- [x] **F5. Hệ màu & token mở rộng**
  - Bảng 10 sắc độ cho primary/success/warning/danger/info (`--hui-primary-1` … `-10`, giống Ant)
  - Token ngữ nghĩa: `--hui-bg-container`, `--hui-bg-elevated`, `--hui-bg-spotlight`, `--hui-text-tertiary`,
    `--hui-border-secondary`, `--hui-fill-*`, `--hui-control-height-*`, `--hui-motion-*`
  - `hui-config-provider`: đặt theme / size / locale cho cả vùng con (biến CSS + context)
- [x] **F6. Đa ngôn ngữ (locale)** — `HUI.setLocale('vi' | 'en')`, gói chuỗi mặc định (Empty, Pagination,
  Modal OK/Cancel, DatePicker, Upload, Table…); component đọc chuỗi qua `getLocale()`.
- [x] **F7. Engine định vị popup** — `src/utils/floating.js`
  - 12 placement (top/topStart/topEnd/…), `offset`, `flip` khi tràn màn hình, `shift`, mũi tên (arrow)
  - Tự cập nhật khi scroll/resize; dùng Popover API (top-layer) nếu có, fallback `position: fixed`
  - Tách logic từ `hui-tooltip` hiện tại → Tooltip/Popover/Dropdown/Select/DatePicker dùng chung
- [x] **F8. Overlay manager** — `src/utils/overlay.js`
  - Ngăn xếp overlay: phím Esc chỉ đóng lớp trên cùng · click ngoài để đóng
  - Focus trap + trả focus về phần tử cũ khi đóng · khóa scroll `body` (bù thanh cuộn)
  - Dùng cho Modal, Drawer, Dropdown, Popover, Popconfirm, Image preview, Tour
- [x] **F9. Motion** — `src/utils/motion.js`: fade, zoom, slide-up/down/left/right, collapse (height auto),
  dùng Web Animations API; tôn trọng `prefers-reduced-motion`.
- [x] **F10. `HuiFormElement`** (lớp con của HuiElement cho mọi control nhập liệu)
  - `value`, `name`, `required`, `disabled`, `readonly`, `status` (error/warning), `size` kế thừa từ `hui-form`
  - Validate: `required`, `minlength/maxlength`, `min/max`, `pattern`, `setCustomValidity()`
  - `formResetCallback`, `formStateRestoreCallback`, `<fieldset disabled>`
- [x] **F11. Chuyển component cũ sang `HuiElement`/`HuiFormElement`** (giữ nguyên API, chỉ đổi lõi)
  - [x] button · [x] input · [x] select · [x] checkbox · [x] switch · [x] modal · [x] card · [x] badge
  - [x] alert · [x] tooltip (dùng F7) · [x] spinner · [x] tag · [x] divider · [x] avatar/avatar-group
- [x] **F12. Hạ tầng test & typing**
  - Vitest browser test mẫu cho button → nhân rộng; a11y addon chuyển `test: 'error'`
  - Sinh `custom-elements.json` (CEM analyzer) → tự sinh `.d.ts` cho Vue (`GlobalComponents`) và React (JSX)
- [x] **F13. Sửa build/package**
  - `package.json` exports khai báo `require` (`*.js`) nhưng Vite chỉ build ES → bỏ `require` hoặc build thêm CJS
  - Tự sinh danh sách exports theo thư mục `src/components/*`
  - Verify `dist/` + import lẻ từng component trong một trang HTML sạch

---

## G1 — CỐT LÕI ĐỂ DỰNG WEBSITE (ưu tiên cao) — ✅ hoàn thành 2026-10-19

### G1.1 Typography
- [x] **`hui-title`** — `level` 1–5, `type` (secondary/success/warning/danger), `ellipsis`
- [x] **`hui-text`** — `type`, `strong`, `italic`, `underline`, `delete`, `code`, `mark`, `keyboard`,
  `ellipsis` (+ `rows` nhiều dòng, tooltip khi bị cắt), `copyable` (nút copy + sự kiện `hui-copy`)
- [x] **`hui-link`** — `href`, `target`, `external` (icon ↗), `underline` (none/hover/always), `disabled`
- [x] **`hui-paragraph`** — đoạn văn, `ellipsis` + nút "Xem thêm"

### G1.2 Layout
- [x] **`hui-flex`** — `vertical`, `gap` (sm/md/lg/số), `align`, `justify`, `wrap`
- [x] **`hui-space`** — `size`, `direction`, `wrap`, `split` (slot ngăn cách), `compact` (gộp viền nút/input liền nhau)
- [x] **`hui-row` + `hui-col`** — lưới 24 cột, `gutter` [ngang, dọc], `span`/`offset`/`order`,
  responsive bằng attribute `span-xs` … `span-xxl` (breakpoint 576/768/992/1200/1600)
- [x] **`hui-container`** — `max-width` theo breakpoint, `fluid`
- [x] **`hui-layout` + `hui-header` / `hui-sider` / `hui-content` / `hui-footer`**
  - `hui-sider`: `width`, `collapsed`, `collapsible`, `collapsed-width`, `breakpoint` tự thu gọn, sự kiện `hui-collapse`
- [x] **`hui-section`** (cho landing page) — vùng nội dung có `padding` chuẩn, nền tùy chọn, slot tiêu đề/mô tả

### G1.3 Nhập liệu
- [x] **`hui-input` nâng cấp** — `type="password"` có nút ẩn/hiện, `show-count`, `maxlength`,
  slot `prefix`/`suffix`/`addon-before`/`addon-after`, `allow-clear`, `status`, `variant` (outlined/filled/borderless)
- [x] **`hui-textarea`** — `rows`, `autosize` (min/max rows), `show-count`, `maxlength`, `resize`
- [x] **`hui-input-number`** — `min`/`max`/`step`/`precision`, nút tăng giảm, phím ↑/↓, `formatter`/`parser`
  (vd: phân tách hàng nghìn, đơn vị ₫), `prefix`/`suffix`
- [x] **`hui-radio` + `hui-radio-group`** — `value`, `options` (property), `direction`,
  `option-type="button"` (dạng nút liền), `button-style` (outline/solid); phím mũi tên chuyển lựa chọn (APG radio)
- [x] **`hui-checkbox-group`** — `value[]`, `options`, chọn tất cả (`indeterminate`)
- [x] **`hui-select` nâng cấp** — `mode` (multiple/tags), `show-search` + lọc, `allow-clear`, `max-tag-count`,
  `options` qua property, nhóm option, `loading`, `not-found` slot, virtual list khi > 100 option, dùng F7
- [x] **`hui-slider`** — `min`/`max`/`step`, `range` (2 tay nắm), `marks`, `vertical`, tooltip giá trị, phím mũi tên/PageUp/Home
- [x] **`hui-form` + `hui-form-item`**
  - `hui-form`: `layout` (vertical/horizontal/inline), `label-width`, `label-align`, `size`, `disabled` cho toàn form,
    `required-mark` (true/false/optional)
  - Rules: `required`, `type` (email/url/number), `min`/`max`, `pattern`, `validator` (hàm, hỗ trợ async), `message`
  - API: `validate()`, `validateFields(names)`, `reset()`, `getValues()`, `setValues()`, `scrollToError()`
  - `hui-form-item`: `label`, `name`, `help`, `extra`, `tooltip`, hiển thị lỗi + trạng thái màu
  - Sự kiện: `hui-submit` (đã validate ok), `hui-submit-failed`, `hui-values-change`

### G1.4 Phản hồi
- [x] **`hui-message`** (toast nhỏ giữa trên) — `HUI.message.success|error|warning|info|loading(text, opts)`,
  `duration`, `max` số lượng, trả về hàm đóng / promise; `aria-live`
- [x] **`hui-notification`** — `HUI.notification.open({ title, description, type, placement, duration, actions })`,
  6 vị trí, nút đóng, tạm dừng đếm giờ khi hover
- [x] **`hui-modal` nâng cấp** — `HUI.modal.confirm|info|success|error|warning()` trả Promise,
  `ok-loading` khi `onOk` async, slot `footer`, `width`, `centered`, `mask-closable`, `destroy-on-close`; dùng F8/F9
- [x] **`hui-drawer`** — `placement` (left/right/top/bottom), `size`, `mask`, `closable`, slot `header`/`footer`/`extra`,
  drawer lồng nhau; dùng F8/F9
- [x] **`hui-progress`** — `type` (line/circle/dashboard), `percent`, `status` (active/success/exception), `steps`,
  `stroke-color` (gradient), `size`, hiển thị chữ %
- [x] **`hui-skeleton`** — `avatar`, `title`, `paragraph` (số dòng), `active` (shimmer), `loading` (bọc nội dung thật);
  biến thể `hui-skeleton-button` / `-input` / `-image`
- [x] **`hui-popconfirm`** — `title`, `description`, `ok-text`/`cancel-text`, `ok-type`, async OK, icon; dùng F7
- [x] **`hui-result`** — `status` success/error/info/warning/404/403/500 (minh họa SVG), slot `extra`
- [x] **`hui-empty`** — ảnh mặc định + `description`, slot hành động; dùng cho Table/List/Select

### G1.5 Điều hướng
- [x] **`hui-tabs` + `hui-tab-panel`** — `type` (line/card/editable-card), `placement` (top/bottom/left/right),
  `active-key`, `centered`, tab có icon, đóng/thêm tab, cuộn khi tràn, lazy render panel; phím mũi tên/Home/End (APG tabs)
- [x] **`hui-menu` + `hui-menu-item` / `hui-sub-menu` / `hui-menu-group` / `hui-menu-divider`**
  - `mode` (horizontal/vertical/inline), `collapsed` (chỉ icon + tooltip), `selected-keys`, `open-keys`, `accordion`
  - Item: `icon`, `disabled`, `danger`, `href`; sự kiện `hui-select`, `hui-open-change`; điều hướng bàn phím (APG menu)
- [x] **`hui-dropdown`** — `trigger` (hover/click/contextmenu), `placement`, `arrow`, nội dung slot hoặc `menu` (property),
  `hui-dropdown-button` (nút chính + mũi tên); dùng F7/F8
- [x] **`hui-breadcrumb` + `hui-breadcrumb-item`** — `separator`, item có `href`/icon/dropdown, rút gọn khi quá dài
- [x] **`hui-pagination`** — `total`, `current`, `page-size`, `page-size-options`, `show-size-changer`, `show-quick-jumper`,
  `show-total`, `simple`, `size`, `hide-on-single-page`; sự kiện `change`
- [x] **`hui-navbar`** (cho website) — logo slot, menu ngang, nút hamburger → drawer trên mobile, `sticky`, nền trong suốt khi ở đầu trang

### G1.6 Hiển thị dữ liệu
- [x] **`hui-popover`** — `title`, nội dung slot, `trigger`, `placement`, `open` (controlled); dùng F7
- [x] **`hui-tooltip` nâng cấp** — dùng F7, `color`, `arrow`, delay mở/đóng
- [x] **`hui-collapse` + `hui-collapse-panel`** — `accordion`, `bordered`, `ghost`, `expand-icon-position`,
  panel `disabled`/`collapsible`; animation F9; APG accordion
- [x] **`hui-list` + `hui-list-item` / `hui-list-item-meta`** — header/footer, avatar + title + description, slot actions,
  `bordered`, `split`, `loading`, `grid` (dạng lưới thẻ), tích hợp `hui-pagination`
- [x] **`hui-descriptions` + item** — `bordered`, `column` (responsive), `layout` (horizontal/vertical), `size`
- [x] **`hui-statistic`** — `value`, `precision`, `prefix`/`suffix`, phân tách nghìn, `hui-statistic-countdown`
- [x] **`hui-card` nâng cấp** — `hoverable`, slot `cover`/`actions`/`extra`, `loading` (skeleton), `hui-card-meta`, `type="inner"`
- [x] **`hui-badge` nâng cấp** — `hui-badge-ribbon`, `status` dot (processing nhấp nháy)

**🔖 Mốc kiểm chứng sau G1 — ✅ đã dựng** `examples/landing.html`, `examples/auth.html`, `examples/admin.html`: dựng 3 trang mẫu chỉ bằng HUI trong `examples/`:
`landing.html` (navbar, hero, section, card, footer), `auth.html` (form đăng nhập/đăng ký + validate + message),
`admin.html` (layout + sider menu + breadcrumb + list/descriptions + pagination + drawer + notification).
Thiếu gì khi dựng → bổ sung vào backlog trước khi sang G2.

**Backlog chỉnh sửa phát hiện khi dựng trang mẫu:**
- [ ] `hui-input` `icon-left`/`icon-right`: nhận tên `hui-icon` (hiện đang in chữ ra, vd "user") — tạm dùng `<hui-icon slot="prefix">`
- [ ] `hui-checkbox` / `hui-radio`: cỡ chữ nhãn theo `effectiveSize` (đang to hơn input cùng size)
- [x] `hui-card` slot `actions`: `hui-button block` chưa giãn hết chiều ngang
- [ ] `hui-statistic`: thuộc tính `align` (start | center) để căn giữa trong dải số liệu
- [ ] Modal mặc định không còn căn giữa dọc (cách đỉnh `min(100px, 10vh)` như Ant) — cân nhắc giữ hay đổi mặc định `centered`
- [ ] Nút trên toast (message/notification) chưa bấm được khi đang mở modal (giới hạn của top-layer + inert)

---

## G2 — BỔ SUNG PHONG PHÚ (ưu tiên trung bình)
- [ ] **`hui-steps` + `hui-step`** — `current`, `direction`, `status` (wait/process/finish/error), `type` (default/navigation/dot), `clickable`
- [/] **`hui-timeline` + item** — `mode` (left/right/alternate), màu/icon từng mốc, `pending`, `reverse` *(→ chuyển sang A6.2)*
- [ ] **`hui-segmented`** — chọn 1 trong nhiều (dạng thanh trượt), `options`, `block`, icon
- [ ] **`hui-button-group`** + **`hui-toggle-button-group`** (MUI ToggleButton) — chọn đơn/nhiều
- [/] **`hui-rate`** — `count`, `allow-half`, `allow-clear`, ký tự tùy chỉnh (slot), `readonly`, tooltip từng sao *(→ chuyển sang A6.3)*
- [ ] **`hui-upload`** — kéo thả (`hui-upload-dragger`), `list-type` (text/picture/picture-card), progress, `accept`, `max-count`,
  `multiple`, `before-upload` (hàm), `custom-request`, xem trước ảnh, xóa file; sự kiện `change`
- [ ] **`hui-autocomplete`** — gợi ý theo `options`, lọc, async (`hui-search` + `loading`), dùng F7
- [/] **`hui-image`** — `preview` (phóng to, xoay, lật, zoom bằng cuộn), `hui-image-group` xem dạng album, `fallback`, `lazy`, `placeholder` *(→ gộp vào A1 `hui-image` + A6.2 `hui-lightbox`)*
- [/] **`hui-carousel`** — `autoplay`, `dots`, `arrows`, `effect` (scroll/fade), vuốt trên mobile, `slides-per-view` *(→ chuyển sang A6.2 (xây trên `hui-scroller`))*
- [/] **`hui-float-button`** + **`-group`** (MUI SpeedDial) + **`hui-back-top`** *(→ chuyển sang A6.1)*
- [/] **`hui-anchor`** — mục lục bám theo cuộn trang, `offset-top`, highlight mục hiện tại *(→ chuyển sang A6.1 (`hui-toc`))*
- [ ] **`hui-affix`** — ghim phần tử khi cuộn (`offset-top`/`offset-bottom`)
- [/] **`hui-bottom-navigation`** (MUI) — thanh điều hướng đáy cho mobile *(→ chuyển sang A6.1 (`hui-bottom-nav`))*
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
- [ ] **Vue plugin** `@itmrhoang/h-ui/vue` — tự cấu hình `isCustomElement`, hỗ trợ `v-model` (`value` + `input`/`change`), types `GlobalComponents`
- [ ] **React** — types JSX cho React 19 (dùng trực tiếp được); tùy chọn wrapper cho React 18
- [ ] **Nuxt** — hướng dẫn client-only + CSS `hui-*:not(:defined)` chống nháy layout khi SSR
- [ ] **Trang tài liệu** — deploy Storybook; trang "Getting started", "Theming", "Override" (lấy từ hui-demo)
- [ ] **Template mẫu** — landing page, admin dashboard, trang đăng nhập (từ mốc G1, hoàn thiện thêm G2/G3)
- [ ] **Phát hành npm** — semver, CHANGELOG, kiểm tra kích thước bundle từng component (giới hạn ~10KB gzip/component thường)

### G4.CI — CI/CD: kiểm tra tự động, Storybook lên GitHub Pages, phát hành npm + CDN
- [x] **CI kiểm tra** — `.github/workflows/ci.yml`, chạy khi push / pull request:
  `npm ci` → cài Playwright chromium-headless-shell (có cache) → `npm run build` (vite + custom-elements.json + .d.ts)
  → `tsc` kiểm tra `dist/types` → `vitest` (unit + toàn bộ story) → báo cáo kích thước gzip từng component (cảnh báo khi vượt ngưỡng)
  → lưu `dist/` làm artifact. Bật `test: 'error'` cho a11y khi đã sạch lỗi.
- [x] **Deploy Storybook lên GitHub Pages** — `.github/workflows/pages.yml`, chạy khi push `main` (và chạy tay):
  `npm run build-storybook` → gộp thêm `examples/` + `dist/` vào `storybook-static/examples` để xem trang mẫu online
  → `actions/upload-pages-artifact` + `actions/deploy-pages`. Địa chỉ dự kiến: `https://itmrhoang.github.io/HUI/`.
  Cần: Settings → Pages → Source = **GitHub Actions** (bạn bật 1 lần); Storybook cấu hình `base` đúng đường dẫn con `/HUI/`.
- [x] **Phát hành npm** — `.github/workflows/release.yml`, chạy khi đẩy tag `v*` (hoặc tạo GitHub Release):
  kiểm tra version trong `package.json` khớp tag → build + test → `npm publish --provenance --access public`.
  Xác thực bằng npm **Trusted Publishing (OIDC)** — không cần lưu token; hoặc secret `NPM_TOKEN` nếu chưa bật được.
  Bổ sung `package.json`: `repository`, `homepage` (link Storybook), `bugs`, `publishConfig`, `engines`; README song ngữ cập nhật.
- [x] **CDN (jsDelivr / unpkg)** — có sẵn ngay sau khi lên npm, không cần server riêng:
  `<script type="module" src="https://cdn.jsdelivr.net/npm/<tên-gói>@0/dist/hui-button.esm.js"></script>`
  Thêm bản build tối ưu cho CDN `dist/cdn/` (nén cả khoảng trắng — bản ES thường không nén để giữ tree-shaking),
  ghi URL mẫu từng component vào README + Storybook "Getting started"; trường `jsdelivr`/`unpkg` trong package.json.
- [x] **Quản lý phiên bản** — Changesets (hoặc release-please): mỗi PR ghi thay đổi → tự tạo PR "Version packages" + CHANGELOG
  → merge thì tự tag + publish. Dependabot cập nhật devDependencies hằng tuần.
- [ ] **Tối ưu kích thước organism** — import lẻ hiện tại (gzip): `hui-data-view` 91,6 KB, `hui-card-grid` 68 KB,
  `hui-faq` 58 KB, `hui-kpi-row` 50 KB (kéo theo nhiều component con). Hướng: tải động (import()) phần table/pagination/
  select khi chế độ đó được dùng; CI đang chặn ở ngưỡng 100 KB/entry (`SIZE_LIMIT_KB`), component đơn lẻ đều < 40 KB.
- [ ] **Bảo vệ nhánh main** — bắt buộc CI xanh trước khi merge (bạn bật trong Settings → Branches).

**Đã chốt / đã làm (2026-10-20):**
- Repo GitHub đổi tên `HUI` → **`ITmrHoang/h-ui`** (remote đã set-url; GitHub tự chuyển hướng link cũ).
- Tên npm `h-ui` và `hui-lib` đã thuộc người khác → dùng **`@itmrhoang/h-ui`** (đổi chỉ cần sửa `name` trong package.json).
- Phát hành bằng **Changesets** (merge PR "chore: version packages" → publish + tag + GitHub Release); bản đầu `0.2.0`.
- Thêm `scripts/check-static-build.mjs`: CI build trang mẫu và kiểm tra mọi thẻ được đăng ký (bắt lỗi `sideEffects`).
- **Việc bạn cần làm 1 lần:** (1) npmjs.com → tạo token *Automation* → GitHub repo Secrets `NPM_TOKEN` (cho lần đăng đầu),
  sau đó cấu hình Trusted Publisher (repo `ITmrHoang/h-ui`, workflow `release.yml`) rồi có thể xóa token;
  (2) Settings → Actions → General → bật *Allow GitHub Actions to create and approve pull requests* (để mở PR version);
  (3) Settings → Branches → bảo vệ `main`, bắt buộc CI xanh.

---

# KẾ HOẠCH ATOMIC DESIGN — ATOMS · MOLECULES · ORGANISMS · TEMPLATES (bản review — chưa thực thi)

**Mục tiêu:** tổ chức thư viện theo Atomic Design để ghép trang nhanh. Ưu tiên:
(1) khung cuộn ngang chứa card/thành phần bất kỳ, (2) khung cuộn từng bước full-height,
(3) component **nhận data → hiển thị & tương tác nhanh** (không phải tự viết vòng lặp DOM).

**Quy ước phân tầng** (chỉ phân loại tài liệu/Storybook, KHÔNG đổi đường dẫn import `@itmrhoang/h-ui/hui-xxx`):
| Tầng | Định nghĩa trong HUI | Storybook title |
|------|----------------------|-----------------|
| Tokens | Biến CSS `--hui-*` (màu, khoảng cách, cỡ chữ, motion) | `Foundations/…` |
| Atoms | Phần tử nhỏ nhất, 1 nhiệm vụ, không chứa component HUI khác (trừ `hui-icon`) | `Atoms/…` |
| Molecules | Ghép 2+ atoms thành một khối có ý nghĩa (card, form-item, search box) | `Molecules/…` |
| Organisms | Khối lớn của trang, thường nhận **data** (navbar, table, hero, pricing) | `Organisms/…` |
| Templates | Bố cục trang mẫu ghép từ organisms (landing, dashboard, auth) | `Templates/…` + `examples/` |

Ký hiệu: ✅ đã có · 🔄 đang làm (G1) · 🆕 mới trong kế hoạch này.

---

## A0 — HẠ TẦNG CHO COMPONENT NHẬN DATA (làm trước A3/A4)

- [x] **A0.1 `DataController`** — `src/core/data-controller.js` (mixin cho HuiElement)
  - Property chung: `data` (Array/Object), `src` (URL → fetch JSON), `fetchFn` (hàm async tự viết),
    `params` (query), `loading`, `error`, `empty-text`
  - Tự quản lý 4 trạng thái hiển thị: **loading** (skeleton) → **empty** (`hui-empty`) → **error** (`hui-result` + nút Thử lại) → **data**
  - Huỷ request cũ khi `params` đổi (AbortController), debounce khi tìm kiếm
  - Sự kiện: `hui-load` {data}, `hui-error` {error}
- [x] **A0.2 Template binding** — `src/core/template.js`
  - Người dùng viết `<template>` ngay trong thẻ, component nhân bản theo từng item:
    ```html
    <hui-card-grid .data=${products}>
      <template>
        <hui-card>
          <img data-bind-attr="src:image, alt:name">
          <h3 data-bind="name"></h3>
          <span data-bind="price" data-format="currency"></span>
          <hui-button data-action="buy">Mua</hui-button>
        </hui-card>
      </template>
    </hui-card-grid>
    ```
  - `data-bind="field"` → `textContent` (an toàn, không chèn HTML) · `data-bind-attr="attr:field"` · `data-show="field"`
  - `data-format`: currency / number / percent / date / relative-time (dùng `Intl`, theo locale)
  - `data-action="buy"` → component phát `hui-action` {action, item, index} (event delegation, 1 listener cho cả danh sách)
  - Hoặc dùng hàm: `el.renderItem = (item, i) => Node`
- [x] **A0.3 Keyed reconcile** — `src/core/repeat.js`: cập nhật danh sách theo `row-key`
  (thêm/xóa/đổi thứ tự chỉ đụng node thay đổi → 1000 item cập nhật vẫn mượt, giữ focus/trạng thái)
- [x] **A0.4 Virtual window** — `src/utils/virtual.js`: chỉ render phần đang nhìn thấy (dọc & ngang), dùng chung cho list/scroller/table/select
- [x] **A0.5 Scroll utils** — `src/utils/scroll.js`
  - `dragToScroll(el)` (kéo chuột như mobile, chặn click khi đang kéo), `wheelToHorizontal(el)`
  - `inView(el, cb, opts)` (IntersectionObserver), `scrollProgress(el)`, `snapTo(el, index)`
  - Đo cạnh tràn để hiện bóng mờ 2 mép / ẩn hiện nút mũi tên
- [x] **A0.6 Formatters** — `src/core/format.js`: `formatNumber`, `formatCurrency` (VND mặc định), `formatPercent`,
  `formatDate`, `relativeTime` ("3 phút trước") — dùng chung cho template, statistic, table

---

## A1 — ATOMS

| Atom | Trạng thái | Ghi chú |
|------|-----------|---------|
| `hui-button`, `hui-icon`, `hui-input`, `hui-checkbox`, `hui-switch`, `hui-tag`, `hui-badge`, `hui-avatar`, `hui-spinner`, `hui-divider`, `hui-tooltip` | ✅ | đã chuyển sang HuiElement |
| `hui-text`, `hui-title`, `hui-link`, `hui-paragraph`, `hui-radio`, `hui-textarea`, `hui-input-number`, `hui-slider`, `hui-progress`, `hui-skeleton`, `hui-empty` | 🔄 / ✅ | G1 |
- [ ] 🆕 **`hui-image`** — `src`, `ratio` (16/9, 1/1…), `fit` cover/contain, `lazy` (mặc định), `placeholder` (blur/skeleton), `fallback` khi lỗi, `rounded`
- [ ] 🆕 **`hui-aspect-ratio`** — khung giữ tỉ lệ cho video/ảnh/iframe
- [ ] 🆕 **`hui-kbd`** — phím tắt (`Ctrl` + `K`)
- [ ] 🆕 **`hui-dot`** — chấm trạng thái (online/offline/processing nhấp nháy)
- [ ] 🆕 **`hui-number`** — hiển thị số đã format (`value`, `format` currency/percent/compact "1,2 tr"), **đếm chạy** khi đổi giá trị
- [ ] 🆕 **`hui-time`** — `datetime` → "3 phút trước" tự cập nhật, tooltip ngày đầy đủ
- [ ] 🆕 **`hui-copy`** — nút copy bất kỳ chuỗi (`value`), đổi icon ✓ khi xong
- [ ] 🆕 **`hui-chip-input`** (atom phức hợp nhẹ) — nhập nhiều tag bằng Enter/phẩy
- [ ] 🆕 **`hui-color-swatch`**, **`hui-rating-display`** (chỉ hiển thị sao, nhẹ hơn `hui-rate`)

---

## A2 — MOLECULES

### A2.1 Card & khối nội dung
- [x] 🆕 **Biến thể `hui-card`** (nâng cấp, không tạo thẻ mới): `variant` elevated | outlined | filled | ghost,
  `orientation` vertical | horizontal (ảnh trái – nội dung phải), `clickable` (cả thẻ là link: `href`), `selectable` + `selected` (chọn nhiều thẻ),
  `media` slot tràn viền, `badge`/ribbon góc
- [ ] 🆕 **`hui-media-card`** — ảnh/video + tiêu đề + mô tả + meta (tác giả, thời gian) + actions; dùng cho bài viết, sản phẩm
- [x] 🆕 **`hui-product-card`** — ảnh, tên, giá (giá gốc gạch ngang + % giảm), rating, nút thêm giỏ, nhãn "Mới"/"Hết hàng"
- [ ] 🆕 **`hui-profile-card`** — avatar, tên, chức danh, chỉ số (followers…), nút liên hệ
- [x] 🆕 **`hui-stat-card`** (KPI tile) — tiêu đề, `hui-number`, chênh lệch ▲/▼ % (màu theo dấu), sparkline nhỏ, icon
- [ ] 🆕 **`hui-feature-card`** — icon lớn + tiêu đề + mô tả (landing page)
- [x] 🆕 **`hui-pricing-card`** — tên gói, giá/kỳ, danh sách tính năng (✓/✗), nút CTA, `highlighted` (gói đề xuất)
- [ ] 🆕 **`hui-testimonial`** — trích dẫn, avatar, tên, công ty, rating

### A2.2 Tiến trình & các bước
- [ ] 🔄 `hui-progress` (G1) — line / circle / dashboard / steps
- [x] 🆕 **`hui-progress-card`** — tiêu đề + progress + "12/20 việc" + hạn chót
- [x] 🆕 **`hui-scroll-progress`** — thanh tiến độ đọc trang ở mép trên (theo cuộn của window hoặc một vùng cuộn)
- [x] (G2) `hui-steps` → kéo lên **A2** vì dùng chung với `hui-scroll-steps`: `current`, `direction`, `status`, `type` default | dot | navigation, `clickable`, **`data`** (mảng bước)
- [x] 🆕 **`hui-step-progress`** — thanh bước dạng "Bước 2/5" + tên bước + nút Trước/Sau (wizard nhỏ)

### A2.3 Nhập liệu ghép
- [ ] 🔄 `hui-form-item` (G1)
- [ ] 🆕 **`hui-search`** — input + icon + nút/Enter, debounce, gợi ý (dùng `hui-autocomplete` khi có), phím tắt `/` để focus
- [ ] 🆕 **`hui-input-group`** — gộp viền nhiều control liền nhau (select + input + button)
- [ ] 🆕 **`hui-filter-chips`** — hàng chip lọc nhanh (chọn 1 / nhiều), "Xóa lọc", nhận `options` data
- [ ] 🆕 **`hui-quantity`** — − [số] + cho giỏ hàng (bọc input-number)

### A2.4 Khác
- [ ] 🆕 **`hui-media-object`** — avatar/ảnh trái + nội dung phải (giống list-item-meta, dùng độc lập)
- [ ] 🆕 **`hui-toolbar`** — hàng nút công cụ, tự gom phần tràn vào menu "…" khi hẹp
- [ ] 🆕 **`hui-empty-state`**? → dùng `hui-empty` + slot action (đã đủ, không tạo mới)

---

## A3 — KHUNG CUỘN & BỐ CỤC ĐỘNG (ưu tiên theo yêu cầu)

- [x] 🆕 **A3.1 `hui-scroller`** — khung **cuộn ngang** chứa bất kỳ thành phần nào (card, ảnh, tag…)
  - Slot mặc định: phần tử con là các item; hoặc **`data` + `<template>`** (A0.2) để render card từ mảng
  - `gap`, `items-per-view` (vd `1.2` trên mobile → lộ một phần thẻ kế tiếp), responsive `items-per-view-md="3"`…
  - `snap` start | center | none (CSS scroll-snap), `arrows` (hiện/ẩn theo vị trí, ẩn trên thiết bị cảm ứng), `edge-fade` (bóng mờ 2 mép)
  - Kéo bằng chuột (`draggable`), lăn chuột dọc → cuộn ngang (`wheel`), bàn phím ←/→ khi focus, `scroll-by` item | page
  - `indicator` dots | bar | none, sự kiện `hui-scroll` {index, progress}, API `scrollToIndex(i)`, `next()`, `prev()`
  - Virtual khi > 50 item (A0.4); `loop` không làm (để `hui-carousel`)
  - ARIA: `role="region"` + `aria-label`, item có `aria-setsize/posinset`
- [x] 🆕 **A3.2 `hui-scroll-steps`** — khung **cuộn từng bước, mỗi bước full chiều cao màn hình** (fullpage)
  - Con là `<hui-step-section>` (hoặc phần tử bất kỳ); mỗi section cao `100dvh` (đúng trên mobile có thanh địa chỉ)
  - Dùng **CSS scroll-snap** (`mandatory`) làm lõi → nhẹ, không chặn cuộn tự nhiên, hỗ trợ trợ năng
  - Tùy chọn `wheel-step` (mỗi lần lăn = 1 bước, khóa trong lúc chuyển — kiểu fullPage.js), `direction` vertical | horizontal
  - Điều hướng: dots/nhãn bên cạnh (`nav` left | right | none), số bước "2 / 5", nút Trước/Sau, phím ↑/↓/PageUp/PageDown/Home/End/Space
  - `hash` → mỗi bước có `#id` để chia sẻ link; nút Back của trình duyệt quay lại bước trước
  - Sự kiện `hui-step-change` {index, id, direction}; API `goTo(i)`, `next()`, `prev()`
  - Hiệu ứng vào cho nội dung từng section (fade/slide-up qua `hui-reveal`), tôn trọng `prefers-reduced-motion`
  - `container` window | self (cuộn trong một vùng thay vì cả trang); section cao hơn màn hình vẫn cuộn bên trong được
- [ ] 🆕 **A3.3 `hui-scrolly`** (scrollytelling) — cột trái **sticky full-height** (ảnh/biểu đồ), cột phải là các bước;
  bước nào vào giữa màn hình thì phát `hui-step-enter` → đổi nội dung cột sticky
- [x] 🆕 **A3.4 `hui-reveal`** — bọc phần tử để hiện dần khi cuộn tới (`effect` fade | slide-up | zoom, `delay`, `stagger` cho con, `once`)
- [ ] 🆕 **A3.5 `hui-marquee`** — dải chạy ngang vô hạn (logo đối tác, tin nhanh), `speed`, `direction`, dừng khi hover, `pause-on-hidden`
- [ ] 🆕 **A3.6 `hui-infinite-scroll`** — đặt cuối danh sách, chạm tới thì phát `hui-load-more` (hoặc tự gọi `fetchFn` trang kế), hiện spinner / "Hết dữ liệu"
- [ ] 🆕 **A3.7 `hui-sticky`** — dính khi cuộn (`top`, `bottom`), thêm `:state(stuck)` để đổi style lúc đang dính (bóng đổ header)
- [ ] 🆕 **A3.8 `hui-masonry`** — lưới so le (Pinterest) cho card cao thấp khác nhau, `columns` responsive, nhận `data` + template
- [ ] 🆕 **A3.9 `hui-split`** (= `hui-splitter` G3 kéo lên) — chia 2 vùng kéo đổi kích thước

---

## A4 — ORGANISMS NHẬN DATA (hiển thị & tương tác nhanh)

Mọi organism dưới đây dùng **DataController (A0.1)** → chung API `data` / `src` / `fetchFn` / `loading` / `error`
và tự có skeleton – empty – error – thử lại.

- [x] 🆕 **`hui-card-grid`** — lưới card responsive từ `data` + `<template>`; `columns` / `min-card-width` (auto-fill),
  chọn nhiều (`selectable` → `hui-selection-change`), sắp xếp/lọc phía client (`sort-by`, `filter` hàm), phân trang hoặc infinite scroll
- [x] 🆕 **`hui-kpi-row`** — dải `hui-stat-card` từ mảng `{title, value, delta, trend[]}`
- [x] 🆕 **Mini chart (SVG, zero-dependency)** — `hui-sparkline` (line/area), `hui-bar-mini`, `hui-donut` (phần trăm/nhiều lát),
  `hui-gauge`; nhận `data` mảng số / `{label, value}`, tooltip khi hover, màu từ palette token
- [ ] (G3) `hui-table` — bổ sung yêu cầu: `columns` có `type` (text/number/currency/date/tag/avatar/progress/actions)
  để **khai báo là hiển thị đẹp ngay**, sửa trực tiếp trong ô (`editable`), xuất CSV
- [ ] (G1) `hui-list` — bổ sung `data` + `<template>`
- [ ] 🆕 **`hui-timeline-feed`** — luồng hoạt động từ data (avatar, hành động, thời gian `hui-time`), nhóm theo ngày
- [ ] 🆕 **`hui-kanban`** — cột trạng thái + kéo thả card giữa cột (`hui-change` {item, from, to}), dữ liệu `columns` + `items`
- [ ] 🆕 **`hui-filter-bar`** — thanh lọc tổng hợp (search + filter-chips + select + date range) phát `params` cho DataController
- [ ] 🆕 **`hui-command-palette`** — Ctrl+K mở hộp tìm lệnh/trang, data `commands` (nhóm, icon, phím tắt), điều hướng bàn phím
- [ ] 🆕 **Tương tác nhanh dùng chung:**
  - [ ] `hui-editable` — bấm vào chữ → sửa tại chỗ (input/select), Enter lưu / Esc hủy, sự kiện `hui-save` (có thể async)
  - [ ] `hui-sortable` — kéo thả sắp xếp phần tử con (pointer + bàn phím), sự kiện `hui-sort` {oldIndex, newIndex}
  - [ ] `hui-hotkey` — đăng ký phím tắt khai báo (`keys="ctrl+s"` → `hui-hotkey`)
  - [ ] `hui-confirm-action` — nút nguy hiểm cần giữ 1 giây / gõ xác nhận
- [ ] Landing organisms: `hui-hero` (tiêu đề lớn, mô tả, CTA, media; layout centered | split), `hui-feature-grid` (data → feature-card),
  `hui-pricing-table` (data → pricing-card, bật/tắt tháng/năm), `hui-logo-cloud` (marquee/grid logo), `hui-cta-banner`, `hui-faq` (data → collapse),
  `hui-testimonial-slider` (scroller + testimonial), `hui-footer-links` (cột link từ data)

---

## A5 — TEMPLATES (trang mẫu ghép sẵn, trong `examples/` + Storybook `Templates/`)
- [x] `landing.html` — navbar → hero → logo marquee → feature-grid → **scroller** testimonial → pricing → faq → footer
- [x] `story.html` — **scroll-steps full-height** giới thiệu sản phẩm 5 bước + scrolly
- [x] `dashboard.html` — layout + sider menu + kpi-row + mini charts + card-grid + table + filter-bar
- [x] `catalog.html` — filter-bar + card-grid (product-card) + infinite-scroll
- [ ] `auth.html` — form đăng nhập/đăng ký (G1)
- [ ] `kanban.html` — kanban + editable + command palette
- [ ] `ecommerce.html` — product detail (gallery + image-zoom + variant-picker + price + add-to-cart + rating-summary + review-list) + cart-drawer
- [ ] `blog.html` — post-list (data-view) + bài viết (prose + toc + code-block + share + back-top + scroll-progress)

---

## A6 — COMPONENT PHỔ BIẾN CỦA WEBSITE (dựng web nhanh, có sẵn hiệu ứng)

Phân tích các khối gần như website nào cũng có (landing, bán hàng, blog, doanh nghiệp, dashboard).
Mục đã có trong G1/G2 được **kéo vào đây và bổ sung yêu cầu**, không làm trùng.

### A6.1 Khung trang & điều hướng nổi
- [x] **`hui-back-top`** (kéo từ G2) — nút cuộn lên đầu trang
  - Hiện khi cuộn quá `visibility-height` (mặc định 400px), ẩn/hiện có hiệu ứng zoom + fade
  - **Vòng tiến độ** quanh nút thể hiện % trang đã đọc (`progress` attribute), cuộn mượt về đầu (`duration`, easing)
  - `target` window | selector (cuộn trong một vùng), `position` bottom-right | bottom-left, `offset`, `shape` circle | square, slot icon
  - Bàn phím + `aria-label` theo locale, tôn trọng `prefers-reduced-motion` (nhảy thẳng, không cuộn mượt)
- [x] **`hui-float-button` + `hui-float-group`** (kéo từ G2) — cụm nút nổi góc màn hình
  - Kiểu mở `trigger` click | hover, xòe lên (SpeedDial) có stagger animation, badge số trên nút
  - **Preset liên hệ cho web Việt Nam:** `hui-contact-float` — Gọi hotline, Zalo, Messenger, email; hiệu ứng rung/nhấp nháy thu hút
    (tắt được), tự ẩn trên trang in; gộp chung cụm với back-top
- [x] 🆕 **`hui-announcement-bar`** — dải thông báo đầu trang (khuyến mãi, sự kiện), đóng được + nhớ trạng thái
  (localStorage theo `id`), chữ chạy (`marquee`) hoặc xoay nhiều thông báo, countdown kèm theo
- [ ] 🆕 **`hui-cookie-consent`** — banner đồng ý cookie (Chấp nhận / Từ chối / Tùy chỉnh theo nhóm), phát `hui-consent` {categories}, lưu lựa chọn
- [x] 🆕 **`hui-theme-toggle`** — nút sáng / tối / theo hệ thống, nhớ lựa chọn, hiệu ứng **lan vòng tròn** khi đổi theme (View Transitions API, fallback fade)
- [ ] 🆕 **`hui-language-switch`** — chọn ngôn ngữ (cờ + tên), gọi `setLocale`, phát `hui-language-change`
- [x] 🆕 **`hui-loading-bar`** — thanh tải mảnh ở mép trên khi chuyển trang / gọi API (kiểu NProgress): `start()`, `done()`, `error()`
- [ ] 🆕 **`hui-page-loader`** — màn chờ lần đầu tải trang (logo + spinner), tự ẩn khi `load`
- [ ] 🆕 **`hui-mega-menu`** — menu xổ lớn nhiều cột (ảnh + nhóm link) cho navbar, mở theo hover có trễ, mobile chuyển thành accordion
- [ ] 🆕 **`hui-bottom-nav`** (kéo từ G2) — thanh điều hướng đáy cho mobile, icon nhún khi chọn, badge
- [ ] 🆕 **`hui-search-overlay`** — bấm icon kính lúp → lớp phủ toàn màn hình với ô tìm + gợi ý + lịch sử tìm (phím `/` hoặc Ctrl+K)
- [ ] **`hui-anchor` / table of contents** (kéo từ G2) — `hui-toc`: tự sinh mục lục từ các heading (`h2,h3`) trong `target`,
  highlight mục đang đọc (scroll-spy), thanh chỉ báo trượt theo, sticky

### A6.2 Nội dung & marketing
- [x] **`hui-collapse`** (🔄 G1) — bổ sung cho web:
  - Mũi tên xoay + mở/đóng mượt (đã có qua `collapse()`), `variant` default | ghost | card | separated (mỗi mục là một thẻ rời có khoảng cách)
  - **`hui-faq`** (organism): nhận `data=[{question, answer}]`, ô tìm trong FAQ, nút "Mở tất cả", nhóm theo chủ đề (tabs),
    tùy chọn `seo` → chèn dữ liệu có cấu trúc **FAQPage (JSON-LD)** để Google hiện FAQ trong kết quả tìm kiếm
- [ ] **`hui-carousel`** (kéo từ G2, xây trên `hui-scroller`) — banner/hero slider: `autoplay` (dừng khi hover/tab ẩn), `loop`,
  `effect` slide | fade | zoom (Ken Burns), dots/arrows/thumbnails, vuốt trên mobile, thanh tiến độ autoplay, lazy ảnh slide kế
- [ ] **`hui-image`** (A1) + **`hui-lightbox`** — bấm ảnh mở xem lớn: zoom, kéo, vuốt chuyển ảnh, phím ←/→/Esc, chú thích, tải ảnh;
  **`hui-gallery`**: lưới ảnh (grid | masonry) mở lightbox theo nhóm
- [ ] 🆕 **`hui-video`** — nhúng YouTube/Vimeo/MP4 dạng **facade** (chỉ hiện ảnh bìa + nút play, bấm mới tải iframe → web nhanh hơn),
  `ratio`, `autoplay-on-view`, popup video trong modal (`mode="popup"`)
- [ ] 🆕 **`hui-compare-slider`** — so sánh ảnh trước/sau bằng thanh kéo (bàn phím được)
- [ ] 🆕 **`hui-image-hotspot`** — ảnh có các điểm chấm nhấp nháy, bấm/hover hiện popover thông tin (giới thiệu sản phẩm, sơ đồ)
- [ ] **`hui-timeline`** (kéo từ G2) — thêm `data`, mốc hiện dần khi cuộn tới (stagger), kiểu "lịch sử công ty" 2 bên xen kẽ
- [ ] 🆕 **`hui-countdown`** — đếm ngược sự kiện/flash sale dạng ô số lật (flip) hoặc chữ thường, `target`, `hui-finish`
  (dùng lõi `hui-statistic-countdown` G1)
- [ ] 🆕 **`hui-stats-counter`** — dải số liệu ("10.000+ khách hàng") **đếm chạy khi cuộn tới**, nhận `data`
- [ ] 🆕 **`hui-team-grid`** — lưới thành viên (ảnh, tên, chức vụ, mạng xã hội hiện khi hover), nhận `data`
- [x] 🆕 **`hui-blog-card`** + **`hui-post-list`** — ảnh bìa, chuyên mục, tiêu đề, trích đoạn, tác giả, `hui-time`, thời gian đọc ước tính
- [ ] 🆕 **`hui-prose`** — bọc nội dung HTML từ CMS/Markdown để có typography đẹp sẵn (heading, list, bảng, trích dẫn, ảnh, code)
- [ ] 🆕 **`hui-code-block`** — khối code có nút copy, tên file, đánh số dòng, highlight dòng (tô màu cú pháp đơn giản, không thư viện)
- [ ] 🆕 **`hui-share`** — nút chia sẻ Facebook / Zalo / X / LinkedIn / copy link; dùng Web Share API trên mobile
- [ ] 🆕 **`hui-map`** — nhúng Google Maps dạng facade (ảnh tĩnh + nút mở) để không làm chậm trang
- [ ] 🆕 **`hui-comparison-table`** — bảng so sánh gói/sản phẩm (✓/✗, cột nổi bật, header dính)

### A6.3 Đánh giá (star rating)
- [x] **`hui-rate`** (kéo từ G2, nâng thành ưu tiên) — chấm sao nhập liệu
  - `count`, `value`, `allow-half` (nửa sao), `allow-clear` (bấm lại để xóa), `readonly`, `disabled`, `size`, `color`
  - Ký tự tùy chỉnh (slot `character` hoặc `icon="heart"`), `tooltips` (["Tệ","Tạm","Ổn","Tốt","Tuyệt vời"]) hiện khi hover
  - **Hiệu ứng:** sao phóng to khi hover, "nảy" khi chọn, các sao sáng lần lượt (stagger) khi giá trị đổi
  - Kế thừa `HuiFormElement` (gửi form, `required`), bàn phím ←/→ (APG slider), `aria-valuetext` "4 trên 5 sao"
- [x] **`hui-rating-display`** (A1) — hiển thị chỉ đọc, hỗ trợ số lẻ chính xác (4,3 sao = tô 30% sao thứ 5), kèm "(128 đánh giá)"
- [x] 🆕 **`hui-rating-summary`** — khối tổng hợp đánh giá trang sản phẩm: điểm trung bình lớn + số sao + **thanh phân bố 5★…1★**
  (bấm vào thanh để lọc), nhận `data` {average, total, distribution}
- [ ] 🆕 **`hui-review-list`** — danh sách đánh giá (avatar, sao, ngày, nội dung, ảnh đính kèm, "Hữu ích (12)"), lọc theo số sao, phân trang
- [ ] 🆕 **`hui-reaction`** — nút cảm xúc (👍❤️😂…) kiểu mạng xã hội, giữ để chọn, đếm số

### A6.4 Data view (hiển thị danh sách dữ liệu)
- [x] 🆕 **`hui-data-view`** (organism trung tâm cho trang danh sách) — một nguồn `data` (DataController A0.1), **nhiều cách xem**:
  - Thanh công cụ: ô tìm, chip lọc, sắp xếp, **chuyển chế độ xem list | grid | table** (nhớ lựa chọn), đếm kết quả
  - Mỗi chế độ dùng `<template view="list">`, `<template view="grid">`; chế độ table dùng `columns`
  - Phân trang | "Xem thêm" | cuộn vô hạn; chọn nhiều + thanh **thao tác hàng loạt** (xóa, xuất…)
  - Đồng bộ trạng thái (trang, lọc, sắp xếp, chế độ xem) lên **URL query** → F5 / chia sẻ link giữ nguyên
  - Hiệu ứng: item xuất hiện so le (stagger) khi tải, **chuyển list ↔ grid mượt** (FLIP animation), skeleton đúng hình dạng từng chế độ
- [ ] **`hui-list`** (🔄 G1) — bổ sung `data` + template, item hover nổi nhẹ, swipe-actions trên mobile (vuốt để hiện nút xóa/sửa)
- [ ] 🆕 **`hui-description-card`** — thẻ chi tiết 1 bản ghi từ `data` + `fields` (label, type format) — trang xem chi tiết nhanh

### A6.5 Card (bổ sung hiệu ứng cho A2.1)
- [x] Thuộc tính `effect` dùng chung cho mọi card: `lift` (nổi lên + bóng), `tilt` (nghiêng 3D theo chuột), `glow` (viền sáng theo con trỏ),
  `zoom-media` (ảnh phóng nhẹ khi hover), `reveal` (lớp phủ + nút hiện khi hover), `border-gradient` (viền chuyển màu chạy)
- [x] 🆕 **`hui-flip-card`** — lật mặt trước/sau (hover hoặc click), slot `front` / `back`
- [ ] 🆕 **`hui-hover-card`** — rê vào tên/avatar hiện thẻ thông tin chi tiết (kiểu GitHub/Twitter), có trễ mở/đóng

### A6.6 Thương mại điện tử
- [x] 🆕 **`hui-price`** — giá bán, giá gốc gạch ngang, % giảm, đơn vị (₫ mặc định), cỡ `sm | md | lg`
- [ ] 🆕 **`hui-variant-picker`** — chọn màu (swatch) / kích cỡ (nút), mục hết hàng gạch chéo, gửi form
- [ ] 🆕 **`hui-image-zoom`** — rê chuột phóng to ảnh sản phẩm (kính lúp hoặc khung bên cạnh)
- [ ] 🆕 **`hui-add-to-cart`** — nút có trạng thái loading → ✓ đã thêm, hiệu ứng **ảnh bay vào giỏ** (fly-to-cart), badge giỏ "nảy"
- [ ] 🆕 **`hui-wishlist-toggle`** — trái tim bật/tắt với hiệu ứng nổ hạt nhỏ (burst)
- [ ] 🆕 **`hui-cart-drawer`** — giỏ hàng trượt bên phải (dùng `hui-drawer`): danh sách, `hui-quantity`, tổng tiền, nút thanh toán
- [ ] 🆕 **`hui-free-ship-bar`** — "Mua thêm 120.000₫ để được freeship" + thanh tiến độ
- [ ] 🆕 **`hui-coupon-input`** — nhập mã giảm giá, trạng thái áp dụng/lỗi

### A6.7 Form & liên hệ
- [ ] 🆕 **`hui-otp-input`** — ô nhập mã OTP N số, tự nhảy ô, dán cả mã, `autocomplete="one-time-code"`
- [ ] 🆕 **`hui-phone-input`** — chọn mã quốc gia (+84 mặc định) + định dạng số
- [ ] 🆕 **`hui-password-strength`** — thanh độ mạnh mật khẩu + danh sách tiêu chí ✓/✗
- [ ] 🆕 **`hui-newsletter`** — ô email + nút đăng ký, trạng thái gửi/thành công có animation
- [ ] 🆕 **`hui-contact-form`** (organism) — họ tên, email, SĐT, nội dung + validate, `action` URL hoặc sự kiện `hui-submit`

---

## A7 — HỆ THỐNG HIỆU ỨNG (animation có sẵn, gắn vào bất kỳ đâu)

Nguyên tắc: hiệu ứng dùng **Web Animations API + CSS**, không thư viện ngoài; mọi hiệu ứng tự tắt/giảm khi người dùng
bật `prefers-reduced-motion`; thời lượng/easing lấy từ token `--hui-motion-*` để đổi toàn hệ thống một chỗ.

- [x] **A7.1 Directive `data-hui-animate`** — gắn lên **bất kỳ thẻ HTML nào**, không cần bọc component:
  ```html
  <section data-hui-animate="fade-up" data-hui-delay="100" data-hui-stagger="80">…</section>
  ```
  `fade | fade-up | fade-down | fade-left | fade-right | zoom-in | zoom-out | flip-up | blur-in | slide-up`,
  chạy khi cuộn tới (IntersectionObserver dùng chung 1 instance), `data-hui-once`, `data-hui-stagger` cho các con
  — `hui-reveal` (A3.4) dùng lại lõi này
- [ ] **A7.2 Hiệu ứng hover/press dùng chung** — class/attribute CSS: `hui-hover-lift`, `hui-hover-glow`, `hui-hover-tilt` (JS nhẹ),
  `hui-press` (nhún khi nhấn), **ripple** gắn được cho mọi phần tử (`data-hui-ripple`), `hui-magnetic` (nút hút nhẹ theo con trỏ)
- [ ] **A7.3 Hiệu ứng chữ** — `hui-typewriter` (gõ chữ, xoay nhiều câu, con trỏ nhấp nháy), `hui-text-rotate` (đổi từ khóa trong câu),
  `hui-gradient-text` (chữ chuyển màu chạy), `hui-number` đếm chạy (A1), `hui-split-text` (từng chữ/từ hiện lần lượt)
- [ ] **A7.4 Nền & trang trí** — `hui-gradient-bg` (nền gradient chuyển động chậm), `hui-blob` (khối mờ trôi), `hui-grid-pattern` / `hui-dot-pattern`
  (nền lưới chấm cho hero), `hui-parallax` (lớp di chuyển chậm hơn khi cuộn)
- [ ] **A7.5 Phản hồi vui** — `hui-confetti` (pháo giấy khi đặt hàng/hoàn thành, canvas tự viết, `HUI.confetti()`),
  hạt nổ (burst) cho like/wishlist, rung nhẹ (`shake`) khi nhập sai
- [ ] **A7.6 Chuyển cảnh** — helper `viewTransition(updateFn)` (View Transitions API, fallback không hiệu ứng) cho đổi theme,
  chuyển list↔grid, mở ảnh từ thumbnail ra lightbox (shared element)
- [ ] **A7.7 Storybook `Foundations/Motion`** — trang trình diễn mọi preset + bảng token motion, kèm nút bật/tắt reduced-motion để thử
- [ ] **A7.8 Hiệu ứng mặc định trong component sẵn có** (rà soát lại): modal zoom từ vị trí bấm, drawer trượt, dropdown/popover
  zoom từ phía trigger, tabs thanh gạch trượt, switch nhún, checkbox vẽ dấu ✓, badge nảy, toast trượt vào + thanh thời gian còn lại,
  skeleton shimmer, button loading → success


---

### Hạn chế đã biết của A3 (backlog)
- [ ] `hui-scroller`: chưa virtual hóa (ổn tới ~200 item; nhiều hơn → dùng `VirtualWindow` ngang), chưa hỗ trợ RTL,
  breakpoint `items-per-view-*` theo cửa sổ (chưa theo container), cần thẻ cha có chiều rộng (do `container-type`)
- [ ] `hui-scroller`: thuộc tính kéo chuột đổi tên `drag-scroll` (tránh trùng `draggable` native)
- [ ] `hui-scroll-steps`: `direction="horizontal"` luôn cuộn bên trong component; `container="window"` + `mandatory` khó với tới
  header/footer ngoài component (khuyên dùng `snap="proximity"`); chỉ hỗ trợ 1 instance window mode mỗi trang
- [ ] `hui-scroll-steps`: theo dõi lại 1 lần thấy điều hướng hash bị nhảy về bước cũ khi pane trình duyệt ẩn (không tái hiện được khi test lại)

## Thứ tự thực thi đề xuất
1. ✅ **A0** hạ tầng data/template/scroll + **A7.1 directive `data-hui-animate`** (nền cho mọi thứ phía sau)
2. ✅ **Khối "web nào cũng có" (đợt nhanh — xong 2026-10-19):** `hui-back-top` + `hui-float-group`/`hui-contact-float`,
   `hui-rate` + `hui-rating-display` + `hui-rating-summary`, `hui-faq` (trên collapse G1), `hui-announcement-bar`,
   `hui-theme-toggle`, `hui-loading-bar`
3. ✅ **A3.1 `hui-scroller` + A3.2 `hui-scroll-steps` + A3.4 `hui-reveal`** (xong 2026-10-19) → tiếp theo `hui-carousel` (trên scroller)
4. ✅ **A2.1 + A6.5 card** (variants + `effect` lift/tilt/glow/zoom-media/reveal) + product/pricing/stat/blog card, **A2.2 progress/steps** (xong 2026-10-19; còn profile/feature/testimonial/media card, hover-card, post-list)
5. ✅ **A6.4 `hui-data-view`** (list ↔ grid ↔ table, URL sync) + **A4** card-grid, kpi-row, mini chart (xong 2026-10-19) — còn tương tác nhanh (editable, sortable, hotkey)
6. **A7.2–A7.8 hiệu ứng** (hover, chữ, nền, confetti, view transition) + trang `Foundations/Motion`
7. **A6.2 nội dung** (lightbox/gallery, video facade, countdown, stats-counter, prose, code-block, share, toc)
8. **A6.6 thương mại điện tử** + **A6.7 form liên hệ** + **A1 atoms còn thiếu** (làm xen kẽ khi cần)
9. **A4 landing organisms + A5 templates** (thêm `ecommerce.html`, `blog.html`)
10. Đổi Storybook title theo tầng (`Atoms/`, `Molecules/`, …) cho toàn bộ component

## Câu hỏi cần chốt khi review (Atomic Design)
1. **Storybook:** đổi title toàn bộ sang `Atoms/ Molecules/ Organisms/ Templates/` ngay, hay chỉ áp dụng cho component mới?
2. **Template data:** dùng `<template>` + `data-bind` (đề xuất — viết HTML thuần, không cần build) có đủ không, hay cần thêm cú pháp `{{field}}` trong chuỗi?
3. **`hui-scroll-steps`:** mặc định dùng CSS scroll-snap (nhẹ, cuộn tự nhiên) và bật `wheel-step` (khóa mỗi lần lăn 1 bước) khi cần — đồng ý?
4. **Mini chart:** chỉ làm sparkline/bar/donut/gauge nhẹ (đề xuất), hay cần bộ chart đầy đủ (line/bar/pie có trục, legend) → khối lượng lớn hơn nhiều.
5. **Card chuyên biệt** (product/pricing/profile/testimonial): làm thành component riêng (đề xuất, dùng nhanh) hay chỉ làm story mẫu ghép từ `hui-card`?
6. **Vị trí trong lộ trình:** làm A0–A3 ngay sau khi G1 xong (trước G2), các mục G2/G3 trùng (steps, splitter, carousel, image) gộp vào kế hoạch này?
7. **Nút liên hệ nổi (Zalo/Messenger/hotline):** làm preset `hui-contact-float` sẵn icon thương hiệu? (icon thương hiệu cần SVG riêng, người dùng tự đăng ký qua `registerIcon` nếu muốn tránh vấn đề bản quyền logo)
8. **Hiệu ứng "nặng"** (tilt 3D, confetti, parallax, gradient chuyển động): tách thành gói riêng `@itmrhoang/h-ui/effects` để ai không dùng thì bundle không phình — đồng ý?
9. **Mặc định có animation hay không:** component bật hiệu ứng sẵn (đề xuất, tắt bằng `no-animation` hoặc token `--hui-motion-duration: 0ms`) hay mặc định tắt?
10. **`hui-faq` SEO (JSON-LD)** và **`hui-cookie-consent`** có cần ngay không, hay để sau?

### ✅ Đã chốt (2026-10-19, theo đề xuất)
1. Component **mới** đặt title Storybook theo tầng (`Atoms/`, `Molecules/`, `Organisms/`, `Foundations/`) ngay; component cũ đổi ở bước cuối (mục 10 của thứ tự thực thi).
2. Template data: `<template>` + `data-bind` / `data-bind-attr` / `data-show` / `data-format` / `data-action` (không dùng `{{field}}`); hoặc hàm `renderItem`.
3. `hui-scroll-steps`: lõi CSS scroll-snap; `wheel-step` là tùy chọn bật thêm.
4. Mini chart: chỉ sparkline / bar / donut / gauge nhẹ.
5. Card chuyên biệt (product / pricing / profile / testimonial / stat / feature / blog): component riêng.
6. Làm A0–A3 (+ đợt nhanh) ngay sau G1, trước G2; mục trùng của G2/G3 gộp vào kế hoạch Atomic.
7. `hui-contact-float`: preset dùng icon chung (phone / chat / mail); logo thương hiệu (Zalo, Messenger) do dự án tự `registerIcon` — thư viện không kèm logo.
8. Hiệu ứng nặng (tilt, confetti, parallax, gradient động) tách entry riêng `@itmrhoang/h-ui/effects`.
9. Animation **bật mặc định**; tắt bằng attribute `no-animation` hoặc token `--hui-motion-duration: 0ms`; luôn tôn trọng `prefers-reduced-motion`.
10. `hui-faq` có `seo` (JSON-LD, bật khi cần) làm ngay trong đợt nhanh; `hui-cookie-consent` để sau.

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
- [x] Build đầy đủ: `npm run build` = vite build + custom-elements.json + types (.d.ts)
- [x] Verify dist/ + import lẻ trong trang HTML sạch (`examples/dist-check.html`)

## Demo & Verification
- [x] `hui-demo` — tài liệu sống về override & selector (story `Guide/HuiDemo`)
- [x] Trang mẫu `examples/` (landing, auth, admin)
- [x] Verify import riêng lẻ và tổng hợp
