/** Chuỗi breadcrumb chưa có trong locale.js → dùng mặc định theo ngôn ngữ (xem báo cáo locale keys mới) */
import { getLocaleName, t } from '../../core/locale.js';

const FALLBACK = {
  vi: { 'breadcrumb.label': 'Đường dẫn', 'breadcrumb.expand': 'Hiện đường dẫn đầy đủ' },
  en: { 'breadcrumb.label': 'Breadcrumb', 'breadcrumb.expand': 'Show full path' },
};

export function breadcrumbText(key) {
  const v = t(key);
  return v !== key ? v : FALLBACK[getLocaleName() === 'vi' ? 'vi' : 'en'][key] ?? key;
}
