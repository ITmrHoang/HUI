/**
 * Tiện ích dùng chung cho nhóm media (hui-image, hui-lightbox, hui-gallery, hui-carousel, hui-video, hui-compare-slider):
 * chuỗi locale dự phòng, icon bổ sung, chuyển đổi tỉ lệ khung / độ dài.
 */

import { t, getLocaleName } from '../../core/locale.js';
import { getIcon, registerIcon } from '../hui-icon/icons.js';

/** Chuỗi dự phòng khi locale.js chưa có key (coordinator sẽ chuyển vào locale.js) */
const FALLBACK = {
  vi: {
    'image.error': 'Không tải được ảnh',
    'image.preview': 'Xem ảnh lớn',
    'lightbox.label': 'Trình xem ảnh',
    'lightbox.close': 'Đóng',
    'lightbox.prev': 'Ảnh trước',
    'lightbox.next': 'Ảnh sau',
    'lightbox.zoomIn': 'Phóng to',
    'lightbox.zoomOut': 'Thu nhỏ',
    'lightbox.rotate': 'Xoay ảnh',
    'lightbox.download': 'Tải ảnh',
    'lightbox.counter': '{index} / {count}',
    'lightbox.error': 'Không tải được ảnh',
    'gallery.label': 'Thư viện ảnh',
    'gallery.open': 'Xem ảnh {index}',
    'carousel.label': 'Băng chuyền',
    'carousel.roleDescription': 'băng chuyền',
    'carousel.slideRole': 'trang chiếu',
    'carousel.slide': '{index} / {count}',
    'carousel.prev': 'Trang chiếu trước',
    'carousel.next': 'Trang chiếu sau',
    'carousel.goTo': 'Đến trang chiếu {index}',
    'carousel.nav': 'Chọn trang chiếu',
    'carousel.pause': 'Tạm dừng tự chạy',
    'carousel.play': 'Bật tự chạy',
    'video.play': 'Phát video: {title}',
    'video.playDefault': 'Phát video',
    'video.close': 'Đóng video',
    'video.frameTitle': 'Trình phát video',
    'compare.label': 'So sánh trước và sau',
    'compare.before': 'Trước',
    'compare.after': 'Sau',
    'compare.valueText': '{value}% ảnh trước',
  },
  en: {
    'image.error': 'Image failed to load',
    'image.preview': 'View larger image',
    'lightbox.label': 'Image viewer',
    'lightbox.close': 'Close',
    'lightbox.prev': 'Previous image',
    'lightbox.next': 'Next image',
    'lightbox.zoomIn': 'Zoom in',
    'lightbox.zoomOut': 'Zoom out',
    'lightbox.rotate': 'Rotate image',
    'lightbox.download': 'Download image',
    'lightbox.counter': '{index} / {count}',
    'lightbox.error': 'Image failed to load',
    'gallery.label': 'Image gallery',
    'gallery.open': 'View image {index}',
    'carousel.label': 'Carousel',
    'carousel.roleDescription': 'carousel',
    'carousel.slideRole': 'slide',
    'carousel.slide': '{index} of {count}',
    'carousel.prev': 'Previous slide',
    'carousel.next': 'Next slide',
    'carousel.goTo': 'Go to slide {index}',
    'carousel.nav': 'Choose slide',
    'carousel.pause': 'Pause autoplay',
    'carousel.play': 'Start autoplay',
    'video.play': 'Play video: {title}',
    'video.playDefault': 'Play video',
    'video.close': 'Close video',
    'video.frameTitle': 'Video player',
    'compare.label': 'Before and after comparison',
    'compare.before': 'Before',
    'compare.after': 'After',
    'compare.valueText': '{value}% before image',
  },
};

/** t() + fallback cục bộ */
export function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/** Icon bổ sung (chỉ đăng ký khi icons.js chưa có — coordinator chuyển vào icons.js) */
const MEDIA_ICONS = {
  'zoom-in': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  'zoom-out': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',
  'rotate-cw': '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
  play: '<path d="M7 4.5v15l12-7.5Z" fill="currentColor"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
};

let iconsReady = false;
export function ensureMediaIcons() {
  if (iconsReady || typeof document === 'undefined') return;
  iconsReady = true;
  for (const [name, svg] of Object.entries(MEDIA_ICONS)) {
    if (getIcon(name) === undefined) registerIcon(name, svg);
  }
}

/** '16/9' | '16:9' | '16 / 9' | '1.5' → '16 / 9' (giá trị aspect-ratio); không hợp lệ → null */
export function toAspectRatio(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  const m = v.match(/^(\d+(?:\.\d+)?)\s*[/:x]\s*(\d+(?:\.\d+)?)$/);
  if (m && Number(m[1]) > 0 && Number(m[2]) > 0) return `${m[1]} / ${m[2]}`;
  if (/^\d+(\.\d+)?$/.test(v) && Number(v) > 0) return v;
  return null;
}

/** Từ khóa khoảng cách — giống hui-scroller / hui-flex */
const GAP_TOKENS = {
  none: '0px',
  xs: 'var(--hui-space-xs)',
  sm: 'var(--hui-space-sm)',
  md: 'var(--hui-space-lg)',
  lg: 'var(--hui-space-xl)',
  xl: 'var(--hui-space-2xl)',
};

/** Từ khóa → token, số trơn → px, còn lại giữ nguyên (CSS length) */
export function toLength(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (GAP_TOKENS[v]) return GAP_TOKENS[v];
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

/** Hiệu ứng bị tắt: attribute no-animation, giảm chuyển động hoặc token 0ms */
export { animationsDisabled } from '../../utils/animate.js';

/** Breakpoint min-width (giống hui-grid / hui-scroller) */
export const BREAKPOINTS = [
  ['Sm', 576],
  ['Md', 768],
  ['Lg', 992],
  ['Xl', 1200],
];

let sharedMqls = null;
/** MediaQueryList dùng chung (tạo khi cần) */
export function breakpointMqls() {
  if (!sharedMqls && typeof matchMedia === 'function') {
    sharedMqls = BREAKPOINTS.map(([, px]) => matchMedia(`(min-width: ${px}px)`));
  }
  return sharedMqls || [];
}
