/**
 * HUI Splitter Panel — một vùng trong <hui-splitter>. Kích thước do hui-splitter tính và ghi vào
 * <style> riêng của panel (không đụng style inline của trang).
 */

import styles from './hui-splitter-panel.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/**
 * @slot - Nội dung vùng
 * @csspart base - Khung nội dung (cuộn được khi tràn)
 * @cssprop --hui-splitter-panel-padding - Đệm nội dung (mặc định 0)
 */
class HuiSplitterPanel extends HuiElement {
  static properties = {
    /** Kích thước ban đầu: % (số trơn hoặc "30%") hoặc px ("240px"); bỏ trống = chia đều phần còn lại */
    size: { type: String },
    /** Kích thước nhỏ nhất: % hoặc px */
    min: { type: String },
    /** Kích thước lớn nhất: % hoặc px */
    max: { type: String },
    /** Cho phép thu gọn về 0 (Enter trên thanh kéo, hoặc kéo nhỏ hơn nửa `min`) */
    collapsible: { type: Boolean },
    /** Đang thu gọn (đặt sẵn để khởi đầu ở trạng thái thu gọn) */
    collapsed: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._sizeStyle = createElement('style');
    this._applyBasis();
    return [this._sizeStyle, createElement('div', { className: 'panel', part: 'base' }, createElement('slot'))];
  }

  updated(changed) {
    if (changed.has('collapsed') && (this.collapsed || changed.get('collapsed') !== undefined)) {
      // Vùng thu gọn: không nhận focus, trình đọc màn hình bỏ qua
      this.inert = this.collapsed;
      this.setState('collapsed', this.collapsed);
    }
    if (!this._notifyReady) {
      this._notifyReady = true;
      return;
    }
    const keys = ['size', 'min', 'max', 'collapsible', 'collapsed'].filter((k) => changed.has(k));
    if (keys.length) this.parentElement?._onPanelChange?.(this, keys);
  }

  /** hui-splitter gọi: phần trăm (0–100) kích thước của panel */
  _setPercent(percent) {
    this._percent = percent;
    this._applyBasis();
  }

  _applyBasis() {
    if (!this._sizeStyle || this._percent === undefined) return;
    // --_splitter-gutters (tổng bề dày thanh chia) do hui-splitter đặt trên khung cha trong shadow DOM
    const ratio = Math.max(0, this._percent) / 100;
    this._sizeStyle.textContent = `:host { flex-basis: calc((100% - var(--_splitter-gutters, 0px)) * ${ratio.toFixed(6)}); }`;
  }
}

defineElement('hui-splitter-panel', HuiSplitterPanel);

export default HuiSplitterPanel;
