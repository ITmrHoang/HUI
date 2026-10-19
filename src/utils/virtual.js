/**
 * VirtualWindow — chỉ render phần đang nhìn thấy của danh sách dài (dọc hoặc ngang).
 *
 *   const vw = new VirtualWindow(scrollEl, {
 *     count: items.length, itemSize: 48, overscan: 6,
 *     onRange: ({ start, end, offset, total }) => {
 *       spacer.style.height = `${total}px`;        // giữ đúng chiều dài thanh cuộn
 *       list.style.transform = `translateY(${offset}px)`;
 *       repeater.render(items.slice(start, end));
 *     },
 *   });
 *   vw.setCount(newLength);   vw.scrollToIndex(120);   vw.destroy();
 *
 * itemSize: số (cao cố định) hoặc hàm (index) => px cho kích thước khác nhau.
 */
export class VirtualWindow {
  constructor(scroller, { count = 0, itemSize = 40, overscan = 6, horizontal = false, onRange } = {}) {
    this.scroller = scroller;
    this.count = count;
    this.itemSize = itemSize;
    this.overscan = overscan;
    this.horizontal = horizontal;
    this.onRange = onRange;
    this._offsets = null;
    this._last = '';
    this._frame = 0;

    this._schedule = () => {
      if (!this._frame) this._frame = requestAnimationFrame(() => { this._frame = 0; this.update(); });
    };
    scroller.addEventListener('scroll', this._schedule, { passive: true });
    this._ro = typeof ResizeObserver === 'function' ? new ResizeObserver(this._schedule) : null;
    this._ro?.observe(scroller);
    this.update();
  }

  /** Vị trí bắt đầu của từng item (chỉ tính khi kích thước thay đổi theo index) */
  _offsetsTable() {
    if (typeof this.itemSize === 'number') return null;
    if (!this._offsets || this._offsets.length !== this.count + 1) {
      const t = new Float64Array(this.count + 1);
      for (let i = 0; i < this.count; i++) t[i + 1] = t[i] + this.itemSize(i);
      this._offsets = t;
    }
    return this._offsets;
  }

  offsetOf(index) {
    const t = this._offsetsTable();
    return t ? t[index] : index * this.itemSize;
  }

  get total() {
    return this.offsetOf(this.count);
  }

  /** Index đầu tiên có điểm bắt đầu <= pos (tìm nhị phân khi kích thước khác nhau) */
  _indexAt(pos) {
    const t = this._offsetsTable();
    if (!t) return Math.min(this.count - 1, Math.max(0, Math.floor(pos / this.itemSize)));
    let lo = 0;
    let hi = this.count - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (t[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  update(force = false) {
    if (!this.count) {
      this._emit({ start: 0, end: 0, offset: 0, total: 0 }, force);
      return;
    }
    const pos = this.horizontal ? this.scroller.scrollLeft : this.scroller.scrollTop;
    const size = this.horizontal ? this.scroller.clientWidth : this.scroller.clientHeight;
    const first = this._indexAt(pos);
    const last = this._indexAt(pos + size);
    const start = Math.max(0, first - this.overscan);
    const end = Math.min(this.count, last + 1 + this.overscan);
    this._emit({ start, end, offset: this.offsetOf(start), total: this.total }, force);
  }

  _emit(range, force) {
    const key = `${range.start}-${range.end}-${range.total}`;
    if (!force && key === this._last) return; // khoảng hiển thị không đổi → không render lại
    this._last = key;
    this.onRange?.(range);
  }

  setCount(count) {
    this.count = count;
    this._offsets = null;
    this.update(true);
  }

  /** Báo kích thước item đã đổi (với itemSize dạng hàm) */
  invalidate() {
    this._offsets = null;
    this.update(true);
  }

  scrollToIndex(index, align = 'start') {
    const offset = this.offsetOf(index);
    const size = this.horizontal ? this.scroller.clientWidth : this.scroller.clientHeight;
    const itemSize = this.offsetOf(index + 1) - offset;
    const target = align === 'center' ? offset - (size - itemSize) / 2 : align === 'end' ? offset - size + itemSize : offset;
    this.scroller[this.horizontal ? 'scrollLeft' : 'scrollTop'] = Math.max(0, target);
    this.update();
  }

  destroy() {
    cancelAnimationFrame(this._frame);
    this.scroller.removeEventListener('scroll', this._schedule);
    this._ro?.disconnect();
  }
}
