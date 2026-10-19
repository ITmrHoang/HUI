// Kiểu cho @itmrhoang/h-ui/effects — viết tay (scripts/gen-types.mjs chép sang dist/types/effects.d.ts)

type Cleanup = () => void;

export declare function attachTilt(
  el: HTMLElement,
  opts?: { max?: number; scale?: number; perspective?: number; target?: HTMLElement },
): Cleanup;
export declare function attachGlow(el: HTMLElement, opts?: { target?: HTMLElement }): Cleanup;
export declare function attachRipple(
  el: HTMLElement,
  opts?: { color?: string; duration?: number; center?: boolean; target?: HTMLElement },
): Cleanup;
export declare function attachMagnetic(
  el: HTMLElement,
  opts?: { strength?: number; max?: number; force?: boolean },
): Cleanup;
export declare function attachPress(el: HTMLElement, opts?: { scale?: number }): Cleanup;

/** Bật data-hui-tilt / glow / ripple / magnetic / press + class .hui-hover-* cho cả trang */
export declare function enableEffects(root?: Document | Element): void;
export declare function disableEffects(el: Element): void;
export declare function ensureEffectStyles(): void;

export interface ConfettiOptions {
  count?: number;
  spread?: number;
  angle?: number;
  velocity?: number;
  colors?: string | string[];
  origin?: { x: number; y: number } | Element;
  duration?: number;
}
export declare function confetti(opts?: ConfettiOptions): Promise<void>;
export declare function clearConfetti(): void;
export declare function burst(
  el: Element,
  opts?: { icon?: 'heart' | 'star' | 'circle'; count?: number; distance?: number; size?: number; colors?: string | string[]; duration?: number },
): Promise<void>;
export declare function shake(el: Element, opts?: { distance?: number; duration?: number }): Promise<void>;

export type ViewTransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom' | 'none' | (string & {});
export declare function viewTransition(updateFn: () => void | Promise<void>, opts?: { type?: ViewTransitionType; skip?: boolean }): Promise<void>;
export declare const supportsViewTransition: boolean;
export declare const VIEW_TRANSITION_TYPES: readonly string[];
export declare function parseColors(value: string | string[] | null | undefined): string[];
