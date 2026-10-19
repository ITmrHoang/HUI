/**
 * Template binding — nhân bản <template> theo từng item dữ liệu, KHÔNG dùng innerHTML với data
 * (chỉ textContent / setAttribute → an toàn với dữ liệu người dùng nhập).
 *
 *   <template>
 *     <article>
 *       <img data-bind-attr="src:image, alt:name">
 *       <h3 data-bind="name"></h3>
 *       <span data-bind="price" data-format="currency"></span>
 *       <hui-progress data-bind-prop="percent:progress"></hui-progress>
 *       <span data-show="isNew">Mới</span>
 *       <li data-class="active:selected">…</li>
 *       <hui-button data-action="buy">Mua</hui-button>
 *     </article>
 *   </template>
 *
 * Đường dẫn: "name", "author.name", "tags.0", "$index" (vị trí), "$item" (cả item, vd item là chuỗi).
 * Giá trị mặc định khi rỗng: data-bind="note" data-default="—".
 */

import { format } from './format.js';

const BIND_SELECTOR = '[data-bind],[data-bind-attr],[data-bind-prop],[data-show],[data-hide],[data-class]';

/** Đọc giá trị theo đường dẫn "a.b.c" */
export function getPath(item, path, index) {
  if (path === '$index') return index;
  if (path === '$item') return item;
  return path.split('.').reduce((obj, key) => (obj == null ? undefined : obj[key]), item);
}

/** "src:image, alt:name" → [['src','image'], ['alt','name']] */
function parsePairs(spec) {
  return spec.split(',').map((s) => s.trim()).filter(Boolean).map((pair) => {
    const i = pair.indexOf(':');
    return i === -1 ? [pair, pair] : [pair.slice(0, i).trim(), pair.slice(i + 1).trim()];
  });
}

/**
 * Biên dịch các binding của một node gốc thành danh sách hàm cập nhật (tính 1 lần cho mỗi node,
 * lần cập nhật sau chỉ chạy lại hàm — không querySelectorAll lại).
 */
function compileBindings(root) {
  const nodes = root.matches?.(BIND_SELECTOR) ? [root, ...root.querySelectorAll(BIND_SELECTOR)] : [...root.querySelectorAll(BIND_SELECTOR)];
  const updaters = [];

  for (const el of nodes) {
    const ds = el.dataset;
    if (ds.bind) {
      const path = ds.bind;
      const fmt = ds.format;
      const fallback = ds.default ?? '';
      updaters.push((item, i) => {
        const v = getPath(item, path, i);
        const text = v === null || v === undefined || v === '' ? fallback : format(v, fmt);
        if (el.textContent !== text) el.textContent = text;
      });
    }
    if (ds.bindAttr) {
      for (const [attr, path] of parsePairs(ds.bindAttr)) {
        updaters.push((item, i) => {
          const v = getPath(item, path, i);
          // false / null / undefined → bỏ attribute (hợp với boolean attribute như disabled)
          if (v === false || v === null || v === undefined) el.removeAttribute(attr);
          else el.setAttribute(attr, v === true ? '' : String(v));
        });
      }
    }
    if (ds.bindProp) {
      for (const [prop, path] of parsePairs(ds.bindProp)) {
        updaters.push((item, i) => { el[prop] = getPath(item, path, i); });
      }
    }
    if (ds.show) updaters.push((item, i) => { el.hidden = !getPath(item, ds.show, i); });
    if (ds.hide) updaters.push((item, i) => { el.hidden = Boolean(getPath(item, ds.hide, i)); });
    if (ds.class) {
      for (const [cls, path] of parsePairs(ds.class)) {
        updaters.push((item, i) => el.classList.toggle(cls, Boolean(getPath(item, path, i))));
      }
    }
  }
  return updaters;
}

/** Thông tin gắn với mỗi node đã render: item, index, các hàm cập nhật */
const entries = new WeakMap();

/**
 * Tạo node từ <template> cho một item. Template nên có 1 phần tử gốc;
 * nhiều phần tử gốc sẽ được bọc trong <div style="display: contents">.
 */
export function renderTemplate(template, item, index = 0) {
  const fragment = template.content.cloneNode(true);
  const elements = [...fragment.children];
  let root;
  if (elements.length === 1) {
    root = elements[0];
  } else {
    root = document.createElement('div');
    root.style.display = 'contents';
    root.append(fragment);
  }
  const updaters = compileBindings(root);
  entries.set(root, { item, index, updaters });
  for (const fn of updaters) fn(item, index);
  return root;
}

/** Cập nhật node đã render với item mới (giữ nguyên DOM, focus, trạng thái con) */
export function updateTemplateNode(root, item, index = 0) {
  const entry = entries.get(root);
  if (!entry) return;
  entry.item = item;
  entry.index = index;
  for (const fn of entry.updaters) fn(item, index);
}

/** Item + index của node đã render (hoặc của node con bên trong nó) */
export function entryOf(node, boundary) {
  for (let n = node; n && n !== boundary; n = n.parentNode) {
    const e = entries.get(n);
    if (e) return { node: n, item: e.item, index: e.index };
  }
  return null;
}

/**
 * Bắt click trên phần tử có `data-action` bên trong `container` (1 listener cho cả danh sách)
 * → phát `hui-action` {action, item, index, originalEvent} từ `host`.
 * Trả về hàm gỡ listener.
 */
export function delegateActions(host, container) {
  const onClick = (e) => {
    const actionEl = e.composedPath().find((n) => n instanceof Element && n.dataset?.action);
    if (!actionEl || !container.contains(actionEl)) return;
    const entry = entryOf(actionEl, container);
    if (!entry) return;
    host.dispatchEvent(new CustomEvent('hui-action', {
      bubbles: true,
      composed: true,
      detail: { action: actionEl.dataset.action, item: entry.item, index: entry.index, originalEvent: e },
    }));
  };
  container.addEventListener('click', onClick);
  return () => container.removeEventListener('click', onClick);
}
