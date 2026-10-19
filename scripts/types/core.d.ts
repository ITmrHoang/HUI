// Kiểu cho @itmrhoang/h-ui/core — viết tay (scripts/gen-types.mjs chép sang dist/types/core.d.ts)

export interface PropertyOptions {
  type?: StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor | ArrayConstructor;
  default?: unknown;
  attribute?: string | false;
  reflect?: boolean;
}

export declare class HuiElement extends HTMLElement {
  static properties: Record<string, PropertyOptions>;
  static styles: string | string[];
  static formAssociated: boolean;
  static localized: boolean;
  readonly updateComplete: Promise<void>;
  readonly isDisabled: boolean;
  readonly form: HTMLFormElement | null;
  readonly validity: ValidityState | undefined;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  requestUpdate(name?: string, oldValue?: unknown): void;
  protected render(): Node | Node[] | null;
  protected updated(changed: Map<string, unknown>): void;
  protected firstUpdated(): void;
  emit(name: string, detail?: unknown, options?: { bubbles?: boolean; composed?: boolean; cancelable?: boolean }): boolean;
  listen(target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions): void;
  setState(name: string, on: boolean): void;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setFormValue(value: File | string | FormData | null, state?: unknown): void;
}

export declare class HuiFormElement extends HuiElement {
  name: string | null;
  value: unknown;
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  status: '' | 'error' | 'warning';
  size: '' | 'sm' | 'md' | 'lg';
  minlength: number | null;
  maxlength: number | null;
  pattern: string | null;
  readonly effectiveSize: 'sm' | 'md' | 'lg';
  readonly errorMessage: string;
  setCustomValidity(message: string): void;
  markInteracted(): void;
  protected formValue(): string | FormData | null;
  protected validationAnchor(): HTMLElement | undefined;
  protected checkConstraints(): { flags: ValidityStateFlags; message: string } | null;
  protected relayNativeEvents(inner: HTMLElement, read?: (el: any) => unknown): void;
}

export declare function defineElement<T extends CustomElementConstructor>(tag: string, ctor: T): T;

// Locale
export declare function setLocale(nameOrMessages: string | Record<string, unknown>): void;
export declare function registerLocale(name: string, messages: Record<string, unknown>, fallback?: string): void;
export declare function getLocale(): Record<string, any>;
export declare function getLocaleName(): string;
export declare function t(path: string, vars?: Record<string, string | number>): any;

// Floating
export type Placement =
  | 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end'
  | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom';
export interface PositionResult {
  x: number; y: number; placement: string; side: string; align: string; arrowX?: number; arrowY?: number;
}
export declare function computePosition(
  reference: Element | { getBoundingClientRect(): DOMRect | Record<string, number> },
  floating: HTMLElement,
  opts?: { placement?: Placement; offset?: number; flip?: boolean; shift?: boolean; padding?: number; arrow?: HTMLElement; matchWidth?: boolean | 'width' | 'min-width' },
): PositionResult;
export declare function autoUpdate(reference: Element | object, floating: HTMLElement, update: () => void): () => void;
export declare function showFloating(floating: HTMLElement, zIndexVar?: string): void;
export declare function hideFloating(floating: HTMLElement): void;
export declare function virtualPoint(x: number, y: number): { getBoundingClientRect(): Record<string, number> };
export declare function parsePlacement(placement?: string): { side: string; align: string };
export declare const supportsPopover: boolean;
export declare const floatingCss: string;

// Overlay
export interface OverlayHandle { zIndex: number; isTop(): boolean; close(): void; }
export declare function openOverlay(opts: {
  element: HTMLElement;
  ignore?: Element[];
  onEscape?: ((e: KeyboardEvent) => void) | null;
  onClickOutside?: ((e: PointerEvent) => void) | null;
  trapFocus?: boolean;
  lockScroll?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
}): OverlayHandle;
export declare function getTabbables(root: Element | ShadowRoot): HTMLElement[];
export declare function getDeepActiveElement(): Element | null;
export declare function overlayCount(): number;

// Motion
export type MotionPreset =
  | 'fade' | 'zoom' | 'zoom-big' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
  | 'move-left' | 'move-right' | 'move-up' | 'move-down';
export declare function animateIn(el: Element, preset?: MotionPreset, opts?: { duration?: number; origin?: string }): Promise<void>;
export declare function animateOut(el: Element, preset?: MotionPreset, opts?: { duration?: number; origin?: string }): Promise<void>;
export declare function collapse(el: HTMLElement, open: boolean, opts?: { duration?: number }): Promise<void>;
export declare function prefersReducedMotion(): boolean;
export declare const motionPresets: MotionPreset[];

// DOM / events
export declare function createElement(tag: string, attrs?: Record<string, unknown>, ...children: Array<Node | string | number | null | undefined>): HTMLElement;
export declare function createStyle(css: string): HTMLStyleElement;
export declare function ensureTokens(): void;
export declare function emitEvent(el: EventTarget, name: string, detail?: unknown, options?: object): boolean;
export declare function debounce<T extends (...a: any[]) => void>(fn: T, delay?: number): T;
export declare function throttle<T extends (...a: any[]) => void>(fn: T, limit?: number): T;
