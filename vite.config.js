import { defineConfig } from 'vite';
import { resolve } from 'path';
import fastGlob from 'fast-glob';

/**
 * ==========================================================
 * CẤU HÌNH VITE (Vite Configuration file)
 * Chức năng: Đóng gói (Bundler) thư viện UI ra file dùng thực tế.
 * Thay vì xuất ra file để mở trang web, ta xuất ra dạng "Thư viện" (Library Mode).
 * ==========================================================
 */

// Tự động quét (Quét ổ đĩa) tìm tất cả các file `index.js` nằm trong thư mục con của `src/components`.
// Ví dụ: nó sẽ tóm được `src/components/hui-button/index.js` và `src/components/hui-input/index.js`
const componentPaths = fastGlob.sync('src/components/*/index.js', { cwd: resolve(__dirname) });

// Nặn mảng path đó thành Object Entry để ra lệnh cho Rollup (Core đóng gói của Vite) biết cách cắt khúc mã (Code splitting).
const componentEntries = componentPaths.reduce((entries, filePath) => {
  // Trích xuất tên thư mục thành tên biến (ví dụ: 'hui-button')
  const name = filePath.match(/src\/components\/(.+)\/index\.js/)[1];
  // Chuyển đường dẫn tương đối thành tuyệt đối
  entries[name] = resolve(__dirname, filePath);
  return entries;
}, {});

export default defineConfig({
  build: {
    // 1. Kích hoạt chế độ đặc biệt: Library Mode (Chế độ Thư viện)
    lib: {
      // Entry: Nơi mọi thứ bắt đầu. Ta chỉ định file `index.js` tông kho báo tổng hợp,
      // VÀ truyền luôn các component nhỏ lẻ để nó build ra từng file js riêng rẽ, 
      // cho phép người dùng chỉ lấy đúng phần họ muốn (Tree-shaking / Code splitting).
      entry: {
        index: resolve(__dirname, 'src/index.js'),
        ...componentEntries, 
      },
      
      // Định dạng xuất xưởng:
      // - 'es': (ES Module) Định dạng chuẩn mới cho phép dùng lệnh `import / export` (Rất nhẹ, hỗ trợ Tree-Shaking).
      // - 'umd': (Universal Module Definition) Đi ngược về quá khứ, dành cho ai dùng thẻ <script src="..."></script> nhúng thẳng file.
      formats: ['es', 'umd'],
      
      // Tên Thư viện trên Window object.
      // Khi user gắn thẻ <script> nó sẽ treo tất cả đồ đạc của ta dưới cái mác `window.HUI`
      name: 'HUI',
      
      // Đặt tên đuôi mở rộng cho file thành phẩm tùy hệ phái (format)
      fileName: (format, entryName) => {
        if (format === 'es') return `${entryName}.esm.js`; // ES Module kết đài là '.esm.js'
        return `${entryName}.js`;                          // UMD kết đài là '.js' tựa dòng lệnh xưa
      },
    },
    
    // 2. Can thiệp sâu bên trong nhân Rollup:
    rollupOptions: {
      output: {
        // Gom toàn bộ CSS của mọi nhà chập lại thành một file tên là `style.css` (Gọn bớt tài sản vụn vặt).
        assetFileNames: 'style.[ext]',
      },
    },
    
    outDir: 'dist',       // Nhả tất cả thành quả vào vùng chứa `dist/` (Distribution/Phân phối).
    emptyOutDir: true,    // Hễ trước khi đóng gói là cầm chổi quét dọn sạch sành sanh thùng rác trong `dist/`.
    
    // Tạo kèm tệp Bản đồ định vị nguồn cơn Sourcemaps.
    // Lập trình viên mua thư viện xài, khi F12 Chrome báo lỗi bên trong ruột mã js phân mảnh, 
    // Sourcemap sẽ lật mặt code gốc tiếng anh tiếng việt đàng hoàng ở dòng nào, file nào thay vì giấu giếm file minified nhằng nhịt.
    sourcemap: true,
  },
});
