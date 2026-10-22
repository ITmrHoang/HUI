// Kiểu cho @itmrhoang/h-ui/vue — viết tay (scripts/gen-types.mjs chép sang dist/types/vue-plugin.d.ts)
// Import plugin này là có luôn gợi ý GlobalComponents (file ./vue.d.ts sinh từ manifest).
/// <reference path="./vue.d.ts" />
import type { App, ObjectDirective } from 'vue';

/** Một mục cần tải: tên thẻ / đường dẫn lẻ ('hui-button', 'hui-radio-group') hoặc loader (() => import(...)) */
export type HuiComponentSource = string | (() => Promise<unknown>);

export interface HuiVueOptions {
  /**
   * 'all' (mặc định) = tải toàn bộ thư viện; false = không tải (bạn tự import từng component);
   * mảng = chỉ tải các component liệt kê.
   */
  components?: 'all' | false | HuiComponentSource[];
  /** Tên directive hai chiều (mặc định 'hui-model' → v-hui-model); false = không đăng ký */
  directive?: string | false;
}

/** true với thẻ bắt đầu bằng 'hui-' */
export declare function isHuiElement(tag: string): boolean;

/** vue({ template: { compilerOptions: huiCompilerOptions } }) — @vitejs/plugin-vue / Nuxt */
export declare const huiCompilerOptions: Readonly<{ isCustomElement: (tag: string) => boolean }>;

/** Gộp với isCustomElement sẵn có của dự án */
export declare function withHuiElements(prev?: (tag: string) => boolean): (tag: string) => boolean;

/** Tên thư mục component chứa thẻ ('hui-radio-group' → 'hui-radio'), null nếu không có */
export declare function resolveComponentFolder(tag: string): string | null;

/** Tải (đăng ký) component — Promise xong khi các thẻ đã được define */
export declare function loadHui(components?: 'all' | false | HuiComponentSource | HuiComponentSource[]): Promise<void>;

/**
 * Giá trị binding của v-hui-model:
 *   v-hui-model:email="form"      → form.email (form là reactive)
 *   v-hui-model="[form, 'email']" → form.email
 *   v-hui-model="someRef"         → someRef.value (ref không bị template tự unwrap)
 * Modifier: .lazy (chỉ nghe change), .trim, .number, .checked / .value (chọn property đồng bộ).
 */
export type HuiModelBinding = Record<string, any> | [Record<string, any>, string] | { value: unknown };
export type HuiModelModifiers = 'lazy' | 'trim' | 'number' | 'checked' | 'value';

/** Directive hai chiều cho component form (value / checked + sự kiện input / change) */
export declare const vHuiModel: ObjectDirective<HTMLElement, HuiModelBinding, HuiModelModifiers, string>;

export declare function modelAccessor(binding: { value: unknown; arg?: string }): { get(): unknown; set(v: unknown): void } | null;
export declare function modelProp(el: Element, modifiers?: Partial<Record<HuiModelModifiers, boolean>>): 'value' | 'checked';
export declare function castModelValue(value: unknown, modifiers?: Partial<Record<HuiModelModifiers, boolean>>): unknown;

/** Khóa inject: inject(HUI_READY) → Promise khi component đã tải xong */
export declare const HUI_READY: 'hui:ready';

export declare const HuiVue: { install(app: App, options?: HuiVueOptions): Promise<void> };
export default HuiVue;

declare module 'vue' {
  interface ComponentCustomProperties {
    /** Promise xong khi plugin H-UI đã tải component */
    $huiReady: Promise<void>;
  }
  interface GlobalDirectives {
    /** v-hui-model (đăng ký bởi app.use(HuiVue)) */
    vHuiModel: typeof vHuiModel;
  }
}
