# @itmrhoang/h-ui

## 0.4.0

### Minor Changes

- 6b84d3d: Thêm ~48 component (đợt 2):
  
  - Tương tác: `hui-hotkey`, `hui-editable`, `hui-sortable`, `hui-confirm-action`, `hui-command-palette`, `hui-kanban`
  - Landing: `hui-feature-card`, `hui-testimonial`, `hui-profile-card`, `hui-media-card`, `hui-hero`, `hui-feature-grid`, `hui-pricing-table`, `hui-logo-cloud`, `hui-cta-banner`, `hui-testimonial-slider`, `hui-footer-links`, `hui-team-grid`
  - Trang web: `hui-cookie-consent`, `hui-language-switch`, `hui-page-loader`, `hui-mega-menu`, `hui-bottom-nav`, `hui-search-overlay`, `hui-hover-card`, `hui-toolbar`, `hui-media-object`, `hui-map`, `hui-comparison-table`
  - Nhập liệu: `hui-segmented`, `hui-button-group`, `hui-toggle-button-group`, `hui-autocomplete`, `hui-search`, `hui-input-group`, `hui-filter-chips`, `hui-filter-bar`, `hui-upload`, `hui-chip-input`
  - Hiển thị: `hui-aspect-ratio`, `hui-dot`, `hui-color-swatch`, `hui-timeline`, `hui-timeline-feed`, `hui-review-list`, `hui-reaction`, `hui-description-card`, `hui-image-hotspot`
  - Sửa: `hui-cart-drawer` giữ focus ở nút Hoàn tác (không còn bị trả về nút đóng), bỏ thông báo trùng khi đã có dòng hoàn tác
- 784a6d5: Thêm nhóm component phức tạp (G3):
  
  - `hui-table`: sắp xếp/lọc, phân trang, chọn dòng, mở rộng + dữ liệu cây, cột cố định, kéo đổi độ rộng, dòng tổng, virtual 10k+ dòng, sửa ô, xuất CSV
  - Ngày giờ (không thư viện): `hui-calendar`, `hui-date-picker`, `hui-range-picker`, `hui-time-picker`
  - `hui-tree`, `hui-tree-select`, `hui-cascader`, `hui-transfer`
  - `hui-color-picker` (HEX/RGB/HSB/HSL, alpha, EyeDropper), `hui-mentions`
  - `hui-tour`, `hui-watermark`, `hui-qrcode` (bộ mã hóa QR tự viết)
  - Sửa: `createElement` bỏ qua thuộc tính `undefined`/`null` (option trong `hui-editable` không còn bị vô hiệu); DataController ghi `aria-busy="true"`; type sinh tự động nhận đúng lớp form kế thừa gián tiếp
- 1bf03c8: Hoàn thiện phần còn lại: `hui-highlight`, `hui-virtual-list`, chip trong `hui-tag`, vuốt thao tác `hui-list`, RTL `hui-scroller`; tích hợp Vue (`@itmrhoang/h-ui/vue`), React (`@itmrhoang/h-ui/react` + JSX types), `undefined.css` cho Nuxt; CDN tách nhóm (core/form/data/marketing/shop); tải động component con trong các organism lớn; sửa độ tương phản token, race hui-modal, toast bấm được khi mở modal, scroll-steps ngang theo trang; trang tài liệu + trang mẫu mới.

## 0.3.0

### Minor Changes

- 0293091: Thêm ~50 component website (đợt 1):
  
  - Cuộn & bố cục: `hui-marquee`, `hui-infinite-scroll`, `hui-sticky`, `hui-masonry`, `hui-scrolly`, `hui-splitter`
  - Hiệu ứng chữ / nền: `hui-typewriter`, `hui-text-rotate`, `hui-gradient-text`, `hui-split-text`, `hui-gradient-bg`, `hui-blob`, `hui-pattern`, `hui-parallax`, `hui-confetti`
  - Thương mại & form: `hui-price`, `hui-quantity`, `hui-variant-picker`, `hui-image-zoom`, `hui-add-to-cart`, `hui-wishlist-toggle`, `hui-cart-drawer`, `hui-free-ship-bar`, `hui-coupon-input`, `hui-otp-input`, `hui-phone-input`, `hui-password-strength`, `hui-newsletter`, `hui-contact-form`
  - Media: `hui-image`, `hui-lightbox`, `hui-gallery`, `hui-carousel`, `hui-video`, `hui-compare-slider`
  - Nội dung: `hui-number`, `hui-time`, `hui-countdown`, `hui-stats-counter`, `hui-copy`, `hui-kbd`, `hui-code-block`, `hui-prose`, `hui-share`, `hui-toc`
  - Sửa: `hui-input` nhận tên icon cho prefix/suffix, cỡ chữ nhãn `hui-checkbox` theo `size`, `hui-statistic` thêm `align`

## 0.2.0

### Minor Changes

- 545897f: Phát hành công khai đầu tiên trên npm với tên `@itmrhoang/h-ui`: 110+ Web Components (form native, dữ liệu,
  điều hướng, phản hồi, card, chart, cuộn từng bước, hiệu ứng), theme + dark mode, locale vi/en,
  bản CDN một file `dist/cdn/h-ui.min.js`, types cho Vue/React và custom-elements.json.
