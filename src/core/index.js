/**
 * hui-lib/core — Lớp nền + tiện ích để tự viết component theo chuẩn HUI
 *   import { HuiElement, defineElement, computePosition, openOverlay } from 'hui-lib/core';
 */
export { HuiElement, defineElement } from './hui-element.js';
export { HuiFormElement } from './hui-form-element.js';
export { setLocale, registerLocale, getLocale, getLocaleName, t } from './locale.js';
export {
  computePosition, autoUpdate, showFloating, hideFloating, virtualPoint, parsePlacement,
  supportsPopover, floatingCss,
} from '../utils/floating.js';
export { openOverlay, getTabbables, getDeepActiveElement, overlayCount } from '../utils/overlay.js';
export { animateIn, animateOut, collapse, prefersReducedMotion, motionPresets } from '../utils/motion.js';
export { createElement, createStyle, ensureTokens } from '../utils/dom.js';
export { emitEvent, debounce, throttle } from '../utils/events.js';
