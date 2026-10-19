import { describe, it, expect, afterEach } from 'vitest';
import { setLocale } from '../src/core/locale.js';
import { format, formatCurrency, formatPercent, formatCompact, relativeTime, formatNumber } from '../src/core/format.js';
import { renderTemplate, updateTemplateNode, delegateActions } from '../src/core/template.js';
import { Repeater } from '../src/core/repeat.js';
import { DataController } from '../src/core/data-controller.js';
import { HuiElement, defineElement } from '../src/core/hui-element.js';
import { VirtualWindow } from '../src/utils/virtual.js';
import { overflowEdges, inView } from '../src/utils/scroll.js';
import { enableAnimations, playAnimation } from '../src/utils/animate.js';

const nbsp = (s) => s.replace(/ | /g, ' '); // Intl dùng khoảng trắng không ngắt
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  document.body.innerHTML = '';
  setLocale('vi');
});

describe('format', () => {
  it('định dạng theo tiếng Việt', () => {
    expect(nbsp(formatCurrency(56890000))).toBe('56.890.000 ₫');
    expect(nbsp(formatPercent(12.5))).toMatch(/^12,5\s?%$/); // khoảng trắng tùy dữ liệu Intl của trình duyệt
    expect(formatNumber(1234.5, 2)).toBe('1.234,50');
    expect(formatCompact(1250000)).toMatch(/^1,3\s?Tr$/);
    expect(relativeTime(Date.now() - 3 * 60 * 1000)).toBe('3 phút trước');
  });

  it('đổi theo locale + bộ chọn data-format', () => {
    setLocale('en');
    expect(format(1234.5, 'number:1')).toBe('1,234.5');
    expect(format(9.99, 'currency:USD')).toBe('$9.99');
    expect(format('', 'currency')).toBe('');
    expect(format('abc', 'upper')).toBe('ABC');
  });
});

describe('template', () => {
  const tpl = document.createElement('template');
  tpl.innerHTML = `
    <article>
      <img data-bind-attr="src:image, alt:name">
      <h3 data-bind="name"></h3>
      <span class="price" data-bind="price" data-format="currency"></span>
      <em data-show="isNew">Mới</em>
      <i data-bind="note" data-default="—"></i>
      <button data-action="buy" data-class="active:selected">Mua</button>
    </article>`;

  it('bind text / attribute / format / show / class / default, không chèn HTML', () => {
    const node = renderTemplate(tpl, { name: '<b>Áo</b>', image: 'a.png', price: 150000, isNew: false, selected: true }, 0);
    expect(node.querySelector('h3').textContent).toBe('<b>Áo</b>');
    expect(node.querySelector('h3').children.length).toBe(0);
    expect(node.querySelector('img').getAttribute('src')).toBe('a.png');
    expect(nbsp(node.querySelector('.price').textContent)).toBe('150.000 ₫');
    expect(node.querySelector('em').hidden).toBe(true);
    expect(node.querySelector('i').textContent).toBe('—');
    expect(node.querySelector('button').classList.contains('active')).toBe(true);

    updateTemplateNode(node, { name: 'Quần', image: 'b.png', price: 0, isNew: true, selected: false }, 1);
    expect(node.querySelector('h3').textContent).toBe('Quần');
    expect(node.querySelector('em').hidden).toBe(false);
    expect(node.querySelector('button').classList.contains('active')).toBe(false);
  });

  it('data-action phát hui-action kèm item', () => {
    const host = document.createElement('div');
    const list = document.createElement('div');
    host.append(list);
    document.body.append(host);
    const items = [{ name: 'A' }, { name: 'B' }];
    items.forEach((it, i) => list.append(renderTemplate(tpl, it, i)));
    delegateActions(host, list);
    let got = null;
    host.addEventListener('hui-action', (e) => { got = e.detail; });
    list.querySelectorAll('button')[1].click();
    expect(got).toMatchObject({ action: 'buy', index: 1, item: { name: 'B' } });
  });
});

describe('Repeater', () => {
  it('giữ nguyên node theo key khi thêm, xóa, đổi thứ tự', () => {
    const ul = document.createElement('ul');
    document.body.append(ul);
    const r = new Repeater(ul, {
      key: 'id',
      create: (item) => Object.assign(document.createElement('li'), { textContent: item.t }),
      update: (node, item) => { node.textContent = item.t; },
    });
    r.render([{ id: 1, t: 'a' }, { id: 2, t: 'b' }, { id: 3, t: 'c' }]);
    const [n1, n2, n3] = ul.querySelectorAll('li');

    r.render([{ id: 3, t: 'C' }, { id: 1, t: 'a' }, { id: 4, t: 'd' }]);
    const after = [...ul.querySelectorAll('li')];
    expect(after.map((n) => n.textContent)).toEqual(['C', 'a', 'd']);
    expect(after[0]).toBe(n3); // tái sử dụng, chỉ di chuyển
    expect(after[1]).toBe(n1);
    expect(n2.isConnected).toBe(false);
  });

  it('1000 dòng: sửa 1 dòng chỉ cập nhật 1 dòng', () => {
    const ul = document.createElement('ul');
    let creates = 0;
    const r = new Repeater(ul, { key: 'id', create: (it) => { creates++; return Object.assign(document.createElement('li'), { textContent: it.id }); } });
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    r.render(items);
    expect(creates).toBe(1000);
    r.render([...items.slice(0, 500), { id: 'new' }, ...items.slice(500)]);
    expect(creates).toBe(1001);
    expect(ul.children.length).toBe(1001);
  });
});

class XData extends DataController(HuiElement) {
  render() { this.box = document.createElement('div'); return this.box; }
  updated(changed) { super.updated(changed); this.renders = (this.renders || 0) + 1; }
}
defineElement('x-data', XData);

describe('DataController', () => {
  it('fetchFn: loading → ready, params đổi thì tải lại, request cũ bị bỏ', async () => {
    const calls = [];
    const el = document.createElement('x-data');
    el.fetchFn = async (params, { signal }) => {
      calls.push(params.q);
      await tick(params.q === 'slow' ? 60 : 5);
      if (signal.aborted) throw new DOMException('aborted', 'AbortError');
      return { data: [{ q: params.q }], total: 42 };
    };
    el.params = { q: 'slow' };
    document.body.append(el);
    await tick(10);
    expect(el.dataState).toBe('loading');
    expect(el.matches(':state(loading)')).toBe(true);
    el.params = { q: 'fast' };
    await tick(100);
    expect(calls).toEqual(['slow', 'fast']);
    expect(el.data).toEqual([{ q: 'fast' }]);
    expect(el.dataTotal).toBe(42);
    expect(el.dataState).toBe('ready');
  });

  it('rỗng → empty, lỗi → error + reload', async () => {
    const el = document.createElement('x-data');
    let fail = true;
    el.fetchFn = async () => { if (fail) throw new Error('Mất mạng'); return []; };
    let errorEvent = null;
    el.addEventListener('hui-error', (e) => { errorEvent = e.detail.error.message; });
    document.body.append(el);
    await tick(20);
    expect(el.dataState).toBe('error');
    expect(errorEvent).toBe('Mất mạng');
    const view = document.createElement('div');
    expect(el.renderStateView(view)).toBe(true);
    expect(view.textContent).toContain('Mất mạng');

    fail = false;
    await el.reload();
    expect(el.dataState).toBe('empty');
  });

  it('src + data-path: fetch JSON thật', async () => {
    const blob = new Blob([JSON.stringify({ result: { items: [1, 2, 3] } })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('x-data');
    el.setAttribute('data-path', 'result.items');
    el.src = url;
    document.body.append(el);
    await tick(50);
    expect(el.data).toEqual([1, 2, 3]);
  });
});

describe('VirtualWindow', () => {
  it('chỉ báo khoảng đang nhìn thấy + overscan', async () => {
    const box = document.createElement('div');
    box.style.cssText = 'height: 200px; overflow: auto;';
    const spacer = document.createElement('div');
    box.append(spacer);
    document.body.append(box);
    let range = null;
    const vw = new VirtualWindow(box, {
      count: 10000, itemSize: 20, overscan: 2,
      onRange: (r) => { range = r; spacer.style.height = `${r.total}px`; },
    });
    expect(range).toMatchObject({ start: 0, end: 13, total: 200000 });
    vw.scrollToIndex(500);
    expect(range.start).toBe(498);
    expect(range.offset).toBe(498 * 20);
    vw.destroy();
  });
});

describe('scroll + animate', () => {
  it('overflowEdges phát hiện mép bị che', () => {
    const box = document.createElement('div');
    box.style.cssText = 'width: 100px; overflow: auto; white-space: nowrap;';
    box.innerHTML = '<span style="display:inline-block;width:400px">x</span>';
    document.body.append(box);
    expect(overflowEdges(box)).toMatchObject({ start: false, end: true });
    box.scrollLeft = 300;
    expect(overflowEdges(box)).toMatchObject({ start: true, end: false });
  });

  it('inView + data-hui-animate: phần tử trong màn hình được đánh dấu animated, có stagger', async () => {
    document.body.innerHTML = `
      <div id="a" data-hui-animate="fade-up">A</div>
      <ul id="s" data-hui-animate="fade-up" data-hui-stagger="50"><li>1</li><li>2</li></ul>
      <div style="height: 3000px"></div>
      <div id="far" data-hui-animate="zoom-in">xa</div>`;
    enableAnimations();
    await tick(150);
    expect(document.querySelector('#a').hasAttribute('data-hui-animated')).toBe(true);
    expect(document.querySelector('#s').hasAttribute('data-hui-animated')).toBe(true);
    expect(document.querySelector('#far').hasAttribute('data-hui-animated')).toBe(false);
    // Phần tử thêm sau cũng được theo dõi (MutationObserver)
    const late = Object.assign(document.createElement('p'), { textContent: 'late' });
    late.setAttribute('data-hui-animate', 'fade');
    document.body.prepend(late);
    await tick(150);
    expect(late.hasAttribute('data-hui-animated')).toBe(true);
  });

  it('playAnimation với stagger chạy animation cho từng con', () => {
    document.body.innerHTML = '<ul data-hui-animate="fade" data-hui-stagger="100"><li>1</li><li>2</li><li>3</li></ul>';
    const ul = document.querySelector('ul');
    playAnimation(ul);
    const delays = [...ul.children].map((li) => li.getAnimations()[0]?.effect.getTiming().delay);
    expect(delays).toEqual([0, 100, 200]);
  });

  it('inView once tự ngừng theo dõi', async () => {
    const el = document.createElement('div');
    el.textContent = 'x';
    document.body.append(el);
    let n = 0;
    inView(el, (e) => { if (e.isIntersecting) n++; }, { once: true });
    await tick(100);
    el.style.display = 'none';
    await tick(50);
    el.style.display = '';
    await tick(100);
    expect(n).toBe(1);
  });
});
