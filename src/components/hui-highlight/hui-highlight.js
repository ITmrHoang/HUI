/**
 * HUI Highlight — Tô sáng từ khóa tìm kiếm trong đoạn chữ (Atom).
 * Nguồn chữ: attribute `text` hoặc nội dung light DOM (giữ định dạng <b>, <a>… — chỉ nhân bản node + textContent,
 * KHÔNG dùng innerHTML). Mặc định so khớp không dấu tiếng Việt + không phân biệt hoa thường.
 */

import styles from './hui-highlight.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/** Thẻ không mang chữ hiển thị → bỏ qua khi dựng bản sao */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT']);

/** Bỏ dấu 1 ký tự (giữ hoa/thường): "Ầ" → "A", "đ" → "d", dấu kết hợp rời → "" */
const stripMarks = (c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

/**
 * Tách query thành các từ: khoảng trắng tách từ, "cụm trong ngoặc kép" giữ nguyên cụm.
 * @param {string | string[]} query
 * @returns {string[]}
 */
export function parseQuery(query) {
  if (Array.isArray(query)) return query.map((q) => String(q ?? '').trim()).filter(Boolean);
  const out = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m;
  while ((m = re.exec(String(query ?? '')))) {
    const term = (m[1] ?? m[2]).trim();
    if (term) out.push(term);
  }
  return out;
}

/**
 * Tìm các đoạn khớp `query` trong `text`.
 * Chuẩn hóa từng ký tự và ghi lại chỉ số gốc → vị trí trả về luôn đúng trên chuỗi CÓ dấu.
 * @param {string} text
 * @param {string | string[]} query - nhiều từ cách nhau bằng khoảng trắng, "cụm từ" trong ngoặc kép, hoặc mảng
 * @param {{caseSensitive?: boolean, diacritics?: 'sensitive' | 'insensitive', maxMarks?: number}} [opts]
 * @returns {Array<[number, number]>} các khoảng [start, end) đã sắp xếp, gộp chồng lấn, cắt theo maxMarks
 */
export function highlightText(text, query, { caseSensitive = false, diacritics = 'insensitive', maxMarks = 0 } = {}) {
  const src = String(text ?? '');
  const fold = (s) => {
    const v = diacritics === 'sensitive' ? s : stripMarks(s);
    return caseSensitive ? v : v.toLowerCase();
  };
  const terms = [...new Set(parseQuery(query).map((q) => fold(q.normalize('NFC'))).filter(Boolean))];
  if (!terms.length || !src) return [];

  // norm: chuỗi đã chuẩn hóa; map[k] = chỉ số ký tự gốc sinh ra norm[k]; pieces[i] = phần chuẩn hóa của ký tự gốc i
  let norm = '';
  const map = [];
  const pieces = [];
  for (let i = 0; i < src.length; i++) {
    const f = fold(src[i]);
    pieces.push(f);
    for (let k = 0; k < f.length; k++) {
      norm += f[k];
      map.push(i);
    }
  }

  const ranges = [];
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const idx = norm.indexOf(term, from);
      if (idx < 0) break;
      const start = map[idx];
      let end = map[idx + term.length - 1] + 1;
      // Dấu kết hợp rời (chuỗi dạng NFD) ngay sau đoạn khớp thuộc về ký tự cuối
      while (end < src.length && pieces[end] === '') end++;
      ranges.push([start, end]);
      from = idx + term.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);

  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return maxMarks > 0 ? merged.slice(0, maxMarks) : merged;
}

/**
 * Bọc các đoạn khớp trong <mark part="mark">. Không nhận focus, không có sự kiện.
 *
 * @slot - Đoạn chữ cần tô (có thể chứa thẻ định dạng). Bị bỏ qua khi có attribute `text`
 * @csspart base - Khung chứa bản sao đã tô
 * @csspart mark - Mỗi đoạn khớp (<mark>)
 * @cssprop --hui-highlight-bg - Nền đoạn khớp (mặc định màu warning nhạt)
 * @cssprop --hui-highlight-color - Màu chữ đoạn khớp (mặc định kế thừa)
 * @cssprop --hui-highlight-font-weight - Độ đậm đoạn khớp (mặc định kế thừa)
 * @cssprop --hui-highlight-radius - Bo góc đoạn khớp (mặc định 2px)
 * @cssprop --hui-highlight-padding - Đệm đoạn khớp (mặc định 0 1px)
 */
class HuiHighlight extends HuiElement {
  static properties = {
    /** Từ khóa: nhiều từ cách nhau bằng khoảng trắng, "cụm từ" trong ngoặc kép giữ nguyên cụm */
    query: { type: String },
    /** Chữ nguồn (thay cho nội dung slot) */
    text: { type: String },
    /** Phân biệt chữ hoa / thường */
    caseSensitive: { type: Boolean },
    /** insensitive | sensitive — insensitive: "ha noi" khớp "Hà Nội" (mặc định) */
    diacritics: { type: String, default: 'insensitive' },
    /** Số đoạn tô tối đa (0 = không giới hạn) */
    maxMarks: { type: Number, default: 0 },
  };

  static styles = styles;

  constructor() {
    super();
    this._ranges = [];
    this._queued = false;
  }

  render() {
    // Slot nằm trong khung ẩn: nội dung gốc không hiển thị, chỉ dùng làm nguồn để dựng bản sao
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._schedule());
    this._source = createElement('span', { hidden: true }, this._slot);
    this._base = createElement('span', { className: 'hl', part: 'base' });
    return [this._base, this._source];
  }

  connectedCallback() {
    super.connectedCallback();
    // Chữ trong light DOM đổi (characterData) không làm slotchange → theo dõi bằng MutationObserver
    this._mo = new MutationObserver(() => this._schedule());
    this._mo.observe(this, { childList: true, subtree: true, characterData: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mo?.disconnect();
    this._mo = null;
  }

  updated() {
    this._build();
  }

  /** Số đoạn đang được tô (chỉ đọc) */
  get matchCount() {
    return this._ranges.length;
  }

  /** Các khoảng [start, end) đang tô, tính trên chữ nguồn (chỉ đọc) */
  get ranges() {
    return this._ranges.map((r) => [...r]);
  }

  _schedule() {
    if (this._queued) return;
    this._queued = true;
    queueMicrotask(() => {
      this._queued = false;
      if (this._hasRendered) this._build();
    });
  }

  _options() {
    return {
      caseSensitive: this.caseSensitive,
      diacritics: this.diacritics === 'sensitive' ? 'sensitive' : 'insensitive',
      maxMarks: this.maxMarks > 0 ? Math.floor(this.maxMarks) : 0,
    };
  }

  /** Dựng bản sao đã tô từ `text` hoặc light DOM */
  _build() {
    const useText = this.text !== null && this.text !== undefined;
    const sources = useText ? [document.createTextNode(this.text)] : [...this.childNodes];

    // Gom chữ theo đúng thứ tự node văn bản (bỏ script/style)
    let full = '';
    const collect = (node) => {
      if (node.nodeType === Node.TEXT_NODE) full += node.data;
      else if (node.nodeType === Node.ELEMENT_NODE && !SKIP_TAGS.has(node.tagName)) node.childNodes.forEach(collect);
    };
    sources.forEach(collect);

    const ranges = this.query ? highlightText(full, this.query, this._options()) : [];
    this._ranges = ranges;

    // Duyệt lại, cắt từng node văn bản theo các khoảng → text node + <mark> (chỉ textContent)
    let offset = 0;
    let ri = 0;
    const splitText = (data) => {
      const out = [];
      const start = offset;
      const end = offset + data.length;
      let pos = start;
      while (ri < ranges.length && ranges[ri][0] < end) {
        const [a, b] = ranges[ri];
        const from = Math.max(a, pos);
        const to = Math.min(b, end);
        if (from > pos) out.push(document.createTextNode(data.slice(pos - start, from - start)));
        if (to > from) {
          const mark = document.createElement('mark');
          mark.setAttribute('part', 'mark');
          mark.className = 'hl__mark';
          mark.textContent = data.slice(from - start, to - start);
          out.push(mark);
        }
        pos = Math.max(pos, to);
        if (b <= end) ri++;
        else break; // khoảng còn kéo sang node văn bản kế tiếp
      }
      if (pos < end) out.push(document.createTextNode(data.slice(pos - start)));
      offset = end;
      return out;
    };
    const copy = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return splitText(node.data);
      if (node.nodeType !== Node.ELEMENT_NODE || SKIP_TAGS.has(node.tagName)) return [];
      const el = node.cloneNode(false);
      el.removeAttribute('id');
      el.removeAttribute('slot');
      for (const child of node.childNodes) el.append(...copy(child));
      return [el];
    };
    this._base.replaceChildren(...sources.flatMap(copy));
    this.setState('matched', ranges.length > 0);
  }
}

defineElement('hui-highlight', HuiHighlight);

export default HuiHighlight;
