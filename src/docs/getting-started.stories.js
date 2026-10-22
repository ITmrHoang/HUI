/**
 * Trang tài liệu "Bắt đầu" — nội dung chính nằm trong getting-started.md (markdown, hiện ở trang Docs).
 * Story bên dưới là ví dụ sống + play test để project storybook của vitest phủ trang này.
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import doc from './getting-started.md?raw';
import { ensureTokens } from '../utils/dom.js';
import '../components/hui-button/index.js';
import '../components/hui-input/index.js';
import '../components/hui-tag/index.js';
import '../components/hui-space/index.js';
import '../components/hui-card/index.js';

// Token phải có trên trang kể cả khi story chưa gắn component nào (vd palette chỉ dùng var(--hui-*))
ensureTokens();

export default {
  title: 'Docs/Bắt đầu (Getting started)',
  id: 'docs-getting-started', // id ASCII cho URL (?path=/docs/docs-getting-started--docs)
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: doc } },
  },
};

/** Ví dụ đầu tiên: thẻ HUI là HTML chuẩn — attribute để cấu hình, sự kiện `hui-click` / `input` để nhận tương tác. */
export const FirstExample = {
  name: 'Ví dụ đầu tiên',
  render: () => {
    let count = 0;
    const onClick = (e) => {
      count += 1;
      e.currentTarget.closest('hui-card').querySelector('#gs-count').textContent = String(count);
    };
    const onInput = (e) => {
      e.currentTarget.closest('hui-card').querySelector('#gs-echo').textContent = e.target.value || '…';
    };
    return html`
      <hui-card title="Xin chào H-UI" style="max-width: 480px">
        <hui-tag slot="extra" color="success">v0</hui-tag>
        <hui-space direction="vertical" style="width: 100%">
          <hui-input id="gs-name" label="Tên của bạn" placeholder="Nhập tên…" @input=${onInput}></hui-input>
          <div>Bạn đã gõ: <strong id="gs-echo">…</strong></div>
          <hui-space>
            <hui-button id="gs-btn" variant="primary" icon="check" @hui-click=${onClick}>Bấm thử</hui-button>
            <span>Số lần bấm: <strong id="gs-count">0</strong></span>
          </hui-space>
        </hui-space>
      </hui-card>
    `;
  },
  play: async ({ canvasElement }) => {
    for (const tag of ['hui-card', 'hui-input', 'hui-button', 'hui-tag', 'hui-space']) {
      await expect(customElements.get(tag)).toBeDefined();
    }
    const btn = canvasElement.querySelector('#gs-btn');
    await waitFor(() => expect(btn.shadowRoot.querySelector('[part~="base"]')).not.toBe(null));
    await userEvent.click(btn.shadowRoot.querySelector('button'));
    await waitFor(() => expect(canvasElement.querySelector('#gs-count').textContent).toBe('1'));

    const input = canvasElement.querySelector('#gs-name').shadowRoot.querySelector('input');
    await userEvent.type(input, 'An');
    await waitFor(() => expect(canvasElement.querySelector('#gs-echo').textContent).toBe('An'));
  },
};

/** Gán property boolean bằng JS: `el.loading = true` */
function toggleLoading(e) {
  const target = e.currentTarget.parentElement.querySelector('#gs-target');
  target.loading = !target.loading;
}

/** Mảng / object truyền bằng **property** (lit: `.options=${...}`; JS thuần: `el.options = [...]`), chuỗi / số / boolean bằng attribute. */
export const PropertyVsAttribute = {
  name: 'Attribute và property',
  render: () => html`
    <hui-space direction="vertical">
      <hui-button size="sm" variant="outline" disabled>disabled (có mặt = true)</hui-button>
      <hui-button size="sm" variant="outline" id="gs-toggle" @hui-click=${toggleLoading}>
        Bấm để bật / tắt loading của nút bên dưới
      </hui-button>
      <hui-button size="sm" id="gs-target">Nút đích</hui-button>
    </hui-space>
  `,
  play: async ({ canvasElement }) => {
    const toggle = canvasElement.querySelector('#gs-toggle');
    const target = canvasElement.querySelector('#gs-target');
    await userEvent.click(toggle.shadowRoot.querySelector('button'));
    // Property boolean phản chiếu (reflect) ra attribute → CSS :host([loading]) thấy được
    await waitFor(() => expect(target.hasAttribute('loading')).toBe(true));
    await userEvent.click(toggle.shadowRoot.querySelector('button'));
    await waitFor(() => expect(target.hasAttribute('loading')).toBe(false));
  },
};
