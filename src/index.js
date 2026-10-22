/**
 * GOM TOÀN BỘ COMPONENT CHÍNH CỦA THƯ VIỆN HUI (HUI-Lib)
 * File này dùng làm cổng chính (Entry point) để Vite build ra cục bundle bự.
 */

// Import 1: Nhúng CSS Reset
// Design Tokens KHÔNG import ở đây nữa: mỗi component tự gọi ensureTokens() (src/utils/dom.js)
// để gắn tokens 1 lần vào <head> — tránh trùng 2 bản khi dùng bundle tổng.
import './styles/reset.css';

// Import 2: Lớp nền để tự viết component mới theo chuẩn HUI
export * from './core/index.js';

// Bundle tổng bật sẵn directive data-hui-animate (import lẻ thì tự gọi enableAnimations())
import { enableAnimations } from './utils/animate.js';
enableAnimations();

// Import 3: Xuất xưởng toàn bộ Component trong hệ sinh thái
export { default as HuiConfigProvider } from './components/hui-config-provider/index.js';
export { default as HuiIcon, registerIcon, getIcon, getIconNames } from './components/hui-icon/index.js';
export { default as HuiButton } from './components/hui-button/index.js';
export { default as HuiTextarea } from './components/hui-textarea/index.js';
export { default as HuiInputNumber } from './components/hui-input-number/index.js';
export { default as HuiSlider } from './components/hui-slider/index.js';
export { default as HuiRadioGroup, HuiRadio } from './components/hui-radio/index.js';
export { default as HuiCheckboxGroup } from './components/hui-checkbox-group/index.js';
export { default as HuiForm, HuiFormItem } from './components/hui-form/index.js';
export { default as HuiEmpty } from './components/hui-empty/index.js';
export { default as HuiText, HuiTitle, HuiParagraph, HuiLink } from './components/hui-typography/index.js';
export { default as HuiFlex } from './components/hui-flex/index.js';
export { default as HuiSpace } from './components/hui-space/index.js';
export { default as HuiRow, HuiCol } from './components/hui-grid/index.js';
export { default as HuiContainer } from './components/hui-container/index.js';
export { default as HuiLayout, HuiHeader, HuiSider, HuiContent, HuiFooter } from './components/hui-layout/index.js';
export { default as HuiSection } from './components/hui-section/index.js';
export { default as HuiCollapse, HuiCollapsePanel } from './components/hui-collapse/index.js';
export { default as HuiList, HuiListItem, HuiListItemMeta } from './components/hui-list/index.js';
export { default as HuiDescriptions, HuiDescriptionsItem } from './components/hui-descriptions/index.js';
export { default as HuiStatistic, HuiStatisticCountdown } from './components/hui-statistic/index.js';
export { default as HuiMessageContainer, message } from './components/hui-message/index.js';
export { default as HuiNotificationContainer, notification } from './components/hui-notification/index.js';
export { default as HuiDrawer } from './components/hui-drawer/index.js';
export { default as HuiProgress } from './components/hui-progress/index.js';
export {
  default as HuiSkeleton, HuiSkeletonButton, HuiSkeletonInput, HuiSkeletonAvatar, HuiSkeletonImage,
} from './components/hui-skeleton/index.js';
export { default as HuiPopover } from './components/hui-popover/index.js';
export { default as HuiPopconfirm } from './components/hui-popconfirm/index.js';
export { default as HuiResult } from './components/hui-result/index.js';
export { default as HuiRate, HuiRatingDisplay, HuiRatingSummary } from './components/hui-rate/index.js';
export { default as HuiBackTop } from './components/hui-back-top/index.js';
export { default as HuiFloatButton, HuiFloatGroup } from './components/hui-float-button/index.js';
export { default as HuiContactFloat } from './components/hui-contact-float/index.js';
export { default as HuiLoadingBar, loadingBar } from './components/hui-loading-bar/index.js';
export { default as HuiFaq, foldText } from './components/hui-faq/index.js';
export { default as HuiAnnouncementBar } from './components/hui-announcement-bar/index.js';
export {
  default as HuiThemeToggle, applyTheme, getStoredTheme, storeTheme, resolveTheme, getCurrentTheme,
  THEME_MODES, THEME_STORAGE_KEY,
} from './components/hui-theme-toggle/index.js';
export { default as HuiReveal } from './components/hui-reveal/index.js';
export { default as HuiScrollSteps, HuiStepSection } from './components/hui-scroll-steps/index.js';
export { default as HuiScroller } from './components/hui-scroller/index.js';
export { default as HuiFlipCard } from './components/hui-flip-card/index.js';
export { default as HuiSteps, HuiStep } from './components/hui-steps/index.js';
export { default as HuiStepProgress } from './components/hui-step-progress/index.js';
export { default as HuiProgressCard } from './components/hui-progress-card/index.js';
export { default as HuiScrollProgress } from './components/hui-scroll-progress/index.js';
export { default as HuiPrice, discountPercent } from './components/hui-price/index.js';
export { default as HuiProductCard } from './components/hui-product-card/index.js';
export { default as HuiPricingCard } from './components/hui-pricing-card/index.js';
export { default as HuiStatCard, sparklinePoints } from './components/hui-stat-card/index.js';
export { default as HuiBlogCard, readingMinutes, WORDS_PER_MINUTE } from './components/hui-blog-card/index.js';
export { default as HuiCardGrid } from './components/hui-card-grid/index.js';
export { default as HuiKpiRow } from './components/hui-kpi-row/index.js';
export { default as HuiDataView, processRows } from './components/hui-data-view/index.js';
export {
  HuiSparkline, HuiBarMini, HuiDonut, HuiGauge, CHART_PALETTE, linePath, arcPath, niceMax,
} from './components/hui-chart/index.js';
export { default as HuiTabs, HuiTabPanel } from './components/hui-tabs/index.js';
export {
  default as HuiMenu, HuiMenuItem, HuiSubMenu, HuiMenuGroup, HuiMenuDivider,
} from './components/hui-menu/index.js';
export { default as HuiDropdown, HuiDropdownButton } from './components/hui-dropdown/index.js';
export { default as HuiBreadcrumb, HuiBreadcrumbItem } from './components/hui-breadcrumb/index.js';
export { default as HuiPagination } from './components/hui-pagination/index.js';
export { default as HuiNavbar } from './components/hui-navbar/index.js';
export { default as HuiInput } from './components/hui-input/index.js';
export { default as HuiModal, modal } from './components/hui-modal/index.js';
export { default as HuiSelect } from './components/hui-select/index.js';
export { default as HuiCheckbox } from './components/hui-checkbox/index.js';
export { default as HuiCard, HuiCardMeta } from './components/hui-card/index.js';
export { default as HuiBadge, HuiBadgeRibbon } from './components/hui-badge/index.js';
export { default as HuiAlert } from './components/hui-alert/index.js';
export { default as HuiTooltip } from './components/hui-tooltip/index.js';
export { default as HuiSpinner } from './components/hui-spinner/index.js';

// Nhóm component cơ bản bổ sung (API tham khảo Ant Design + MUI)
export { default as HuiSwitch } from './components/hui-switch/index.js';
export { default as HuiTag } from './components/hui-tag/index.js';
export { default as HuiDivider } from './components/hui-divider/index.js';
export { default as HuiAvatar, HuiAvatarGroup } from './components/hui-avatar/index.js';

export { default as HuiDemo } from './components/hui-demo/index.js';

console.info('🧩 HUI-Lib Loaded! Hệ thống Component Sẵn Sàng.');

// Đợt 1 (A3) — cuộn & bố cục động
export { default as HuiMarquee } from './components/hui-marquee/index.js';
export { default as HuiInfiniteScroll } from './components/hui-infinite-scroll/index.js';
export { default as HuiSticky } from './components/hui-sticky/index.js';
export { default as HuiMasonry } from './components/hui-masonry/index.js';
export { default as HuiScrolly, HuiScrollyStep } from './components/hui-scrolly/index.js';
export { default as HuiSplitter, HuiSplitterPanel } from './components/hui-splitter/index.js';

// Đợt 1 (A7) — hiệu ứng chữ & nền (hàm confetti/burst/shake/ripple nằm riêng ở '@itmrhoang/h-ui/effects')
export { default as HuiTypewriter } from './components/hui-typewriter/index.js';
export { default as HuiTextRotate } from './components/hui-text-rotate/index.js';
export { default as HuiGradientText } from './components/hui-gradient-text/index.js';
export { default as HuiSplitText } from './components/hui-split-text/index.js';
export { default as HuiGradientBg } from './components/hui-gradient-bg/index.js';
export { default as HuiBlob } from './components/hui-blob/index.js';
export { default as HuiPattern } from './components/hui-pattern/index.js';
export { default as HuiParallax } from './components/hui-parallax/index.js';
export { default as HuiConfetti } from './components/hui-confetti/index.js';

// Đợt 1 (A6.6 + A6.7) — thương mại điện tử & form
export { default as HuiQuantity } from './components/hui-quantity/index.js';
export { default as HuiVariantPicker } from './components/hui-variant-picker/index.js';
export { default as HuiImageZoom } from './components/hui-image-zoom/index.js';
export { default as HuiAddToCart } from './components/hui-add-to-cart/index.js';
export { default as HuiWishlistToggle } from './components/hui-wishlist-toggle/index.js';
export { default as HuiCartDrawer } from './components/hui-cart-drawer/index.js';
export { default as HuiFreeShipBar } from './components/hui-free-ship-bar/index.js';
export { default as HuiCouponInput } from './components/hui-coupon-input/index.js';
export { default as HuiOtpInput } from './components/hui-otp-input/index.js';
export { default as HuiPhoneInput, PHONE_COUNTRIES, parsePhone, formatNational } from './components/hui-phone-input/index.js';
export { default as HuiPasswordStrength, scorePassword } from './components/hui-password-strength/index.js';
export { default as HuiNewsletter } from './components/hui-newsletter/index.js';
export { default as HuiContactForm } from './components/hui-contact-form/index.js';

// Đợt 1 (A1 + A6.2) — media
export { default as HuiImage } from './components/hui-image/index.js';
export { default as HuiLightbox, lightbox } from './components/hui-lightbox/index.js';
export { default as HuiGallery } from './components/hui-gallery/index.js';
export { default as HuiCarousel } from './components/hui-carousel/index.js';
export { default as HuiVideo, parseVideoSource } from './components/hui-video/index.js';
export { default as HuiCompareSlider } from './components/hui-compare-slider/index.js';

// Nội dung (A1 / A6.2)
export { default as HuiNumber } from './components/hui-number/index.js';
export { default as HuiTime, formatTime } from './components/hui-time/index.js';
export { default as HuiCountdown, splitDuration } from './components/hui-countdown/index.js';
export { default as HuiStatsCounter } from './components/hui-stats-counter/index.js';
export { default as HuiCopy, copyText } from './components/hui-copy/index.js';
export { default as HuiKbd, parseKeys } from './components/hui-kbd/index.js';
export { default as HuiCodeBlock, tokenize } from './components/hui-code-block/index.js';
export { default as HuiProse } from './components/hui-prose/index.js';
export { default as HuiShare, buildShareUrl } from './components/hui-share/index.js';
export { default as HuiToc, slugify } from './components/hui-toc/index.js';

// Hiển thị (A1 / A4 / A6 — đợt 2)
export { default as HuiAspectRatio } from './components/hui-aspect-ratio/index.js';
export { default as HuiDot } from './components/hui-dot/index.js';
export { default as HuiColorSwatch } from './components/hui-color-swatch/index.js';
export { default as HuiTimeline, HuiTimelineItem } from './components/hui-timeline/index.js';
export { default as HuiTimelineFeed } from './components/hui-timeline-feed/index.js';
export { default as HuiReviewList } from './components/hui-review-list/index.js';
export { default as HuiReaction } from './components/hui-reaction/index.js';
export { default as HuiDescriptionCard } from './components/hui-description-card/index.js';
export { default as HuiImageHotspot } from './components/hui-image-hotspot/index.js';

// Tương tác (A4 — đợt 2)
export { default as HuiHotkey, registerHotkey, parseHotkey } from './components/hui-hotkey/index.js';
export { default as HuiEditable } from './components/hui-editable/index.js';
export { default as HuiSortable } from './components/hui-sortable/index.js';
export { default as HuiConfirmAction } from './components/hui-confirm-action/index.js';
export { default as HuiCommandPalette, fuzzyMatch } from './components/hui-command-palette/index.js';
export { default as HuiKanban } from './components/hui-kanban/index.js';

// Landing (A2 / A6 — đợt 2)
export { default as HuiFeatureCard } from './components/hui-feature-card/index.js';
export { default as HuiTestimonial } from './components/hui-testimonial/index.js';
export { default as HuiProfileCard } from './components/hui-profile-card/index.js';
export { default as HuiMediaCard } from './components/hui-media-card/index.js';
export { default as HuiHero } from './components/hui-hero/index.js';
export { default as HuiFeatureGrid } from './components/hui-feature-grid/index.js';
export { default as HuiPricingTable, maxYearlySaving } from './components/hui-pricing-table/index.js';
export { default as HuiLogoCloud } from './components/hui-logo-cloud/index.js';
export { default as HuiCtaBanner } from './components/hui-cta-banner/index.js';
export { default as HuiTestimonialSlider } from './components/hui-testimonial-slider/index.js';
export { default as HuiFooterLinks } from './components/hui-footer-links/index.js';
export { default as HuiTeamGrid } from './components/hui-team-grid/index.js';

// Nhập liệu (G2 / A2 / A4 — đợt 2)
export { default as HuiSegmented } from './components/hui-segmented/index.js';
export { default as HuiButtonGroup, HuiToggleButtonGroup } from './components/hui-button-group/index.js';
export { default as HuiAutocomplete, matchRange, highlight, fold } from './components/hui-autocomplete/index.js';
export { default as HuiSearch } from './components/hui-search/index.js';
export { default as HuiInputGroup } from './components/hui-input-group/index.js';
export { default as HuiFilterChips } from './components/hui-filter-chips/index.js';
export { default as HuiFilterBar } from './components/hui-filter-bar/index.js';
export { default as HuiUpload, parseSize, formatBytes, acceptsFile } from './components/hui-upload/index.js';
export { default as HuiChipInput } from './components/hui-chip-input/index.js';

// Trang web / điều hướng (A5 / A6 — đợt 2)
export { default as HuiCookieConsent, readConsent } from './components/hui-cookie-consent/index.js';
export { default as HuiLanguageSwitch, DEFAULT_LANGUAGES } from './components/hui-language-switch/index.js';
export { default as HuiPageLoader } from './components/hui-page-loader/index.js';
export { default as HuiMegaMenu } from './components/hui-mega-menu/index.js';
export { default as HuiBottomNav } from './components/hui-bottom-nav/index.js';
export { default as HuiSearchOverlay } from './components/hui-search-overlay/index.js';
export { default as HuiHoverCard } from './components/hui-hover-card/index.js';
export { default as HuiToolbar } from './components/hui-toolbar/index.js';
export { default as HuiMediaObject } from './components/hui-media-object/index.js';
export { default as HuiMap } from './components/hui-map/index.js';
export { default as HuiComparisonTable } from './components/hui-comparison-table/index.js';

// G3 — đợt 3
export { default as HuiColorPicker, parseColor, formatColor, rgbToHsv, hsvToRgb, rgbToHsl, hslToRgb, hslToHsv, hsvToHsl, rgbToHex, luminance, contrastRatio, readableColor } from './components/hui-color-picker/index.js';
export { default as HuiMentions, getMentions } from './components/hui-mentions/index.js';
export { default as HuiTour } from './components/hui-tour/index.js';
export { default as HuiWatermark, createWatermarkDataUrl } from './components/hui-watermark/index.js';
export { default as HuiQrcode, encodeQR } from './components/hui-qrcode/index.js';
export { default as HuiCalendar, CalendarPanel, dateUtils } from './components/hui-calendar/index.js';
export { default as HuiDatePicker, HuiPickerBase } from './components/hui-date-picker/index.js';
export { default as HuiRangePicker, rangePresets, normalizeRange } from './components/hui-range-picker/index.js';
export { default as HuiTimePicker, TimePanel } from './components/hui-time-picker/index.js';
export { default as HuiTree, buildIndex, flattenTree, findPath, conductCheck, toggleCheck, strategyKeys, filterTree, moveNode } from './components/hui-tree/index.js';
export { default as HuiTreeSelect } from './components/hui-tree-select/index.js';
export { default as HuiCascader } from './components/hui-cascader/index.js';
export { default as HuiTransfer } from './components/hui-transfer/index.js';
export { default as HuiTable } from './components/hui-table/index.js';

// Hoàn thiện
export { default as HuiHighlight, highlightText, parseQuery } from './components/hui-highlight/index.js';
export { default as HuiVirtualList } from './components/hui-virtual-list/index.js';
