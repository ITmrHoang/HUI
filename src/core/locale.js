/**
 * Đa ngôn ngữ (locale) cho chuỗi mặc định của component (nút OK/Hủy, "Không có dữ liệu"...).
 *   import { setLocale, registerLocale, t } from 'hui-lib/core';
 *   setLocale('en');
 *   registerLocale('ja', { modal: { ok: 'OK', cancel: 'キャンセル' } }); // thiếu key → lấy từ 'en'
 *   t('pagination.total', { total: 50 }) → "Tổng 50 mục"
 * Component dùng chuỗi locale đặt `static localized = true` để tự cập nhật khi đổi ngôn ngữ.
 */

const vi = {
  common: { ok: 'Đồng ý', cancel: 'Hủy', close: 'Đóng', clear: 'Xóa', loading: 'Đang tải...', search: 'Tìm kiếm', copy: 'Sao chép', copied: 'Đã sao chép', expand: 'Mở rộng', collapse: 'Thu gọn', more: 'Xem thêm' },
  empty: { description: 'Không có dữ liệu' },
  blog: { readingTime: '{minutes} phút đọc' },
  stat: { up: 'Tăng', down: 'Giảm', flat: 'Không đổi', trend: 'Biểu đồ xu hướng' },
  pricing: { popular: 'Phổ biến', month: '/tháng', year: '/năm', cta: 'Chọn gói', included: 'Có', excluded: 'Không có', save: 'Tiết kiệm {percent}%' },
  product: { addToCart: 'Thêm vào giỏ', soldOut: 'Hết hàng', wishlist: 'Yêu thích' },
  price: { free: 'Miễn phí', label: 'Giá {value}', srSale: 'Giá gốc {original}, giá bán {value}', srDiscount: 'giảm {percent}%' },
  scrollProgress: { label: 'Tiến độ đọc trang' },
  progressCard: { count: '{value}/{total} việc', deadline: 'Hạn chót {time}', overdue: 'Quá hạn {time}' },
  stepProgress: { label: 'Tiến trình các bước', counter: 'Bước {index}/{total}', prev: 'Quay lại', next: 'Tiếp tục', finish: 'Hoàn thành' },
  steps: { label: 'Các bước', stepLabel: 'Bước {index}: {title}', wait: 'Đang chờ', process: 'Đang thực hiện', finish: 'Đã hoàn thành', error: 'Lỗi' },
  flipCard: { flip: 'Lật thẻ' },
  card: { open: 'Xem chi tiết' },
  scroller: { label: 'Danh sách cuộn ngang', prev: 'Trước', next: 'Tiếp', slide: '{index} / {count}', goTo: 'Đến trang {index}', pagination: 'Chọn trang', itemRole: 'mục' },
  scrollSteps: { label: 'Nội dung theo bước', nav: 'Điều hướng các bước', step: 'Bước {index}', prev: 'Bước trước', next: 'Bước sau', counter: 'Bước {index} / {count}' },
  theme: { label: 'Giao diện', light: 'Sáng', dark: 'Tối', system: 'Theo hệ thống', darkMode: 'Chế độ tối' },
  announcement: { label: 'Thông báo', close: 'Đóng thông báo' },
  faq: { searchPlaceholder: 'Tìm câu hỏi...', expandAll: 'Mở tất cả', collapseAll: 'Thu gọn tất cả', noResults: 'Không tìm thấy câu hỏi phù hợp', resultCount: '{count} câu hỏi phù hợp', all: 'Tất cả', other: 'Khác' },
  contactFloat: { phone: 'Gọi {value}', zalo: 'Chat Zalo', messenger: 'Nhắn tin Messenger', email: 'Gửi email', toggle: 'Liên hệ' },
  floatGroup: { toggle: 'Mở nhóm nút' },
  backTop: { label: 'Lên đầu trang' },
  rate: { label: 'Đánh giá', valueText: '{value} trên {count} sao', required: 'Vui lòng chọn số sao', displayLabel: 'Đánh giá {value} trên {count}', reviews: '({count} đánh giá)', total: '{count} đánh giá', bar: '{stars} sao: {count} đánh giá ({percent})', summary: 'Phân bố đánh giá' },
  data: { errorTitle: 'Không tải được dữ liệu', retry: 'Thử lại' },
  form: {
    required: 'Vui lòng nhập trường này',
    requiredChecked: 'Vui lòng chọn mục này',
    requiredSelect: 'Vui lòng chọn một giá trị',
    tooShort: 'Tối thiểu {min} ký tự',
    tooLong: 'Tối đa {max} ký tự',
    rangeUnderflow: 'Giá trị tối thiểu là {min}',
    rangeOverflow: 'Giá trị tối đa là {max}',
    patternMismatch: 'Định dạng không hợp lệ',
    typeEmail: 'Email không hợp lệ',
    typeUrl: 'Đường dẫn không hợp lệ',
    typeNumber: 'Vui lòng nhập số',
    minItems: 'Chọn tối thiểu {min} mục',
    maxItems: 'Chọn tối đa {max} mục',
    optional: '(không bắt buộc)',
  },
  modal: { ok: 'Đồng ý', cancel: 'Hủy', confirmTitle: 'Xác nhận' },
  popconfirm: { ok: 'Đồng ý', cancel: 'Hủy' },
  tabs: { add: 'Thêm tab', remove: 'Đóng tab' },
  breadcrumb: { label: 'Đường dẫn', expand: 'Hiện đường dẫn đầy đủ' },
  navbar: { openMenu: 'Mở menu', closeMenu: 'Đóng menu', label: 'Điều hướng chính' },
  pagination: { label: 'Phân trang', prev5: 'Lùi 5 trang', next5: 'Tiến 5 trang', prev: 'Trang trước', next: 'Trang sau', itemsPerPage: '/ trang', jumpTo: 'Đến trang', page: 'Trang', total: 'Tổng {total} mục' },
  input: { showPassword: 'Hiện mật khẩu' },
  inputNumber: { increase: 'Tăng giá trị', decrease: 'Giảm giá trị' },
  slider: { start: 'Giá trị đầu', end: 'Giá trị cuối' },
  progress: { label: 'Tiến độ' },
  select: { notFound: 'Không tìm thấy', placeholder: 'Chọn...' },
  table: { filterConfirm: 'Lọc', filterReset: 'Đặt lại', selectAll: 'Chọn tất cả', sortAsc: 'Sắp xếp tăng dần', sortDesc: 'Sắp xếp giảm dần', expand: 'Mở dòng', collapse: 'Thu dòng' },
  upload: { uploading: 'Đang tải lên...', remove: 'Xóa tệp', preview: 'Xem trước', drag: 'Kéo thả tệp vào đây hoặc bấm để chọn' },
  datePicker: { placeholder: 'Chọn ngày', rangePlaceholder: ['Từ ngày', 'Đến ngày'], today: 'Hôm nay', now: 'Bây giờ', weekStart: 1 },
  image: { preview: 'Xem ảnh', zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ', rotate: 'Xoay' },
  tour: { next: 'Tiếp', prev: 'Quay lại', finish: 'Hoàn thành' },
};

const en = {
  common: { ok: 'OK', cancel: 'Cancel', close: 'Close', clear: 'Clear', loading: 'Loading...', search: 'Search', copy: 'Copy', copied: 'Copied', expand: 'Expand', collapse: 'Collapse', more: 'More' },
  empty: { description: 'No data' },
  blog: { readingTime: '{minutes} min read' },
  stat: { up: 'Up', down: 'Down', flat: 'No change', trend: 'Trend chart' },
  pricing: { popular: 'Popular', month: '/month', year: '/year', cta: 'Choose plan', included: 'Included', excluded: 'Not included', save: 'Save {percent}%' },
  product: { addToCart: 'Add to cart', soldOut: 'Sold out', wishlist: 'Wishlist' },
  price: { free: 'Free', label: 'Price {value}', srSale: 'Original price {original}, sale price {value}', srDiscount: '{percent}% off' },
  scrollProgress: { label: 'Reading progress' },
  progressCard: { count: '{value}/{total} tasks', deadline: 'Due {time}', overdue: 'Overdue {time}' },
  stepProgress: { label: 'Step progress', counter: 'Step {index}/{total}', prev: 'Back', next: 'Next', finish: 'Finish' },
  steps: { label: 'Steps', stepLabel: 'Step {index}: {title}', wait: 'Waiting', process: 'In progress', finish: 'Finished', error: 'Error' },
  flipCard: { flip: 'Flip card' },
  card: { open: 'View details' },
  scroller: { label: 'Horizontal list', prev: 'Previous', next: 'Next', slide: '{index} of {count}', goTo: 'Go to page {index}', pagination: 'Choose page', itemRole: 'slide' },
  scrollSteps: { label: 'Step content', nav: 'Step navigation', step: 'Step {index}', prev: 'Previous step', next: 'Next step', counter: 'Step {index} of {count}' },
  theme: { label: 'Theme', light: 'Light', dark: 'Dark', system: 'System', darkMode: 'Dark mode' },
  announcement: { label: 'Announcement', close: 'Dismiss announcement' },
  faq: { searchPlaceholder: 'Search questions...', expandAll: 'Expand all', collapseAll: 'Collapse all', noResults: 'No matching questions', resultCount: '{count} matching questions', all: 'All', other: 'Other' },
  contactFloat: { phone: 'Call {value}', zalo: 'Chat on Zalo', messenger: 'Chat on Messenger', email: 'Send email', toggle: 'Contact us' },
  floatGroup: { toggle: 'Open actions' },
  backTop: { label: 'Back to top' },
  rate: { label: 'Rating', valueText: '{value} out of {count} stars', required: 'Please select a rating', displayLabel: 'Rated {value} out of {count}', reviews: '({count} reviews)', total: '{count} reviews', bar: '{stars} stars: {count} reviews ({percent})', summary: 'Rating distribution' },
  data: { errorTitle: 'Could not load data', retry: 'Retry' },
  form: {
    required: 'Please fill out this field',
    requiredChecked: 'Please check this box',
    requiredSelect: 'Please select a value',
    tooShort: 'At least {min} characters',
    tooLong: 'At most {max} characters',
    rangeUnderflow: 'Minimum value is {min}',
    rangeOverflow: 'Maximum value is {max}',
    patternMismatch: 'Invalid format',
    typeEmail: 'Invalid email',
    typeUrl: 'Invalid URL',
    typeNumber: 'Please enter a number',
    minItems: 'Select at least {min} items',
    maxItems: 'Select at most {max} items',
    optional: '(optional)',
  },
  modal: { ok: 'OK', cancel: 'Cancel', confirmTitle: 'Confirm' },
  popconfirm: { ok: 'OK', cancel: 'Cancel' },
  tabs: { add: 'Add tab', remove: 'Close tab' },
  breadcrumb: { label: 'Breadcrumb', expand: 'Show full path' },
  navbar: { openMenu: 'Open menu', closeMenu: 'Close menu', label: 'Main navigation' },
  pagination: { label: 'Pagination', prev5: 'Previous 5 pages', next5: 'Next 5 pages', prev: 'Previous page', next: 'Next page', itemsPerPage: '/ page', jumpTo: 'Go to', page: 'Page', total: 'Total {total} items' },
  input: { showPassword: 'Show password' },
  inputNumber: { increase: 'Increase value', decrease: 'Decrease value' },
  slider: { start: 'Start value', end: 'End value' },
  progress: { label: 'Progress' },
  select: { notFound: 'Not found', placeholder: 'Select...' },
  table: { filterConfirm: 'OK', filterReset: 'Reset', selectAll: 'Select all', sortAsc: 'Sort ascending', sortDesc: 'Sort descending', expand: 'Expand row', collapse: 'Collapse row' },
  upload: { uploading: 'Uploading...', remove: 'Remove file', preview: 'Preview', drag: 'Drag files here or click to select' },
  datePicker: { placeholder: 'Select date', rangePlaceholder: ['Start date', 'End date'], today: 'Today', now: 'Now', weekStart: 0 },
  image: { preview: 'Preview', zoomIn: 'Zoom in', zoomOut: 'Zoom out', rotate: 'Rotate' },
  tour: { next: 'Next', prev: 'Previous', finish: 'Finish' },
};

const locales = new Map([['vi', vi], ['en', en]]);
let current = 'vi';

/** Trộn sâu: key thiếu ở `override` lấy từ `base` */
function deepMerge(base, override) {
  const out = { ...base };
  for (const [k, v] of Object.entries(override || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(base?.[k] || {}, v) : v;
  }
  return out;
}

/** Đăng ký / bổ sung ngôn ngữ. Key thiếu được lấy từ `fallback` (mặc định 'en'). */
export function registerLocale(name, messages, fallback = 'en') {
  const base = locales.get(name) || locales.get(fallback) || en;
  locales.set(name, deepMerge(base, messages));
}

/**
 * Đổi ngôn ngữ toàn cục. Nhận tên đã đăng ký hoặc object chuỗi (ghi đè lên ngôn ngữ hiện tại).
 * Phát sự kiện `hui-locale-change` trên document → component `localized` tự vẽ lại chữ.
 */
export function setLocale(nameOrMessages) {
  if (typeof nameOrMessages === 'string') {
    if (!locales.has(nameOrMessages)) {
      console.warn(`[HUI] Locale "${nameOrMessages}" chưa đăng ký, dùng registerLocale() trước.`);
      return;
    }
    current = nameOrMessages;
  } else {
    registerLocale(current, nameOrMessages, current);
  }
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('hui-locale-change', { detail: { locale: current } }));
  }
}

export function getLocaleName() {
  return current;
}

/** Toàn bộ chuỗi của ngôn ngữ hiện tại */
export function getLocale() {
  return locales.get(current);
}

/**
 * Lấy chuỗi theo đường dẫn 'nhóm.key', thay {biến} bằng giá trị trong `vars`.
 * Không tìm thấy → trả về chính key (dễ phát hiện thiếu bản dịch).
 */
export function t(path, vars) {
  let value = path.split('.').reduce((obj, k) => obj?.[k], locales.get(current));
  if (value === undefined) value = path.split('.').reduce((obj, k) => obj?.[k], en);
  if (value === undefined) return path;
  if (typeof value === 'string' && vars) {
    value = value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }
  return value;
}
