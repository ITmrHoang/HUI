/**
 * Dữ liệu mẫu đơn vị hành chính (Tỉnh/Thành → Quận/Huyện → Phường/Xã) — CHỈ dùng cho stories / demo.
 * Minh họa theo mô hình 3 cấp (trước đợt sắp xếp 2025), không đầy đủ.
 */

const P = (value, label, children) => ({ value, label, children });
const W = (value, label) => ({ value, label });

/** Định dạng options của hui-cascader: { value, label, children } */
export const VN_ADMIN = [
  P('hn', 'Hà Nội', [
    P('hn-bd', 'Quận Ba Đình', [W('hn-bd-px', 'Phường Phúc Xá'), W('hn-bd-tb', 'Phường Trúc Bạch'), W('hn-bd-vp', 'Phường Vĩnh Phúc')]),
    P('hn-hk', 'Quận Hoàn Kiếm', [W('hn-hk-hb', 'Phường Hàng Bạc'), W('hn-hk-hbai', 'Phường Hàng Bài'), W('hn-hk-tt', 'Phường Tràng Tiền')]),
    P('hn-cg', 'Quận Cầu Giấy', [W('hn-cg-dv', 'Phường Dịch Vọng'), W('hn-cg-md', 'Phường Mai Dịch'), W('hn-cg-nd', 'Phường Nghĩa Đô')]),
  ]),
  P('hcm', 'TP. Hồ Chí Minh', [
    P('hcm-q1', 'Quận 1', [W('hcm-q1-bn', 'Phường Bến Nghé'), W('hcm-q1-bt', 'Phường Bến Thành'), W('hcm-q1-dk', 'Phường Đa Kao')]),
    P('hcm-q3', 'Quận 3', [W('hcm-q3-vts', 'Phường Võ Thị Sáu'), W('hcm-q3-p9', 'Phường 9'), W('hcm-q3-p14', 'Phường 14')]),
    P('hcm-td', 'TP. Thủ Đức', [W('hcm-td-tdi', 'Phường Thảo Điền'), W('hcm-td-ap', 'Phường An Phú'), W('hcm-td-lt', 'Phường Linh Trung')]),
  ]),
  P('dn', 'Đà Nẵng', [
    P('dn-hc', 'Quận Hải Châu', [W('dn-hc-tt', 'Phường Thạch Thang'), W('dn-hc-hc1', 'Phường Hải Châu I'), W('dn-hc-bh', 'Phường Bình Hiên')]),
    P('dn-st', 'Quận Sơn Trà', [W('dn-st-ahb', 'Phường An Hải Bắc'), W('dn-st-mt', 'Phường Mân Thái'), W('dn-st-tq', 'Phường Thọ Quang')]),
  ]),
  P('hue', 'Thừa Thiên Huế', [
    P('hue-tp', 'TP. Huế', [W('hue-tp-ph', 'Phường Phú Hội'), W('hue-tp-vn', 'Phường Vĩnh Ninh')]),
    P('hue-ht', 'Thị xã Hương Thủy', [W('hue-ht-pb', 'Phường Phú Bài'), W('hue-ht-tv', 'Xã Thủy Vân')]),
  ]),
  P('ct', 'Cần Thơ', [
    P('ct-nk', 'Quận Ninh Kiều', [W('ct-nk-ah', 'Phường An Hòa'), W('ct-nk-ck', 'Phường Cái Khế'), W('ct-nk-ta', 'Phường Tân An')]),
    P('ct-cr', 'Quận Cái Răng', [W('ct-cr-hp', 'Phường Hưng Phú'), W('ct-cr-lt', 'Phường Lê Bình')]),
  ]),
];

/** Đổi sang định dạng hui-tree / hui-tree-select: { key, value, title, children } */
export function toTreeData(options = VN_ADMIN) {
  return options.map((o) => ({
    key: o.value,
    value: o.value,
    title: o.label,
    ...(o.children ? { children: toTreeData(o.children) } : {}),
  }));
}

/** Cây lớn (count node gốc × 10 con × 10 cháu) cho demo virtual scroll */
export function bigTree(count = 100) {
  return Array.from({ length: count }, (_, i) => ({
    key: `n${i}`,
    title: `Thư mục ${i + 1}`,
    children: Array.from({ length: 10 }, (_, j) => ({
      key: `n${i}-${j}`,
      title: `Mục ${i + 1}.${j + 1}`,
      children: Array.from({ length: 10 }, (_, k) => ({ key: `n${i}-${j}-${k}`, title: `Tệp ${i + 1}.${j + 1}.${k + 1}` })),
    })),
  }));
}
