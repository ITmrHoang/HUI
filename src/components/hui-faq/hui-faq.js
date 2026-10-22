/**
 * HUI FAQ — Khối câu hỏi thường gặp (Organism), xây trên hui-collapse + DataController.
 * Hai cách dùng: `data=[{question, answer, category}]` hoặc viết sẵn <hui-collapse-panel> bên trong.
 * Tìm kiếm không phân biệt hoa/thường + dấu tiếng Việt, tô sáng bằng <mark> (tách text node, không innerHTML).
 */

import styles from './hui-faq.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { DataController } from '../../core/data-controller.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import { inView } from '../../utils/scroll.js';
import { ANIMATIONS } from '../../utils/animate.js';
import { ensureElement, renderLazyStateView } from '../hui-data-view/lazy-elements.js';
import '../hui-collapse/index.js';
import '../hui-button/index.js';
import '../hui-icon/index.js';
import '../hui-empty/index.js';
// Tải động khi dùng tới: hui-input (search), hui-tabs (group-by-category="tabs"), hui-skeleton / hui-result (trạng thái)

/** Chuỗi chưa có trong locale.js → chuỗi dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  vi: {
    'faq.searchPlaceholder': 'Tìm câu hỏi...',
    'faq.expandAll': 'Mở tất cả',
    'faq.collapseAll': 'Thu gọn tất cả',
    'faq.noResults': 'Không tìm thấy câu hỏi phù hợp',
    'faq.resultCount': '{count} câu hỏi phù hợp',
    'faq.all': 'Tất cả',
    'faq.other': 'Khác',
  },
  en: {
    'faq.searchPlaceholder': 'Search questions...',
    'faq.expandAll': 'Expand all',
    'faq.collapseAll': 'Collapse all',
    'faq.noResults': 'No matching questions',
    'faq.resultCount': '{count} matching questions',
    'faq.all': 'All',
    'faq.other': 'Other',
  },
};
function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

const VARIANTS = ['default', 'ghost', 'card', 'separated'];
const ALL_KEY = '__all';

// =====================================================
// CHUẨN HÓA CHỮ: bỏ dấu tiếng Việt + không phân biệt hoa/thường
// =====================================================

const COMBINING = /[̀-ͯ]/g;

/** "Trả HÀNG" → "tra hang" (NFD rồi bỏ dấu tổ hợp; đ/Đ không tách được bằng NFD nên đổi tay) */
export function foldText(str) {
  return String(str ?? '').normalize('NFD').replace(COMBINING, '').replace(/[đĐ]/g, 'd').toLowerCase();
}

const isHighSurrogate = (code) => code >= 0xd800 && code <= 0xdbff;

/**
 * Chuẩn hóa từng ký tự và giữ bản đồ vị trí: map[i] = chỉ số trong chuỗi GỐC của ký tự thứ i (đã chuẩn hóa)
 * → tìm trên chuỗi đã chuẩn hóa nhưng cắt <mark> đúng vị trí trên chuỗi gốc.
 */
function foldWithMap(str) {
  let text = '';
  const map = [];
  for (let i = 0; i < str.length; i++) {
    const width = isHighSurrogate(str.charCodeAt(i)) && i + 1 < str.length ? 2 : 1;
    const folded = foldText(str.slice(i, i + width));
    for (let k = 0; k < folded.length; k++) {
      text += folded[k];
      map.push(i);
    }
    i += width - 1;
  }
  return { text, map };
}

/** Các đoạn [start, end) trên chuỗi gốc khớp với 1 trong các từ khóa (đã gộp đoạn chồng nhau) */
function findRanges(str, tokens) {
  const { text, map } = foldWithMap(str);
  const ranges = [];
  for (const token of tokens) {
    let from = 0;
    let idx;
    while ((idx = text.indexOf(token, from)) !== -1) {
      const start = map[idx];
      const lastIdx = map[idx + token.length - 1];
      let end = lastIdx + (isHighSurrogate(str.charCodeAt(lastIdx)) ? 2 : 1);
      // Chuỗi gốc dạng NFD: nuốt luôn dấu tổ hợp đi sau ký tự cuối
      while (end < str.length && foldText(str[end]) === '') end++;
      ranges.push([start, end]);
      from = idx + token.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

const MARK_ATTR = 'data-hui-faq-mark';

/** Tạo <mark> bằng DOM — style inline (dùng biến CSS) để chạy cả khi nằm ở light DOM */
function createMark(text) {
  const mark = document.createElement('mark');
  mark.setAttribute(MARK_ATTR, '');
  mark.textContent = text;
  mark.style.background = 'var(--hui-faq-mark-bg, var(--hui-warning-3))';
  mark.style.color = 'var(--hui-faq-mark-color, inherit)';
  mark.style.borderRadius = 'var(--hui-faq-mark-radius, 2px)';
  mark.style.padding = '0';
  return mark;
}

/** Tô sáng từ khóa trong mọi text node của `root` (bỏ qua nhánh mà `skip(el)` trả true) */
function highlight(root, tokens, skip) {
  if (!root || !tokens.length) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      for (let p = node.parentNode; p && p !== root; p = p.parentNode) {
        if (p.localName === 'script' || p.localName === 'style' || skip?.(p)) return NodeFilter.FILTER_REJECT;
      }
      return node.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const str = node.data;
    const ranges = findRanges(str, tokens);
    if (!ranges.length) continue;
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const [start, end] of ranges) {
      if (start > pos) frag.append(document.createTextNode(str.slice(pos, start)));
      frag.append(createMark(str.slice(start, end)));
      pos = end;
    }
    if (pos < str.length) frag.append(document.createTextNode(str.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  }
}

/** Gỡ <mark> đã chèn, gộp lại text node liền kề */
function clearHighlight(root) {
  if (!root) return;
  const parents = new Set();
  for (const mark of root.querySelectorAll(`mark[${MARK_ATTR}]`)) {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parents.add(parent);
  }
  parents.forEach((p) => p.normalize());
}

/** Chữ của panel viết tay: các con không có slot (bỏ header / extra / icon) */
function lightAnswerText(panel) {
  let text = '';
  for (const node of panel.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.data;
    else if (node.nodeType === Node.ELEMENT_NODE && !node.hasAttribute('slot')) text += ` ${node.textContent}`;
  }
  return text.replace(/\s+/g, ' ').trim();
}

let uid = 0;

/**
 * Danh sách câu hỏi thường gặp: ô tìm kiếm, mở/thu tất cả, nhóm theo chủ đề (tabs | headings),
 * JSON-LD FAQPage cho SEO, hiệu ứng hiện lần lượt khi cuộn tới.
 *
 * Dữ liệu: `data` = [{ question, answer, category?, key?, active?, answerHtml? }] (hoặc `src` / `fetchFn`).
 * `answer` luôn hiển thị bằng textContent. `answerHtml` CHỈ được dùng khi bật `allow-html`
 * (chèn bằng innerHTML → nguy cơ XSS nếu nội dung đến từ người dùng; chỉ dùng với HTML tin cậy/đã lọc).
 * Viết tay: đặt <hui-collapse-panel header="..." data-category="..."> trực tiếp bên trong — hui-faq
 * gom chúng vào hui-collapse ở light DOM (giữ nguyên nội dung, `active`, `key` của bạn).
 *
 * @fires hui-search - Người dùng gõ tìm kiếm. detail: { query, matches }
 * @fires change - (từ hui-collapse bên trong) panel được mở/đóng. detail: { activeKeys }
 * @fires hui-category-change - Đổi tab chủ đề. detail: { category } ('' = tất cả)
 * @fires hui-load - (DataController) tải xong src / fetchFn. detail: { data, total }
 * @fires hui-error - (DataController) tải lỗi. detail: { error }
 * @slot - Các <hui-collapse-panel> viết tay (khi không dùng data / src)
 * @csspart base - Khung ngoài
 * @csspart toolbar - Hàng công cụ (ô tìm + nút mở tất cả)
 * @csspart search - hui-input tìm kiếm
 * @csspart expand-button - hui-button "Mở tất cả / Thu gọn tất cả"
 * @csspart tabs - hui-tabs chủ đề (group-by-category="tabs")
 * @csspart body - Vùng chứa danh sách + trạng thái
 * @csspart list - Danh sách nhóm
 * @csspart group - Mỗi nhóm (chủ đề)
 * @csspart category - Tiêu đề chủ đề (group-by-category="headings")
 * @csspart collapse - hui-collapse của nhóm (chỉ khi dùng data)
 * @csspart question - Chữ câu hỏi (chỉ khi dùng data)
 * @csspart answer - Khối câu trả lời (chỉ khi dùng data)
 * @csspart empty - hui-empty khi tìm không thấy
 * @csspart state - Vùng loading / empty / error của dữ liệu
 * @cssprop --hui-faq-gap - Khoảng cách toolbar ↔ tabs ↔ danh sách
 * @cssprop --hui-faq-group-gap - Khoảng cách giữa các nhóm chủ đề
 * @cssprop --hui-faq-category-color - Màu tiêu đề chủ đề
 * @cssprop --hui-faq-category-font-size - Cỡ chữ tiêu đề chủ đề
 * @cssprop --hui-faq-question-font-weight - Độ đậm câu hỏi (chỉ khi dùng data)
 * @cssprop --hui-faq-answer-color - Màu chữ câu trả lời (chỉ khi dùng data)
 * @cssprop --hui-faq-search-max-width - Chiều rộng tối đa ô tìm
 * @cssprop --hui-faq-mark-bg - Nền chữ được tô sáng
 * @cssprop --hui-faq-mark-color - Màu chữ được tô sáng
 * @cssprop --hui-faq-mark-radius - Bo góc chữ được tô sáng
 * @cssprop --hui-faq-card-bg - Nền khung (variant card)
 * @cssprop --hui-faq-card-shadow - Bóng khung (variant card)
 * @cssprop --hui-faq-item-bg - Nền từng mục (variant separated)
 * @cssprop --hui-faq-item-border-color - Viền từng mục (variant separated)
 * @cssprop --hui-faq-item-radius - Bo góc từng mục (variant separated)
 * @cssprop --hui-faq-item-gap - Khoảng cách giữa các mục (variant separated)
 * @cssprop --hui-faq-item-shadow - Bóng từng mục (variant separated)
 */
class HuiFaq extends DataController(HuiElement) {
  static properties = {
    /** Hiện ô tìm kiếm (lọc câu hỏi + câu trả lời, bỏ dấu, tô sáng kết quả) */
    search: { type: Boolean },
    /** Từ khóa đang tìm (gán được bằng code) */
    query: { type: String, default: '' },
    /** Chữ gợi ý trong ô tìm (mặc định theo locale) */
    searchPlaceholder: { type: String },
    /** Hiện nút "Mở tất cả / Thu gọn tất cả" (ẩn khi accordion) */
    expandAll: { type: Boolean },
    /** Chỉ mở tối đa 1 câu hỏi cùng lúc (trong mỗi nhóm) */
    accordion: { type: Boolean },
    /** default | ghost | card | separated — default: khung viền; ghost: trong suốt; card: khung nổi có bóng; separated: mỗi câu là một thẻ rời */
    variant: { type: String, default: 'default' },
    /** sm | md | lg — khoảng đệm (truyền xuống hui-collapse) */
    size: { type: String, default: 'md' },
    /** start | end — vị trí mũi tên */
    expandIconPosition: { type: String, default: 'start' },
    /** tabs | headings — nhóm theo `category`: tabs (thanh tab, có "Tất cả") hoặc tiêu đề từng nhóm; attribute rỗng = tabs */
    groupByCategory: { type: String, default: null },
    /** Chủ đề đang chọn ở chế độ tabs ('' = tất cả) */
    activeCategory: { type: String, default: '' },
    /** Chèn JSON-LD FAQPage vào <head> (giữ đồng bộ, tự gỡ khi tháo khỏi trang) */
    seo: { type: Boolean },
    /** Cho phép `answerHtml` (innerHTML — nguy cơ XSS, chỉ dùng với HTML tin cậy) */
    allowHtml: { type: Boolean },
    /** Tắt hiệu ứng hiện lần lượt khi cuộn tới */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    /** [{ panel, header, body, category, light, item }] */
    this._items = [];
    /** [{ category, label, section, collapse, panels }] */
    this._groups = [];
    this._lightPanels = [];
    this._categories = [];
    this._revealed = false;
    this._revealStop = null;
    this._seoScript = null;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    // Toolbar: ô tìm + nút mở/thu tất cả
    this._searchIcon = createElement('hui-icon', { name: 'search', slot: 'prefix' });
    this._input = createElement('hui-input', {
      className: 'faq__search', part: 'search', type: 'search', clearable: true,
    }, this._searchIcon);
    this._input.addEventListener('input', (e) => {
      e.stopPropagation();
      this.query = e.detail?.value ?? this._input.value ?? '';
      this._afterUserSearch();
    });
    this._input.addEventListener('clear', (e) => e.stopPropagation());
    this._input.addEventListener('change', (e) => e.stopPropagation());
    this._input.addEventListener('hui-search', (e) => e.stopPropagation());

    this._expandBtn = createElement('hui-button', {
      className: 'faq__expand', part: 'expand-button', variant: 'text', size: 'sm', icon: 'chevron-down',
    });
    this._expandBtn.addEventListener('click', () => this._toggleAll());

    this._toolbar = createElement('div', { className: 'faq__toolbar', part: 'toolbar' }, this._input, this._expandBtn);

    // Tabs chủ đề: thân danh sách được chuyển vào tab-panel đang mở (đúng vai trò tabpanel)
    this._tabs = createElement('hui-tabs', { className: 'faq__tabs', part: 'tabs', hidden: true });
    this._tabs.addEventListener('change', (e) => {
      if (e.target !== this._tabs) return; // change của hui-collapse bên trong nổi bọt qua đây
      e.stopPropagation();
      const key = e.detail?.key;
      const cat = key === ALL_KEY ? '' : this._categories[Number(String(key).slice(1))]?.name ?? '';
      this.activeCategory = cat;
      this.emit('hui-category-change', { category: cat });
    });

    // Thân: trạng thái dữ liệu + danh sách + kết quả rỗng + vùng đọc số kết quả
    this._state = createElement('div', { className: 'faq__state', part: 'state', hidden: true });
    this._list = createElement('div', { className: 'faq__list', part: 'list' });
    this._empty = createElement('hui-empty', { className: 'faq__empty', part: 'empty', hidden: true });
    this._status = createElement('div', { className: 'faq__sr-only', role: 'status', 'aria-live': 'polite' });
    this._body = createElement('div', { className: 'faq__body', part: 'body' }, this._state, this._list, this._empty, this._status);

    this._base = createElement('div', { className: 'faq', part: 'base' }, this._toolbar, this._tabs, this._body);

    // Mở/đóng panel → cập nhật chữ nút "Mở tất cả"
    this.addEventListener('change', (e) => {
      if (e.composedPath()[0]?.localName === 'hui-collapse') queueMicrotask(() => this._syncExpandButton());
    });
    return this._base;
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback();
    // Theo dõi <hui-collapse-panel> viết tay được thêm vào sau
    this._mo ||= new MutationObserver((records) => {
      const added = records.some((r) => [...r.addedNodes].some((n) => n.localName === 'hui-collapse-panel' && n.parentNode === this));
      if (added && !this._isDataMode) this._rebuild();
    });
    this._mo.observe(this, { childList: true });
    if (reconnect) {
      this._syncSeo();
      this._setupReveal();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mo?.disconnect();
    this._revealStop?.();
    this._revealStop = null;
    this._removeSeo();
  }

  updated(changed) {
    super.updated(changed);

    if (changed.has('search')) this._input.hidden = !this.search;
    if (this.search) ensureElement('hui-input');
    if (changed.has('searchPlaceholder') || changed.has('locale')) {
      this._input.placeholder = this.searchPlaceholder || tx('faq.searchPlaceholder');
    }
    if (changed.has('query') && (this._input.value ?? '') !== (this.query || '')) this._input.value = this.query || '';
    if (changed.has('locale')) this._empty.description = tx('faq.noResults');

    const rebuild = ['data', 'allowHtml', 'groupByCategory', 'locale'].some((k) => changed.has(k));
    if (rebuild) this._rebuild();
    else {
      if (['accordion', 'variant', 'size', 'expandIconPosition'].some((k) => changed.has(k))) this._applyCollapseProps();
      if (changed.has('activeCategory')) this._syncTabs();
      if (['query', 'activeCategory', 'variant'].some((k) => changed.has(k))) this._applyFilter();
    }
    if (changed.has('seo')) this._syncSeo();

    if (changed.has('variant')) {
      const variant = VARIANTS.includes(this.variant) ? this.variant : 'default';
      this._base.className = `faq faq--${variant}`;
    }
    if (changed.has('noAnimation') && this.noAnimation) this._reveal(false);

    if (['data', 'dataState', 'loading', 'emptyText', 'src', 'fetchFn', 'locale'].some((k) => changed.has(k))) {
      if (this._isDataMode) renderLazyStateView(this, this._state);
      else {
        this._state.hidden = true;
        this._state.replaceChildren();
      }
    }
    this._list.hidden = this._isDataMode && this.dataState !== 'ready';

    this._toolbar.hidden = !this.search && !this.expandAll;
    this._syncExpandButton();
  }

  // =====================================================
  // DỰNG DANH SÁCH
  // =====================================================

  /** Đang dùng data / src / fetchFn (ngược lại: panel viết tay ở light DOM) */
  get _isDataMode() {
    return this.data != null || Boolean(this.src) || Boolean(this.fetchFn);
  }

  /** '' | 'tabs' | 'headings' */
  get _groupMode() {
    const g = this.groupByCategory;
    if (g === null || g === undefined || g === 'false') return '';
    return g === 'headings' ? 'headings' : 'tabs';
  }

  /** Dựng lại toàn bộ mục + nhóm (khi dữ liệu / cách nhóm / panel viết tay đổi) */
  _rebuild() {
    const dataMode = this._isDataMode;
    const oldActive = new Set(this._items.filter((x) => x.panel.active).map((x) => x.key));
    const firstBuild = !this._built;
    this._built = true;

    // 1. Thu thập mục
    let items;
    if (dataMode) {
      const list = Array.isArray(this.data) ? this.data : [];
      items = list.map((raw, index) => this._createDataItem(raw, index, firstBuild ? Boolean(raw?.active) : null, oldActive));
    } else {
      items = this._collectLightItems();
    }
    this._items = items;

    // 2. Chủ đề theo thứ tự xuất hiện
    const names = [];
    for (const it of items) if (!names.includes(it.category)) names.push(it.category);
    this._categories = names.map((name, i) => ({ name, key: `c${i}`, label: name || tx('faq.other') }));

    // 3. Nhóm: headings → mỗi chủ đề 1 nhóm; còn lại 1 nhóm duy nhất
    const mode = this._groupMode;
    const groupDefs = mode === 'headings'
      ? this._categories.map((c) => ({ category: c.name, label: c.label, items: items.filter((x) => x.category === c.name) }))
      : [{ category: null, label: null, items }];

    // 4. Gắn vào DOM
    const oldLightCollapses = [...this.children].filter((el) => el.hasAttribute('data-hui-faq-collapse'));
    this._groups = groupDefs.map((def, gi) => this._createGroup(def, gi, dataMode));
    this._list.replaceChildren(...this._groups.map((g) => g.section));
    if (!dataMode) {
      oldLightCollapses.forEach((c) => c.remove());
      this.append(...this._groups.map((g) => g.collapse));
      this._mo?.takeRecords(); // bỏ qua thay đổi do chính mình
    }

    this._buildTabs();
    this._applyCollapseProps();
    this._applyFilter();
    this._syncSeo();
    this._syncExpandButton();
    if (items.length) this._setupReveal();
  }

  _createDataItem(raw, index, initialActive, oldActive) {
    const item = raw && typeof raw === 'object' ? raw : { question: String(raw ?? '') };
    const key = String(item.key ?? item.id ?? `faq-${index}`);
    const panel = createElement('hui-collapse-panel', { key });
    const header = createElement('span', { slot: 'header', className: 'faq__question', part: 'question' });
    header.textContent = String(item.question ?? '');
    const body = createElement('div', { className: 'faq__answer', part: 'answer' });
    if (this.allowHtml && item.answerHtml != null) {
      // Developer chủ động bật allow-html → tin tưởng nội dung (xem cảnh báo XSS trong docs)
      body.innerHTML = String(item.answerHtml);
    } else {
      body.textContent = String(item.answer ?? '');
    }
    panel.append(header, body);
    if (initialActive || oldActive.has(key)) panel.active = true;
    return {
      key, panel, header, body, light: false, item,
      category: item.category == null ? '' : String(item.category),
      question: () => header.textContent,
      answer: () => body.textContent.replace(/\s+/g, ' ').trim(),
    };
  }

  /** Panel viết tay: con trực tiếp mới + panel đã gom từ trước (giữ thứ tự) */
  _collectLightItems() {
    const known = this._lightPanels.filter((p) => this.contains(p));
    const direct = [...this.children].filter((el) => el.localName === 'hui-collapse-panel');
    for (const p of direct) if (!known.includes(p)) known.push(p);
    this._lightPanels = known;

    return known.map((panel, index) => {
      let header = [...panel.children].find((el) => el.getAttribute('slot') === 'header');
      if (!header) {
        // Đưa attribute header thành slot="header" để tô sáng được từ khóa
        header = createElement('span', { slot: 'header', 'data-hui-faq-header': '' });
        header.textContent = panel.getAttribute('header') || '';
        panel.prepend(header);
      }
      return {
        key: panel.getAttribute('key') ?? `light-${index}`,
        panel, header, body: panel, light: true, item: null,
        category: panel.dataset.category ?? panel.getAttribute('category') ?? '',
        question: () => header.textContent.replace(/\s+/g, ' ').trim(),
        answer: () => lightAnswerText(panel),
      };
    });
  }

  _createGroup(def, gi, dataMode) {
    const collapse = createElement('hui-collapse', { className: 'faq__collapse' });
    if (dataMode) collapse.setAttribute('part', 'collapse');
    // Panel đang mở → active-key (key thật hoặc chỉ số trong nhóm, giống hui-collapse)
    const active = [];
    def.items.forEach((it, i) => {
      if (it.panel.active) active.push(it.panel.getAttribute('key') ?? String(i));
    });
    collapse.activeKey = active;
    collapse.append(...def.items.map((it) => it.panel));

    const section = createElement('section', { className: 'faq__group', part: 'group' });
    let heading = null;
    if (def.label !== null) {
      heading = createElement('h3', { className: 'faq__category', part: 'category', id: `hui-faq-${this._uid}-g${gi}` });
      heading.textContent = def.label;
      section.setAttribute('aria-labelledby', heading.id);
      section.append(heading);
    }
    if (dataMode) {
      section.append(collapse);
    } else {
      const name = `group-${gi}`;
      collapse.setAttribute('slot', name);
      collapse.setAttribute('data-hui-faq-collapse', '');
      section.append(createElement('slot', { name }));
    }
    return { category: def.category, section, heading, collapse, items: def.items };
  }

  _buildTabs() {
    const on = this._groupMode === 'tabs' && this._categories.length > 0;
    this._tabs.hidden = !on;
    if (!on) {
      this._tabs.replaceChildren();
      if (this._body.parentNode !== this._base) this._base.append(this._body);
      return;
    }
    ensureElement('hui-tabs');
    const all = createElement('hui-tab-panel', { key: ALL_KEY, label: tx('faq.all') });
    const panels = this._categories.map((c) => createElement('hui-tab-panel', { key: c.key, label: c.label }));
    this._tabs.replaceChildren(all, ...panels);
    this._syncTabs();
  }

  /** Chọn tab theo activeCategory và đưa thân danh sách vào tab-panel tương ứng */
  _syncTabs() {
    if (this._groupMode !== 'tabs' || !this._categories.length) return;
    const cat = this._categories.find((c) => c.name === this.activeCategory);
    const key = cat ? cat.key : ALL_KEY;
    this._tabs.activeKey = key;
    const panel = [...this._tabs.children].find((p) => p.getAttribute('key') === key);
    if (panel && this._body.parentNode !== panel) panel.append(this._body);
  }

  _applyCollapseProps() {
    const variant = VARIANTS.includes(this.variant) ? this.variant : 'default';
    for (const g of this._groups) {
      const c = g.collapse;
      c.toggleAttribute('accordion', this.accordion);
      c.toggleAttribute('ghost', variant === 'ghost' || variant === 'separated');
      c.setAttribute('size', this.size || 'md');
      c.setAttribute('expand-icon-position', this.expandIconPosition === 'end' ? 'end' : 'start');
    }
  }

  // =====================================================
  // TÌM KIẾM + LỌC
  // =====================================================

  get _tokens() {
    return foldText(this.query || '').split(/\s+/).filter(Boolean);
  }

  /** Ẩn/hiện mục theo từ khóa + chủ đề, tô sáng, cập nhật trạng thái rỗng */
  _applyFilter() {
    if (!this._hasRendered) return;
    const tokens = this._tokens;
    const tabCat = this._groupMode === 'tabs' ? this.activeCategory : '';
    const tabCatValid = this._categories.some((c) => c.name === tabCat);
    const separated = this.variant === 'separated';
    let visibleCount = 0;

    for (const it of this._items) {
      // Gỡ tô sáng cũ trước khi đọc chữ
      clearHighlight(it.header);
      clearHighlight(it.body);
      const inCat = !tabCat || !tabCatValid || it.category === tabCat;
      const haystack = foldText(`${it.question()} ${it.answer()}`);
      const matched = tokens.every((tk) => haystack.includes(tk));
      it.visible = inCat && matched;
      it.panel.style.display = it.visible ? '' : 'none';
      if (it.visible) visibleCount++;
      if (it.visible && tokens.length) {
        highlight(it.header, tokens);
        // Panel viết tay: bỏ qua các con có slot (header đã tô riêng, extra / icon không tô)
        highlight(it.body, tokens, it.light ? (el) => el.parentNode === it.panel && el.hasAttribute('slot') : null);
      }
    }
    this._mo?.takeRecords();

    // Kiểu dáng từng mục + mục cuối cùng đang hiện (bỏ đường kẻ dưới để không bị viền đôi)
    for (const g of this._groups) {
      const visible = g.items.filter((x) => x.visible);
      g.section.hidden = !visible.length && this._groupMode === 'headings';
      g.items.forEach((it) => this._decoratePanel(it.panel, separated, it === visible[visible.length - 1]));
    }

    const noResult = tokens.length > 0 && this._items.length > 0 && visibleCount === 0;
    this._empty.hidden = !noResult;
    this._list.classList.toggle('faq__list--no-result', noResult);
    this._matchCount = visibleCount;
    this._status.textContent = tokens.length ? tx('faq.resultCount', { count: visibleCount }) : '';
    this._syncExpandButton();
  }

  /** separated: mỗi mục là thẻ rời (style inline vì panel viết tay nằm ở light DOM, ::part không với tới) */
  _decoratePanel(panel, separated, isLastVisible) {
    const s = panel.style;
    if (separated) {
      s.border = '1px solid var(--hui-faq-item-border-color, var(--hui-border))';
      s.borderRadius = 'var(--hui-faq-item-radius, var(--hui-radius-lg))';
      s.background = 'var(--hui-faq-item-bg, var(--hui-bg-container))';
      s.boxShadow = 'var(--hui-faq-item-shadow, none)';
      s.overflow = 'hidden';
      s.marginBlockEnd = isLastVisible ? '' : 'var(--hui-faq-item-gap, var(--hui-space-md))';
    } else {
      for (const prop of ['border', 'borderRadius', 'background', 'boxShadow', 'overflow', 'marginBlockEnd']) s[prop] = '';
    }
    // Biến nội bộ của hui-collapse-panel: độ dày đường kẻ dưới mục
    if (separated || isLastVisible) s.setProperty('--_collapse-item-border-w', '0px');
    else s.removeProperty('--_collapse-item-border-w');
  }

  _afterUserSearch() {
    // Tab đang chọn không còn kết quả nhưng tab khác có → về "Tất cả"
    queueMicrotask(() => {
      let matches = this._matchCount ?? 0;
      if (this._groupMode === 'tabs' && this.activeCategory && this._tokens.length && matches === 0) {
        const tokens = this._tokens;
        const allMatches = this._items.filter((it) => {
          const h = foldText(`${it.question()} ${it.answer()}`);
          return tokens.every((tk) => h.includes(tk));
        }).length;
        if (allMatches) {
          this.activeCategory = '';
          matches = allMatches;
        }
      }
      this.emit('hui-search', { query: this.query, matches });
    });
  }

  // =====================================================
  // MỞ / THU TẤT CẢ
  // =====================================================

  _visibleItems() {
    return this._items.filter((x) => x.visible !== false);
  }

  get _allOpen() {
    const visible = this._visibleItems();
    return visible.length > 0 && visible.every((x) => x.panel.active);
  }

  /** Mở mọi câu hỏi đang hiện */
  openAll() {
    for (const g of this._groups) {
      const keys = [];
      g.items.forEach((it, i) => {
        if (it.visible !== false) keys.push(it.panel.getAttribute('key') ?? String(i));
      });
      g.collapse.activeKey = this.accordion ? keys.slice(0, 1) : keys;
      g.items.forEach((it) => { if (it.visible !== false && !this.accordion) it.panel.active = true; });
    }
    this._syncExpandButton(true);
  }

  /** Thu gọn mọi câu hỏi */
  closeAll() {
    for (const g of this._groups) {
      g.collapse.activeKey = [];
      g.items.forEach((it) => { it.panel.active = false; });
    }
    this._syncExpandButton(false);
  }

  _toggleAll() {
    if (this._allOpen) this.closeAll();
    else this.openAll();
  }

  _syncExpandButton(forceOpen) {
    if (!this._expandBtn) return;
    this._expandBtn.hidden = !this.expandAll || this.accordion || !this._items.length;
    const open = forceOpen ?? this._allOpen;
    this._expandBtn.textContent = open ? tx('faq.collapseAll') : tx('faq.expandAll');
    this._expandBtn.setAttribute('icon', open ? 'chevron-up' : 'chevron-down');
    this._expandBtn.setAttribute('aria-pressed', String(open));
  }

  /** Đọc lại nội dung panel viết tay (sau khi bạn sửa chữ bên trong) và đồng bộ lại tìm kiếm / SEO */
  refresh() {
    this._rebuild();
  }

  // =====================================================
  // SEO — JSON-LD FAQPage
  // =====================================================

  _syncSeo() {
    if (!this.seo || !this.isConnected) {
      this._removeSeo();
      return;
    }
    const entries = this._items
      .map((it) => ({ q: it.question().replace(/\s+/g, ' ').trim(), a: it.answer() }))
      .filter((x) => x.q);
    if (!entries.length) {
      this._removeSeo();
      return;
    }
    const json = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: entries.map((x) => ({
        '@type': 'Question',
        name: x.q,
        acceptedAnswer: { '@type': 'Answer', text: x.a },
      })),
    })
      // Chặn thoát khỏi thẻ <script>: "</script>" → "<\/script>", "<!--" → "<!--"
      .replace(/<\//g, '<\\/')
      .replace(/<!--/g, '\\u003c!--');

    if (!this._seoScript) {
      this._seoScript = document.createElement('script');
      this._seoScript.type = 'application/ld+json';
      this._seoScript.setAttribute('data-hui-faq', String(this._uid));
    }
    if (this._seoScript.textContent !== json) this._seoScript.textContent = json;
    if (!this._seoScript.isConnected) document.head.append(this._seoScript);
  }

  _removeSeo() {
    this._seoScript?.remove();
  }

  // =====================================================
  // HIỆU ỨNG HIỆN LẦN LƯỢT KHI CUỘN TỚI
  // =====================================================

  get _animationsOn() {
    if (this.noAnimation || prefersReducedMotion()) return false;
    if (document.documentElement.hasAttribute('data-hui-no-animation')) return false;
    const token = getComputedStyle(this).getPropertyValue('--hui-motion-duration').trim();
    return !(token === '0ms' || token === '0s' || token === '0');
  }

  _setupReveal() {
    if (this._revealed || this._revealStop || !this.isConnected || !this._items.length) return;
    if (!this._animationsOn) {
      this._revealed = true;
      return;
    }
    this._list.classList.add('faq__list--pending');
    this._revealStop = inView(this._list, (entry) => {
      if (entry.isIntersecting) this._reveal(true);
    }, { threshold: 0.1, once: true });
  }

  _reveal(animate) {
    this._revealStop?.();
    this._revealStop = null;
    this._list.classList.remove('faq__list--pending');
    if (this._revealed) return;
    this._revealed = true;
    if (!animate || !this._animationsOn) return;

    const targets = [];
    for (const g of this._groups) {
      if (g.section.hidden) continue;
      if (g.heading) targets.push(g.heading);
      for (const it of g.items) if (it.visible !== false) targets.push(it.panel);
    }
    targets.forEach((el, i) => {
      el.animate?.(ANIMATIONS['fade-up'], {
        duration: 500,
        delay: Math.min(i, 10) * 60, // tối đa ~0.6s chờ dù danh sách dài
        easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        fill: 'backwards',
      });
    });
  }
}

defineElement('hui-faq', HuiFaq);

export default HuiFaq;
