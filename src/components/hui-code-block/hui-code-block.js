/**
 * HUI Code Block — Khối code (Molecule): tên file, nút copy (hui-copy), đánh số dòng, tô sáng dòng,
 * tô màu cú pháp tối giản cho js / ts / html / css / json / bash (xem highlight.js).
 * Code lấy từ attribute/property `code`, <template> con (giữ nguyên HTML) hoặc chữ trong thẻ.
 * Mọi nội dung đi qua textContent — không bao giờ chèn HTML của người dùng.
 */

import styles from './hui-code-block.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { tokenize, splitLines, parseLineRanges, dedent, normalizeLanguage } from './highlight.js';
import '../hui-copy/hui-copy.js';

/** Tên hiển thị của ngôn ngữ trên thanh tiêu đề */
const LANG_LABEL = { js: 'JavaScript', ts: 'TypeScript', html: 'HTML', css: 'CSS', json: 'JSON', bash: 'Bash' };

/**
 * Khối code chỉ đọc. Vùng <pre> nhận focus (tabindex=0) để cuộn bằng bàn phím khi code dài/rộng.
 *
 * @slot - Code dạng chữ (hoặc một <template> chứa HTML cần hiển thị nguyên văn)
 * @csspart base - Khung ngoài (<figure>)
 * @csspart header - Thanh tiêu đề (tên file / ngôn ngữ / nút copy)
 * @csspart filename - Tên file
 * @csspart language - Nhãn ngôn ngữ
 * @csspart copy - Nút hui-copy
 * @csspart pre - Vùng cuộn <pre>
 * @csspart code - Thẻ <code>
 * @csspart line - Mỗi dòng; dòng tô sáng có thêm line-highlight
 * @csspart line-number - Số dòng
 * @cssprop --hui-code-block-bg - Nền vùng code
 * @cssprop --hui-code-block-color - Màu chữ mặc định
 * @cssprop --hui-code-block-header-bg - Nền thanh tiêu đề
 * @cssprop --hui-code-block-border-color - Màu viền
 * @cssprop --hui-code-block-radius - Bo góc
 * @cssprop --hui-code-block-font-family - Font (mặc định mono)
 * @cssprop --hui-code-block-font-size - Cỡ chữ
 * @cssprop --hui-code-block-line-height - Chiều cao dòng (số không đơn vị)
 * @cssprop --hui-code-block-padding - Khoảng đệm vùng code
 * @cssprop --hui-code-block-tab-size - Độ rộng tab
 * @cssprop --hui-code-block-highlight-bg - Nền dòng tô sáng
 * @cssprop --hui-code-block-highlight-border - Vạch trái dòng tô sáng
 * @cssprop --hui-code-block-line-number-color - Màu số dòng
 * @cssprop --hui-code-block-comment - Màu chú thích
 * @cssprop --hui-code-block-keyword - Màu từ khóa
 * @cssprop --hui-code-block-string - Màu chuỗi
 * @cssprop --hui-code-block-number - Màu số / màu hex / entity
 * @cssprop --hui-code-block-function - Màu tên hàm / lệnh
 * @cssprop --hui-code-block-tag - Màu tên thẻ HTML / selector CSS
 * @cssprop --hui-code-block-attr - Màu thuộc tính HTML / cờ bash
 * @cssprop --hui-code-block-property - Màu thuộc tính CSS / khóa JSON
 * @cssprop --hui-code-block-punctuation - Màu dấu câu / toán tử
 */
class HuiCodeBlock extends HuiElement {
  static properties = {
    /** Code cần hiển thị (ưu tiên hơn nội dung trong thẻ) */
    code: { type: String },
    /** js | ts | html | css | json | bash (kèm bí danh javascript, typescript, xml, svg, sh, shell…); khác = không tô màu */
    language: { type: String },
    /** Tên file hiện trên thanh tiêu đề */
    filename: { type: String },
    /** Hiện số dòng */
    lineNumbers: { type: Boolean },
    /** Dòng tô sáng, vd "2,4-6" */
    highlight: { type: String },
    /** Chiều cao tối đa vùng code (số = px, hoặc độ dài CSS) — dài hơn thì cuộn */
    maxHeight: { type: String },
    /** Xuống dòng thay vì cuộn ngang */
    wrap: { type: Boolean },
    /** Ẩn nút copy */
    noCopy: { type: Boolean },
    /** Ẩn thanh tiêu đề (nút copy chuyển thành nổi ở góc) */
    noHeader: { type: Boolean },
    /** Số bắt đầu đánh dòng */
    startLine: { type: Number, default: 1 },
  };

  static styles = styles;

  constructor() {
    super();
    this._observer = null;
    this._source = '';
  }

  /** Code đang hiển thị (đã bỏ thụt lề chung) */
  get displayedCode() {
    return this._source;
  }

  connectedCallback() {
    super.connectedCallback();
    // Code nằm trong thẻ có thể đổi sau (framework render muộn) → theo dõi để vẽ lại
    this._observer = new MutationObserver(() => {
      if (this.code === null || this.code === undefined) this._renderCode();
    });
    this._observer.observe(this, { childList: true, characterData: true, subtree: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = null;
  }

  render() {
    this._filename = createElement('span', { className: 'cb__filename', part: 'filename' });
    this._lang = createElement('span', { className: 'cb__lang', part: 'language' });
    this._copy = createElement('hui-copy', { className: 'cb__copy', part: 'copy', size: 'sm', variant: 'text' });
    this._header = createElement('figcaption', { className: 'cb__header', part: 'header' },
      this._filename, this._lang);
    this._code = createElement('code', { className: 'cb__code', part: 'code' });
    this._pre = createElement('pre', { className: 'cb__pre', part: 'pre', tabindex: '0' }, this._code);
    this._body = createElement('div', { className: 'cb__body' }, this._pre);
    this._base = createElement('figure', { className: 'cb', part: 'base' }, this._header, this._body);
    return this._base;
  }

  updated(changed) {
    if (changed.has('wrap') || changed.has('lineNumbers')) {
      this._base.classList.toggle('cb--wrap', this.wrap);
      this._base.classList.toggle('cb--numbers', this.lineNumbers);
    }
    if (changed.has('maxHeight')) {
      const h = this.maxHeight;
      this._pre.style.maxHeight = !h ? '' : (/^\d+(\.\d+)?$/.test(h) ? `${h}px` : h);
    }
    if (['filename', 'language', 'noCopy', 'noHeader'].some((k) => changed.has(k))) this._syncHeader();
    if (['code', 'language', 'lineNumbers', 'highlight', 'startLine'].some((k) => changed.has(k))) this._renderCode();
  }

  _syncHeader() {
    const lang = normalizeLanguage(this.language);
    this._filename.textContent = this.filename || '';
    this._filename.hidden = !this.filename;
    this._lang.textContent = LANG_LABEL[lang] || (this.language || '').toUpperCase();
    this._lang.hidden = !this._lang.textContent;
    const headerVisible = !this.noHeader && Boolean(this.filename || this._lang.textContent || !this.noCopy);
    this._header.hidden = !headerVisible;
    this._copy.hidden = this.noCopy;
    // Nút copy: trên thanh tiêu đề, hoặc nổi ở góc vùng code khi không có thanh tiêu đề
    (headerVisible ? this._header : this._body).append(this._copy);
    this._copy.classList.toggle('cb__copy--float', !headerVisible);
  }

  /** Lấy code: property → <template> con (HTML nguyên văn) → chữ trong thẻ */
  _readSource() {
    if (this.code !== null && this.code !== undefined) return String(this.code);
    const tpl = [...this.children].find((c) => c.tagName === 'TEMPLATE');
    if (tpl) return tpl.innerHTML;
    return this.textContent;
  }

  _renderCode() {
    if (!this._code) return;
    const source = dedent(this._readSource());
    this._source = source;
    this._copy.value = source;

    const hl = parseLineRanges(this.highlight);
    const start = Number.isFinite(Number(this.startLine)) ? Number(this.startLine) : 1;
    const lines = splitLines(tokenize(source, this.language));
    const rows = lines.map((tokens, i) => {
      const n = start + i;
      const marked = hl.has(n);
      const content = createElement('span', { className: 'cb__lc' });
      for (const tok of tokens) {
        content.append(tok.type === 'plain'
          ? document.createTextNode(tok.text)
          : createElement('span', { className: `tok tok-${tok.type}` }, tok.text));
      }
      const row = createElement('span', {
        className: `cb__line${marked ? ' cb__line--hl' : ''}`,
        part: marked ? 'line line-highlight' : 'line',
        'data-line': String(n),
      });
      if (this.lineNumbers) {
        row.append(createElement('span', { className: 'cb__ln', part: 'line-number', 'aria-hidden': 'true' }, String(n)));
      }
      row.append(content);
      return row;
    });
    this._code.replaceChildren(...rows);
    this._base.style.setProperty('--_cb-digits', String(String(start + lines.length - 1).length));
  }
}

defineElement('hui-code-block', HuiCodeBlock);

export default HuiCodeBlock;
