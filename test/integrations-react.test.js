import { describe, it, expect, vi, afterEach } from 'vitest';
// React / react-dom có sẵn trong devDependencies gián tiếp (Storybook) — chỉ dùng trong test
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  createComponent, toEventProp, normalizeEvents, splitProps, syncProperties, syncListeners, detachListeners,
} from '../src/integrations/react.js';
import '../src/components/hui-input/index.js';
import '../src/components/hui-switch/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const mount = () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  return { host, root, render: (el) => flushSync(() => root.render(el)) };
};

describe('React helper — hàm thuần', () => {
  it('toEventProp / normalizeEvents', () => {
    expect(toEventProp('hui-change')).toBe('onHuiChange');
    expect(toEventProp('change')).toBe('onChange');
    expect(toEventProp('hui-upload-progress')).toBe('onHuiUploadProgress');
    expect(normalizeEvents(['change', 'hui-search'])).toEqual({ onChange: 'change', onHuiSearch: 'hui-search' });
    expect(normalizeEvents({ onPick: 'change' })).toEqual({ onPick: 'change' });
    expect(normalizeEvents()).toEqual({});
  });

  it('splitProps: forward / properties / listeners', () => {
    const fn = () => {};
    const click = () => {};
    const { forward, properties, listeners } = splitProps({
      children: 'x', className: 'c', style: { color: 'red' }, id: 'i', 'data-x': '1', 'aria-label': 'a',
      onClick: click, onHuiChange: fn, value: 'v', options: [1, 2], disabled: false, maxCount: 3,
    }, { onHuiChange: 'hui-change' });
    expect(Object.keys(forward).sort()).toEqual(['aria-label', 'children', 'className', 'data-x', 'id', 'onClick', 'style']);
    expect(properties).toEqual({ value: 'v', options: [1, 2], disabled: false, maxCount: 3 });
    expect(listeners).toEqual({ 'hui-change': fn });
  });

  it('syncProperties: gán khi đổi, gỡ → undefined', () => {
    const el = document.createElement('div');
    let prev = syncProperties(el, { foo: 1, bar: [1] });
    expect(el.foo).toBe(1);
    expect(el.bar).toEqual([1]);
    prev = syncProperties(el, { foo: 2 }, prev);
    expect(el.foo).toBe(2);
    expect(el.bar).toBe(undefined);
    expect(prev).toEqual({ foo: 2 });
  });

  it('syncListeners: 1 listener mỗi sự kiện, luôn gọi handler mới nhất, gỡ khi bỏ', () => {
    const el = document.createElement('div');
    const handlers = {};
    const a = vi.fn();
    const b = vi.fn();
    handlers.ping = a;
    const attached = syncListeners(el, handlers);
    el.dispatchEvent(new Event('ping'));
    handlers.ping = b;
    syncListeners(el, handlers, attached);
    el.dispatchEvent(new Event('ping'));
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    expect(attached.size).toBe(1);
    delete handlers.ping;
    syncListeners(el, handlers, attached);
    el.dispatchEvent(new Event('ping'));
    expect(b).toHaveBeenCalledOnce();
    expect(attached.size).toBe(0);
    handlers.pong = a;
    syncListeners(el, handlers, attached);
    detachListeners(el, attached);
    el.dispatchEvent(new Event('pong'));
    expect(a).toHaveBeenCalledOnce();
  });
});

describe('React helper — createComponent (React thật)', () => {
  it('prop → property (giữ kiểu), sự kiện → listener, ref trỏ tới element', () => {
    const HuiInput = createComponent(React, 'hui-input', { events: ['input', 'hui-search'] });
    expect(HuiInput.displayName).toBe('HuiInput');
    const onInput = vi.fn();
    const ref = React.createRef();
    const { host, root, render } = mount();
    render(React.createElement(HuiInput, { ref, value: 'đầu', disabled: true, className: 'x', onInput }));
    const el = host.querySelector('hui-input');
    expect(ref.current).toBe(el);
    expect(el.value).toBe('đầu');
    expect(el.disabled).toBe(true);
    expect(el.className).toBe('x');

    render(React.createElement(HuiInput, { ref, value: 'sau', disabled: false, onInput }));
    expect(el.value).toBe('sau');
    expect(el.disabled).toBe(false);

    el.emit('input', { value: 'gõ' });
    expect(onInput).toHaveBeenCalledOnce();
    expect(onInput.mock.calls[0][0].detail).toEqual({ value: 'gõ' });

    // Đổi handler không gắn thêm listener
    const onInput2 = vi.fn();
    render(React.createElement(HuiInput, { ref, onInput: onInput2 }));
    el.emit('input', { value: '2' });
    expect(onInput).toHaveBeenCalledOnce();
    expect(onInput2).toHaveBeenCalledOnce();
    // Prop value bị bỏ → về mặc định ''
    expect(el.value).toBe('');

    root.unmount();
    el.emit('input', { value: '3' });
    expect(onInput2).toHaveBeenCalledOnce();
  });

  it('boolean false không thành attribute "false" (lỗi kinh điển của React 18)', () => {
    const HuiSwitch = createComponent(React, 'hui-switch', { events: { onToggle: 'change' } });
    const onToggle = vi.fn();
    const { host, root, render } = mount();
    render(React.createElement(HuiSwitch, { checked: false, onToggle }));
    const el = host.querySelector('hui-switch');
    expect(el.checked).toBe(false);
    expect(el.hasAttribute('checked')).toBe(false);
    el.shadowRoot.querySelector('button').click();
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onToggle.mock.calls[0][0].detail.checked).toBe(true);
    root.unmount();
  });
});

describe('React 19 dùng thẳng custom element (khẳng định quy tắc đặt tên trong react.d.ts)', () => {
  it('on<tên-sự-kiện> nguyên văn → addEventListener; prop trùng property → gán property', () => {
    const onSearch = vi.fn();
    const onChange = vi.fn();
    const { host, root, render } = mount();
    render(React.createElement('hui-input', {
      value: 'x', disabled: true, 'onhui-search': onSearch, onChange,
    }));
    const el = host.querySelector('hui-input');
    expect(el.value).toBe('x');
    expect(el.disabled).toBe(true);
    el.emit('hui-search', { value: 'q' });
    expect(onSearch).toHaveBeenCalledOnce();
    // onChange của React nghe sự kiện 'change' của custom element
    el.emit('change', { value: 'c' });
    expect(onChange).toHaveBeenCalledOnce();
    root.unmount();
  });
});
