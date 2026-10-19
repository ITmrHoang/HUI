import { describe, it, expect, afterEach } from 'vitest';
import { HuiElement, defineElement } from '../src/core/hui-element.js';

let uid = 0;
/** Tạo 1 class test với tên thẻ duy nhất (customElements không cho define trùng) */
function makeElement(props, extra = {}) {
  const tag = `x-test-${++uid}`;
  const calls = [];
  class X extends HuiElement {
    static properties = props;
    static styles = ':host { display: block; }';
    render() {
      this._el = document.createElement('span');
      return this._el;
    }
    updated(changed) {
      calls.push(new Map(changed));
    }
  }
  Object.assign(X, extra);
  defineElement(tag, X);
  return { tag, X, calls };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('HuiElement — attribute ↔ property', () => {
  it('đọc attribute đúng kiểu và dùng giá trị mặc định', () => {
    const { tag } = makeElement({
      size: { type: String, default: 'md' },
      count: { type: Number, default: 0 },
      open: { type: Boolean },
      maxCount: { type: Number },
    });
    document.body.innerHTML = `<${tag} count="3" open max-count="7"></${tag}>`;
    const el = document.querySelector(tag);
    expect(el.size).toBe('md');
    expect(el.count).toBe(3);
    expect(el.open).toBe(true);
    expect(el.maxCount).toBe(7); // kebab-case attribute
  });

  it('property reflect ra attribute, xóa attribute quay về mặc định', async () => {
    const { tag } = makeElement({ size: { type: String, default: 'md' }, open: { type: Boolean } });
    const el = document.createElement(tag);
    document.body.append(el);
    el.size = 'lg';
    el.open = true;
    expect(el.getAttribute('size')).toBe('lg');
    expect(el.hasAttribute('open')).toBe(true);
    el.open = false;
    expect(el.hasAttribute('open')).toBe(false);
    el.removeAttribute('size');
    expect(el.size).toBe('md');
  });

  it('Object/Array không reflect, nhận JSON từ attribute', () => {
    const { tag } = makeElement({ items: { type: Array, default: [] } });
    document.body.innerHTML = `<${tag} items='[1,2]'></${tag}>`;
    const el = document.querySelector(tag);
    expect(el.items).toEqual([1, 2]);
    el.items = [3];
    expect(el.getAttribute('items')).toBe('[1,2]');
  });

  it('property gán trước khi upgrade vẫn đi qua setter', () => {
    const tag = `x-late-${++uid}`;
    const el = document.createElement(tag);
    el.size = 'lg'; // chưa define → nằm trên instance
    document.body.append(el);
    class Late extends HuiElement {
      static properties = { size: { type: String, default: 'md' } };
    }
    defineElement(tag, Late);
    expect(el.size).toBe('lg');
    expect(el.getAttribute('size')).toBe('lg');
  });
});

describe('HuiElement — chu kỳ cập nhật', () => {
  it('render 1 lần, updated đầu tiên nhận mọi property, sau đó gom thay đổi', async () => {
    const { tag, calls } = makeElement({ a: { type: String }, b: { type: Number } });
    const el = document.createElement(tag);
    document.body.append(el);
    expect(calls).toHaveLength(1);
    expect([...calls[0].keys()].sort()).toEqual(['a', 'b']);

    const first = el.shadowRoot.querySelector('span');
    el.a = 'x';
    el.b = 2;
    el.a = 'y';
    await el.updateComplete;
    expect(calls).toHaveLength(2);
    expect([...calls[1].keys()].sort()).toEqual(['a', 'b']);
    expect(calls[1].get('a')).toBe(null); // giá trị CŨ
    expect(el.shadowRoot.querySelector('span')).toBe(first); // không dựng lại DOM
  });

  it('styles dùng chung 1 CSSStyleSheet cho mọi instance', () => {
    const { tag } = makeElement({});
    document.body.innerHTML = `<${tag}></${tag}><${tag}></${tag}>`;
    const [a, b] = document.querySelectorAll(tag);
    expect(a.shadowRoot.adoptedStyleSheets[0]).toBe(b.shadowRoot.adoptedStyleSheets[0]);
  });

  it('listen() tự gỡ khi tháo khỏi trang', () => {
    const { tag } = makeElement({});
    const el = document.createElement(tag);
    document.body.append(el);
    let hits = 0;
    el.listen(document, 'x-ping', () => hits++);
    document.dispatchEvent(new Event('x-ping'));
    el.remove();
    document.dispatchEvent(new Event('x-ping'));
    expect(hits).toBe(1);
  });

  it('setState bật :state()', () => {
    const { tag } = makeElement({});
    const el = document.createElement(tag);
    document.body.append(el);
    el.setState('active', true);
    expect(el.matches(':state(active)')).toBe(true);
    el.setState('active', false);
    expect(el.matches(':state(active)')).toBe(false);
  });
});
