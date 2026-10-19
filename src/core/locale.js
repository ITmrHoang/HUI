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
  table: { filterConfirm: 'Lọc', filterReset: 'Đặt lại', selectAll: 'Chọn tất cả', sortAsc: 'Sắp xếp tăng dần', sortDesc: 'Sắp xếp giảm dần', expand: 'Mở dòng', collapse: 'Thu dòng' },
  upload: { uploading: 'Đang tải lên...', remove: 'Xóa tệp', preview: 'Xem trước', drag: 'Kéo thả tệp vào đây hoặc bấm để chọn' },
  datePicker: { placeholder: 'Chọn ngày', rangePlaceholder: ['Từ ngày', 'Đến ngày'], today: 'Hôm nay', now: 'Bây giờ', weekStart: 1 },
  image: { error: 'Không tải được ảnh', preview: 'Xem ảnh', zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ', rotate: 'Xoay' },
  tour: { next: 'Tiếp', prev: 'Quay lại', finish: 'Hoàn thành' },
};

const en = {
  common: { ok: 'OK', cancel: 'Cancel', close: 'Close', clear: 'Clear', loading: 'Loading...', search: 'Search', copy: 'Copy', copied: 'Copied', expand: 'Expand', collapse: 'Collapse', more: 'More' },
  empty: { description: 'No data' },
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
  table: { filterConfirm: 'OK', filterReset: 'Reset', selectAll: 'Select all', sortAsc: 'Sort ascending', sortDesc: 'Sort descending', expand: 'Expand row', collapse: 'Collapse row' },
  upload: { uploading: 'Uploading...', remove: 'Remove file', preview: 'Preview', drag: 'Drag files here or click to select' },
  datePicker: { placeholder: 'Select date', rangePlaceholder: ['Start date', 'End date'], today: 'Today', now: 'Now', weekStart: 0 },
  image: { error: 'Image failed to load', preview: 'Preview', zoomIn: 'Zoom in', zoomOut: 'Zoom out', rotate: 'Rotate' },
  tour: { next: 'Next', prev: 'Previous', finish: 'Finish' },
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
