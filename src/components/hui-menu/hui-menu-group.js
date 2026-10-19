/**
 * HUI Menu Group — Nhóm item có tiêu đề (không đóng/mở được). Xem JSDoc của class.
 */

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { DEFAULT_CTX } from './menu-shared.js';

const styles = `
:host { display: block; font-family: var(--hui-font-family); }
:host([hidden]) { display: none !important; }
[hidden] { display: none !important; }
.title {
  padding-block: var(--hui-space-sm) var(--hui-space-xs);
  padding-inline: calc(var(--hui-menu-item-padding-x, 16px) + 4px + var(--_mg-level, 0) * var(--_mg-indent, 24px)) var(--hui-menu-item-padding-x, 16px);
  color: var(--hui-menu-group-title-color, var(--hui-text-tertiary));
  font-size: var(--hui-menu-group-title-font-size, var(--hui-font-xs));
  line-height: var(--hui-line-height, 1.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title--collapsed { padding-inline: 0; text-align: center; }
`;

/**
 * @slot - Các hui-menu-item thuộc nhóm
 * @slot label - Tiêu đề nhóm dạng HTML (thay cho attribute label)
 * @csspart title - Tiêu đề nhóm
 * @csspart list - Khung chứa item (role=group)
 * @cssprop --hui-menu-group-title-color - Màu tiêu đề nhóm
 * @cssprop --hui-menu-group-title-font-size - Cỡ chữ tiêu đề nhóm
 */
class HuiMenuGroup extends HuiElement {
  static properties = {
    /** Tiêu đề nhóm */
    label: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    this._ctx = DEFAULT_CTX;
  }

  render() {
    this._text = document.createTextNode('');
    this._title = createElement('div', { className: 'title', part: 'title', role: 'presentation', id: 'title' },
      createElement('slot', { name: 'label' }, this._text));
    this._list = createElement('div', { part: 'list', role: 'group', 'aria-labelledby': 'title' }, createElement('slot'));
    return [this._title, this._list];
  }

  connectedCallback() {
    super.connectedCallback();
    this.closest('hui-menu')?._scheduleSync?.();
  }

  updated(changed) {
    if (changed.has('label')) this._text.data = this.label || '';
    this._applyCtx();
  }

  _applyContext(ctx) {
    this._ctx = ctx;
    if (this._hasRendered) this._applyCtx();
  }

  _applyCtx() {
    const ctx = this._ctx;
    this._title.className = `title${ctx.collapsedRoot ? ' title--collapsed' : ''}`;
    this._title.style.setProperty('--_mg-level', String(ctx.mode === 'inline' ? ctx.level : 0));
    this._title.style.setProperty('--_mg-indent', `${ctx.indent}px`);
    // Menu thu gọn: chỉ còn icon → ẩn chữ tiêu đề nhóm (giữ khoảng cách)
    this._title.style.visibility = ctx.collapsedRoot ? 'hidden' : '';
  }
}

defineElement('hui-menu-group', HuiMenuGroup);

export default HuiMenuGroup;
