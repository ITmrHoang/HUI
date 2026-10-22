/**
 * Đa ngôn ngữ (locale) cho chuỗi mặc định của component (nút OK/Hủy, "Không có dữ liệu"...).
 *   import { setLocale, registerLocale, t } from '@itmrhoang/h-ui/core';
 *   setLocale('en');
 *   registerLocale('ja', { modal: { ok: 'OK', cancel: 'キャンセル' } }); // thiếu key → lấy từ 'en'
 *   t('pagination.total', { total: 50 }) → "Tổng 50 mục"
 * Component dùng chuỗi locale đặt `static localized = true` để tự cập nhật khi đổi ngôn ngữ.
 */

const vi = {
  common: { ok: 'Đồng ý', cancel: 'Hủy', close: 'Đóng', clear: 'Xóa', loading: 'Đang tải...', search: 'Tìm kiếm', copy: 'Sao chép', copied: 'Đã sao chép', expand: 'Mở rộng', collapse: 'Thu gọn', more: 'Xem thêm' },
  empty: { description: 'Không có dữ liệu' },
  virtualList: { label: 'Danh sách', loadingMore: 'Đang tải thêm...' },
  listItem: { actions: 'Thao tác', delete: 'Xóa', edit: 'Sửa', archive: 'Lưu trữ', pin: 'Ghim', share: 'Chia sẻ', more: 'Thêm', read: 'Đã đọc' },
  tree: { label: 'Cây thư mục', empty: 'Không có dữ liệu', notFound: 'Không tìm thấy kết quả phù hợp', loading: 'Đang tải {title}...', moved: 'Đã chuyển {title}' },
  cascader: { placeholder: 'Vui lòng chọn', notFound: 'Không tìm thấy', level: 'Cấp {level}', back: 'Quay lại' },
  transfer: { source: 'Nguồn', target: 'Đích', total: '{total} mục', count: '{checked}/{total} mục', selectAll: 'Chọn tất cả', searchPlaceholder: 'Tìm trong danh sách', notFound: 'Không tìm thấy', empty: 'Không có dữ liệu', moveTo: 'Chuyển sang {title}', remove: 'Bỏ {title}', moved: 'Đã chuyển {count} mục sang {title}', page: 'Trang {page}/{total}' },
  calendar: { label: 'Lịch', modeMonth: 'Tháng', modeYear: 'Năm', mode: 'Chế độ xem' },
  timePicker: { placeholder: 'Chọn giờ', hours: 'Giờ', minutes: 'Phút', seconds: 'Giây', meridiem: 'Buổi' },
  qrcode: { label: 'Mã QR: {value}', loading: 'Đang tải mã QR…', expired: 'Mã QR đã hết hạn', refresh: 'Làm mới', scanned: 'Đã quét', error: 'Không tạo được mã QR: nội dung quá dài' },
  colorPicker: { label: 'Chọn màu', trigger: '{label}: {color}', empty: 'Chưa chọn màu', area: 'Độ bão hòa và độ sáng', areaText: 'Độ bão hòa {s}%, độ sáng {v}%', area2d: 'thanh trượt 2 chiều', hue: 'Sắc độ', alpha: 'Độ đục', format: 'Định dạng', red: 'Đỏ', green: 'Xanh lá', blue: 'Xanh dương', saturation: 'Độ bão hòa', brightness: 'Độ sáng', lightness: 'Độ sáng (L)', eyedropper: 'Lấy màu trên màn hình', clear: 'Xóa màu', recent: 'Màu gần đây', presets: 'Màu có sẵn', invalid: 'Màu không hợp lệ' },
  mentions: { label: 'Gợi ý nhắc tên', noResults: 'Không tìm thấy', error: 'Không tải được gợi ý', count: '{count} gợi ý', tooLong: 'Vượt quá số ký tự cho phép' },
  cookieConsent: { label: 'Đồng ý cookie', title: 'Chúng tôi sử dụng cookie', message: 'Chúng tôi dùng cookie để website hoạt động ổn định, phân tích lưu lượng và cá nhân hóa nội dung. Bạn có thể chọn loại cookie cho phép.', acceptAll: 'Chấp nhận tất cả', reject: 'Từ chối', customize: 'Tùy chỉnh', save: 'Lưu lựa chọn', dialogTitle: 'Tùy chỉnh cookie', policy: 'Chính sách cookie', required: 'Luôn bật', necessary: 'Cần thiết', necessaryDesc: 'Bắt buộc để website hoạt động (đăng nhập, giỏ hàng, bảo mật).', analytics: 'Phân tích', analyticsDesc: 'Giúp chúng tôi hiểu cách bạn sử dụng website để cải thiện trải nghiệm.', marketing: 'Tiếp thị', marketingDesc: 'Dùng để hiển thị quảng cáo phù hợp với bạn.' },
  languageSwitch: { label: 'Ngôn ngữ', current: 'Ngôn ngữ: {label}' },
  pageLoader: { label: 'Đang tải trang…' },
  megaMenu: { label: 'Menu chính' },
  bottomNav: { label: 'Điều hướng nhanh' },
  searchOverlay: { label: 'Tìm kiếm', placeholder: 'Tìm kiếm…', open: 'Mở tìm kiếm', close: 'Đóng tìm kiếm', clear: 'Xóa nội dung tìm', recent: 'Tìm kiếm gần đây', clearRecent: 'Xóa lịch sử', removeRecent: 'Xóa "{query}" khỏi lịch sử', suggestions: 'Gợi ý', loading: 'Đang tìm…', noResults: 'Không tìm thấy kết quả cho "{query}"', error: 'Không tải được gợi ý', count: '{count} gợi ý', hintNavigate: 'di chuyển', hintSelect: 'chọn', hintClose: 'đóng' },
  toolbar: { more: 'Công cụ khác' },
  map: { load: 'Mở bản đồ', loadLabel: 'Mở bản đồ: {place}', openExternal: 'Mở trong Google Maps', frameTitle: 'Bản đồ: {place}', label: 'Bản đồ', privacy: 'Bản đồ do Google cung cấp, chỉ tải khi bạn bấm mở.' },
  comparisonTable: { feature: 'Tính năng', choose: 'Chọn gói để so sánh', label: 'Bảng so sánh' },
  autocomplete: { noResults: 'Không có gợi ý phù hợp', error: 'Không tải được gợi ý', count: '{count} gợi ý' },
  filterChips: { clear: 'Xóa lọc', label: 'Bộ lọc nhanh' },
  filterBar: { filters: 'Bộ lọc', reset: 'Đặt lại', apply: 'Xem kết quả', searchPlaceholder: 'Tìm kiếm...', active: '{count} bộ lọc đang bật' },
  chipInput: { duplicate: '"{value}" đã có', max: 'Tối đa {max} mục', invalid: '"{value}" không hợp lệ', added: 'Đã thêm {value}', removed: 'Đã xóa {value}', remove: 'Xóa {value}' },
  featureCard: { more: 'Tìm hiểu thêm' },
  profileCard: { email: 'Gửi email', phone: 'Gọi điện', verified: 'Đã xác minh', stats: 'Chỉ số' },
  pricingTable: { monthly: 'Theo tháng', yearly: 'Theo năm', billing: 'Kỳ thanh toán', plans: 'Các gói giá' },
  logoCloud: { label: 'Khách hàng và đối tác' },
  ctaBanner: { close: 'Đóng' },
  testimonialSlider: { label: 'Nhận xét của khách hàng' },
  footerLinks: { label: 'Liên kết chân trang' },
  teamGrid: { label: 'Đội ngũ', socials: 'Mạng xã hội của {name}' },
  editable: { placeholder: 'Nhấn để sửa', hint: 'Nhấn Enter để sửa', saving: 'Đang lưu...', saved: 'Đã lưu', error: 'Không lưu được, đã khôi phục giá trị cũ', required: 'Vui lòng nhập giá trị' },
  sortable: { instructions: 'Nhấn Space để nhấc lên và sắp xếp lại', grabbed: 'Đã nhấc {label}, vị trí {index}/{count}. Dùng phím mũi tên để di chuyển, Space để thả, Esc để hủy.', moved: '{label}: vị trí {index}/{count}', movedList: '{label}: chuyển sang {list}, vị trí {index}/{count}', dropped: 'Đã thả {label} tại vị trí {index}/{count}', cancelled: 'Đã hủy, {label} trở về vị trí {index}', edge: 'Không còn danh sách nào ở hướng này', list: 'danh sách khác' },
  confirmAction: { holdHint: 'nhấn giữ {seconds} giây để xác nhận', typePrompt: 'Gõ {text} để xác nhận', confirm: 'Xác nhận', cancel: 'Hủy', done: 'Đã xác nhận', defaultText: 'XÓA' },
  commandPalette: { label: 'Bảng lệnh', placeholder: 'Tìm lệnh hoặc trang...', empty: 'Không tìm thấy lệnh phù hợp', recent: 'Gần đây', results: '{count} kết quả', navigate: 'di chuyển', run: 'chọn', close: 'đóng', listLabel: 'Danh sách lệnh' },
  kanban: { label: 'Bảng Kanban', count: '{count} thẻ', countLimit: '{count} trên giới hạn {limit} thẻ', over: 'vượt giới hạn WIP', empty: 'Chưa có thẻ', instructions: 'Nhấn Space để nhấc thẻ, Enter để mở', grabbed: 'Đã nhấc thẻ {label} ở cột {list}, vị trí {index}/{count}. Mũi tên lên xuống để di chuyển trong cột, trái phải để chuyển cột, Space để thả, Esc để hủy.', moved: '{label}: vị trí {index}/{count}', movedList: '{label}: sang cột {list}, vị trí {index}/{count}', dropped: 'Đã thả thẻ {label} vào cột {list}, vị trí {index}/{count}', cancelled: 'Đã hủy, thẻ {label} trở về vị trí cũ', edge: 'Không còn cột nào ở hướng này' },
  dot: { success: 'Thành công', processing: 'Đang xử lý', default: 'Mặc định', error: 'Lỗi', warning: 'Cảnh báo', online: 'Trực tuyến', offline: 'Ngoại tuyến', busy: 'Bận' },
  colorSwatch: { label: 'Màu {color}', copy: 'Sao chép mã màu {color}', copied: 'Đã sao chép {color}' },
  timeline: { label: 'Dòng thời gian', pending: 'Đang tiếp diễn...' },
  timelineFeed: { label: 'Hoạt động gần đây', today: 'Hôm nay', yesterday: 'Hôm qua', loadMore: 'Xem thêm hoạt động', loading: 'Đang tải thêm...' },
  reviewList: { label: 'Đánh giá của khách hàng', sort: 'Sắp xếp', newest: 'Mới nhất', highest: 'Điểm cao nhất', lowest: 'Điểm thấp nhất', helpful: 'Hữu ích nhất', count: '{count} đánh giá', countFiltered: '{count} đánh giá {stars} sao', clearFilter: 'Bỏ lọc', verified: 'Đã mua hàng', helpfulButton: 'Hữu ích ({count})', helpfulEmpty: 'Hữu ích', image: 'Xem ảnh {index}/{count} của {author}', images: 'Ảnh đính kèm', loadMore: 'Xem thêm đánh giá', noResults: 'Chưa có đánh giá {stars} sao', anonymous: 'Khách hàng' },
  reaction: { like: 'Thích', love: 'Yêu thích', haha: 'Haha', wow: 'Wow', sad: 'Buồn', angry: 'Phẫn nộ', picker: 'Chọn cảm xúc', hint: 'Nhấn mũi tên lên để chọn cảm xúc khác', summary: '{total} lượt bày tỏ cảm xúc: {detail}', reacted: 'Đã bày tỏ cảm xúc {label}', removed: 'Đã bỏ cảm xúc' },
  descriptionCard: { yes: 'Có', no: 'Không', copy: 'Sao chép {label}' },
  imageHotspot: { spot: 'Điểm {index}', more: 'Xem chi tiết', label: 'Ảnh có {count} điểm thông tin' },
  countdown: { label: 'Đếm ngược', days: 'Ngày', hours: 'Giờ', minutes: 'Phút', seconds: 'Giây' },
  share: { label: 'Chia sẻ', via: 'Chia sẻ lên {network}', email: 'Gửi qua email', copy: 'Sao chép liên kết', copied: 'Đã sao chép liên kết', native: 'Chia sẻ…' },
  statsCounter: { label: 'Số liệu nổi bật' },
  toc: { title: 'Mục lục' },
  lightbox: { label: 'Trình xem ảnh', close: 'Đóng', prev: 'Ảnh trước', next: 'Ảnh sau', zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ', rotate: 'Xoay ảnh', download: 'Tải ảnh', counter: '{index} / {count}', error: 'Không tải được ảnh' },
  gallery: { label: 'Thư viện ảnh', open: 'Xem ảnh {index}' },
  carousel: { label: 'Băng chuyền', roleDescription: 'băng chuyền', slideRole: 'trang chiếu', slide: '{index} / {count}', prev: 'Trang chiếu trước', next: 'Trang chiếu sau', goTo: 'Đến trang chiếu {index}', nav: 'Chọn trang chiếu', pause: 'Tạm dừng tự chạy', play: 'Bật tự chạy' },
  video: { play: 'Phát video: {title}', playDefault: 'Phát video', close: 'Đóng video', frameTitle: 'Trình phát video' },
  compare: { label: 'So sánh trước và sau', before: 'Trước', after: 'Sau', valueText: '{value}% ảnh trước' },
  quantity: { label: 'Số lượng', increase: 'Tăng số lượng', decrease: 'Giảm số lượng' },
  variantPicker: { soldOut: 'Hết hàng', label: 'Chọn biến thể' },
  imageZoom: { label: 'Phóng to ảnh' },
  addToCart: { added: 'Đã thêm', adding: 'Đang thêm vào giỏ...', announce: 'Đã thêm {qty} sản phẩm vào giỏ hàng', failed: 'Không thêm được vào giỏ, vui lòng thử lại' },
  freeShip: { remaining: 'Mua thêm {amount} để được miễn phí vận chuyển', reached: 'Tuyệt! Đơn hàng của bạn được miễn phí vận chuyển', label: 'Tiến độ miễn phí vận chuyển' },
  coupon: { label: 'Mã giảm giá', placeholder: 'Nhập mã giảm giá', apply: 'Áp dụng', applied: 'Đã áp dụng mã {code}', invalid: 'Mã giảm giá không hợp lệ', empty: 'Vui lòng nhập mã giảm giá', remove: 'Gỡ mã {code}' },
  cart: { title: 'Giỏ hàng', count: '{count} sản phẩm', subtotal: 'Tạm tính', note: 'Phí vận chuyển và thuế được tính khi thanh toán', checkout: 'Thanh toán', empty: 'Giỏ hàng của bạn đang trống', continue: 'Tiếp tục mua sắm', remove: 'Xóa {name} khỏi giỏ', removed: 'Đã xóa {name} khỏi giỏ', undo: 'Hoàn tác', quantity: 'Số lượng {name}', list: 'Sản phẩm trong giỏ' },
  otp: { label: 'Mã xác thực', char: 'Ký tự {index}/{length}', incomplete: 'Vui lòng nhập đủ {length} ký tự' },
  phone: { country: 'Quốc gia / vùng', number: 'Số điện thoại', invalid: 'Số điện thoại không hợp lệ' },
  passwordStrength: { label: 'Độ mạnh mật khẩu', rules: 'Yêu cầu mật khẩu', empty: 'Chưa nhập', weak: 'Yếu', fair: 'Trung bình', good: 'Khá', strong: 'Mạnh', length: 'Ít nhất {min} ký tự', lower: 'Có chữ thường (a-z)', upper: 'Có chữ hoa (A-Z)', number: 'Có chữ số (0-9)', symbol: 'Có ký tự đặc biệt (!@#...)', passed: 'đã đạt', failed: 'chưa đạt' },
  newsletter: { label: 'Địa chỉ email', form: 'Đăng ký nhận tin', placeholder: 'Nhập email của bạn', button: 'Đăng ký', success: 'Đăng ký thành công! Hãy kiểm tra hộp thư của bạn.', empty: 'Vui lòng nhập email', consentRequired: 'Vui lòng đồng ý để tiếp tục', error: 'Đăng ký không thành công, vui lòng thử lại' },
  contactForm: { name: 'Họ và tên', email: 'Email', phone: 'Số điện thoại', subject: 'Chủ đề', message: 'Nội dung', consent: 'Tôi đồng ý để được liên hệ lại qua thông tin trên', namePlaceholder: 'Nguyễn Văn A', emailPlaceholder: 'ban@email.com', subjectPlaceholder: 'Chọn chủ đề', messagePlaceholder: 'Bạn cần chúng tôi hỗ trợ điều gì?', submit: 'Gửi liên hệ', successTitle: 'Đã gửi thành công!', successText: 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất có thể.', reset: 'Gửi tin khác', error: 'Gửi không thành công. Vui lòng thử lại.', consentRequired: 'Vui lòng đồng ý để tiếp tục' },
  splitter: { handle: 'Thay đổi kích thước vùng {index}' },
  infiniteScroll: { loading: 'Đang tải thêm...', end: 'Hết dữ liệu', error: 'Không tải được dữ liệu', retry: 'Thử lại' },
  chart: { sparkline: 'Biểu đồ đường', bar: 'Biểu đồ cột', donut: 'Biểu đồ tròn', gauge: 'Đồng hồ đo', summary: 'Thấp nhất {min}, cao nhất {max}, hiện tại {last}', trendUp: 'xu hướng tăng', trendDown: 'xu hướng giảm', trendFlat: 'đi ngang', reference: 'mốc tham chiếu {value}', barSummary: '{count} mục, cao nhất {maxLabel}: {max}', donutSummary: '{count} phần, tổng {total}', total: 'Tổng', label: 'Nhãn', value: 'Giá trị', point: 'Điểm {index}', empty: 'Không có dữ liệu' },
  dataView: { label: 'Danh sách dữ liệu', searchPlaceholder: 'Tìm kiếm...', searchLabel: 'Tìm trong danh sách', resultCount: '{count} kết quả', clearFilters: 'Xóa lọc', sort: 'Sắp xếp', sortDefault: 'Mặc định', views: 'Chế độ xem', viewList: 'Danh sách', viewGrid: 'Lưới', viewTable: 'Bảng', loadMore: 'Xem thêm', loadingMore: 'Đang tải thêm...', selected: 'Đã chọn {count}', clearSelection: 'Bỏ chọn', selectItem: 'Chọn {name}', selectAll: 'Chọn tất cả', noResults: 'Không tìm thấy kết quả phù hợp', yes: 'Có', no: 'Không' },
  kpiRow: { label: 'Chỉ số chính' },
  cardGrid: { loadMore: 'Tải thêm', select: 'Chọn mục {index}', loading: 'Đang tải thêm...' },
  blog: { readingTime: '{minutes} phút đọc' },
  stat: { up: 'Tăng', down: 'Giảm', flat: 'Không đổi', trend: 'Biểu đồ xu hướng' },
  pricing: { popular: 'Phổ biến', month: '/tháng', year: '/năm', cta: 'Chọn gói', included: 'Có', excluded: 'Không có', save: 'Tiết kiệm {percent}%' },
  product: { addToCart: 'Thêm vào giỏ', soldOut: 'Hết hàng', wishlist: 'Yêu thích' },
  price: { free: 'Miễn phí', label: 'Giá {value}', srSale: 'Giá gốc {original}, giá bán {value}', srDiscount: 'giảm {percent}%' },
  scrollProgress: { label: 'Tiến độ đọc trang' },
  progressCard: { count: '{value}/{total} việc', deadline: 'Hạn chót {time}', overdue: 'Quá hạn {time}' },
  stepProgress: { label: 'Tiến trình các bước', counter: 'Bước {index}/{total}', prev: 'Quay lại', next: 'Tiếp tục', finish: 'Hoàn thành' },
  steps: { label: 'Các bước', stepLabel: 'Bước {index}: {title}', wait: 'Đang chờ', process: 'Đang thực hiện', finish: 'Đã hoàn thành', error: 'Lỗi' },
  flipCard: { flip: 'Lật thẻ' },
  card: { open: 'Xem chi tiết' },
  scroller: { label: 'Danh sách cuộn ngang', prev: 'Trước', next: 'Tiếp', slide: '{index} / {count}', goTo: 'Đến trang {index}', pagination: 'Chọn trang', itemRole: 'mục' },
  scrollSteps: { label: 'Nội dung theo bước', nav: 'Điều hướng các bước', step: 'Bước {index}', prev: 'Bước trước', next: 'Bước sau', counter: 'Bước {index} / {count}' },
  theme: { label: 'Giao diện', light: 'Sáng', dark: 'Tối', system: 'Theo hệ thống', darkMode: 'Chế độ tối' },
  announcement: { label: 'Thông báo', close: 'Đóng thông báo' },
  faq: { searchPlaceholder: 'Tìm câu hỏi...', expandAll: 'Mở tất cả', collapseAll: 'Thu gọn tất cả', noResults: 'Không tìm thấy câu hỏi phù hợp', resultCount: '{count} câu hỏi phù hợp', all: 'Tất cả', other: 'Khác' },
  contactFloat: { phone: 'Gọi {value}', zalo: 'Chat Zalo', messenger: 'Nhắn tin Messenger', email: 'Gửi email', toggle: 'Liên hệ' },
  floatGroup: { toggle: 'Mở nhóm nút' },
  backTop: { label: 'Lên đầu trang' },
  rate: { label: 'Đánh giá', valueText: '{value} trên {count} sao', required: 'Vui lòng chọn số sao', displayLabel: 'Đánh giá {value} trên {count}', reviews: '({count} đánh giá)', total: '{count} đánh giá', bar: '{stars} sao: {count} đánh giá ({percent})', summary: 'Phân bố đánh giá' },
  data: { errorTitle: 'Không tải được dữ liệu', retry: 'Thử lại' },
  form: {
    required: 'Vui lòng nhập trường này',
    requiredChecked: 'Vui lòng chọn mục này',
    requiredSelect: 'Vui lòng chọn một giá trị',
    tooShort: 'Tối thiểu {min} ký tự',
    tooLong: 'Tối đa {max} ký tự',
    rangeUnderflow: 'Giá trị tối thiểu là {min}',
    rangeOverflow: 'Giá trị tối đa là {max}',
    patternMismatch: 'Định dạng không hợp lệ',
    typeEmail: 'Email không hợp lệ',
    typeUrl: 'Đường dẫn không hợp lệ',
    typeNumber: 'Vui lòng nhập số',
    minItems: 'Chọn tối thiểu {min} mục',
    maxItems: 'Chọn tối đa {max} mục',
    optional: '(không bắt buộc)',
  },
  modal: { ok: 'Đồng ý', cancel: 'Hủy', confirmTitle: 'Xác nhận' },
  popconfirm: { ok: 'Đồng ý', cancel: 'Hủy' },
  tabs: { add: 'Thêm tab', remove: 'Đóng tab' },
  breadcrumb: { label: 'Đường dẫn', expand: 'Hiện đường dẫn đầy đủ' },
  navbar: { openMenu: 'Mở menu', closeMenu: 'Đóng menu', label: 'Điều hướng chính' },
  pagination: { label: 'Phân trang', prev5: 'Lùi 5 trang', next5: 'Tiến 5 trang', prev: 'Trang trước', next: 'Trang sau', itemsPerPage: '/ trang', jumpTo: 'Đến trang', page: 'Trang', total: 'Tổng {total} mục' },
  input: { showPassword: 'Hiện mật khẩu' },
  inputNumber: { increase: 'Tăng giá trị', decrease: 'Giảm giá trị' },
  slider: { start: 'Giá trị đầu', end: 'Giá trị cuối' },
  progress: { label: 'Tiến độ' },
  select: { notFound: 'Không tìm thấy', placeholder: 'Chọn...' },
  table: { filterConfirm: 'Lọc', filterReset: 'Đặt lại', selectAll: 'Chọn tất cả', sortAsc: 'Sắp xếp tăng dần', sortDesc: 'Sắp xếp giảm dần', expand: 'Mở dòng', collapse: 'Thu dòng', label: 'Bảng dữ liệu', filter: 'Lọc theo {title}', filterSearch: 'Tìm trong bộ lọc', filterEmpty: 'Không có lựa chọn phù hợp', selectRow: 'Chọn dòng {name}', selection: 'Chọn dòng', expandColumn: 'Mở rộng', sortNone: 'Bỏ sắp xếp', resize: 'Đổi độ rộng cột {title}', yes: 'Có', no: 'Không' },
  upload: { uploading: 'Đang tải lên...', remove: 'Xóa tệp', preview: 'Xem trước', drag: 'Kéo thả tệp vào đây hoặc bấm để chọn', button: 'Tải tệp lên', retry: 'Tải lại', error: 'Tải lên thất bại', done: 'Đã tải lên', tooLarge: '{name} vượt quá {max}', notAccepted: '{name}: định dạng không được hỗ trợ', maxCount: 'Chỉ được chọn tối đa {max} tệp', list: 'Danh sách tệp' },
  datePicker: { placeholder: 'Chọn ngày', rangePlaceholder: ['Từ ngày', 'Đến ngày'], today: 'Hôm nay', now: 'Bây giờ', weekStart: 1, prevMonth: 'Tháng trước', nextMonth: 'Tháng sau', prevYear: 'Năm trước', nextYear: 'Năm sau', prevDecade: 'Thập kỷ trước', nextDecade: 'Thập kỷ sau', chooseMonth: 'Chọn tháng', chooseYear: 'Chọn năm', week: 'Tuần', weekLabel: 'Tuần {week}, {year}', quarterLabel: 'Quý {quarter}, {year}', weekPlaceholder: 'Chọn tuần', monthPlaceholder: 'Chọn tháng', quarterPlaceholder: 'Chọn quý', yearPlaceholder: 'Chọn năm', dateTimePlaceholder: 'Chọn ngày giờ', monthRangePlaceholder: ['Từ tháng', 'Đến tháng'], yearRangePlaceholder: ['Từ năm', 'Đến năm'], presets: 'Chọn nhanh', invalid: 'Ngày không hợp lệ', dialog: 'Chọn ngày', last7Days: '7 ngày qua', last30Days: '30 ngày qua', thisWeek: 'Tuần này', thisMonth: 'Tháng này', lastMonth: 'Tháng trước', thisYear: 'Năm nay' },
  image: { error: 'Không tải được ảnh', preview: 'Xem ảnh', zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ', rotate: 'Xoay' },
  tour: { next: 'Tiếp', prev: 'Quay lại', finish: 'Hoàn thành', skip: 'Bỏ qua', close: 'Đóng hướng dẫn', indicator: '{current}/{total}', step: 'Bước {current} trên {total}', label: 'Hướng dẫn sử dụng' },
};

const en = {
  common: { ok: 'OK', cancel: 'Cancel', close: 'Close', clear: 'Clear', loading: 'Loading...', search: 'Search', copy: 'Copy', copied: 'Copied', expand: 'Expand', collapse: 'Collapse', more: 'More' },
  empty: { description: 'No data' },
  virtualList: { label: 'List', loadingMore: 'Loading more...' },
  listItem: { actions: 'Actions', delete: 'Delete', edit: 'Edit', archive: 'Archive', pin: 'Pin', share: 'Share', more: 'More', read: 'Mark as read' },
  tree: { label: 'Tree', empty: 'No data', notFound: 'No matching results', loading: 'Loading {title}...', moved: 'Moved {title}' },
  cascader: { placeholder: 'Please select', notFound: 'Not found', level: 'Level {level}', back: 'Back' },
  transfer: { source: 'Source', target: 'Target', total: '{total} items', count: '{checked}/{total} items', selectAll: 'Select all', searchPlaceholder: 'Search here', notFound: 'Not found', empty: 'No data', moveTo: 'Move to {title}', remove: 'Remove {title}', moved: 'Moved {count} items to {title}', page: 'Page {page} of {total}' },
  calendar: { label: 'Calendar', modeMonth: 'Month', modeYear: 'Year', mode: 'View mode' },
  timePicker: { placeholder: 'Select time', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds', meridiem: 'AM/PM' },
  qrcode: { label: 'QR code: {value}', loading: 'Loading QR code…', expired: 'QR code expired', refresh: 'Refresh', scanned: 'Scanned', error: 'Cannot create QR code: content is too long' },
  colorPicker: { label: 'Color picker', trigger: '{label}: {color}', empty: 'No color', area: 'Saturation and brightness', areaText: 'Saturation {s}%, brightness {v}%', area2d: '2D slider', hue: 'Hue', alpha: 'Opacity', format: 'Format', red: 'Red', green: 'Green', blue: 'Blue', saturation: 'Saturation', brightness: 'Brightness', lightness: 'Lightness', eyedropper: 'Pick a color from the screen', clear: 'Clear color', recent: 'Recent colors', presets: 'Presets', invalid: 'Invalid color' },
  mentions: { label: 'Mention suggestions', noResults: 'No matches', error: 'Could not load suggestions', count: '{count} suggestions', tooLong: 'Exceeds the character limit' },
  cookieConsent: { label: 'Cookie consent', title: 'We use cookies', message: 'We use cookies to keep the site working, analyse traffic and personalise content. You can choose which cookies to allow.', acceptAll: 'Accept all', reject: 'Reject', customize: 'Customize', save: 'Save preferences', dialogTitle: 'Cookie preferences', policy: 'Cookie policy', required: 'Always on', necessary: 'Necessary', necessaryDesc: 'Required for the site to work (sign-in, cart, security).', analytics: 'Analytics', analyticsDesc: 'Helps us understand how the site is used so we can improve it.', marketing: 'Marketing', marketingDesc: 'Used to show you relevant ads.' },
  languageSwitch: { label: 'Language', current: 'Language: {label}' },
  pageLoader: { label: 'Loading page…' },
  megaMenu: { label: 'Main menu' },
  bottomNav: { label: 'Quick navigation' },
  searchOverlay: { label: 'Search', placeholder: 'Search…', open: 'Open search', close: 'Close search', clear: 'Clear search', recent: 'Recent searches', clearRecent: 'Clear history', removeRecent: 'Remove "{query}" from history', suggestions: 'Suggestions', loading: 'Searching…', noResults: 'No results for "{query}"', error: 'Could not load suggestions', count: '{count} suggestions', hintNavigate: 'navigate', hintSelect: 'select', hintClose: 'close' },
  toolbar: { more: 'More tools' },
  map: { load: 'Show map', loadLabel: 'Show map: {place}', openExternal: 'Open in Google Maps', frameTitle: 'Map: {place}', label: 'Map', privacy: 'Map provided by Google, loaded only when you open it.' },
  comparisonTable: { feature: 'Features', choose: 'Choose a plan to compare', label: 'Comparison table' },
  autocomplete: { noResults: 'No matching suggestions', error: 'Could not load suggestions', count: '{count} suggestions' },
  filterChips: { clear: 'Clear filters', label: 'Quick filters' },
  filterBar: { filters: 'Filters', reset: 'Reset', apply: 'Show results', searchPlaceholder: 'Search...', active: '{count} active filters' },
  chipInput: { duplicate: '"{value}" already added', max: 'Up to {max} items', invalid: '"{value}" is not valid', added: 'Added {value}', removed: 'Removed {value}', remove: 'Remove {value}' },
  featureCard: { more: 'Learn more' },
  profileCard: { email: 'Email', phone: 'Call', verified: 'Verified', stats: 'Stats' },
  pricingTable: { monthly: 'Monthly', yearly: 'Yearly', billing: 'Billing period', plans: 'Pricing plans' },
  logoCloud: { label: 'Customers and partners' },
  ctaBanner: { close: 'Dismiss' },
  testimonialSlider: { label: 'Customer testimonials' },
  footerLinks: { label: 'Footer links' },
  teamGrid: { label: 'Team', socials: '{name} on social media' },
  editable: { placeholder: 'Click to edit', hint: 'Press Enter to edit', saving: 'Saving...', saved: 'Saved', error: 'Could not save, the previous value was restored', required: 'Please enter a value' },
  sortable: { instructions: 'Press Space to pick up and reorder', grabbed: 'Picked up {label}, position {index} of {count}. Use the arrow keys to move, Space to drop, Escape to cancel.', moved: '{label}: position {index} of {count}', movedList: '{label}: moved to {list}, position {index} of {count}', dropped: 'Dropped {label} at position {index} of {count}', cancelled: 'Cancelled, {label} returned to position {index}', edge: 'No more lists in this direction', list: 'another list' },
  confirmAction: { holdHint: 'press and hold for {seconds} seconds to confirm', typePrompt: 'Type {text} to confirm', confirm: 'Confirm', cancel: 'Cancel', done: 'Confirmed', defaultText: 'DELETE' },
  commandPalette: { label: 'Command palette', placeholder: 'Search commands or pages...', empty: 'No matching commands', recent: 'Recent', results: '{count} results', navigate: 'navigate', run: 'select', close: 'close', listLabel: 'Commands' },
  kanban: { label: 'Kanban board', count: '{count} cards', countLimit: '{count} of {limit} cards limit', over: 'over WIP limit', empty: 'No cards', instructions: 'Press Space to pick up the card, Enter to open', grabbed: 'Picked up card {label} in column {list}, position {index} of {count}. Use up and down to move within the column, left and right to change column, Space to drop, Escape to cancel.', moved: '{label}: position {index} of {count}', movedList: '{label}: moved to column {list}, position {index} of {count}', dropped: 'Dropped card {label} in column {list}, position {index} of {count}', cancelled: 'Cancelled, card {label} returned to its original position', edge: 'No more columns in this direction' },
  dot: { success: 'Success', processing: 'Processing', default: 'Default', error: 'Error', warning: 'Warning', online: 'Online', offline: 'Offline', busy: 'Busy' },
  colorSwatch: { label: 'Color {color}', copy: 'Copy color {color}', copied: 'Copied {color}' },
  timeline: { label: 'Timeline', pending: 'In progress...' },
  timelineFeed: { label: 'Recent activity', today: 'Today', yesterday: 'Yesterday', loadMore: 'Load more activity', loading: 'Loading more...' },
  reviewList: { label: 'Customer reviews', sort: 'Sort by', newest: 'Newest', highest: 'Highest rating', lowest: 'Lowest rating', helpful: 'Most helpful', count: '{count} reviews', countFiltered: '{count} {stars}-star reviews', clearFilter: 'Clear filter', verified: 'Verified purchase', helpfulButton: 'Helpful ({count})', helpfulEmpty: 'Helpful', image: 'View photo {index}/{count} from {author}', images: 'Attached photos', loadMore: 'Show more reviews', noResults: 'No {stars}-star reviews yet', anonymous: 'Customer' },
  reaction: { like: 'Like', love: 'Love', haha: 'Haha', wow: 'Wow', sad: 'Sad', angry: 'Angry', picker: 'Choose a reaction', hint: 'Press arrow up to choose another reaction', summary: '{total} reactions: {detail}', reacted: 'Reacted with {label}', removed: 'Reaction removed' },
  descriptionCard: { yes: 'Yes', no: 'No', copy: 'Copy {label}' },
  imageHotspot: { spot: 'Point {index}', more: 'Learn more', label: 'Image with {count} hotspots' },
  countdown: { label: 'Countdown', days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' },
  share: { label: 'Share', via: 'Share on {network}', email: 'Send by email', copy: 'Copy link', copied: 'Link copied', native: 'Share…' },
  statsCounter: { label: 'Key figures' },
  toc: { title: 'On this page' },
  lightbox: { label: 'Image viewer', close: 'Close', prev: 'Previous image', next: 'Next image', zoomIn: 'Zoom in', zoomOut: 'Zoom out', rotate: 'Rotate image', download: 'Download image', counter: '{index} / {count}', error: 'Image failed to load' },
  gallery: { label: 'Image gallery', open: 'View image {index}' },
  carousel: { label: 'Carousel', roleDescription: 'carousel', slideRole: 'slide', slide: '{index} of {count}', prev: 'Previous slide', next: 'Next slide', goTo: 'Go to slide {index}', nav: 'Choose slide', pause: 'Pause autoplay', play: 'Start autoplay' },
  video: { play: 'Play video: {title}', playDefault: 'Play video', close: 'Close video', frameTitle: 'Video player' },
  compare: { label: 'Before and after comparison', before: 'Before', after: 'After', valueText: '{value}% before image' },
  quantity: { label: 'Quantity', increase: 'Increase quantity', decrease: 'Decrease quantity' },
  variantPicker: { soldOut: 'Sold out', label: 'Choose a variant' },
  imageZoom: { label: 'Zoom image' },
  addToCart: { added: 'Added', adding: 'Adding to cart...', announce: 'Added {qty} item(s) to cart', failed: 'Could not add to cart, please try again' },
  freeShip: { remaining: 'Spend {amount} more to get free shipping', reached: 'Great! Your order ships for free', label: 'Free shipping progress' },
  coupon: { label: 'Coupon code', placeholder: 'Enter coupon code', apply: 'Apply', applied: 'Coupon {code} applied', invalid: 'Invalid coupon code', empty: 'Please enter a coupon code', remove: 'Remove coupon {code}' },
  cart: { title: 'Your cart', count: '{count} item(s)', subtotal: 'Subtotal', note: 'Shipping and taxes calculated at checkout', checkout: 'Checkout', empty: 'Your cart is empty', continue: 'Continue shopping', remove: 'Remove {name} from cart', removed: 'Removed {name} from cart', undo: 'Undo', quantity: 'Quantity of {name}', list: 'Items in cart' },
  otp: { label: 'Verification code', char: 'Character {index} of {length}', incomplete: 'Please enter all {length} characters' },
  phone: { country: 'Country / region', number: 'Phone number', invalid: 'Invalid phone number' },
  passwordStrength: { label: 'Password strength', rules: 'Password requirements', empty: 'Not entered', weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong', length: 'At least {min} characters', lower: 'A lowercase letter (a-z)', upper: 'An uppercase letter (A-Z)', number: 'A number (0-9)', symbol: 'A symbol (!@#...)', passed: 'met', failed: 'not met' },
  newsletter: { label: 'Email address', form: 'Newsletter signup', placeholder: 'Enter your email', button: 'Subscribe', success: 'Thanks for subscribing! Please check your inbox.', empty: 'Please enter your email', consentRequired: 'Please agree to continue', error: 'Subscription failed, please try again' },
  contactForm: { name: 'Full name', email: 'Email', phone: 'Phone number', subject: 'Subject', message: 'Message', consent: 'I agree to be contacted using the information above', namePlaceholder: 'Jane Doe', emailPlaceholder: 'you@example.com', subjectPlaceholder: 'Choose a subject', messagePlaceholder: 'How can we help you?', submit: 'Send message', successTitle: 'Message sent!', successText: 'Thanks for reaching out. We will get back to you soon.', reset: 'Send another message', error: 'Could not send your message. Please try again.', consentRequired: 'Please agree to continue' },
  splitter: { handle: 'Resize panel {index}' },
  infiniteScroll: { loading: 'Loading more...', end: 'No more data', error: 'Failed to load', retry: 'Retry' },
  chart: { sparkline: 'Line chart', bar: 'Bar chart', donut: 'Donut chart', gauge: 'Gauge', summary: 'Min {min}, max {max}, latest {last}', trendUp: 'trending up', trendDown: 'trending down', trendFlat: 'flat', reference: 'reference {value}', barSummary: '{count} items, highest {maxLabel}: {max}', donutSummary: '{count} parts, total {total}', total: 'Total', label: 'Label', value: 'Value', point: 'Point {index}', empty: 'No data' },
  dataView: { label: 'Data list', searchPlaceholder: 'Search...', searchLabel: 'Search the list', resultCount: '{count} results', clearFilters: 'Clear filters', sort: 'Sort by', sortDefault: 'Default', views: 'View', viewList: 'List', viewGrid: 'Grid', viewTable: 'Table', loadMore: 'Load more', loadingMore: 'Loading more...', selected: '{count} selected', clearSelection: 'Clear selection', selectItem: 'Select {name}', selectAll: 'Select all', noResults: 'No matching results', yes: 'Yes', no: 'No' },
  kpiRow: { label: 'Key metrics' },
  cardGrid: { loadMore: 'Load more', select: 'Select item {index}', loading: 'Loading more...' },
  blog: { readingTime: '{minutes} min read' },
  stat: { up: 'Up', down: 'Down', flat: 'No change', trend: 'Trend chart' },
  pricing: { popular: 'Popular', month: '/month', year: '/year', cta: 'Choose plan', included: 'Included', excluded: 'Not included', save: 'Save {percent}%' },
  product: { addToCart: 'Add to cart', soldOut: 'Sold out', wishlist: 'Wishlist' },
  price: { free: 'Free', label: 'Price {value}', srSale: 'Original price {original}, sale price {value}', srDiscount: '{percent}% off' },
  scrollProgress: { label: 'Reading progress' },
  progressCard: { count: '{value}/{total} tasks', deadline: 'Due {time}', overdue: 'Overdue {time}' },
  stepProgress: { label: 'Step progress', counter: 'Step {index}/{total}', prev: 'Back', next: 'Next', finish: 'Finish' },
  steps: { label: 'Steps', stepLabel: 'Step {index}: {title}', wait: 'Waiting', process: 'In progress', finish: 'Finished', error: 'Error' },
  flipCard: { flip: 'Flip card' },
  card: { open: 'View details' },
  scroller: { label: 'Horizontal list', prev: 'Previous', next: 'Next', slide: '{index} of {count}', goTo: 'Go to page {index}', pagination: 'Choose page', itemRole: 'slide' },
  scrollSteps: { label: 'Step content', nav: 'Step navigation', step: 'Step {index}', prev: 'Previous step', next: 'Next step', counter: 'Step {index} of {count}' },
  theme: { label: 'Theme', light: 'Light', dark: 'Dark', system: 'System', darkMode: 'Dark mode' },
  announcement: { label: 'Announcement', close: 'Dismiss announcement' },
  faq: { searchPlaceholder: 'Search questions...', expandAll: 'Expand all', collapseAll: 'Collapse all', noResults: 'No matching questions', resultCount: '{count} matching questions', all: 'All', other: 'Other' },
  contactFloat: { phone: 'Call {value}', zalo: 'Chat on Zalo', messenger: 'Chat on Messenger', email: 'Send email', toggle: 'Contact us' },
  floatGroup: { toggle: 'Open actions' },
  backTop: { label: 'Back to top' },
  rate: { label: 'Rating', valueText: '{value} out of {count} stars', required: 'Please select a rating', displayLabel: 'Rated {value} out of {count}', reviews: '({count} reviews)', total: '{count} reviews', bar: '{stars} stars: {count} reviews ({percent})', summary: 'Rating distribution' },
  data: { errorTitle: 'Could not load data', retry: 'Retry' },
  form: {
    required: 'Please fill out this field',
    requiredChecked: 'Please check this box',
    requiredSelect: 'Please select a value',
    tooShort: 'At least {min} characters',
    tooLong: 'At most {max} characters',
    rangeUnderflow: 'Minimum value is {min}',
    rangeOverflow: 'Maximum value is {max}',
    patternMismatch: 'Invalid format',
    typeEmail: 'Invalid email',
    typeUrl: 'Invalid URL',
    typeNumber: 'Please enter a number',
    minItems: 'Select at least {min} items',
    maxItems: 'Select at most {max} items',
    optional: '(optional)',
  },
  modal: { ok: 'OK', cancel: 'Cancel', confirmTitle: 'Confirm' },
  popconfirm: { ok: 'OK', cancel: 'Cancel' },
  tabs: { add: 'Add tab', remove: 'Close tab' },
  breadcrumb: { label: 'Breadcrumb', expand: 'Show full path' },
  navbar: { openMenu: 'Open menu', closeMenu: 'Close menu', label: 'Main navigation' },
  pagination: { label: 'Pagination', prev5: 'Previous 5 pages', next5: 'Next 5 pages', prev: 'Previous page', next: 'Next page', itemsPerPage: '/ page', jumpTo: 'Go to', page: 'Page', total: 'Total {total} items' },
  input: { showPassword: 'Show password' },
  inputNumber: { increase: 'Increase value', decrease: 'Decrease value' },
  slider: { start: 'Start value', end: 'End value' },
  progress: { label: 'Progress' },
  select: { notFound: 'Not found', placeholder: 'Select...' },
  table: { filterConfirm: 'OK', filterReset: 'Reset', selectAll: 'Select all', sortAsc: 'Sort ascending', sortDesc: 'Sort descending', expand: 'Expand row', collapse: 'Collapse row', label: 'Data table', filter: 'Filter by {title}', filterSearch: 'Search filters', filterEmpty: 'No matching options', selectRow: 'Select row {name}', selection: 'Row selection', expandColumn: 'Expand', sortNone: 'Sorting removed', resize: 'Resize column {title}', yes: 'Yes', no: 'No' },
  upload: { uploading: 'Uploading...', remove: 'Remove file', preview: 'Preview', drag: 'Drag files here or click to select', button: 'Upload file', retry: 'Retry', error: 'Upload failed', done: 'Uploaded', tooLarge: '{name} is larger than {max}', notAccepted: '{name}: file type not allowed', maxCount: 'You can select up to {max} files', list: 'File list' },
  datePicker: { placeholder: 'Select date', rangePlaceholder: ['Start date', 'End date'], today: 'Today', now: 'Now', weekStart: 0, prevMonth: 'Previous month', nextMonth: 'Next month', prevYear: 'Previous year', nextYear: 'Next year', prevDecade: 'Previous decade', nextDecade: 'Next decade', chooseMonth: 'Choose month', chooseYear: 'Choose year', week: 'Wk', weekLabel: 'Week {week}, {year}', quarterLabel: 'Quarter {quarter}, {year}', weekPlaceholder: 'Select week', monthPlaceholder: 'Select month', quarterPlaceholder: 'Select quarter', yearPlaceholder: 'Select year', dateTimePlaceholder: 'Select date and time', monthRangePlaceholder: ['Start month', 'End month'], yearRangePlaceholder: ['Start year', 'End year'], presets: 'Presets', invalid: 'Invalid date', dialog: 'Choose date', last7Days: 'Last 7 days', last30Days: 'Last 30 days', thisWeek: 'This week', thisMonth: 'This month', lastMonth: 'Last month', thisYear: 'This year' },
  image: { error: 'Image failed to load', preview: 'Preview', zoomIn: 'Zoom in', zoomOut: 'Zoom out', rotate: 'Rotate' },
  tour: { next: 'Next', prev: 'Previous', finish: 'Finish', skip: 'Skip', close: 'Close tour', indicator: '{current}/{total}', step: 'Step {current} of {total}', label: 'Product tour' },
};

const locales = new Map([['vi', vi], ['en', en]]);
let current = 'vi';

/** Trộn sâu: key thiếu ở `override` lấy từ `base` */
function deepMerge(base, override) {
  const out = { ...base };
  for (const [k, v] of Object.entries(override || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(base?.[k] || {}, v) : v;
  }
  return out;
}

/** Đăng ký / bổ sung ngôn ngữ. Key thiếu được lấy từ `fallback` (mặc định 'en'). */
export function registerLocale(name, messages, fallback = 'en') {
  const base = locales.get(name) || locales.get(fallback) || en;
  locales.set(name, deepMerge(base, messages));
}

/**
 * Đổi ngôn ngữ toàn cục. Nhận tên đã đăng ký hoặc object chuỗi (ghi đè lên ngôn ngữ hiện tại).
 * Phát sự kiện `hui-locale-change` trên document → component `localized` tự vẽ lại chữ.
 */
export function setLocale(nameOrMessages) {
  if (typeof nameOrMessages === 'string') {
    if (!locales.has(nameOrMessages)) {
      console.warn(`[HUI] Locale "${nameOrMessages}" chưa đăng ký, dùng registerLocale() trước.`);
      return;
    }
    current = nameOrMessages;
  } else {
    registerLocale(current, nameOrMessages, current);
  }
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('hui-locale-change', { detail: { locale: current } }));
  }
}

export function getLocaleName() {
  return current;
}

/** Toàn bộ chuỗi của ngôn ngữ hiện tại */
export function getLocale() {
  return locales.get(current);
}

/**
 * Lấy chuỗi theo đường dẫn 'nhóm.key', thay {biến} bằng giá trị trong `vars`.
 * Không tìm thấy → trả về chính key (dễ phát hiện thiếu bản dịch).
 */
export function t(path, vars) {
  let value = path.split('.').reduce((obj, k) => obj?.[k], locales.get(current));
  if (value === undefined) value = path.split('.').reduce((obj, k) => obj?.[k], en);
  if (value === undefined) return path;
  if (typeof value === 'string' && vars) {
    value = value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }
  return value;
}
