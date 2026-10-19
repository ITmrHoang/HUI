/**
 * Foundations — trình diễn hạ tầng A0 (template + dữ liệu) và A7.1 (data-hui-animate).
 * Không phải component: là các tiện ích dùng được trên HTML thuần.
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import { enableAnimations, ANIMATIONS, playAnimation } from '../../utils/animate.js';
import { renderTemplate, updateTemplateNode, delegateActions } from '../../core/template.js';
import { Repeater } from '../../core/repeat.js';
import '../hui-button/index.js';
import '../hui-progress/index.js';
import '../hui-tag/index.js';

export default {
  title: 'Foundations/Data & Motion',
  parameters: {
    docs: {
      description: {
        component: `
### data-hui-animate — hiệu ứng khi cuộn tới, gắn lên thẻ HTML bất kỳ
\`\`\`html
<section data-hui-animate="fade-up">…</section>
<ul data-hui-animate="zoom-in" data-hui-stagger="80">…</ul>   <!-- các con hiện lần lượt -->
<div data-hui-animate="fade" data-hui-delay="200" data-hui-duration="800" data-hui-once="false">…</div>
\`\`\`
Hiệu ứng: ${Object.keys(ANIMATIONS).map((k) => `\`${k}\``).join(', ')}.
Bundle tổng tự bật; import lẻ thì gọi \`enableAnimations()\` từ \`@itmrhoang/h-ui/core\`.
Tắt: \`<html data-hui-no-animation>\`, token \`--hui-motion-duration: 0ms\`, hoặc hệ điều hành bật "giảm chuyển động".

### Template binding — hiển thị nhanh từ mảng dữ liệu
\`\`\`html
<template id="tpl">
  <article>
    <h3 data-bind="name"></h3>
    <span data-bind="price" data-format="currency"></span>
    <hui-progress data-bind-prop="percent:sold"></hui-progress>
    <hui-tag data-show="isNew">Mới</hui-tag>
    <hui-button data-action="buy">Mua</hui-button>
  </article>
</template>
\`\`\`
\`data-format\`: number, number:2, currency, currency:USD, percent, compact, date, date:long, datetime, time, relative, upper, lower.
        `,
      },
    },
  },
};

export const AnimateDirective = {
  render: () => {
    queueMicrotask(() => enableAnimations());
    return html`
      <style>
        .anim-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; font-family: var(--hui-font-family); }
        .anim-box { padding: 20px; border-radius: 12px; background: var(--hui-primary-1); color: var(--hui-primary-7); text-align: center; font-weight: 600; }
      </style>
      <div class="anim-grid">
        ${Object.keys(ANIMATIONS).map((name, i) => html`
          <div class="anim-box" data-hui-animate=${name} data-hui-delay=${i * 60} data-hui-once="false">${name}</div>`)}
      </div>
      <h4 style="font-family: var(--hui-font-family)">Stagger (các con hiện lần lượt)</h4>
      <ul class="anim-grid" data-hui-animate="zoom-in" data-hui-stagger="90" style="list-style: none; padding: 0;">
        ${[1, 2, 3, 4, 5, 6].map((n) => html`<li class="anim-box">Mục ${n}</li>`)}
      </ul>
      <hui-button style="margin-top: 12px" @hui-click=${(e) => {
        e.target.closest('.sb-show-main, body').querySelectorAll('[data-hui-animate]').forEach(playAnimation);
      }}>Chạy lại</hui-button>
    `;
  },
  play: async ({ canvasElement }) => {
    await new Promise((r) => setTimeout(r, 300));
    await expect(canvasElement.querySelector('[data-hui-animate]').hasAttribute('data-hui-animated')).toBe(true);
  },
};

const PRODUCTS = [
  { id: 1, name: 'Áo thun HUI', price: 199000, sold: 72, isNew: true },
  { id: 2, name: 'Cốc sứ', price: 89000, sold: 35, isNew: false },
  { id: 3, name: 'Sổ tay', price: 59000, sold: 90, isNew: true },
];

export const TemplateBinding = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <style>
        .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; font-family: var(--hui-font-family); }
        .tpl-card { border: 1px solid var(--hui-border); border-radius: 12px; padding: 12px; display: grid; gap: 8px; background: var(--hui-bg-container); }
        .tpl-card h3 { margin: 0; font-size: 1rem; }
        .tpl-log { font: 13px var(--hui-font-mono); color: var(--hui-text-secondary); margin-top: 12px; }
      </style>
      <template>
        <article class="tpl-card">
          <h3 data-bind="name"></h3>
          <span data-bind="price" data-format="currency"></span>
          <hui-progress data-bind-prop="percent:sold" size="sm"></hui-progress>
          <hui-tag data-show="isNew" color="success">Mới</hui-tag>
          <hui-button data-action="buy" size="sm">Mua</hui-button>
        </article>
      </template>
      <div class="tpl-grid"></div>
      <hui-button class="shuffle" variant="outline" size="sm" style="margin-top: 12px">Đảo thứ tự + tăng giá</hui-button>
      <div class="tpl-log">Bấm "Mua" để xem sự kiện hui-action</div>`;
    const tpl = wrap.querySelector('template');
    const grid = wrap.querySelector('.tpl-grid');
    let items = PRODUCTS;
    const repeater = new Repeater(grid, {
      key: 'id',
      create: (item, i) => renderTemplate(tpl, item, i),
      update: (node, item, i) => updateTemplateNode(node, item, i),
    });
    repeater.render(items);
    delegateActions(wrap, grid);
    wrap.addEventListener('hui-action', (e) => {
      wrap.querySelector('.tpl-log').textContent = `hui-action: ${e.detail.action} → ${e.detail.item.name}`;
    });
    wrap.querySelector('.shuffle').addEventListener('hui-click', () => {
      items = [...items].reverse().map((p) => ({ ...p, price: p.price + 10000 }));
      repeater.render(items);
    });
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const cards = canvasElement.querySelectorAll('.tpl-card');
    await expect(cards.length).toBe(3);
    await expect(cards[0].querySelector('h3').textContent).toBe('Áo thun HUI');
    cards[1].querySelector('hui-button').click();
    await expect(canvasElement.querySelector('.tpl-log').textContent).toContain('Cốc sứ');
  },
};
