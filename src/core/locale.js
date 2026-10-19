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
  form: {
    required: 'Vui lòng nhập trường này',
    requiredSelect: 'Vui lòng chọn một giá trị',
    tooShort: 'Tối thiểu {min} ký tự',
    tooLong: 'Tối đa {max} ký tự',
    rangeUnderflow: 'Giá trị tối thiểu là {min}',
    rangeOverflow: 'Giá trị tối đa là {max}',
    patternMismatch: 'Định dạng không hợp lệ',
    typeEmail: 'Email không hợp lệ',
    typeUrl: 'Đường dẫn không hợp lệ',
    optional: '(không bắt buộc)',
  },
  modal: { ok: 'Đồng ý', cancel: 'Hủy', confirmTitle: 'Xác nhận' },
  popconfirm: { ok: 'Đồng ý', cancel: 'Hủy' },
  pagination: { prev: 'Trang trước', next: 'Trang sau', itemsPerPage: '/ trang', jumpTo: 'Đến trang', page: 'Trang', total: 'Tổng {total} mục' },
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
  form: {
    required: 'Please fill out this field',
    requiredSelect: 'Please select a value',
    tooShort: 'At least {min} characters',
    tooLong: 'At most {max} characters',
    rangeUnderflow: 'Minimum value is {min}',
    rangeOverflow: 'Maximum value is {max}',
    patternMismatch: 'Invalid format',
    typeEmail: 'Invalid email',
    typeUrl: 'Invalid URL',
    optional: '(optional)',
  },
  modal: { ok: 'OK', cancel: 'Cancel', confirmTitle: 'Confirm' },
  popconfirm: { ok: 'OK', cancel: 'Cancel' },
  pagination: { prev: 'Previous page', next: 'Next page', itemsPerPage: '/ page', jumpTo: 'Go to', page: 'Page', total: 'Total {total} items' },
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
