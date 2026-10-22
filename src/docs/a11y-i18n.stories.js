/**
 * Trang tài liệu "Accessibility & i18n" — nội dung trong a11y-i18n.md; story = đổi ngôn ngữ trực tiếp + bàn phím.
 * Story đổi locale toàn cục → play luôn trả lại 'vi' ở cuối để không ảnh hưởng story khác.
 */

import { html, render as litRender } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import doc from './a11y-i18n.md?raw';
import { ensureTokens } from '../utils/dom.js';
import { setLocale, getLocaleName } from '../core/locale.js';
import { formatCurrency, formatDate } from '../core/format.js';
import '../components/hui-language-switch/index.js';
import '../components/hui-empty/index.js';
import '../components/hui-pagination/index.js';
import '../components/hui-tabs/index.js';
import '../components/hui-button/index.js';
import '../components/hui-kbd/index.js';

// Token phải có trên trang kể cả khi story chưa gắn component nào (vd palette chỉ dùng var(--hui-*))
ensureTokens();

export default {
  title: 'Docs/Accessibility & i18n',
  id: 'docs-a11y-i18n',
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: doc } },
  },
};

/** Đổi ngôn ngữ: chuỗi mặc định của component + định dạng tiền / ngày (`Intl`) cập nhật ngay, không tải lại trang. */
export const LiveLocale = {
  name: 'Đổi ngôn ngữ trực tiếp',
  render: () => {
    const wrap = document.createElement('div');
    const sample = () => {
      wrap.querySelector('#i18n-name').textContent = getLocaleName();
      wrap.querySelector('#i18n-money').textContent = formatCurrency(1290000);
      wrap.querySelector('#i18n-date').textContent = formatDate('2026-10-20T09:00:00', 'long');
    };
    // Trang của bạn nghe hui-locale-change để đổi nội dung riêng (gỡ listener khi story bị gỡ khỏi trang)
    const onLocale = () => (wrap.isConnected ? sample() : document.removeEventListener('hui-locale-change', onLocale));
    document.addEventListener('hui-locale-change', onLocale);
    litRender(html`
      <style>
        .i18n { display: grid; gap: 16px; max-width: 560px; font-family: var(--hui-font-family); color: var(--hui-text); }
        .i18n dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0; }
        .i18n dt { color: var(--hui-text-secondary); }
        .i18n dd { margin: 0; font-weight: 600; }
        .i18n .box { border: 1px solid var(--hui-border); border-radius: 12px; padding: 12px; background: var(--hui-bg-container); }
      </style>
      <div class="i18n">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap">
          <hui-language-switch id="i18n-switch" variant="inline"></hui-language-switch>
          <hui-button id="i18n-en" size="sm" variant="outline" @hui-click=${() => setLocale('en')}>setLocale('en')</hui-button>
          <hui-button id="i18n-vi" size="sm" variant="outline" @hui-click=${() => setLocale('vi')}>setLocale('vi')</hui-button>
        </div>
        <dl>
          <dt>getLocaleName()</dt><dd id="i18n-name"></dd>
          <dt>formatCurrency(1290000)</dt><dd id="i18n-money"></dd>
          <dt>formatDate(…, 'long')</dt><dd id="i18n-date"></dd>
        </dl>
        <div class="box"><hui-empty id="i18n-empty"></hui-empty></div>
        <hui-pagination total="85" show-total></hui-pagination>
      </div>
    `, wrap);
    sample();
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const empty = canvasElement.querySelector('#i18n-empty');
    const desc = () => empty.shadowRoot.querySelector('[part~="description"]').textContent.trim();
    try {
      await waitFor(() => expect(desc()).toBe('Không có dữ liệu'));
      await userEvent.click(canvasElement.querySelector('#i18n-en').shadowRoot.querySelector('button'));
      await waitFor(() => expect(desc()).toBe('No data'));
      await expect(getLocaleName()).toBe('en');
      await waitFor(() => expect(canvasElement.querySelector('#i18n-name').textContent).toBe('en'));
      await userEvent.click(canvasElement.querySelector('#i18n-vi').shadowRoot.querySelector('button'));
      await waitFor(() => expect(desc()).toBe('Không có dữ liệu'));
    } finally {
      setLocale('vi');
    }
  },
};

/** Bàn phím theo APG Tabs: `←` `→` chuyển tab (bỏ qua tab disabled), `Home` / `End`, một điểm dừng Tab cho cả thanh. */
export const KeyboardTabs = {
  name: 'Bàn phím: Tabs',
  render: () => html`
    <p style="font-family: var(--hui-font-family); color: var(--hui-text-secondary); margin: 0 0 8px">
      Bấm vào tab đầu rồi dùng <hui-kbd>←</hui-kbd> <hui-kbd>→</hui-kbd> <hui-kbd>Home</hui-kbd> <hui-kbd>End</hui-kbd>.
    </p>
    <hui-tabs id="kbd-tabs">
      <hui-tab-panel key="overview" label="Tổng quan">Nội dung tổng quan.</hui-tab-panel>
      <hui-tab-panel key="specs" label="Thông số" disabled>Không chọn được.</hui-tab-panel>
      <hui-tab-panel key="reviews" label="Đánh giá">Đánh giá của khách hàng.</hui-tab-panel>
      <hui-tab-panel key="faq" label="Hỏi đáp">Câu hỏi thường gặp.</hui-tab-panel>
    </hui-tabs>
  `,
  play: async ({ canvasElement }) => {
    const tabs = canvasElement.querySelector('#kbd-tabs');
    const list = () => [...tabs.shadowRoot.querySelectorAll('[role="tab"]')];
    await waitFor(() => expect(list().length).toBe(4));
    await expect(list()[0].getAttribute('aria-selected')).toBe('true');
    list()[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(tabs.getAttribute('active-key')).toBe('reviews')); // bỏ qua tab disabled
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(tabs.getAttribute('active-key')).toBe('faq'));
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(tabs.getAttribute('active-key')).toBe('overview'));
  },
};
