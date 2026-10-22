/**
 * @itmrhoang/h-ui/react — bọc custom element thành component React (dành cho React 18 trở xuống).
 * React 19 đã hỗ trợ custom element sẵn (gán property + nghe sự kiện qua prop `on<tên-sự-kiện>`),
 * không cần file này — chỉ cần kiểu trong @itmrhoang/h-ui/types/react.
 *
 * Không import 'react' (giữ zero-dependency): truyền React vào làm tham số.
 *   import * as React from 'react';
 *   import { createComponent } from '@itmrhoang/h-ui/react';
 *   import '@itmrhoang/h-ui/hui-input';
 *   export const HuiInput = createComponent(React, 'hui-input', { events: ['input', 'change', 'hui-search'] });
 *   <HuiInput value={v} disabled onChange={(e) => setV(e.target.value)} onHuiSearch={...} />
 */

/** Prop chuyển nguyên cho React (React tự xử lý thành attribute của thẻ) */
const FORWARD = new Set([
  'children', 'key', 'ref', 'style', 'className', 'class', 'id', 'slot', 'part', 'title', 'lang', 'dir',
  'hidden', 'tabIndex', 'role', 'inert', 'draggable', 'translate', 'spellCheck', 'accessKey', 'autoFocus',
  'contentEditable', 'nonce', 'dangerouslySetInnerHTML', 'suppressHydrationWarning', 'suppressContentEditableWarning',
]);

/** 'hui-change' → 'onHuiChange', 'change' → 'onChange' */
export function toEventProp(eventName) {
  return `on${String(eventName).replace(/(^|[-_:])(\w)/g, (_, __, c) => c.toUpperCase())}`;
}

/** ['change', 'hui-search'] | { onChange: 'change' } → { onChange: 'change', onHuiSearch: 'hui-search' } */
export function normalizeEvents(events) {
  if (!events) return {};
  if (Array.isArray(events)) return Object.fromEntries(events.map((name) => [toEventProp(name), name]));
  return { ...events };
}

/**
 * Tách props thành 3 nhóm:
 *   forward    — đưa cho React.createElement (children, className, style, data-*, aria-*, onClick…)
 *   properties — gán thẳng lên element (el.value = …, el.disabled = …) — giữ đúng kiểu object/mảng/boolean
 *   listeners  — { 'hui-change': fn } gắn bằng addEventListener
 */
export function splitProps(props, eventMap = {}) {
  const forward = {};
  const properties = {};
  const listeners = {};
  for (const [key, value] of Object.entries(props || {})) {
    if (Object.prototype.hasOwnProperty.call(eventMap, key)) {
      if (typeof value === 'function') listeners[eventMap[key]] = value;
    } else if (FORWARD.has(key) || key.includes('-') || /^on[A-Z]/.test(key)) {
      forward[key] = value;
    } else {
      properties[key] = value;
    }
  }
  return { forward, properties, listeners };
}

/**
 * Đồng bộ property: gán khi đổi, prop bị bỏ đi → gán undefined (HuiElement đưa về giá trị mặc định).
 * Trả về bản ghi property hiện tại để lần sau so sánh.
 */
export function syncProperties(el, next, prev = {}) {
  for (const key of Object.keys(prev)) {
    if (!(key in next)) el[key] = undefined;
  }
  for (const [key, value] of Object.entries(next)) {
    if (!(key in prev) || !Object.is(prev[key], value) || !Object.is(el[key], value)) el[key] = value;
  }
  return { ...next };
}

/**
 * Gắn/gỡ listener. Mỗi sự kiện gắn 1 hàm trung gian đọc handler MỚI NHẤT từ `handlers`
 * (đối tượng giữ nguyên qua các lần render) → đổi handler không phải gỡ/gắn lại.
 * @returns {Map<string, EventListener>} các listener đang gắn
 */
export function syncListeners(el, handlers, attached = new Map()) {
  for (const [name, fn] of attached) {
    if (typeof handlers[name] !== 'function') {
      el.removeEventListener(name, fn);
      attached.delete(name);
    }
  }
  for (const name of Object.keys(handlers)) {
    if (attached.has(name) || typeof handlers[name] !== 'function') continue;
    const fn = (event) => handlers[name]?.(event);
    el.addEventListener(name, fn);
    attached.set(name, fn);
  }
  return attached;
}

/** Gỡ toàn bộ listener đã gắn */
export function detachListeners(el, attached) {
  for (const [name, fn] of attached) el.removeEventListener(name, fn);
  attached.clear();
}

/** 'hui-input-number' → 'HuiInputNumber' */
const pascal = (tag) => tag.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());

/**
 * Tạo component React bọc thẻ H-UI.
 * @param {typeof import('react')} React
 * @param {string} tagName vd 'hui-button'
 * @param {{ events?: string[] | Record<string, string>, displayName?: string }} [options]
 */
export function createComponent(React, tagName, options = {}) {
  const { createElement, forwardRef, useRef, useLayoutEffect, useEffect } = React;
  // SSR: useLayoutEffect in cảnh báo trên server → dùng useEffect khi không có DOM
  const useIsoEffect = typeof document !== 'undefined' && useLayoutEffect ? useLayoutEffect : useEffect;
  const eventMap = normalizeEvents(options.events);

  const Component = forwardRef((props, ref) => {
    const store = useRef(null);
    if (!store.current) {
      const s = { el: null, ref: null, props: {}, handlers: {}, attached: new Map() };
      // Callback ref cố định (tạo 1 lần) — không bị React gọi lại null/node sau mỗi render
      s.setRef = (node) => {
        s.el = node;
        if (typeof s.ref === 'function') s.ref(node);
        else if (s.ref) s.ref.current = node;
      };
      store.current = s;
    }
    const s = store.current;
    s.ref = ref;
    const { forward, properties, listeners } = splitProps(props, eventMap);

    useIsoEffect(() => {
      // Cập nhật handler ở effect (không ở render — render có thể bị React bỏ dở)
      for (const key of Object.keys(s.handlers)) delete s.handlers[key];
      Object.assign(s.handlers, listeners);
      if (!s.el) return;
      s.props = syncProperties(s.el, properties, s.props);
      syncListeners(s.el, s.handlers, s.attached);
    });
    useIsoEffect(() => () => {
      if (s.el) detachListeners(s.el, s.attached);
      s.props = {};
    }, []);

    return createElement(tagName, { ...forward, ref: s.setRef });
  });
  Component.displayName = options.displayName || pascal(tagName);
  return Component;
}

export default createComponent;
