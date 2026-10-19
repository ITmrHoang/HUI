/**
 * @itmrhoang/h-ui/core — Lớp nền + tiện ích để tự viết component theo chuẩn HUI
 *   import { HuiElement, defineElement, computePosition, openOverlay } from '@itmrhoang/h-ui/core';
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
// A0 — hạ tầng hiển thị dữ liệu & cuộn
export {
  format, formatNumber, formatCurrency, formatPercent, formatCompact, formatDate, relativeTime, toDate, intlLocale,
} from './format.js';
export { renderTemplate, updateTemplateNode, entryOf, delegateActions, getPath } from './template.js';
export { Repeater } from './repeat.js';
export { DataController } from './data-controller.js';
export { onScroll, scrollToPosition, overflowEdges, dragToScroll, wheelToHorizontal, inView } from '../utils/scroll.js';
export { VirtualWindow } from '../utils/virtual.js';
// A7.1 — directive data-hui-animate
export {
  enableAnimations, disableAnimations, playAnimation, resetAnimation, runAnimation, animationsDisabled, ANIMATIONS,
} from '../utils/animate.js';
export { emitEvent, debounce, throttle } from '../utils/events.js';
