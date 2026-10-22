// Kiểm tra kiểu React (npm run check:types) — không chạy, chỉ để tsc bắt lỗi trong file .d.ts sinh ra.
import * as React from 'react';
import { createComponent } from '../../dist/types/react-helper';

// React 19: dùng thẳng thẻ hui-*
export const Native = () => (
  <>
    <hui-button variant="primary" loading onhui-click={(e) => e.detail.originalEvent} className="x">
      Lưu
    </hui-button>
    <hui-input value="a" onInput={(e) => e.currentTarget.value} onhui-search={(e) => e.detail.value} />
    <hui-switch checked onchange={(e) => e.detail.checked} />
    {/* @ts-expect-error variant không hợp lệ */}
    <hui-button variant="nope" />
  </>
);

// Ví dụ trong README
export const Readme = () => {
  const [q, setQ] = React.useState<unknown>('');
  const [, setCity] = React.useState<unknown>(null);
  const cities = ['HN', 'HCM'];
  const search = (v: string) => v;
  return (
    <>
      <hui-input value={q as string} placeholder="Tìm" onInput={(e) => setQ(e.currentTarget.value)}
        onhui-search={(e) => search(e.detail.value)} />
      <hui-select options={cities} mode="multiple" className="w-60" onChange={(e) => setCity(e.currentTarget.value)} />
    </>
  );
};

// React 18: createComponent
const HuiInput = createComponent(React, 'hui-input', { events: ['input', 'change', 'hui-search'] });
const HuiSelect = createComponent(React, 'hui-select', { events: { onPick: 'change' } });

export const Wrapped = () => {
  const ref = React.useRef<HTMLElementTagNameMap['hui-input']>(null);
  return (
    <>
      <HuiInput ref={ref} value="x" disabled onHuiSearch={(e) => e.detail.value} onChange={(e) => e.detail.value} />
      <HuiSelect onPick={(e) => e.detail.option} className="s" />
      {/* @ts-expect-error size không hợp lệ */}
      <HuiInput size="xl" />
    </>
  );
};
