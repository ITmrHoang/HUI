/**
 * Storybook Stories — HUI Tree
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { buildIndex, conductCheck, strategyKeys, findPath, filterTree, moveNode, flattenTree } from './index.js';
import { VN_ADMIN, toTreeData, bigTree } from './vn-admin-data.js';

const rows = (el) => [...el.shadowRoot.querySelectorAll('[role="treeitem"]')];
const rowOf = (el, text) => rows(el).find((r) => r.querySelector('[part~="title"]').textContent === text);
const titles = (el) => rows(el).map((r) => r.querySelector('[part~="title"]').textContent);
const treeEl = (el) => el.shadowRoot.querySelector('[role="tree"]');
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

/** Kéo giả lập bằng PointerEvent: từ giữa hàng `from` tới tỉ lệ `ratio` chiều cao hàng `to` */
async function pointerDrag(from, to, ratio = 0.5) {
  const a = from.querySelector('[part~="content"]').getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const x0 = a.left + 10;
  const y0 = a.top + a.height / 2;
  const x1 = b.left + b.width / 2;
  const y1 = b.top + b.height * ratio;
  const opts = (x, y) => ({ bubbles: true, composed: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'mouse', button: 0, buttons: 1, isPrimary: true });
  from.querySelector('[part~="content"]').dispatchEvent(new PointerEvent('pointerdown', opts(x0, y0)));
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    document.dispatchEvent(new PointerEvent('pointermove', opts(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps)));
    await frame();
  }
  document.dispatchEvent(new PointerEvent('pointerup', opts(x1, y1)));
  await frame();
}

const FILES = () => [
  {
    key: 'src', title: 'src', children: [
      { key: 'components', title: 'components', children: [
        { key: 'button', title: 'hui-button.js' },
        { key: 'tree', title: 'hui-tree.js' },
        { key: 'select', title: 'hui-select.js', disabled: true },
      ] },
      { key: 'core', title: 'core', children: [{ key: 'element', title: 'hui-element.js' }, { key: 'locale', title: 'locale.js' }] },
      { key: 'readme', title: 'README.md' },
    ],
  },
  { key: 'pkg', title: 'package.json' },
];

export default {
  title: 'Organisms/HuiTree',
  component: 'hui-tree',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Tree** — Cây phân cấp (Ant Tree + MUI TreeView). Check cha–con liên kết (nửa chọn), chọn một / nhiều,
tải con bất đồng bộ, đường nối, tìm kiếm **không dấu** (tô đậm + tự mở tổ tiên), kéo thả sắp xếp / đổi cha,
**virtual scroll** cho cây hàng chục nghìn node. Bàn phím theo **WAI-ARIA APG Tree**.

\`\`\`html
<hui-tree checkable default-expand-all show-line></hui-tree>
<script>
  tree.data = [{ key: 'hn', title: 'Hà Nội', children: [{ key: 'bd', title: 'Quận Ba Đình' }] }];
  tree.loadData = async (node) => fetchChildren(node.key); // trả về mảng con (hoặc tự gán node.children)
  tree.addEventListener('hui-check', (e) => console.log(e.detail.checkedKeys));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | JSON | \`[]\` | \`[{ key, title, icon, children, isLeaf, disabled, disableCheckbox, selectable }]\` — nên gán bằng property |
| \`expanded-keys\` / \`selected-keys\` / \`checked-keys\` | JSON | \`[]\` | Khóa đang mở / chọn / check |
| \`default-expand-all\` | boolean | \`false\` | Mở toàn bộ ở lần có dữ liệu đầu |
| \`checkable\` | boolean | \`false\` | Ô check trước mỗi node |
| \`check-strictly\` | boolean | \`false\` | Cha–con độc lập |
| \`selectable\` | \`true\` \\| \`false\` | \`true\` | Cho phép chọn node |
| \`multiple\` | boolean | \`false\` | Chọn nhiều node |
| \`show-line\` / \`show-icon\` / \`block-node\` | boolean | \`false\` | Đường nối / icon / dòng rộng hết chiều ngang |
| \`filter-value\` | string | — | Chữ tìm kiếm (không dấu) |
| \`filter-mode\` | \`highlight\` \\| \`hide\` | \`highlight\` | Chỉ tô đậm hay ẩn node không khớp |
| \`drag-reorder\` | boolean | \`false\` | Kéo thả sắp xếp (phát \`hui-drop\`) |
| \`virtual\` + \`height\` | boolean + number | — | Chỉ vẽ dòng đang nhìn thấy trong vùng cao \`height\` px |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Chiều cao dòng |
| \`label\` | string | "Cây thư mục" | Tên cây cho trình đọc màn hình |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Properties (JS)
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`loadData\` | \`(node) => Promise<children[] \\| void>\` | Tải con khi mở node chưa có \`children\` (vòng xoay trên node) |
| \`renderTitle\` | \`(node, { query }) => string \\| Node\` | Tự vẽ chữ node |
| \`allowDrop\` | \`({ dragNode, dropNode, position }) => boolean\` | Chặn vị trí thả |
| \`halfCheckedKeys\` / \`activeKey\` | chỉ đọc | Node nửa chọn / node đang focus |
| \`getNode(key)\`, \`expandAll()\`, \`collapseAll()\`, \`scrollToKey(key)\`, \`refreshLayout()\` | method | |

Helper thuần (import từ \`@itmrhoang/h-ui/hui-tree\`): \`buildIndex\`, \`flattenTree\`, \`findPath\`, \`conductCheck\`,
\`toggleCheck\`, \`strategyKeys\`, \`filterTree\`, \`moveNode\`, \`fold\`, \`matchRange\`.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-select\` | \`{ selectedKeys, node, selected }\` | Chọn / bỏ chọn (cancelable) |
| \`hui-check\` | \`{ checkedKeys, halfCheckedKeys, node, checked }\` | Check / bỏ check (cancelable) |
| \`hui-expand\` | \`{ expandedKeys, node, expanded }\` | Mở / đóng node |
| \`hui-load\` | \`{ node, loadedKeys }\` | \`loadData\` xong |
| \`hui-drop\` | \`{ dragNode, dropNode, dragKey, dropKey, position }\` | Thả node (\`before\` \\| \`inside\` \\| \`after\`). Không \`preventDefault()\` → cây tự chuyển node trong \`data\` (sửa trực tiếp mảng) |

### Slots / Parts
Slot \`empty\`. Parts: \`base\`, \`tree\`, \`node\` (+ \`node-selected\` \\| \`node-active\` \\| \`node-disabled\` \\| \`node-match\` \\| \`node-leaf\` \\| \`node-open\` \\| \`node-dragging\` \\| \`node-drop-inside\`),
\`indent\`, \`switcher\`, \`loading\`, \`checkbox\` (+ \`checkbox-checked\` \\| \`checkbox-indeterminate\` \\| \`checkbox-disabled\`), \`content\`, \`icon\`, \`title\`,
\`highlight\`, \`empty\`, \`drop-indicator\`, \`drag-ghost\`. State: \`:state(dragging)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-tree-node-height\` / \`--hui-tree-indent\` / \`--hui-tree-font-size\` | Cao dòng / thụt mỗi cấp / cỡ chữ |
| \`--hui-tree-color\` / \`--hui-tree-bg\` / \`--hui-tree-node-radius\` | Màu chữ / nền / bo góc vùng nội dung |
| \`--hui-tree-node-hover-bg\` / \`--hui-tree-node-selected-bg\` / \`--hui-tree-node-selected-color\` | Nền hover / chọn |
| \`--hui-tree-line-color\` | Đường nối |
| \`--hui-tree-checkbox-size\` / \`--hui-tree-checked-bg\` | Ô check |
| \`--hui-tree-highlight-color\` / \`--hui-tree-highlight-bg\` | Phần chữ khớp tìm kiếm |
| \`--hui-tree-drop-color\` / \`--hui-tree-focus-ring\` | Vạch thả / viền focus |

### Bàn phím (WAI-ARIA APG Tree)
| Phím | Tác dụng |
|------|----------|
| \`↓\` / \`↑\` | Node kế / trước (đang hiển thị) |
| \`→\` | Node đóng → mở; đang mở → vào con đầu |
| \`←\` | Node mở → đóng; đang đóng → về cha |
| \`Home\` / \`End\` | Node đầu / cuối |
| \`Enter\` | Chọn (hoặc check khi không selectable, hoặc mở/đóng) |
| \`Space\` | Check (checkable) / chọn |
| \`*\` | Mở mọi anh em của node đang focus |
| Gõ chữ | Nhảy tới node có tên bắt đầu bằng chữ vừa gõ (không dấu) |
| \`Alt\` + mũi tên | (drag-reorder) ↑↓ đổi chỗ, → thụt vào node trước, ← ra ngoài cha |
| \`Esc\` | Hủy kéo thả |
        `,
      },
    },
  },
  argTypes: {
    checkable: { control: 'boolean' },
    showLine: { control: 'boolean' },
    showIcon: { control: 'boolean' },
    multiple: { control: 'boolean' },
    blockNode: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-tree
      id="tr-default"
      ?checkable=${args.checkable}
      ?show-line=${args.showLine}
      ?show-icon=${args.showIcon}
      ?multiple=${args.multiple}
      ?block-node=${args.blockNode}
      size=${args.size}
      .data=${toTreeData(VN_ADMIN)}
      .expandedKeys=${['hn']}
    ></hui-tree>
  `,
  args: { checkable: false, showLine: false, showIcon: false, multiple: false, blockNode: false, size: 'md' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tr-default');
    await expect(treeEl(el).getAttribute('aria-label')).toBe('Cây thư mục');
    await expect(titles(el)).toEqual(['Hà Nội', 'Quận Ba Đình', 'Quận Hoàn Kiếm', 'Quận Cầu Giấy', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Thừa Thiên Huế', 'Cần Thơ']);
    const hn = rowOf(el, 'Hà Nội');
    await expect(hn.getAttribute('aria-expanded')).toBe('true');
    await expect(hn.getAttribute('aria-level')).toBe('1');
    await expect(rowOf(el, 'Quận Ba Đình').getAttribute('aria-level')).toBe('2');
    await expect(rowOf(el, 'Quận Ba Đình').getAttribute('aria-posinset')).toBe('1');
    await expect(rowOf(el, 'Quận Ba Đình').getAttribute('aria-setsize')).toBe('3');

    const expands = [];
    el.addEventListener('hui-expand', (e) => expands.push([e.detail.node.key, e.detail.expanded]));
    rowOf(el, 'Đà Nẵng').querySelector('[part~="switcher"]').click();
    await waitFor(() => expect(titles(el)).toContain('Quận Hải Châu'));
    await expect(rowOf(el, 'Đà Nẵng').getAttribute('aria-expanded')).toBe('true');
    await expect(el.expandedKeys).toEqual(['hn', 'dn']);
    await expect(expands).toEqual([['dn', true]]);

    // Bấm chữ → chọn; bấm lại → bỏ chọn
    const sel = [];
    el.addEventListener('hui-select', (e) => sel.push(e.detail.selectedKeys));
    rowOf(el, 'Quận Hoàn Kiếm').querySelector('[part~="content"]').click();
    await waitFor(() => expect(rowOf(el, 'Quận Hoàn Kiếm').getAttribute('aria-selected')).toBe('true'));
    await expect(rowOf(el, 'Quận Hoàn Kiếm').part.contains('node-selected')).toBe(true);
    rowOf(el, 'Quận Hoàn Kiếm').querySelector('[part~="content"]').click();
    await waitFor(() => expect(el.selectedKeys).toEqual([]));
    await expect(sel).toEqual([['hn-hk'], []]);
  },
};

/** Bàn phím theo APG: mũi tên, Home/End, *, gõ chữ (không dấu), Enter chọn */
export const Keyboard = {
  render: () => html`<hui-tree id="tr-kb" label="Địa giới hành chính" .data=${toTreeData(VN_ADMIN)}></hui-tree>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tr-kb');
    const tree = treeEl(el);
    const active = () => el.shadowRoot.getElementById(tree.getAttribute('aria-activedescendant'))?.querySelector('[part~="title"]').textContent;
    el.focus();
    await waitFor(() => expect(active()).toBe('Hà Nội'));
    await userEvent.keyboard('{ArrowDown}');
    await expect(active()).toBe('TP. Hồ Chí Minh');
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(rowOf(el, 'TP. Hồ Chí Minh').getAttribute('aria-expanded')).toBe('true'));
    await userEvent.keyboard('{ArrowRight}');
    await expect(active()).toBe('Quận 1');
    await userEvent.keyboard('{ArrowLeft}');
    await expect(active()).toBe('TP. Hồ Chí Minh');
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(rowOf(el, 'TP. Hồ Chí Minh').getAttribute('aria-expanded')).toBe('false'));
    await userEvent.keyboard('{End}');
    await expect(active()).toBe('Cần Thơ');
    await userEvent.keyboard('{Home}');
    await expect(active()).toBe('Hà Nội');

    // * mở mọi anh em cùng cấp
    await userEvent.keyboard('*');
    await waitFor(() => expect(el.expandedKeys).toEqual(['hn', 'hcm', 'dn', 'hue', 'ct']));

    // Gõ "da" (không dấu) → Đà Nẵng
    await userEvent.keyboard('da');
    await expect(active()).toBe('Đà Nẵng');

    const sel = [];
    el.addEventListener('hui-select', (e) => sel.push(e.detail.node.key));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(el.selectedKeys).toEqual(['dn']));
    await expect(sel).toEqual(['dn']);
    el.blur();
  },
};

/** Check cha – con liên kết: check cha → mọi con; bỏ 1 con → cha nửa chọn. Node disabled không bị lan */
export const Checkable = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px;">
      <hui-tree id="tr-check" checkable default-expand-all .data=${FILES()}></hui-tree>
      <hui-tree id="tr-strict" checkable check-strictly default-expand-all .data=${FILES()} .checkedKeys=${['src']}></hui-tree>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tr-check');
    const box = (text) => rowOf(el, text).querySelector('[part~="checkbox"]');
    const events = [];
    el.addEventListener('hui-check', (e) => events.push(e.detail));

    box('components').click();
    await waitFor(() => expect(el.checkedKeys).toEqual(['components', 'button', 'tree']));
    await expect(rowOf(el, 'components').getAttribute('aria-checked')).toBe('true');
    await expect(rowOf(el, 'src').getAttribute('aria-checked')).toBe('mixed');
    await expect(box('src').part.contains('checkbox-indeterminate')).toBe(true);
    await expect(rowOf(el, 'hui-select.js').getAttribute('aria-checked')).toBe('false'); // disabled: không lan
    await expect(events[0].halfCheckedKeys).toEqual(['src']);

    box('hui-tree.js').click();
    await waitFor(() => expect(el.checkedKeys).toEqual(['button']));
    await expect(rowOf(el, 'components').getAttribute('aria-checked')).toBe('mixed');
    await expect(el.halfCheckedKeys).toEqual(['src', 'components']);

    // Check gốc → mọi node (trừ disabled) → gốc checked đầy đủ
    box('src').click();
    await waitFor(() => expect(el.checkedKeys).toEqual(['src', 'components', 'button', 'tree', 'core', 'element', 'locale', 'readme']));
    await expect(rowOf(el, 'src').getAttribute('aria-checked')).toBe('true');

    // Space trên node đang focus = check
    el.focus();
    await userEvent.keyboard('{End}');
    await userEvent.keyboard(' ');
    await waitFor(() => expect(el.checkedKeys).toContain('pkg'));
    el.blur();

    // check-strictly: cha check không lan xuống con
    const strict = canvasElement.querySelector('#tr-strict');
    await expect(rowOf(strict, 'src').getAttribute('aria-checked')).toBe('true');
    await expect(rowOf(strict, 'components').getAttribute('aria-checked')).toBe('false');
  },
};

/** Tải con bất đồng bộ — vòng xoay trên node, xong phát hui-load */
export const AsyncLoad = {
  render: () => html`<hui-tree id="tr-async" show-line></hui-tree>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tr-async');
    let release;
    el.loadData = (node) => new Promise((resolve) => {
      release = () => resolve(VN_ADMIN.find((p) => p.value === node.key)?.children
        .map((d) => ({ key: d.value, title: d.label, isLeaf: true })) || []);
    });
    el.data = VN_ADMIN.map((p) => ({ key: p.value, title: p.label }));
    await el.updateComplete;
    const loads = [];
    el.addEventListener('hui-load', (e) => loads.push(e.detail.node.key));

    rowOf(el, 'Đà Nẵng').querySelector('[part~="switcher"]').click();
    await waitFor(() => expect(rowOf(el, 'Đà Nẵng').querySelector('[part~="loading"]')).not.toBeNull());
    await expect(rowOf(el, 'Đà Nẵng').getAttribute('aria-busy')).toBe('true');
    release();
    await waitFor(() => expect(titles(el)).toContain('Quận Sơn Trà'));
    await waitFor(() => expect(rowOf(el, 'Đà Nẵng').getAttribute('aria-expanded')).toBe('true'));
    await expect(loads).toEqual(['dn']);
    await expect(rowOf(el, 'Quận Sơn Trà').getAttribute('aria-expanded')).toBeNull(); // isLeaf
  },
};

/** Tìm kiếm không dấu: tô đậm phần khớp, tự mở tổ tiên; filter-mode="hide" ẩn node không khớp */
export const Search = {
  render: () => html`
    <div style="display: grid; gap: 12px; max-width: 420px;">
      <input id="tr-q" placeholder="Tìm phường / quận (gõ không dấu)..." aria-label="Tìm trong cây"
        style="padding: 6px 10px; border: 1px solid var(--hui-border); border-radius: 6px; background: var(--hui-bg); color: var(--hui-text);"
        @input=${(e) => { document.querySelector('#tr-search').filterValue = e.target.value; }}>
      <label style="font-size: 14px;"><input type="checkbox" id="tr-hide"
        @change=${(e) => { document.querySelector('#tr-search').filterMode = e.target.checked ? 'hide' : 'highlight'; }}> Ẩn node không khớp</label>
      <hui-tree id="tr-search" .data=${toTreeData(VN_ADMIN)}></hui-tree>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tr-search');
    el.filterValue = 'phuc';
    await waitFor(() => expect(titles(el)).toContain('Phường Phúc Xá'));
    await expect(el.expandedKeys).toEqual(['hn', 'hn-bd']);
    const mark = rowOf(el, 'Phường Phúc Xá').querySelector('[part="highlight"]');
    await expect(mark.textContent).toBe('Phúc');
    await expect(rowOf(el, 'Phường Vĩnh Phúc').part.contains('node-match')).toBe(true);
    await expect(titles(el)).toContain('Đà Nẵng'); // highlight: vẫn hiện node khác

    el.filterMode = 'hide';
    await waitFor(() => expect(titles(el)).toEqual(['Hà Nội', 'Quận Ba Đình', 'Phường Phúc Xá', 'Phường Vĩnh Phúc']));

    el.filterValue = 'khong co';
    await waitFor(() => expect(rows(el).length).toBe(0));
    await expect(el.shadowRoot.querySelector('[part="empty"]').hidden).toBe(false);
    el.filterValue = '';
    el.filterMode = 'highlight';
    await waitFor(() => expect(rows(el).length).toBeGreaterThan(4));
  },
};

/** Kéo thả sắp xếp / đổi cha — vạch báo before/after, viền khi thả vào trong; Alt + mũi tên bằng bàn phím */
export const DragReorder = {
  render: () => html`<hui-tree id="tr-drag" drag-reorder show-icon default-expand-all .data=${FILES()}></hui-tree>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tr-drag');
    const drops = [];
    el.addEventListener('hui-drop', (e) => drops.push([e.detail.dragKey, e.detail.dropKey, e.detail.position]));

    // README.md → trước "components"
    await pointerDrag(rowOf(el, 'README.md'), rowOf(el, 'components'), 0.1);
    await waitFor(() => expect(drops).toEqual([['readme', 'components', 'before']]));
    await waitFor(() => expect(el.data[0].children.map((n) => n.key)).toEqual(['readme', 'components', 'core']));

    // package.json → vào trong "core"
    await pointerDrag(rowOf(el, 'package.json'), rowOf(el, 'core'), 0.5);
    await waitFor(() => expect(drops[1]).toEqual(['pkg', 'core', 'inside']));
    await waitFor(() => expect(el.data.map((n) => n.key)).toEqual(['src']));
    await expect(el.getNode('core').children[0].key).toBe('pkg');

    // Không thả được vào chính con cháu của nó
    await pointerDrag(rowOf(el, 'src'), rowOf(el, 'hui-element.js'), 0.5);
    await expect(drops.length).toBe(2);

    // preventDefault → không đổi data
    const stop = (e) => e.preventDefault();
    el.addEventListener('hui-drop', stop);
    await pointerDrag(rowOf(el, 'locale.js'), rowOf(el, 'hui-button.js'), 0.1);
    await expect(drops.length).toBe(3);
    await expect(el.getNode('core').children.map((n) => n.key)).toEqual(['pkg', 'element', 'locale']);
    el.removeEventListener('hui-drop', stop);

    // Bàn phím: Alt+↓ đổi chỗ với node kế
    el.scrollToKey('element');
    el.focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(el.getNode('core').children.map((n) => n.key)).toEqual(['pkg', 'locale', 'element']));
    await expect(el.activeKey).toBe('element');
    el.blur();
  },
};

/** 11.100 node (100 × 10 × 10), mở hết — chỉ vẽ vài chục dòng đang nhìn thấy */
export const Virtual = {
  render: () => html`<hui-tree id="tr-virtual" virtual height="320" checkable show-line .data=${bigTree(100)}></hui-tree>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tr-virtual');
    el.expandAll();
    await waitFor(() => expect(rows(el).length).toBeGreaterThan(5));
    await expect(rows(el).length).toBeLessThan(60);
    await expect(rows(el)[0].getAttribute('aria-setsize')).toBe('100');
    el.scrollToKey('n80-5-3');
    await waitFor(() => expect(titles(el)).toContain('Tệp 81.6.4'));
    await expect(el.activeKey).toBe('n80-5-3');
  },
};

/** Đường nối + icon (thư mục / tệp, hoặc node.icon), các size */
export const LinesAndIcons = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px;">
      <hui-tree show-line show-icon default-expand-all .data=${FILES()}></hui-tree>
      <hui-tree show-line size="sm" default-expand-all .data=${FILES()}></hui-tree>
      <hui-tree show-icon block-node size="lg" .expandedKeys=${['src']} .selectedKeys=${['readme']}
        .data=${[{ key: 'src', title: 'Dự án', icon: 'home', children: [{ key: 'readme', title: 'Ghi chú', icon: 'edit' }, { key: 'u', title: 'Thành viên', icon: 'user' }] }]}></hui-tree>
    </div>
  `,
};

/** Override từ ngoài bằng biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .custom-tree {
        --hui-tree-node-height: 34px;
        --hui-tree-indent: 26px;
        --hui-tree-node-radius: 999px;
        --hui-tree-node-selected-bg: var(--hui-success-light);
        --hui-tree-node-selected-color: var(--hui-success);
        --hui-tree-checked-bg: var(--hui-success);
        --hui-tree-line-color: var(--hui-success-4);
      }
      .custom-tree::part(title) { font-weight: 500; }
      .custom-tree::part(node-match) { font-style: italic; }
    </style>
    <hui-tree id="tr-custom" class="custom-tree" checkable show-line default-expand-all .selectedKeys=${['hn-bd']}
      .data=${toTreeData(VN_ADMIN.slice(0, 2))}></hui-tree>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tr-custom');
    const row = rowOf(el, 'Quận Ba Đình');
    await expect(row.getBoundingClientRect().height).toBe(34);
    await expect(getComputedStyle(row.querySelector('[part~="title"]')).fontWeight).toBe('500');
  },
};

/** Helper thuần (tree-utils) — dùng lại cho TreeSelect / Cascader / Transfer */
export const Helpers = {
  render: () => html`<p>Kiểm tra các hàm thuần: buildIndex, flattenTree, conductCheck, strategyKeys, findPath, filterTree, moveNode.</p>`,
  play: async () => {
    const data = toTreeData(VN_ADMIN);
    const index = buildIndex(data);
    await expect(index.map.size).toBe(5 + 12 + 33);
    await expect(findPath(data, 'hcm-q1-bn').map((n) => n.title)).toEqual(['TP. Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé']);
    await expect(flattenTree(index, new Set(['dn'])).map((r) => r.entry.key)).toEqual(['hn', 'hcm', 'dn', 'dn-hc', 'dn-st', 'hue', 'ct']);

    const { checked, half } = conductCheck(index, ['dn-hc', 'dn-st-mt']);
    await expect(half.has('dn')).toBe(true);
    await expect(half.has('dn-st')).toBe(true);
    await expect(strategyKeys(index, checked, 'parent')).toEqual(['dn-hc', 'dn-st-mt']);
    await expect(strategyKeys(index, checked, 'child')).toEqual(['dn-hc-tt', 'dn-hc-hc1', 'dn-hc-bh', 'dn-st-mt']);
    await expect(strategyKeys(index, checked, 'all')).toEqual(['dn-hc', 'dn-hc-tt', 'dn-hc-hc1', 'dn-hc-bh', 'dn-st-mt']);
    const full = conductCheck(index, ['hue-tp', 'hue-ht']);
    await expect(full.checked.has('hue')).toBe(true);

    const f = filterTree(index, 'ben');
    await expect([...f.matched]).toEqual(['hcm-q1-bn', 'hcm-q1-bt']);
    await expect([...f.ancestors]).toEqual(['hcm-q1', 'hcm']);

    const small = [{ key: 'a', children: [{ key: 'a1' }] }, { key: 'b' }];
    await expect(moveNode(small, 'a', 'a1', 'inside')).toBe(false);
    await expect(moveNode(small, 'b', 'a1', 'before')).toBe(true);
    await expect(small[0].children.map((n) => n.key)).toEqual(['b', 'a1']);
  },
};
