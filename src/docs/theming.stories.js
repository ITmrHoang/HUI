/**
 * Trang tài liệu "Theming" — nội dung trong theming.md; story = ví dụ sống (palette, config-provider, đổi màu chính).
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import doc from './theming.md?raw';
import { ensureTokens } from '../utils/dom.js';
import '../components/hui-config-provider/index.js';
import '../components/hui-button/index.js';
import '../components/hui-input/index.js';
import '../components/hui-switch/index.js';
import '../components/hui-tag/index.js';
import '../components/hui-card/index.js';
import '../components/hui-progress/index.js';

const COLORS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];
const SHADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const STYLE = html`
  <style>
    .th-palette { display: grid; gap: 6px; font-family: var(--hui-font-family); color: var(--hui-text); }
    .th-row { display: grid; grid-template-columns: 84px repeat(10, minmax(0, 1fr)); gap: 4px; align-items: center; }
    .th-row > span { font-size: 12px; color: var(--hui-text-secondary); }
    .th-chip { height: 32px; border-radius: 6px; border: 1px solid var(--hui-border-secondary); }
    .th-scale { display: grid; grid-template-columns: 84px repeat(10, minmax(0, 1fr)); gap: 4px; font-size: 11px; color: var(--hui-text-tertiary); text-align: center; }
    .th-split { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .th-zone { display: block; padding: 16px; border-radius: 12px; background: var(--hui-bg); color: var(--hui-text); border: 1px solid var(--hui-border); }
    .th-zone h4 { margin: 0 0 12px; font: 600 14px var(--hui-font-family); }
    .th-stack { display: grid; gap: 12px; }
    .th-picker { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-family: var(--hui-font-family); color: var(--hui-text); margin-bottom: 12px; }
  </style>
`;

const sampleUi = () => html`
  <div class="th-stack">
    <div style="display:flex; gap:8px; flex-wrap:wrap">
      <hui-button variant="primary">Primary</hui-button>
      <hui-button variant="outline">Outline</hui-button>
      <hui-button variant="text">Text</hui-button>
    </div>
    <hui-input label="Email" placeholder="ban@vidu.com"></hui-input>
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
      <hui-switch checked aria-label="Bật thông báo"></hui-switch>
      <hui-tag color="primary">Mới</hui-tag>
      <hui-tag color="success">Hoạt động</hui-tag>
    </div>
    <hui-progress percent="64"></hui-progress>
  </div>
`;

// Token phải có trên trang kể cả khi story chưa gắn component nào (vd palette chỉ dùng var(--hui-*))
ensureTokens();

export default {
  title: 'Docs/Theming',
  id: 'docs-theming',
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: doc } },
  },
};

/** Bảng sắc độ `-1 … -10` của 6 màu ngữ nghĩa — tự tính từ màu gốc bằng `color-mix()`, đổi theo theme (thử nút Theme trên toolbar). */
export const Palette = {
  name: 'Bảng màu (palette)',
  render: () => html`
    ${STYLE}
    <div class="th-palette">
      <div class="th-scale"><span></span>${SHADES.map((s) => html`<span>${s}</span>`)}</div>
      ${COLORS.map((c) => html`
        <div class="th-row" data-color=${c}>
          <span>${c}</span>
          ${SHADES.map((s) => html`<div class="th-chip" title="--hui-${c}-${s}" style="background: var(--hui-${c}-${s})"></div>`)}
        </div>
      `)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('.th-chip').length).toBe(60);
    // Sắc 6 = màu gốc
    const chip = canvasElement.querySelector('[data-color="primary"] .th-chip:nth-of-type(6)');
    const root = getComputedStyle(document.documentElement).getPropertyValue('--hui-primary').trim();
    await expect(root).not.toBe('');
    await expect(getComputedStyle(chip).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  },
};

/** Hai vùng cạnh nhau bằng `hui-config-provider`: theme + màu chính + bo góc riêng, không ảnh hưởng phần còn lại của trang. */
export const ConfigProviderScopes = {
  name: 'hui-config-provider theo vùng',
  render: () => html`
    ${STYLE}
    <div class="th-split">
      <hui-config-provider id="th-light" theme="light" primary-color="#0ea5e9" radius="12">
        <div class="th-zone"><h4>theme="light" · primary-color="#0ea5e9" · radius="12"</h4>${sampleUi()}</div>
      </hui-config-provider>
      <hui-config-provider id="th-dark" theme="dark" primary-color="#e11d48" radius="2">
        <div class="th-zone"><h4>theme="dark" · primary-color="#e11d48" · radius="2"</h4>${sampleUi()}</div>
      </hui-config-provider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dark = canvasElement.querySelector('#th-dark');
    await waitFor(() => expect(dark.getAttribute('data-theme')).toBe('dark'));
    await expect(dark.style.getPropertyValue('--hui-primary')).toBe('#e11d48');
    await expect(dark.style.getPropertyValue('--hui-radius')).toBe('2px');
    // Nút bên trong đọc đúng token của vùng (kế thừa xuyên Shadow DOM)
    const btn = dark.querySelector('hui-button');
    await waitFor(() => expect(getComputedStyle(btn).getPropertyValue('--hui-primary').trim()).toBe('#e11d48'));
    const light = canvasElement.querySelector('#th-light');
    await expect(getComputedStyle(light.querySelector('hui-button')).getPropertyValue('--hui-primary').trim()).toBe('#0ea5e9');
  },
};

/** Chọn màu → gán `primary-color` cho provider; hover, active, nền nhạt và 10 sắc độ đổi theo ngay. */
export const CustomPrimary = {
  name: 'Đổi --hui-primary',
  render: () => {
    const onPick = (e) => {
      e.currentTarget.closest('.th-custom').querySelector('hui-config-provider').primaryColor = e.target.value;
    };
    return html`
      ${STYLE}
      <div class="th-custom">
        <label class="th-picker">
          Màu chính:
          <input id="th-color" type="color" value="#7c3aed" @input=${onPick} />
          <code>&lt;hui-config-provider primary-color="…"&gt;</code>
        </label>
        <hui-config-provider primary-color="#7c3aed">
          <div class="th-zone">
            ${sampleUi()}
            <div class="th-row" style="margin-top:12px"><span>primary</span>
              ${SHADES.map((s) => html`<div class="th-chip" style="background: var(--hui-primary-${s})"></div>`)}
            </div>
          </div>
        </hui-config-provider>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const provider = canvasElement.querySelector('hui-config-provider');
    const input = canvasElement.querySelector('#th-color');
    input.value = '#16a34a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await waitFor(() => expect(provider.style.getPropertyValue('--hui-primary')).toBe('#16a34a'));
    const chip6 = canvasElement.querySelectorAll('.th-chip')[5];
    await waitFor(() => expect(getComputedStyle(chip6).backgroundColor).toBe('rgb(22, 163, 74)'));
  },
};
