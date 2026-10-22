/**
 * HUI Upload — Chọn / kéo thả tệp, xem trước, tải lên có tiến trình (Ant Upload + Upload.Dragger), tham gia <form>.
 * 3 cách xử lý: `action` (XHR multipart, có progress), `customRequest(file, { onProgress, signal })`,
 * hoặc không tải lên — chỉ gom tệp, giá trị form = các File (FormData nhiều entry cùng name).
 * list-type: text | picture | picture-card. Ảnh xem trước bằng object URL (tự thu hồi), bấm xem lớn bằng hui-lightbox.
 */

import styles from './hui-upload.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/hui-icon.js';
import '../hui-button/hui-button.js';
import '../hui-progress/hui-progress.js';

const FALLBACK = {
  'upload.button': { vi: 'Tải tệp lên', en: 'Upload file' },
  'upload.uploading': { vi: 'Đang tải lên...', en: 'Uploading...' },
  'upload.remove': { vi: 'Xóa tệp', en: 'Remove file' },
  'upload.preview': { vi: 'Xem trước', en: 'Preview' },
  'upload.drag': { vi: 'Kéo thả tệp vào đây hoặc bấm để chọn', en: 'Drag files here or click to select' },
  'upload.retry': { vi: 'Tải lại', en: 'Retry' },
  'upload.error': { vi: 'Tải lên thất bại', en: 'Upload failed' },
  'upload.done': { vi: 'Đã tải lên', en: 'Uploaded' },
  'upload.tooLarge': { vi: '{name} vượt quá {max}', en: '{name} is larger than {max}' },
  'upload.notAccepted': { vi: '{name}: định dạng không được hỗ trợ', en: '{name}: file type not allowed' },
  'upload.maxCount': { vi: 'Chỉ được chọn tối đa {max} tệp', en: 'You can select up to {max} files' },
  'upload.list': { vi: 'Danh sách tệp', en: 'File list' },
};
const msg = (key, vars) => {
  let v = t(key, vars);
  if (v !== key) return v;
  v = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : v;
};

const LIST_TYPES = ['text', 'picture', 'picture-card'];
let uidSeq = 0;

/** "5MB" | "500KB" | "1.5 GB" | "1048576" → số byte (null = không giới hạn) */
export function parseSize(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const m = String(v).trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
  if (!m) return null;
  const mult = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[(m[2] || 'b').toLowerCase()];
  return Math.round(Number(m[1]) * mult);
}

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 10 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/** Tệp có khớp `accept` không (".png", "image/*", "application/pdf"…) */
export function acceptsFile(file, accept) {
  if (!accept) return true;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return accept.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i;
const isImage = (item) => /^image\//.test(item.type || '') || IMG_EXT.test(item.name || '')
  || /^data:image\//.test(item.url || '') || IMG_EXT.test((item.url || '').split('?')[0]);

/**
 * Tải tệp lên.
 * @fires change - Danh sách tệp đổi (thêm / xóa / đổi trạng thái). detail: { file, fileList }
 * @fires hui-upload-progress - Tiến trình tải lên. detail: { file, percent }
 * @fires hui-upload-success - Tải lên xong. detail: { file, response }
 * @fires hui-upload-error - Tải lên lỗi. detail: { file, error }
 * @fires hui-reject - Tệp bị loại (sai định dạng / quá lớn / quá số lượng / beforeUpload từ chối). detail: { file, reason, message }
 * @fires hui-remove - Sắp xóa tệp. Cancelable: preventDefault() để giữ lại. detail: { file }
 * @fires hui-preview - Bấm xem trước. Cancelable: preventDefault() để tự xử lý. detail: { file }
 * @slot - Thay nội dung nút / vùng kéo thả mặc định
 * @slot hint - Dòng gợi ý (định dạng, dung lượng tối đa…) — hoặc attribute hint
 * @csspart base - Khung ngoài
 * @csspart trigger - Vùng bấm để chọn tệp (nút / vùng kéo thả / ô "+")
 * @csspart dragger - Vùng kéo thả (khi có attribute dragger)
 * @csspart hint - Dòng gợi ý
 * @csspart list - Danh sách tệp (<ul>)
 * @csspart item - Mỗi tệp (+ item-ready, item-uploading, item-done, item-error)
 * @csspart thumbnail - Ảnh thu nhỏ / icon tệp
 * @csspart name - Tên tệp
 * @csspart meta - Dung lượng / trạng thái
 * @csspart progress - Thanh tiến trình (<hui-progress>)
 * @csspart actions - Vùng nút thao tác của tệp
 * @csspart action - Mỗi nút thao tác (+ preview, retry, remove)
 * @cssprop --hui-upload-dragger-bg - Nền vùng kéo thả
 * @cssprop --hui-upload-dragger-border-color - Viền vùng kéo thả
 * @cssprop --hui-upload-dragger-active-bg - Nền vùng kéo thả khi đang kéo tệp vào
 * @cssprop --hui-upload-dragger-padding - Đệm vùng kéo thả
 * @cssprop --hui-upload-radius - Bo góc vùng kéo thả / ô ảnh
 * @cssprop --hui-upload-card-size - Kích thước ô ảnh (picture-card)
 * @cssprop --hui-upload-thumb-size - Kích thước ảnh thu nhỏ (picture)
 * @cssprop --hui-upload-item-hover-bg - Nền dòng tệp khi hover
 * @cssprop --hui-upload-error-color - Màu tệp lỗi
 */
class HuiUpload extends HuiFormElement {
  static properties = {
    /** Định dạng nhận, giống <input accept> (".png,.jpg", "image/*") */
    accept: { type: String, default: '' },
    /** Chọn nhiều tệp một lần */
    multiple: { type: Boolean },
    /** Số tệp tối đa (1 = tệp mới thay tệp cũ) */
    maxCount: { type: Number },
    /** Dung lượng tối đa mỗi tệp: số byte hoặc "500KB", "5MB" */
    maxSize: { type: String, default: '' },
    /** text | picture | picture-card — kiểu danh sách tệp */
    listType: { type: String, default: 'text' },
    /** Vùng kéo thả lớn thay cho nút (Ant Upload.Dragger) */
    dragger: { type: Boolean },
    /** URL nhận tệp (POST multipart, field = name || "file") — bỏ trống = không tự tải lên */
    action: { type: String, default: '' },
    /** Phương thức HTTP khi tải lên */
    method: { type: String, default: 'POST' },
    /** Gửi kèm cookie (XHR withCredentials) */
    withCredentials: { type: Boolean },
    /** Header gửi kèm { Authorization: '…' } — gán bằng property */
    headers: { type: Object, default: null },
    /** Field gửi kèm: object hoặc (file) => object — gán bằng property */
    extraData: { type: Object, attribute: false },
    /** Tự tải lên: (file, { onProgress, signal, headers, data }) => Promise<response> — thay cho action */
    customRequest: { type: Object, attribute: false },
    /** Trước khi thêm tệp: (file, files) => boolean | File | Blob | Promise — false để bỏ qua */
    beforeUpload: { type: Object, attribute: false },
    /** Dòng gợi ý dưới nút / trong vùng kéo thả */
    hint: { type: String, default: '' },
    /** Chữ của nút / vùng kéo thả (mặc định theo locale) */
    buttonText: { type: String, default: '' },
    /** Ẩn danh sách tệp */
    noList: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    /** @type {Array<object>} */
    this._files = [];
    this._els = new Map();
    this._lightbox = null;
  }

  // =====================================================
  // GIÁ TRỊ
  // =====================================================

  /** Danh sách tệp: [{ uid, name, size, type, status, percent, file, url, thumbUrl, response, error }] */
  get fileList() {
    return this._files.map(({ _abort, _ownUrl, ...rest }) => rest); // eslint-disable-line no-unused-vars
  }

  set fileList(list) {
    this._revokeAll();
    this._files = (Array.isArray(list) ? list : []).map((f) => ({
      uid: f.uid ?? `hui-upload-${++uidSeq}`,
      name: String(f.name ?? f.file?.name ?? ''),
      size: f.size ?? f.file?.size ?? null,
      type: f.type ?? f.file?.type ?? '',
      status: f.status || 'done',
      percent: f.percent ?? (f.status === 'uploading' ? 0 : 100),
      file: f.file instanceof Blob ? f.file : null,
      url: f.url || '',
      thumbUrl: f.thumbUrl || '',
      response: f.response,
      error: f.error,
    }));
    this._changedFiles();
  }

  /** Các File đang giữ (bỏ tệp lỗi) — cũng là giá trị gửi form */
  get value() {
    return this._files.filter((i) => i.file && i.status !== 'error').map((i) => i.file);
  }

  set value(v) {
    // form.reset() gán chuỗi rỗng → xóa hết
    if (!Array.isArray(v) || !v.length) {
      if (!this._files.length) return;
      this._revokeAll();
      this._files.forEach((i) => i._abort?.abort());
      this._files = [];
    } else {
      this._revokeAll();
      this._files = v.filter((f) => f instanceof Blob).map((f) => this._makeItem(f, 'ready'));
    }
    this._changedFiles();
  }

  get _maxBytes() {
    return parseSize(this.maxSize);
  }

  get _canUpload() {
    return Boolean(this.action) || typeof this.customRequest === 'function';
  }

  get _type() {
    return LIST_TYPES.includes(this.listType) ? this.listType : 'text';
  }

  get _full() {
    return this.maxCount > 1 && this._files.length >= this.maxCount;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._fileInput = createElement('input', { type: 'file', className: 'up__file', tabindex: '-1', 'aria-hidden': 'true' });
    this._fileInput.addEventListener('change', (e) => {
      e.stopPropagation();
      const files = [...(this._fileInput.files || [])];
      this._fileInput.value = '';
      if (files.length) this._addFiles(files);
    });
    this._fileInput.addEventListener('input', (e) => e.stopPropagation());
    this._fileInput.addEventListener('cancel', (e) => e.stopPropagation());

    this._fallback = createElement('span', { className: 'up__fallback' });
    this._slot = createElement('slot', {}, this._fallback);
    this._hintSlot = createElement('slot', { name: 'hint' });
    this._hintText = createElement('span');
    this._hint = createElement('div', { className: 'up__hint', part: 'hint', id: 'hint' }, this._hintSlot, this._hintText);
    this._hintSlot.addEventListener('slotchange', () => this._syncHint());

    this._trigger = createElement('div', { className: 'up__trigger', part: 'trigger' }, this._slot);
    this._trigger.addEventListener('click', () => this._openDialog());
    this._trigger.addEventListener('keydown', (e) => {
      if (e.target !== this._trigger) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._openDialog();
      }
    });
    for (const type of ['dragenter', 'dragover']) {
      this._trigger.addEventListener(type, (e) => this._onDragOver(e));
    }
    this._trigger.addEventListener('dragleave', (e) => {
      if (!this._trigger.contains(e.relatedTarget)) this._setDragOver(false);
    });
    this._trigger.addEventListener('drop', (e) => this._onDrop(e));

    this._list = createElement('ul', { className: 'up__list', part: 'list' });
    this._triggerItem = createElement('li', { className: 'up__card-slot' });
    this._list.addEventListener('click', (e) => this._onListClick(e));
    this._live = createElement('div', { className: 'up__sr', role: 'status', 'aria-live': 'polite' });

    this._base = createElement('div', { className: 'up', part: 'base' }, this._fileInput, this._trigger, this._hint, this._list, this._live);
    return this._base;
  }

  updated(changed) {
    if (changed.has('accept')) this._fileInput.accept = this.accept || '';
    if (changed.has('multiple') || changed.has('maxCount')) this._fileInput.multiple = this.multiple && this.maxCount !== 1;
    if (['listType', 'dragger', 'buttonText', 'locale', 'disabled'].some((k) => changed.has(k))) this._renderTrigger();
    if (changed.has('hint')) this._syncHint();
    if (['listType', 'noList', 'disabled', 'readonly', 'locale', 'maxCount'].some((k) => changed.has(k))) this._renderList();
    if (changed.has('name')) this._syncForm();
    if (changed.has('locale')) this._list.setAttribute('aria-label', msg('upload.list'));
    this._base.className = ['up', `up--${this._type}`, this.dragger && 'up--dragger', this.isDisabled && 'up--disabled']
      .filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
    super.updated(changed);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Rời trang: thu hồi object URL (tránh rò bộ nhớ); gắn lại thì tạo URL mới khi vẽ.
    // Không hủy tải lên dở — thẻ có thể chỉ đang được chuyển chỗ trong DOM
    this._revokeAll();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._hasRendered && this._files.length) this._renderList();
  }

  _renderTrigger() {
    const type = this._type;
    const card = type === 'picture-card' && !this.dragger;
    const text = this.buttonText || (this.dragger ? msg('upload.drag') : msg('upload.button'));
    let content;
    if (this.dragger) {
      content = [
        createElement('hui-icon', { name: 'upload-cloud', className: 'up__dragger-icon', 'aria-hidden': 'true' }),
        createElement('span', { className: 'up__dragger-text' }, text),
      ];
    } else if (card) {
      content = [createElement('hui-icon', { name: 'plus', 'aria-hidden': 'true' }), createElement('span', {}, msg('upload.button'))];
    } else {
      const btn = createElement('hui-button', { variant: 'outline', icon: 'upload' }, text);
      if (this.isDisabled) btn.setAttribute('disabled', '');
      content = [btn];
    }
    this._fallback.replaceChildren(...content);

    // Nút mặc định đã là <hui-button>; vùng kéo thả / ô "+" tự làm vai trò nút
    const selfButton = this.dragger || card;
    this._trigger.className = ['up__trigger', this.dragger && 'up__dragger', card && 'up__card up__card--trigger'].filter(Boolean).join(' ');
    this._trigger.setAttribute('part', this.dragger ? 'trigger dragger' : 'trigger');
    if (selfButton) {
      this._trigger.setAttribute('role', 'button');
      this._trigger.tabIndex = this.isDisabled ? -1 : 0;
      this._trigger.setAttribute('aria-label', text);
      this._trigger.toggleAttribute('aria-disabled', this.isDisabled);
      if (this.hint) this._trigger.setAttribute('aria-describedby', 'hint');
    } else {
      for (const a of ['role', 'tabindex', 'aria-label', 'aria-disabled', 'aria-describedby']) this._trigger.removeAttribute(a);
    }
    // Vùng kéo thả: gợi ý nằm trong vùng; picture-card: ô "+" nằm cuối danh sách
    if (this.dragger) this._trigger.append(this._hint);
    else this._base.insertBefore(this._hint, this._list);
    this._placeTrigger();
  }

  /** picture-card: ô "+" là phần tử cuối của lưới ảnh */
  _placeTrigger() {
    const card = this._type === 'picture-card' && !this.dragger;
    if (card) {
      // <ul> chỉ chứa <li> → ô '+' nằm trong 1 <li> riêng ở cuối lưới
      if (this._trigger.parentNode !== this._triggerItem) this._triggerItem.append(this._trigger);
      if (this._list.lastElementChild !== this._triggerItem) this._list.append(this._triggerItem);
    } else if (this._trigger.parentNode !== this._base) {
      this._base.insertBefore(this._trigger, this._fileInput.nextSibling);
    }
    this._triggerItem.hidden = !card || this._full || this.readonly;
  }

  _syncHint() {
    this._hintText.textContent = this.hint || '';
    const has = Boolean(this.hint) || this._hintSlot.assignedNodes().length > 0;
    this._hint.hidden = !has;
    this._hintText.hidden = this._hintSlot.assignedNodes().length > 0;
  }

  // =====================================================
  // DANH SÁCH TỆP
  // =====================================================

  _actionBtn(kind, icon, label) {
    return createElement('button', {
      type: 'button', className: `up__action up__action--${kind}`, part: `action ${kind}`, dataset: { action: kind },
      'aria-label': label, title: label,
    }, createElement('hui-icon', { name: icon, 'aria-hidden': 'true' }));
  }

  _thumb(item) {
    const pic = this._type !== 'text';
    if (pic && isImage(item)) {
      if (!item.thumbUrl && item.file) {
        item.thumbUrl = URL.createObjectURL(item.file);
        item._ownUrl = item.thumbUrl;
      }
      const src = item.thumbUrl || item.url;
      if (src) return createElement('img', { className: 'up__img', src, alt: '', loading: 'lazy', decoding: 'async' });
    }
    const icon = item.status === 'uploading' ? 'loading' : item.status === 'error' ? 'error' : 'file';
    const el = createElement('hui-icon', { name: icon, 'aria-hidden': 'true' });
    if (item.status === 'uploading') el.setAttribute('spin', '');
    return el;
  }

  _statusText(item) {
    if (item.status === 'uploading') return `${msg('upload.uploading')} ${Math.round(item.percent)}%`;
    if (item.status === 'error') return item.error?.message ? `${msg('upload.error')}: ${item.error.message}` : msg('upload.error');
    if (item.status === 'done' && this._canUpload) return msg('upload.done');
    return '';
  }

  _renderItem(item) {
    const card = this._type === 'picture-card';
    const li = createElement('li', { className: `up__item up__item--${item.status}${card ? ' up__card' : ''}`, dataset: { uid: item.uid } });
    li.setAttribute('part', `item item-${item.status}`);

    const thumb = createElement('span', { className: 'up__thumb', part: 'thumbnail' }, this._thumb(item));
    const nameText = item.name || item.url || '';
    const name = item.url && item.status === 'done'
      ? createElement('a', { className: 'up__name', part: 'name', href: item.url, target: '_blank', rel: 'noopener noreferrer' }, nameText)
      : createElement('span', { className: 'up__name', part: 'name' }, nameText);
    const metaText = [item.size != null ? formatBytes(item.size) : '', this._statusText(item)].filter(Boolean).join(' · ');
    const meta = createElement('span', { className: 'up__meta', part: 'meta' }, metaText);
    const progress = createElement('hui-progress', {
      className: 'up__progress', part: 'progress', percent: String(Math.round(item.percent || 0)), size: 'sm',
      'show-info': 'false', label: `${msg('upload.uploading')} ${nameText}`,
    });
    progress.hidden = item.status !== 'uploading';

    const actions = createElement('span', { className: 'up__actions', part: 'actions' });
    if (this._type !== 'text' && isImage(item) && (item.thumbUrl || item.url || item.file)) {
      actions.append(this._actionBtn('preview', 'eye', `${msg('upload.preview')} ${nameText}`));
    }
    if (item.status === 'error' && item.file && this._canUpload && !this.readonly && !this.isDisabled) {
      actions.append(this._actionBtn('retry', 'rotate-cw', `${msg('upload.retry')} ${nameText}`));
    }
    if (!this.readonly && !this.isDisabled) {
      actions.append(this._actionBtn('remove', card ? 'delete' : 'close', `${msg('upload.remove')} ${nameText}`));
    }

    const info = createElement('span', { className: 'up__info' }, name, meta, progress);
    li.append(thumb, info, actions);
    if (item.status === 'error') li.title = this._statusText(item);
    this._els.set(item.uid, { li, progress, meta });
    return li;
  }

  _renderList() {
    if (!this._hasRendered) return;
    // Giữ focus ở cùng nút của cùng tệp sau khi vẽ lại
    const active = this.shadowRoot.activeElement;
    const focusKey = active?.dataset?.action ? `${active.closest('[data-uid]')?.dataset.uid}|${active.dataset.action}` : null;

    this._els.clear();
    const items = this.noList ? [] : this._files.map((f) => this._renderItem(f));
    const card = this._type === 'picture-card' && !this.dragger;
    this._list.replaceChildren(...items);
    if (card) this._list.append(this._triggerItem);
    this._list.hidden = !items.length && !card;
    this._placeTrigger();

    if (focusKey) {
      const [uid, action] = focusKey.split('|');
      this._list.querySelector(`[data-uid="${CSS.escape(uid)}"] [data-action="${action}"]`)?.focus();
    }
  }

  /** Chỉ cập nhật thanh tiến trình (không vẽ lại cả danh sách khi đang tải) */
  _patchProgress(item) {
    const els = this._els.get(item.uid);
    if (!els) return;
    els.progress.setAttribute('percent', String(Math.round(item.percent)));
    els.meta.textContent = [item.size != null ? formatBytes(item.size) : '', this._statusText(item)].filter(Boolean).join(' · ');
  }

  _changedFiles(file = null, emit = false) {
    this._renderList();
    this.requestUpdate('value');
    if (emit) this.emit('change', { file, fileList: this.fileList });
  }

  // =====================================================
  // THÊM TỆP
  // =====================================================

  _openDialog() {
    if (this.isDisabled || this.readonly || (this._full && this.maxCount !== 1)) return;
    this._fileInput.click();
  }

  _onDragOver(e) {
    if (!this.dragger && this._type !== 'picture-card') return;
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    if (this.isDisabled || this.readonly) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = 'copy';
    this._setDragOver(true);
  }

  _onDrop(e) {
    if (!this.dragger && this._type !== 'picture-card') return;
    e.preventDefault();
    this._setDragOver(false);
    if (this.isDisabled || this.readonly) return;
    const files = [...(e.dataTransfer?.files || [])];
    if (files.length) this._addFiles(this.multiple ? files : files.slice(0, 1));
  }

  _setDragOver(on) {
    this._trigger.classList.toggle('up__trigger--over', on);
    this.setState('dragover', on);
  }

  _makeItem(file, status) {
    return {
      uid: `hui-upload-${++uidSeq}`,
      name: file.name || 'file',
      size: file.size,
      type: file.type || '',
      status,
      percent: 0,
      file,
      url: '',
      thumbUrl: '',
    };
  }

  _reject(file, reason, message) {
    this.emit('hui-reject', { file, reason, message });
    this._announce(message);
  }

  _announce(text) {
    this._live.textContent = text;
  }

  /**
   * Thêm tệp người dùng chọn / thả vào. Lọc theo accept → max-size → max-count → beforeUpload,
   * rồi tự tải lên nếu có action / customRequest.
   */
  async _addFiles(files) {
    if (this.isDisabled || this.readonly) return;
    const max = this._maxBytes;
    let picked = [];
    for (const f of files) {
      if (!acceptsFile(f, this.accept)) this._reject(f, 'accept', msg('upload.notAccepted', { name: f.name }));
      else if (max != null && f.size > max) this._reject(f, 'size', msg('upload.tooLarge', { name: f.name, max: formatBytes(max) }));
      else picked.push(f);
    }
    if (!this.multiple) picked = picked.slice(0, 1);

    // max-count=1: tệp mới thay tệp cũ (ảnh đại diện…)
    const replace = this.maxCount === 1;
    if (!replace && this.maxCount > 0) {
      const room = Math.max(0, this.maxCount - this._files.length);
      if (picked.length > room) {
        for (const f of picked.slice(room)) this._reject(f, 'count', msg('upload.maxCount', { max: this.maxCount }));
        picked = picked.slice(0, room);
      }
    }

    const added = [];
    for (const f of picked) {
      let file = f;
      if (typeof this.beforeUpload === 'function') {
        let res;
        try {
          res = await this.beforeUpload(f, picked);
        } catch {
          res = false;
        }
        if (res === false) {
          this._reject(f, 'before', f.name);
          continue;
        }
        if (res instanceof Blob && res !== f) {
          file = res instanceof File ? res : new File([res], f.name, { type: res.type || f.type });
        }
      }
      added.push(this._makeItem(file, 'ready'));
    }
    if (!added.length) return;

    if (replace) {
      for (const old of this._files) {
        old._abort?.abort();
        this._revoke(old);
      }
      this._files = added.slice(-1);
    } else {
      this._files = [...this._files, ...added];
    }
    this.markInteracted();
    this._changedFiles(added[0], true);
    if (this._canUpload) for (const item of this._files.filter((i) => added.includes(i))) this._upload(item);
  }

  // =====================================================
  // TẢI LÊN
  // =====================================================

  async _upload(item) {
    item._abort?.abort();
    const ctrl = new AbortController();
    item._abort = ctrl;
    item.status = 'uploading';
    item.percent = 0;
    item.error = undefined;
    this._renderList();
    this._announce(`${msg('upload.uploading')} ${item.name}`);

    const onProgress = (p) => {
      if (ctrl.signal.aborted) return;
      let percent = typeof p === 'number' ? p : p?.percent ?? (p?.total ? (p.loaded / p.total) * 100 : 0);
      percent = Math.min(100, Math.max(0, Number(percent) || 0));
      item.percent = percent;
      this._patchProgress(item);
      this.emit('hui-upload-progress', { file: this._public(item), percent });
    };

    try {
      const extra = typeof this.extraData === 'function' ? this.extraData(item.file) : this.extraData;
      const response = typeof this.customRequest === 'function'
        ? await this.customRequest(item.file, { onProgress, signal: ctrl.signal, headers: this.headers || {}, data: extra || {}, item: this._public(item) })
        : await this._xhr(item, extra, onProgress, ctrl.signal);
      if (ctrl.signal.aborted || !this._files.includes(item)) return;
      item.status = 'done';
      item.percent = 100;
      item.response = response;
      if (response && typeof response === 'object' && typeof response.url === 'string') item.url = response.url;
      this._announce(`${msg('upload.done')} ${item.name}`);
      this.emit('hui-upload-success', { file: this._public(item), response });
    } catch (error) {
      if (ctrl.signal.aborted || !this._files.includes(item)) return;
      item.status = 'error';
      item.error = error instanceof Error ? error : new Error(String(error));
      this._announce(`${msg('upload.error')} ${item.name}`);
      this.emit('hui-upload-error', { file: this._public(item), error: item.error });
    }
    item._abort = null;
    this._changedFiles(item, true);
  }

  _xhr(item, extra, onProgress, signal) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(this.method || 'POST', this.action, true);
      xhr.withCredentials = this.withCredentials;
      for (const [k, v] of Object.entries(this.headers || {})) {
        if (v !== null && v !== undefined) xhr.setRequestHeader(k, String(v));
      }
      if (xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) onProgress((e.loaded / e.total) * 100);
        };
      }
      const parse = () => {
        const text = xhr.responseText;
        try {
          return text ? JSON.parse(text) : null;
        } catch {
          return text;
        }
      };
      xhr.onload = () => {
        const body = parse();
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else {
          const err = new Error(`HTTP ${xhr.status}`);
          err.status = xhr.status;
          err.response = body;
          reject(err);
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
      signal.addEventListener('abort', () => xhr.abort(), { once: true });

      const data = new FormData();
      for (const [k, v] of Object.entries(extra || {})) data.append(k, v instanceof Blob ? v : String(v));
      data.append(this.name || 'file', item.file, item.name);
      xhr.send(data);
    });
  }

  /** Tải lên lại các tệp đang chờ / lỗi (vd khi tự gán action sau) */
  submit() {
    if (!this._canUpload) return;
    for (const item of this._files) if (item.file && (item.status === 'ready' || item.status === 'error')) this._upload(item);
  }

  // =====================================================
  // XÓA / XEM TRƯỚC
  // =====================================================

  _public(item) {
    return this.fileList.find((f) => f.uid === item.uid) || null;
  }

  _onListClick(e) {
    const btn = e.target.closest?.('[data-action]');
    if (!btn) return;
    const uid = btn.closest('[data-uid]')?.dataset.uid;
    const item = this._files.find((f) => f.uid === uid);
    if (!item) return;
    if (btn.dataset.action === 'remove') this.removeFile(uid);
    else if (btn.dataset.action === 'retry') this._upload(item);
    else if (btn.dataset.action === 'preview') this._preview(item);
  }

  /** Xóa tệp theo uid (hủy tải lên đang chạy) */
  removeFile(uid) {
    const index = this._files.findIndex((f) => f.uid === uid);
    if (index < 0 || this.isDisabled || this.readonly) return false;
    const item = this._files[index];
    if (!this.emit('hui-remove', { file: this._public(item) }, { cancelable: true })) return false;
    item._abort?.abort();
    this._revoke(item);
    this._files = this._files.filter((f) => f !== item);
    this._announce(`${msg('upload.remove')}: ${item.name}`);
    this.markInteracted();
    this._changedFiles(this._public(item) || { uid: item.uid, name: item.name, status: 'removed' }, true);
    // Focus sang nút xóa của tệp kế bên, hết tệp thì về nút chọn tệp
    const next = this._list.querySelectorAll('[data-action="remove"]')[Math.min(index, this._files.length - 1)];
    if (next) next.focus();
    else (this._trigger.getAttribute('role') === 'button' ? this._trigger : this._trigger.querySelector('hui-button'))?.focus?.();
    return true;
  }

  async _preview(item) {
    if (!this.emit('hui-preview', { file: this._public(item) }, { cancelable: true })) return;
    const images = this._files.filter((f) => isImage(f) && (f.thumbUrl || f.url || f.file));
    for (const f of images) {
      if (!f.thumbUrl && !f.url && f.file) {
        f.thumbUrl = URL.createObjectURL(f.file);
        f._ownUrl = f.thumbUrl;
      }
    }
    await import('../hui-lightbox/index.js');
    if (!this._lightbox) {
      this._lightbox = createElement('hui-lightbox', { 'no-download': '' });
      this.shadowRoot.append(this._lightbox);
    }
    this._lightbox.items = images.map((f) => ({ src: f.url || f.thumbUrl, alt: f.name, caption: f.name }));
    this._lightbox.show(Math.max(0, images.indexOf(item)));
  }

  _revoke(item) {
    if (item._ownUrl) {
      URL.revokeObjectURL(item._ownUrl);
      if (item.thumbUrl === item._ownUrl) item.thumbUrl = '';
      item._ownUrl = '';
    }
  }

  _revokeAll() {
    for (const item of this._files) this._revoke(item);
  }

  // =====================================================
  // FORM
  // =====================================================

  /** Mỗi File 1 entry cùng name → FormData.getAll(name) */
  formValue() {
    const files = this.value;
    if (!files.length || !this.name) return null;
    const data = new FormData();
    for (const f of files) data.append(this.name, f, f.name);
    return data;
  }

  /** state cũng là FormData (khôi phục được File khi Back/Forward) */
  _syncForm() {
    const fv = this.formValue();
    this.setFormValue(fv, fv);
    this.setState('filled', !this._isEmpty());
    this._syncValidity();
  }

  _isEmpty() {
    return this._files.length === 0;
  }

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.required') };
    return null;
  }

  validationAnchor() {
    return this._trigger.getAttribute('role') === 'button' ? this._trigger : this._fileInput;
  }

  formStateRestoreCallback(state) {
    if (state instanceof FormData && this.name) this.value = state.getAll(this.name).filter((f) => f instanceof Blob);
  }

  focus(options) {
    const target = this._trigger.getAttribute('role') === 'button' ? this._trigger : this._trigger.querySelector('hui-button, button');
    if (target) target.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-upload', HuiUpload);

export default HuiUpload;
