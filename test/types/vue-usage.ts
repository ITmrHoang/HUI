// Kiểm tra kiểu Vue (npm run check:types) — không chạy, chỉ để tsc bắt lỗi trong file .d.ts sinh ra.
import { createApp, type GlobalComponents, type GlobalDirectives } from 'vue';
import HuiVue, { huiCompilerOptions, isHuiElement, loadHui, vHuiModel } from '../../dist/types/vue-plugin';

const app = createApp({});
app.use(HuiVue, { components: ['hui-button', () => Promise.resolve()] });
app.use(HuiVue, { components: false, directive: 'model-hui' });
// @ts-expect-error components phải là 'all' | false | mảng
app.use(HuiVue, { components: 'some' });

export const ok: boolean = isHuiElement('hui-button') && huiCompilerOptions.isCustomElement('hui-x');
export const ready: Promise<void> = loadHui(['hui-input']);

// GlobalComponents: props + sự kiện + v-model
type ButtonProps = InstanceType<GlobalComponents['hui-button']>['$props'];
export const btn: ButtonProps = { variant: 'danger', loading: true, onHuiClick: (e) => e.detail.originalEvent };
// @ts-expect-error variant không hợp lệ
export const badBtn: ButtonProps = { variant: 'nope' };

type InputProps = InstanceType<GlobalComponents['hui-input']>['$props'];
export const input: InputProps = {
  value: 'a',
  modelValue: 'a',
  'onUpdate:modelValue': (v) => v,
  onHuiSearch: (e) => e.detail.value,
};

export const directive: GlobalDirectives['vHuiModel'] = vHuiModel;
