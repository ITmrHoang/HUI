/**
 * Repeater — render danh sách theo key, chỉ đụng tới node thay đổi.
 * Thêm / xóa / đổi thứ tự / sửa 1 item trong 1000 item → không dựng lại 999 item còn lại,
 * giữ focus, chữ đang gõ, trạng thái mở/đóng của từng dòng.
 *
 *   const r = new Repeater(listEl, {
 *     key: 'id',                                  // hoặc (item, i) => …; bỏ trống = theo vị trí
 *     create: (item, i) => renderTemplate(tpl, item, i),
 *     update: (node, item, i) => updateTemplateNode(node, item, i),
 *   });
 *   r.render(items);
 */

export class Repeater {
  constructor(container, { key, create, update, before = null } = {}) {
    this.container = container;
    this.create = create;
    this.update = update;
    /** Danh sách luôn nằm ngay sau comment mốc này → container chứa thêm phần tử khác vẫn không sao */
    this.anchor = document.createComment('hui-repeat');
    container.insertBefore(this.anchor, before);
    this.getKey = typeof key === 'function' ? key : key ? (item) => item?.[key] : (item, i) => i;
    /** @type {Map<unknown, Node>} key → node, theo thứ tự hiển thị */
    this.nodes = new Map();
  }

  /** Danh sách node theo thứ tự hiện tại */
  get children() {
    return [...this.nodes.values()];
  }

  render(items = []) {
    const old = this.nodes;
    const next = new Map();
    const order = [];

    items.forEach((item, i) => {
      let k = this.getKey(item, i);
      if (next.has(k)) k = `${String(k)}\u0000${i}`; // trùng key → vẫn giữ đủ dòng
      let node = old.get(k);
      if (node) {
        old.delete(k);
        this.update?.(node, item, i);
      } else {
        node = this.create(item, i);
      }
      next.set(k, node);
      order.push(node);
    });

    // Item đã bị xóa
    for (const node of old.values()) node.remove();

    // Đặt đúng thứ tự: node nào đã đứng ngay sau node trước thì để nguyên (không di chuyển DOM)
    let prev = this.anchor;
    for (const node of order) {
      if (prev.nextSibling !== node) this.container.insertBefore(node, prev.nextSibling);
      prev = node;
    }

    this.nodes = next;
    return order;
  }

  clear() {
    for (const node of this.nodes.values()) node.remove();
    this.nodes = new Map();
  }

  /** Gỡ hẳn khỏi container (kể cả comment mốc) */
  destroy() {
    this.clear();
    this.anchor.remove();
  }
}
