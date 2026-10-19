/**
 * Lớp nền chung cho hui-text / hui-title / hui-paragraph (không đăng ký thẻ riêng).
 * Gồm: type màu, kiểu chữ (strong, code, mark...), ellipsis 1 dòng / nhiều dòng (rows),
 * tự gắn title khi bị cắt chữ, nút sao chép (copyable → hui-copy).
 */

import baseStyles from './hui-typography.css?raw';

import { HuiElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { t } from '../../core/locale.js';
import '../hui-icon/hui-icon.js';

export { baseStyles };

const TYPES = ['secondary', 'success', 'warning', 'danger'];

// [property, thẻ HTML] — thứ tự bọc từ ngoài vào trong
const DECORATIONS = [
  ['code', 'code'],
  ['keyboard', 'kbd'],
  ['mark', 'mark'],
  ['delete', 'del'],
  ['underline', 'u'],
  ['strong', 'strong'],
  ['italic', 'em'],
];

/** Thời gian giữ trạng thái "đã sao chép" (ms) */
const COPIED_DURATION = 3000;

/**
 * Ghi chuỗi vào clipboard. Clipboard API bị chặn (http, iframe không cấp quyền...) → fallback execCommand.
 * @returns {Promise<boolean>} true nếu sao chép thành công
 */
export async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch { /* trình duyệt không hỗ trợ */ }
    ta.remove();
    return ok;
  }
}

export class HuiTypographyBase extends HuiElement {
  static localized = true;

  static properties = {
    /** secondary | success | warning | danger — màu ngữ nghĩa */
    type: { type: String },
    /** Chữ mờ, không thao tác được (nút sao chép bị khóa) */
    disabled: { type: Boolean },
    /** In đậm (<strong>) */
    strong: { type: Boolean },
    /** In nghiêng (<em>) */
    italic: { type: Boolean },
    /** Gạch chân (<u>) */
    underline: { type: Boolean },
    /** Gạch ngang (<del>) */
    delete: { type: Boolean },
    /** Dạng mã (<code>) */
    code: { type: Boolean },
    /** Tô sáng (<mark>) */
    mark: { type: Boolean },
    /** Phím bàn phím (<kbd>) */
    keyboard: { type: Boolean },
    /** Cắt chữ bằng dấu "…" (1 dòng; kết hợp rows để cắt nhiều dòng) */
    ellipsis: { type: Boolean },
    /** Số dòng tối đa khi cắt chữ (≥ 2 = cắt nhiều dòng). Đặt rows cũng tự bật ellipsis */
    rows: { type: Number },
    /** Hiện nút sao chép nội dung */
    copyable: { type: Boolean },
    /** Chuỗi được sao chép (mặc định = nội dung chữ) */
    copyText: { type: String },
  };

  /** Thẻ khung ngoài — lớp con đổi thành 'div' cho khối chữ */
  static baseTag = 'span';

  constructor() {
    super();
    this._truncated = false;
    this._copied = false;
    this._copiedTimer = null;
    this._resizeObserver = null;
    this._mutationObserver = null;
    this._decorKey = '';
  }

  // =====================================================
  // RENDER / LIFECYCLE
  // =====================================================

  render() {
    this._slot = createElement('slot');
    this._content = createElement('span', { className: 'typo__content', part: 'content' }, this._slot);

    this._copyIcon = createElement('hui-icon', { name: 'copy' });
    this._copyBtn = createElement('button', { type: 'button', className: 'typo__action typo__copy', part: 'copy' }, this._copyIcon);
    this._copyBtn.addEventListener('click', () => this.copy());

    this._actions = createElement('span', { className: 'typo__actions', part: 'actions' }, this._copyBtn);
    this.renderActions(this._actions);

    this._base = createElement(this.constructor.baseTag, { className: 'typo', part: 'base' }, this._content, this._actions);
    return this._base;
  }

  /** Lớp con thêm nút vào vùng hành động (vd: "Xem thêm" của paragraph) */
  renderActions() {}

  connectedCallback() {
    super.connectedCallback();
    // Đo lại khi kích thước đổi hoặc nội dung chữ đổi (slotchange không bắt được đổi text bên trong)
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => this._measure());
      this._resizeObserver.observe(this._content);
    }
    this._mutationObserver = new MutationObserver(() => this._measure());
    this._mutationObserver.observe(this, { childList: true, characterData: true, subtree: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._mutationObserver?.disconnect();
    clearTimeout(this._copiedTimer);
  }

  updated(changed) {
    const base = this._base;

    if (changed.has('type') || changed.has('disabled')) {
      for (const type of TYPES) base.classList.toggle(`typo--${type}`, this.type === type);
      base.classList.toggle('typo--disabled', this.disabled);
      if (this.disabled) base.setAttribute('aria-disabled', 'true');
      else base.removeAttribute('aria-disabled');
      this._copyBtn.disabled = this.disabled;
    }

    if (DECORATIONS.some(([prop]) => changed.has(prop))) this._buildDecorations();

    // Số dòng cắt chữ: 0 = không cắt
    const rows = this.clampRows();
    base.classList.toggle('typo--clamp', rows > 0);
    base.classList.toggle('typo--single', rows === 1);
    base.classList.toggle('typo--multi', rows > 1);
    if (rows > 1) this._content.style.setProperty('--_typo-rows', String(rows));
    else this._content.style.removeProperty('--_typo-rows');

    this._copyBtn.hidden = !this.copyable;
    if (changed.has('locale') || changed.has('copyable')) this._syncCopyLabel();

    this.updateActions(changed);
    this._actions.hidden = ![...this._actions.children].some((el) => !el.hidden);

    this._measure();
  }

  /** Lớp con cập nhật nút riêng của mình */
  updateActions() {}

  /** Số dòng cần cắt (lớp con ghi đè, vd: paragraph đang mở rộng → 0) */
  clampRows() {
    const rows = Number(this.rows) > 0 ? Math.floor(Number(this.rows)) : 0;
    if (rows) return rows;
    return this.ellipsis ? 1 : 0;
  }

  /** Bọc slot trong chuỗi thẻ ngữ nghĩa <code><mark><strong>… — chỉ dựng lại khi tổ hợp đổi */
  _buildDecorations() {
    const active = DECORATIONS.filter(([prop]) => this[prop]);
    const key = active.map(([prop]) => prop).join(',');
    if (key === this._decorKey && this._content.firstChild) return;
    this._decorKey = key;

    let node = this._slot;
    for (let i = active.length - 1; i >= 0; i--) {
      const [prop, tag] = active[i];
      node = createElement(tag, { part: prop }, node);
    }
    this._content.replaceChildren(node);
  }

  // =====================================================
  // CẮT CHỮ — phát hiện bị cắt để gắn title (tooltip native) + sự kiện
  // =====================================================

  /** Nội dung đang bị cắt (có dấu "…") hay không */
  get truncated() {
    return this._truncated;
  }

  _measure() {
    if (!this._hasRendered) return;
    const c = this._content;
    const rows = this.clampRows();
    let truncated = false;
    if (rows === 1) truncated = c.scrollWidth > c.clientWidth + 0.5;
    else if (rows > 1) truncated = c.scrollHeight > c.clientHeight + 0.5;

    // Chữ bị cắt → title chứa toàn văn (người dùng tự đặt title trên thẻ thì tôn trọng)
    if (truncated && !this.hasAttribute('title')) c.setAttribute('title', this.textContent.trim());
    else c.removeAttribute('title');

    if (truncated === this._truncated) return;
    this._truncated = truncated;
    this.setState('truncated', truncated);
    this.truncateChanged(truncated);
    this.emit('hui-ellipsis', { ellipsis: truncated });
  }

  /** Lớp con phản ứng khi trạng thái cắt chữ đổi */
  truncateChanged() {}

  // =====================================================
  // SAO CHÉP
  // =====================================================

  /** Sao chép nội dung (copy-text hoặc chữ hiển thị). Trả về true nếu thành công */
  async copy() {
    if (this.disabled) return false;
    const text = this.copyText ?? this.textContent.trim();
    const ok = await writeClipboard(text);
    if (!ok) return false;

    this._copied = true;
    this._syncCopyLabel();
    clearTimeout(this._copiedTimer);
    this._copiedTimer = setTimeout(() => {
      this._copied = false;
      this._syncCopyLabel();
    }, COPIED_DURATION);

    this.emit('hui-copy', { text });
    return true;
  }

  _syncCopyLabel() {
    const label = t(this._copied ? 'common.copied' : 'common.copy');
    this._copyIcon.setAttribute('name', this._copied ? 'check' : 'copy');
    this._copyBtn.classList.toggle('typo__copy--copied', this._copied);
    this._copyBtn.setAttribute('aria-label', label);
    this._copyBtn.title = label;
  }
}

export default HuiTypographyBase;
