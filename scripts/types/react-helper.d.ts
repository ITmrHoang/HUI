// Kiểu cho @itmrhoang/h-ui/react — viết tay (scripts/gen-types.mjs chép sang dist/types/react-helper.d.ts)
// createComponent() dành cho React 18 trở xuống; React 19 dùng thẳng <hui-*> với kiểu ở ./react.d.ts.
/// <reference path="./react.d.ts" />
import type * as ReactNS from 'react';
import type { HuiElementPropsMap, HuiElementEventMap } from './index';

/** 'hui-change' → 'HuiChange' */
type Pascal<S extends string> = S extends `${infer H}-${infer R}` ? `${Capitalize<H>}${Pascal<R>}` : Capitalize<S>;

/** Tên prop React của sự kiện: 'hui-change' → 'onHuiChange' */
export type EventPropName<E extends string> = `on${Pascal<E>}`;

type HuiTag = keyof HuiElementPropsMap & keyof HTMLElementTagNameMap;
type EventOf<T extends HuiTag, E extends string> = T extends keyof HuiElementEventMap
  ? E extends keyof HuiElementEventMap[T] ? HuiElementEventMap[T][E] : CustomEvent<any>
  : CustomEvent<any>;

/** events dạng mảng tên sự kiện → { onHuiChange?: (e) => void, ... } */
type EventPropsFromList<T extends HuiTag, L extends readonly string[]> = {
  [E in L[number] as EventPropName<E>]?: (event: EventOf<T, E>) => void;
};
/** events dạng { onX: 'x' } */
type EventPropsFromMap<T extends HuiTag, M extends Record<string, string>> = {
  [K in keyof M]?: (event: EventOf<T, M[K]>) => void;
};

export type HuiEventsOption = readonly string[] | Record<string, string>;

type EventProps<T extends HuiTag, E> = E extends readonly string[]
  ? EventPropsFromList<T, E>
  : E extends Record<string, string> ? EventPropsFromMap<T, E> : {};

/** Props của component bọc: props của thẻ (gán property) + thuộc tính HTML chung + sự kiện khai báo */
export type HuiReactProps<T extends HuiTag, E = []> =
  Omit<ReactNS.HTMLAttributes<HTMLElementTagNameMap[T]>, keyof HuiElementPropsMap[T] | keyof EventProps<T, E>>
  & Partial<HuiElementPropsMap[T]>
  & EventProps<T, E>
  & { class?: string; children?: ReactNS.ReactNode };

/** Phần React mà createComponent cần (truyền `import * as React from 'react'`) */
export type ReactLike = Pick<typeof ReactNS, 'createElement' | 'forwardRef' | 'useRef' | 'useLayoutEffect' | 'useEffect'>;

/**
 * Bọc thẻ H-UI thành component React: prop → property của element (giữ kiểu object/mảng/boolean),
 * sự kiện khai báo trong `events` → addEventListener.
 */
export declare function createComponent<T extends HuiTag, const E extends HuiEventsOption = []>(
  React: ReactLike,
  tagName: T,
  options?: { events?: E; displayName?: string },
): ReactNS.ForwardRefExoticComponent<HuiReactProps<T, E> & ReactNS.RefAttributes<HTMLElementTagNameMap[T]>>;
export default createComponent;

// Hàm tiện ích (dùng nội bộ, xuất ra để kiểm thử / tự viết wrapper)
export declare function toEventProp(eventName: string): string;
export declare function normalizeEvents(events?: HuiEventsOption): Record<string, string>;
export declare function splitProps(
  props: Record<string, unknown>,
  eventMap?: Record<string, string>,
): { forward: Record<string, unknown>; properties: Record<string, unknown>; listeners: Record<string, (e: Event) => void> };
export declare function syncProperties(el: Element, next: Record<string, unknown>, prev?: Record<string, unknown>): Record<string, unknown>;
export declare function syncListeners(
  el: Element,
  handlers: Record<string, ((e: Event) => void) | undefined>,
  attached?: Map<string, EventListener>,
): Map<string, EventListener>;
export declare function detachListeners(el: Element, attached: Map<string, EventListener>): void;
