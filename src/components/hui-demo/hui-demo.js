/**
 * ==========================================================
 * HUI Demo — TÀI LIỆU SỐNG: cách viết & cách override một component HUI
 * ==========================================================
 * File này là "sách hướng dẫn" có code chạy được. Các component khác chỉ comment ngắn gọn,
 * mọi giải thích chi tiết về kỹ thuật được gom ở đây (JS) và hui-demo.css (CSS / selector).
 *
 * MỤC LỤC
 *   A. Nhận dữ liệu từ bên ngoài: attribute ↔ property (static properties)
 *   B. Vòng đời: render() một lần → updated(changed) mỗi lần đổi
 *   C. 5 cách cho phép bên ngoài override giao diện
 *        1. Biến CSS (Custom Properties)   → hui-demo.css PHẦN 1
 *        2. ::part() + exportparts          → hui-demo.css PHẦN 2
 *        3. <slot> + ::slotted()            → hui-demo.css PHẦN 3
 *        4. Attribute + :host([attr])       → hui-demo.css PHẦN 4
 *        5. Custom state + :state()         → hui-demo.css PHẦN 5
 *   D. Sự kiện ra ngoài (emit)
 *   E. Bảng tra cứu pseudo-class / pseudo-element → hui-demo.css PHẦN 6, 7
 *   F. Trợ năng & media query                     → hui-demo.css PHẦN 8
 *   G. Theme bằng token: :where(), color-mix(), data-theme, độ ưu tiên selector → PHẦN 9
 *   H. Trạng thái form: :state(invalid | user-invalid | filled), :has()        → PHẦN 10
 *   I. Lớp nổi: Popover API, top-layer, ::backdrop, :popover-open             → PHẦN 11
 *
 * CÁCH DÙNG (xem story Components/HuiDemo):
 *   <hui-demo heading="Xin chào" count="2" variant="success">
 *     <hui-button slot="actions" size="sm">Hành động</hui-button>
 *     <p class="tieu-de">Nội dung truyền từ ngoài vào slot mặc định</p>
 *   </hui-demo>
 */

import styles from './hui-demo.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import '../hui-button/hui-button.js';

class HuiDemo extends HuiElement {
  /**
   * ── A. NHẬN DỮ LIỆU TỪ BÊN NGOÀI ─────────────────────────
   * Khai báo ở đây → HuiElement tự làm 3 việc:
   *   1. Sinh observedAttributes: trình duyệt báo mỗi khi attribute đổi.
   *   2. Sinh getter/setter: `demo.count = 5` dùng được như property thường.
   *   3. Đồng bộ 2 chiều (reflect): đổi property → attribute đổi theo → CSS :host([...]) thấy được.
   *
   * Quy tắc chuyển kiểu (attribute trên HTML luôn là CHUỖI):
   *   String  : giữ nguyên chuỗi.
   *   Number  : count="3" → 3.
   *   Boolean : CÓ MẶT là true (kể cả dark="false" vẫn là true!), VẮNG MẶT là false.
   *             → Muốn tắt thì XÓA attribute: el.removeAttribute('dark') hoặc el.dark = false.
   *   Object/Array: đọc bằng JSON.parse, mặc định KHÔNG reflect (tránh chuỗi JSON dài trên thẻ).
   *             → Nên truyền bằng property: el.items = [...] (Vue :items, React items={...}).
   *
   * Tên attribute = tên property dạng kebab-case: maxCount ↔ max-count.
   *
   * Lưu ý cho framework:
   *   - Vue:   :count="n" (Vue tự chọn property nếu có), @hui-change="fn".
   *            Cấu hình vite: vue({ template: { compilerOptions: { isCustomElement: t => t.startsWith('hui-') } } })
   *   - React 19: <hui-demo count={n} items={arr} onhui-change={fn} /> — React 19 tự gán property.
   *   - Angular: [count]="n" (hui-change)="fn($event)" + schemas: [CUSTOM_ELEMENTS_SCHEMA].
   */
  static properties = {
    heading: { type: String, default: 'Ví dụ tổng hợp HUI' },
    count: { type: Number, default: 0 },
    /** default | success | danger — đổi màu qua :host([variant=...]) */
    variant: { type: String, default: 'default' },
    dark: { type: Boolean },
    /** Ví dụ Object: chỉ nên truyền bằng property */
    items: { type: Array, default: [] },
  };

  /** CSS được biên dịch 1 lần thành CSSStyleSheet, dùng chung cho mọi <hui-demo> */
  static styles = styles;

  /**
   * ── B. VÒNG ĐỜI ──────────────────────────────────────────
   * render(): chạy MỘT lần khi thẻ vào trang → dựng khung DOM, gắn listener nội bộ.
   * updated(changed): chạy sau mỗi lần property đổi (gom nhiều thay đổi vào 1 lần).
   *   → Chỉ sửa đúng phần thay đổi; KHÔNG xóa DOM vẽ lại (vẽ lại sẽ mất focus, mất chữ đang gõ).
   *
   * Thuộc tính `part="..."` gắn trên phần tử bên trong = "hé cửa" cho CSS bên ngoài (xem CSS PHẦN 2).
   */
  render() {
    this._title = createElement('h3', { className: 'demo__title', part: 'title' });

    // Slot có tên: người dùng đặt <x slot="actions"> → phần tử rơi vào đúng chỗ này
    const actions = createElement('slot', { name: 'actions' });
    const header = createElement('header', { className: 'demo__header', part: 'header' }, this._title, actions);

    this._countEl = createElement('span', { className: 'demo__count', part: 'count' });

    // exportparts: hui-button bên trong có part "base" và "label".
    // Mặc định bên ngoài KHÔNG chọc được part của component lồng bên trong.
    // exportparts="base: button-base" → bên ngoài viết hui-demo::part(button-base) được.
    const button = createElement('hui-button', {
      size: 'sm',
      variant: 'outline',
      icon: 'plus',
      exportparts: 'base: button-base, label: button-label',
    }, 'Tăng count');
    button.addEventListener('hui-click', () => {
      this.count += 1; // Gán property → reflect ra attribute → updated() chạy
      this.emit('hui-change', { count: this.count }); // D. Báo ra ngoài
    });

    const box = createElement('div', { className: 'demo__box', part: 'box' },
      'Rê chuột (:hover) / nhấn giữ (:active) vào hộp này');

    const input = createElement('input', {
      className: 'demo__input',
      part: 'input',
      placeholder: 'Focus vào đây → khung ngoài sáng lên (:focus-within)',
    });

    this._list = createElement('ul', { className: 'demo__list', part: 'list' });

    // Slot mặc định (không tên): nhận mọi phần tử con không khai báo slot.
    // Nội dung bên trong thẻ <slot> là FALLBACK — chỉ hiện khi người dùng không truyền gì.
    const defaultSlot = createElement('slot', {},
      createElement('em', { className: 'demo__fallback' }, '(Chưa có nội dung truyền vào slot mặc định)'));

    const body = createElement('div', { className: 'demo__body', part: 'body' },
      createElement('div', { className: 'demo__row' }, this._countEl, button),
      box, input, this._list, defaultSlot);

    return createElement('section', { className: 'demo', part: 'container' }, header, body);
  }

  updated(changed) {
    if (changed.has('heading')) this._title.textContent = this.heading;

    if (changed.has('count')) {
      this._countEl.textContent = `count = ${this.count}`;
      // ── C5. Custom state: CSS ngoài viết hui-demo:state(has-count) { ... }
      // Khác attribute: state là trạng thái NỘI BỘ, người dùng không gán được bằng HTML.
      this.setState('has-count', this.count > 0);
    }

    if (changed.has('items')) {
      this._list.replaceChildren(...this.items.map((t) => createElement('li', { part: 'item' }, String(t))));
      this._list.hidden = this.items.length === 0;
    }
  }
}

defineElement('hui-demo', HuiDemo);

export default HuiDemo;
