/**
 * Storybook Stories — HUI Toggle Button Group (nhóm nút bật/tắt, MUI ToggleButtonGroup)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const realBtn = (el) => el.shadowRoot?.querySelector('button') ?? el;

export default {
  title: 'Molecules/HuiToggleButtonGroup',
  component: 'hui-toggle-button-group',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Toggle Button Group** — nhóm nút bật/tắt gộp viền (MUI ToggleButtonGroup), tham gia \`<form>\`.
Mặc định *exclusive* (chọn một, bấm lại để tắt); \`multiple\` cho bật nhiều nút.

\`\`\`html
<hui-toggle-button-group name="align" value="left" aria-label="Căn lề">
  <hui-button value="left" icon="chevron-left" aria-label="Trái"></hui-button>
  <hui-button value="center" icon="menu" aria-label="Giữa"></hui-button>
</hui-toggle-button-group>
\`\`\`

### Attributes / Properties
| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| \`value\` | string \\| string[] | \`''\` | exclusive: chuỗi; multiple: mảng (attribute \`"a,b"\` hoặc JSON) |
| \`multiple\` | boolean | — | Bật nhiều nút |
| \`variant\` | variant của hui-button | \`outline\` | Cho nút con chưa tự đặt variant |
| \`orientation\` | \`horizontal \\| vertical\` | \`horizontal\` | Hướng xếp |
| \`size\` / \`block\` | — | — | Kích thước / chia đều chiều ngang |
| \`name\` / \`disabled\` / \`required\` | — | — | Như form control native (multiple: mỗi giá trị 1 entry) |

### Events
| Event | Detail |
|-------|--------|
| \`input\` / \`change\` / \`hui-change\` | \`{ value }\` |

### Slots
(mặc định) — các nút có attribute \`value\`: \`<hui-button>\` hoặc \`<button>\`. Nút bật có attribute \`pressed\`,
\`aria-pressed="true"\` đặt trên thẻ \`<button>\` thật.

### Parts / CSS Variables
\`base\` · \`--hui-button-group-radius\`, \`--hui-toggle-button-group-pressed-bg\`, \`--hui-toggle-button-group-pressed-color\`,
\`--hui-toggle-button-group-pressed-border-color\` · tự style: \`hui-toggle-button-group [pressed] { … }\`

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Đi qua từng nút |
| \`Enter\` / \`Space\` | Bật / tắt nút đang focus |
| \`←\` \`→\` (\`↑\` \`↓\` khi dọc), \`Home\` / \`End\` | Chuyển focus giữa các nút |
        `,
      },
    },
  },
};

export const Exclusive = {
  render: () => html`
    <hui-toggle-button-group id="tbg-x" value="left" aria-label="Căn lề">
      <hui-button value="left">Trái</hui-button>
      <hui-button value="center">Giữa</hui-button>
      <hui-button value="right">Phải</hui-button>
      <hui-button value="justify" disabled>Đều</hui-button>
    </hui-toggle-button-group>
  `,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('#tbg-x');
    const [left, center] = group.querySelectorAll('hui-button');
    await waitFor(() => expect(realBtn(left).getAttribute('aria-pressed')).toBe('true'));
    const events = [];
    group.addEventListener('hui-change', (e) => events.push(e.detail.value));
    await userEvent.click(realBtn(center));
    expect(group.value).toBe('center');
    expect(center.hasAttribute('pressed')).toBe(true);
    expect(realBtn(left).getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(realBtn(center)); // bấm lại → tắt
    expect(group.value).toBe('');
    expect(events).toEqual(['center', '']);
  },
};

export const Multiple = {
  render: () => html`
    <form id="tbg-form">
      <hui-toggle-button-group name="fmt" multiple value="bold" aria-label="Định dạng">
        <hui-button value="bold"><b>B</b></hui-button>
        <hui-button value="italic"><i>I</i></hui-button>
        <hui-button value="underline"><u>U</u></hui-button>
      </hui-toggle-button-group>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#tbg-form');
    const group = form.querySelector('hui-toggle-button-group');
    const btns = group.querySelectorAll('hui-button');
    await waitFor(() => expect(btns[0].hasAttribute('pressed')).toBe(true));
    await userEvent.click(realBtn(btns[2]));
    await userEvent.click(realBtn(btns[1]));
    expect(group.value).toEqual(['bold', 'italic', 'underline']); // giữ thứ tự theo nút
    expect(new FormData(form).getAll('fmt')).toEqual(['bold', 'italic', 'underline']);
    await userEvent.click(realBtn(btns[0]));
    expect(group.value).toEqual(['italic', 'underline']);
    form.reset();
    await group.updateComplete;
    expect(group.value).toEqual(['bold']);
  },
};

/** <button> native làm nút; ←/→ chuyển focus, Space bật/tắt */
export const NativeButtonsKeyboard = {
  render: () => html`
    <hui-toggle-button-group id="tbg-n" aria-label="Chế độ xem">
      <button type="button" value="list">Danh sách</button>
      <button type="button" value="grid">Lưới</button>
      <button type="button" value="map">Bản đồ</button>
    </hui-toggle-button-group>
  `,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('#tbg-n');
    const btns = group.querySelectorAll('button');
    btns[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(btns[1]);
    await userEvent.keyboard(' ');
    expect(group.value).toBe('grid');
    expect(btns[1].getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(btns[2]);
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(btns[0]);
  },
};

export const SizesVertical = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:flex-start">
      <hui-toggle-button-group size="sm" value="a" aria-label="sm"><hui-button value="a">A</hui-button><hui-button value="b">B</hui-button></hui-toggle-button-group>
      <hui-toggle-button-group size="lg" value="b" aria-label="lg"><hui-button value="a">A</hui-button><hui-button value="b">B</hui-button></hui-toggle-button-group>
      <hui-toggle-button-group orientation="vertical" value="top" aria-label="dọc">
        <hui-button value="top">Trên</hui-button><hui-button value="mid">Giữa</hui-button><hui-button value="bot">Dưới</hui-button>
      </hui-toggle-button-group>
      <hui-toggle-button-group disabled value="a" aria-label="disabled"><hui-button value="a">A</hui-button><hui-button value="b">B</hui-button></hui-toggle-button-group>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .tbg-brand {
        --hui-toggle-button-group-pressed-bg: var(--hui-success);
        --hui-toggle-button-group-pressed-color: var(--hui-text-inverse);
        --hui-toggle-button-group-pressed-border-color: var(--hui-success);
        --hui-button-group-radius: 999px;
      }
      .tbg-brand [pressed] { font-weight: 700; }
    </style>
    <hui-toggle-button-group class="tbg-brand" value="on" aria-label="Trạng thái">
      <hui-button value="on">Bật</hui-button><hui-button value="off">Tắt</hui-button>
    </hui-toggle-button-group>
  `,
};
