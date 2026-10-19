/**
 * Floating — engine định vị popup dùng chung (Tooltip, Popover, Dropdown, Select, DatePicker...).
 *
 *   const pos = computePosition(triggerEl, popupEl, { placement: 'bottom-start', offset: 8 });
 *   Object.assign(popupEl.style, { left: `${pos.x}px`, top: `${pos.y}px` });
 *
 *   const stop = autoUpdate(triggerEl, popupEl, () => position());  // bám theo khi cuộn/đổi kích thước
 *
 * Toạ độ trả về là toạ độ VIEWPORT → popup dùng `position: fixed` (hoặc nằm trong top-layer qua
 * Popover API — xem showFloating()). Nhờ vậy popup không bị `overflow: hidden` của thẻ cha cắt mất.
 *
 * Placement: top | bottom | left | right, kèm -start / -end (12 vị trí).
 * Chấp nhận cả tên kiểu Ant: topLeft → top-start, bottomRight → bottom-end, leftTop → left-start...
 */

const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

const ANT_ALIAS = {
  topLeft: 'top-start', topRight: 'top-end',
  bottomLeft: 'bottom-start', bottomRight: 'bottom-end',
  leftTop: 'left-start', leftBottom: 'left-end',
  rightTop: 'right-start', rightBottom: 'right-end',
};

/** Chuẩn hóa placement → { side, align } */
export function parsePlacement(placement = 'bottom') {
  const [side, align = 'center'] = (ANT_ALIAS[placement] || placement).split('-');
  return { side: OPPOSITE[side] ? side : 'bottom', align };
}

function joinPlacement(side, align) {
  return align === 'center' ? side : `${side}-${align}`;
}

/** Toạ độ popup cho một side/align cụ thể (chưa xét tràn màn hình) */
function place(ref, float, side, align, offset) {
  const vertical = side === 'top' || side === 'bottom';
  let x;
  let y;

  if (vertical) {
    y = side === 'top' ? ref.top - float.height - offset : ref.bottom + offset;
    if (align === 'start') x = ref.left;
    else if (align === 'end') x = ref.right - float.width;
    else x = ref.left + (ref.width - float.width) / 2;
  } else {
    x = side === 'left' ? ref.left - float.width - offset : ref.right + offset;
    if (align === 'start') y = ref.top;
    else if (align === 'end') y = ref.bottom - float.height;
    else y = ref.top + (ref.height - float.height) / 2;
  }
  return { x, y };
}

/** Khoảng trống còn lại ở mỗi phía của trigger trong viewport */
function spaceAround(ref, vw, vh) {
  return { top: ref.top, bottom: vh - ref.bottom, left: ref.left, right: vw - ref.right };
}

/**
 * Tính vị trí popup.
 * @param {Element} reference - phần tử trigger (hoặc object có getBoundingClientRect, vd: vị trí chuột)
 * @param {HTMLElement} floating - popup (đã hiển thị để đo được kích thước)
 * @param {object} [opts]
 * @param {string} [opts.placement='bottom']
 * @param {number} [opts.offset=8]      khoảng cách trigger ↔ popup
 * @param {boolean} [opts.flip=true]    tràn màn hình thì lật sang phía đối diện (nếu phía đó rộng hơn)
 * @param {boolean} [opts.shift=true]   trượt dọc theo trục phụ để không tràn mép
 * @param {number} [opts.padding=8]     khoảng cách tối thiểu tới mép viewport
 * @param {HTMLElement} [opts.arrow]    phần tử mũi tên → tính arrowX/arrowY để luôn chỉ vào trigger
 * @param {boolean|'width'|'min-width'} [opts.matchWidth] popup rộng bằng trigger (Select, AutoComplete)
 * @returns {{x:number, y:number, placement:string, side:string, align:string, arrowX?:number, arrowY?:number}}
 */
export function computePosition(reference, floating, opts = {}) {
  const { offset = 8, flip = true, shift = true, padding = 8, arrow, matchWidth } = opts;
  const ref = reference.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  if (matchWidth) {
    floating.style[matchWidth === 'width' ? 'width' : 'minWidth'] = `${ref.width}px`;
  }
  // offsetWidth/Height = kích thước layout, không bị ảnh hưởng bởi transform (vd: đang zoom-in)
  const float = { width: floating.offsetWidth, height: floating.offsetHeight };

  let { side, align } = parsePlacement(opts.placement);

  // FLIP: phía mong muốn không đủ chỗ mà phía đối diện rộng hơn → lật
  if (flip) {
    const space = spaceAround(ref, vw, vh);
    const need = (side === 'top' || side === 'bottom' ? float.height : float.width) + offset + padding;
    if (space[side] < need && space[OPPOSITE[side]] > space[side]) side = OPPOSITE[side];
  }

  let { x, y } = place(ref, float, side, align, offset);

  // SHIFT: trượt trên trục phụ để nằm trọn trong viewport, rồi giới hạn lần 2 để popup
  // vẫn chạm trigger (khi chính trigger đã trôi ra ngoài màn hình thì popup đi theo nó)
  if (shift) {
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    if (side === 'top' || side === 'bottom') {
      const touch = Math.min(12, ref.width / 2);
      x = clamp(x, padding, vw - float.width - padding);
      x = clamp(x, ref.left - float.width + touch, ref.right - touch);
    } else {
      const touch = Math.min(12, ref.height / 2);
      y = clamp(y, padding, vh - float.height - padding);
      y = clamp(y, ref.top - float.height + touch, ref.bottom - touch);
    }
  }

  const result = { x: Math.round(x), y: Math.round(y), side, align, placement: joinPlacement(side, align) };

  // ARROW: mũi tên nằm giữa phần giao nhau của trigger và popup, không lọt ra ngoài góc bo
  if (arrow) {
    const a = { width: arrow.offsetWidth, height: arrow.offsetHeight };
    const edge = 6; // chừa góc bo của popup
    if (side === 'top' || side === 'bottom') {
      const center = ref.left + ref.width / 2 - x - a.width / 2;
      result.arrowX = Math.round(Math.min(Math.max(center, edge), float.width - a.width - edge));
    } else {
      const center = ref.top + ref.height / 2 - y - a.height / 2;
      result.arrowY = Math.round(Math.min(Math.max(center, edge), float.height - a.height - edge));
    }
  }
  return result;
}

/**
 * Gọi `update` mỗi khi vị trí có thể thay đổi: cuộn (mọi thẻ cha), đổi kích thước cửa sổ,
 * trigger/popup đổi kích thước. Gom về 1 lần mỗi frame. Trả về hàm hủy theo dõi.
 */
export function autoUpdate(reference, floating, update) {
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };

  window.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', schedule, { passive: true });

  let ro = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(schedule);
    if (reference instanceof Element) ro.observe(reference);
    ro.observe(floating);
  }

  update();

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule, { capture: true });
    window.removeEventListener('resize', schedule);
    ro?.disconnect();
  };
}

/** Trình duyệt hỗ trợ Popover API (đưa popup lên top-layer, nằm trên mọi z-index) */
export const supportsPopover =
  typeof HTMLElement !== 'undefined' && Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');

/**
 * Hiện popup: ưu tiên top-layer (Popover API, popover="manual" để HUI tự quản lý đóng/mở);
 * trình duyệt cũ → position: fixed + z-index từ token.
 */
export function showFloating(floating, zIndexVar = '--hui-z-dropdown') {
  floating.hidden = false;
  if (supportsPopover) {
    if (!floating.hasAttribute('popover')) floating.setAttribute('popover', 'manual');
    if (!floating.matches(':popover-open')) floating.showPopover();
  } else {
    floating.style.zIndex = `var(${zIndexVar})`;
  }
}

export function hideFloating(floating) {
  if (supportsPopover && floating.matches?.(':popover-open')) floating.hidePopover();
  floating.hidden = true;
}

/** Point giả làm reference — dùng cho menu chuột phải (contextmenu) theo vị trí con trỏ */
export function virtualPoint(x, y) {
  return { getBoundingClientRect: () => ({ x, y, left: x, right: x, top: y, bottom: y, width: 0, height: 0 }) };
}

/**
 * CSS nền cho popup — nối vào `static styles` của component:
 * xóa style mặc định của [popover] (margin auto, inset 0, viền, nền) để engine tự đặt vị trí.
 */
export const floatingCss = `
.hui-floating {
  position: fixed;
  inset: auto;
  left: 0;
  top: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: visible;
  color: inherit;
  width: max-content;
}
.hui-floating[hidden] { display: none; }
`;
