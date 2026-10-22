/**
 * Nhóm component của bản CDN chia nhóm (scripts/build-cdn.mjs → dist/cdn/h-ui-<nhóm>.min.js).
 * Mỗi thư mục src/components/hui-* (trừ EXCLUDED) phải nằm trong ĐÚNG MỘT nhóm — thêm component mới thì thêm tên
 * thư mục vào đây, nếu không `npm run build:cdn` báo lỗi.
 * core luôn phải tải trước; module mà ≥ 2 nhóm khác cùng dùng sẽ tự được đẩy vào core khi build
 * (xếp component vào đúng nhóm của nơi dùng nó để core không phình).
 */

/** Không phát hành trong bản CDN nhóm (component tài liệu) */
export const EXCLUDED = ['hui-demo'];

export const CDN_GROUPS = {
  // Lớp nền (HuiElement, locale, format…) + atom / molecule cơ bản + bố cục + phản hồi
  core: [
    'hui-alert', 'hui-aspect-ratio', 'hui-avatar', 'hui-badge', 'hui-breadcrumb', 'hui-button', 'hui-button-group',
    'hui-card', 'hui-checkbox', 'hui-checkbox-group', 'hui-collapse', 'hui-config-provider', 'hui-confirm-action',
    'hui-container', 'hui-copy', 'hui-divider', 'hui-dot', 'hui-drawer', 'hui-dropdown', 'hui-empty', 'hui-flex',
    'hui-grid', 'hui-highlight', 'hui-hotkey', 'hui-icon', 'hui-input', 'hui-input-group', 'hui-kbd', 'hui-layout',
    'hui-loading-bar', 'hui-menu', 'hui-message', 'hui-modal', 'hui-notification', 'hui-number', 'hui-pagination',
    'hui-popconfirm', 'hui-popover', 'hui-progress', 'hui-radio', 'hui-result', 'hui-section', 'hui-segmented',
    'hui-select', 'hui-skeleton', 'hui-space', 'hui-spinner', 'hui-switch', 'hui-tabs', 'hui-tag', 'hui-textarea',
    'hui-theme-toggle', 'hui-time', 'hui-toolbar', 'hui-tooltip', 'hui-typography',
  ],
  // Nhập liệu: form, ô nhập chuyên dụng, bộ chọn ngày giờ / màu, upload, form dựng sẵn
  form: [
    'hui-autocomplete', 'hui-calendar', 'hui-cascader', 'hui-chip-input', 'hui-color-picker', 'hui-color-swatch',
    'hui-contact-form', 'hui-date-picker', 'hui-filter-bar', 'hui-filter-chips', 'hui-form',
    'hui-input-number', 'hui-mentions', 'hui-otp-input', 'hui-password-strength', 'hui-phone-input',
    'hui-range-picker', 'hui-rate', 'hui-search', 'hui-slider', 'hui-steps', 'hui-time-picker', 'hui-tree-select',
    'hui-upload',
  ],
  // Hiển thị dữ liệu: bảng, data-view, cây, biểu đồ, dòng thời gian, kanban, thống kê
  data: [
    'hui-card-grid', 'hui-chart', 'hui-code-block', 'hui-data-view', 'hui-description-card', 'hui-descriptions', 'hui-editable',
    'hui-infinite-scroll', 'hui-kanban', 'hui-kpi-row', 'hui-list', 'hui-masonry', 'hui-progress-card', 'hui-qrcode',
    'hui-sortable', 'hui-splitter', 'hui-stat-card', 'hui-statistic', 'hui-step-progress', 'hui-table',
    'hui-timeline', 'hui-timeline-feed', 'hui-tour', 'hui-transfer', 'hui-tree', 'hui-virtual-list',
    'hui-watermark',
  ],
  // Landing page / website: khối trang, điều hướng, media, hiệu ứng cuộn & chữ
  marketing: [
    'hui-announcement-bar', 'hui-back-top', 'hui-blob', 'hui-blog-card', 'hui-bottom-nav', 'hui-carousel',
    'hui-command-palette', 'hui-compare-slider', 'hui-comparison-table', 'hui-confetti', 'hui-contact-float',
    'hui-cookie-consent', 'hui-countdown', 'hui-cta-banner', 'hui-faq', 'hui-feature-card', 'hui-feature-grid',
    'hui-flip-card', 'hui-float-button', 'hui-footer-links', 'hui-gallery', 'hui-gradient-bg', 'hui-gradient-text',
    'hui-hero', 'hui-hover-card', 'hui-image', 'hui-image-hotspot', 'hui-language-switch', 'hui-lightbox',
    'hui-logo-cloud', 'hui-map', 'hui-marquee', 'hui-media-card', 'hui-media-object', 'hui-mega-menu', 'hui-navbar',
    'hui-newsletter', 'hui-page-loader', 'hui-parallax', 'hui-pattern', 'hui-pricing-card', 'hui-pricing-table',
    'hui-profile-card', 'hui-prose', 'hui-reaction', 'hui-reveal', 'hui-scroll-progress', 'hui-scroll-steps',
    'hui-scroller', 'hui-scrolly', 'hui-search-overlay', 'hui-share', 'hui-split-text', 'hui-stats-counter',
    'hui-sticky', 'hui-team-grid', 'hui-testimonial', 'hui-testimonial-slider', 'hui-text-rotate', 'hui-toc',
    'hui-typewriter', 'hui-video',
  ],
  // Thương mại điện tử
  shop: [
    'hui-add-to-cart', 'hui-cart-drawer', 'hui-coupon-input', 'hui-free-ship-bar', 'hui-image-zoom', 'hui-price',
    'hui-product-card', 'hui-quantity', 'hui-review-list', 'hui-variant-picker', 'hui-wishlist-toggle',
  ],
};
