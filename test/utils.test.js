import { describe, it, expect, afterEach } from 'vitest';
import { computePosition, parsePlacement, virtualPoint } from '../src/utils/floating.js';
import { openOverlay, getTabbables, overlayCount, getDeepActiveElement } from '../src/utils/overlay.js';
import { t, setLocale, registerLocale } from '../src/core/locale.js';

afterEach(() => {
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  setLocale('vi');
});

function box(style) {
  const el = document.createElement('div');
  el.style.cssText = `position: fixed; ${style}`;
  document.body.append(el);
  return el;
}

describe('floating', () => {
  it('chuẩn hóa placement, nhận cả tên kiểu Ant', () => {
    expect(parsePlacement('topLeft')).toEqual({ side: 'top', align: 'start' });
    expect(parsePlacement('bottom-end')).toEqual({ side: 'bottom', align: 'end' });
    expect(parsePlacement('weird')).toEqual({ side: 'bottom', align: 'center' });
  });

  it('đặt popup dưới trigger, căn giữa, cách offset', () => {
    const ref = box('left: 200px; top: 100px; width: 100px; height: 30px;');
    const pop = box('width: 60px; height: 40px;');
    const pos = computePosition(ref, pop, { placement: 'bottom', offset: 8 });
    expect(pos).toMatchObject({ x: 220, y: 138, placement: 'bottom' });
  });

  it('tự lật lên trên khi phía dưới không đủ chỗ', () => {
    const vh = document.documentElement.clientHeight;
    const ref = box(`left: 200px; top: ${vh - 40}px; width: 100px; height: 30px;`);
    const pop = box('width: 60px; height: 120px;');
    const pos = computePosition(ref, pop, { placement: 'bottom' });
    expect(pos.side).toBe('top');
    expect(pos.y).toBe(vh - 40 - 120 - 8);
  });

  it('trượt (shift) để không tràn mép trái', () => {
    const ref = box('left: 0px; top: 100px; width: 20px; height: 20px;');
    const pop = box('width: 200px; height: 40px;');
    const pos = computePosition(ref, pop, { placement: 'bottom', padding: 8 });
    expect(pos.x).toBe(8);
  });

  it('virtualPoint dùng cho menu chuột phải', () => {
    const pop = box('width: 50px; height: 50px;');
    const pos = computePosition(virtualPoint(300, 300), pop, { placement: 'bottom-start', offset: 0 });
    expect(pos).toMatchObject({ x: 300, y: 300 });
  });
});

describe('overlay', () => {
  it('Esc chỉ đóng lớp trên cùng', () => {
    const closed = [];
    const a = openOverlay({ element: box(''), onEscape: () => { closed.push('a'); a.close(); } });
    const b = openOverlay({ element: box(''), onEscape: () => { closed.push('b'); b.close(); } });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toEqual(['b']);
    expect(overlayCount()).toBe(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toEqual(['b', 'a']);
    expect(overlayCount()).toBe(0);
  });

  it('click ngoài gọi onClickOutside, click vào ignore thì không', () => {
    const panel = box('left: 0; top: 0; width: 50px; height: 50px;');
    const trigger = box('left: 100px; top: 0; width: 50px; height: 50px;');
    let outside = 0;
    const h = openOverlay({ element: panel, ignore: [trigger], onClickOutside: () => outside++ });
    panel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(outside).toBe(1);
    h.close();
  });

  it('getTabbables đi xuyên Shadow DOM và slot', () => {
    const host = document.createElement('div');
    host.attachShadow({ mode: 'open' }).innerHTML = '<button id="in">in</button><slot></slot>';
    host.innerHTML = '<input id="slotted"><button disabled>x</button>';
    const wrap = document.createElement('div');
    wrap.innerHTML = '<a href="#" id="a">a</a>';
    wrap.prepend(host);
    document.body.append(wrap);
    expect(getTabbables(wrap).map((e) => e.id)).toEqual(['in', 'slotted', 'a']);
  });

  it('khóa cuộn trang và trả focus khi đóng', () => {
    const before = document.createElement('button');
    document.body.append(before);
    before.focus();
    const panel = box('');
    panel.innerHTML = '<button>ok</button>';
    const h = openOverlay({ element: panel, lockScroll: true, trapFocus: true, autoFocus: false });
    expect(document.body.style.overflow).toBe('hidden');
    panel.querySelector('button').focus();
    h.close();
    expect(document.body.style.overflow).toBe('');
    expect(getDeepActiveElement()).toBe(before);
  });
});

describe('locale', () => {
  it('thay biến, fallback sang en, đăng ký ngôn ngữ mới', () => {
    expect(t('pagination.total', { total: 5 })).toBe('Tổng 5 mục');
    registerLocale('ja', { modal: { ok: 'はい' } });
    setLocale('ja');
    expect(t('modal.ok')).toBe('はい');
    expect(t('modal.cancel')).toBe('Cancel'); // thiếu → lấy từ en
    expect(t('khong.ton.tai')).toBe('khong.ton.tai');
  });
});
