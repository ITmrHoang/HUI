/**
 * HUI ConfigProvider — đặt theme / màu / bo góc / kích thước cho cả vùng con (Ant ConfigProvider).
 *   <hui-config-provider theme="dark" primary-color="#e11d48" radius="4" size="lg">
 *     ...mọi component HUI bên trong nhận cấu hình này...
 *   </hui-config-provider>
 * Cơ chế: gắn data-theme + biến CSS lên chính thẻ → biến kế thừa xuống mọi con (xuyên Shadow DOM).
 * Các sắc độ/hover tự tính lại vì tokens.css khai báo khối "token suy ra" trên cả hui-config-provider.
 */

import { HuiElement, defineElement } from '../../core/hui-element.js';

/** Thuộc tính → biến token tương ứng */
const TOKEN_MAP = {
  primaryColor: '--hui-primary',
  successColor: '--hui-success',
  warningColor: '--hui-warning',
  dangerColor: '--hui-danger',
  infoColor: '--hui-info',
  fontFamily: '--hui-font-family',
};

class HuiConfigProvider extends HuiElement {
  static properties = {
    /** light | dark | '' (theo trang) */
    theme: { type: String, default: '' },
    primaryColor: { type: String },
    successColor: { type: String },
    warningColor: { type: String },
    dangerColor: { type: String },
    infoColor: { type: String },
    fontFamily: { type: String },
    /** Bo góc gốc (px) — các mức sm/md/lg tính theo */
    radius: { type: Number },
    /** sm | md | lg — kích thước mặc định cho control bên trong (đọc qua effectiveSize) */
    size: { type: String, default: '' },
    /** Ghi đè token bất kỳ: provider.tokens = { '--hui-space-md': '1rem' } */
    tokens: { type: Object },
  };

  static styles = ':host { display: contents; }';

  render() {
    return document.createElement('slot');
  }

  updated(changed) {
    if (changed.has('theme')) {
      if (this.theme) this.dataset.theme = this.theme;
      else delete this.dataset.theme;
    }

    for (const [prop, cssVar] of Object.entries(TOKEN_MAP)) {
      if (changed.has(prop)) this._setVar(cssVar, this[prop]);
    }

    if (changed.has('radius')) {
      const r = this.radius;
      const has = r !== null && r !== undefined && !Number.isNaN(r);
      this._setVar('--hui-radius-sm', has ? `${Math.max(r - 2, 0)}px` : null);
      this._setVar('--hui-radius', has ? `${r}px` : null);
      this._setVar('--hui-radius-md', has ? `${r + 2}px` : null);
      this._setVar('--hui-radius-lg', has ? `${r + 4}px` : null);
    }

    if (changed.has('tokens')) {
      const old = changed.get('tokens') || {};
      for (const key of Object.keys(old)) this.style.removeProperty(key);
      for (const [key, value] of Object.entries(this.tokens || {})) this._setVar(key, value);
    }
  }

  _setVar(name, value) {
    if (value === null || value === undefined || value === '') this.style.removeProperty(name);
    else this.style.setProperty(name, String(value));
  }
}

defineElement('hui-config-provider', HuiConfigProvider);

export default HuiConfigProvider;
