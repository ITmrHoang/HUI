/**
 * Rút gọn CSS import dạng `?raw` (chuỗi CSS nhúng vào Shadow DOM) khi BUILD:
 * bỏ comment + khoảng trắng thừa. Vite không tự nén các chuỗi này, nên nếu không có bước này
 * mọi comment tiếng Việt trong file .css sẽ nằm nguyên trong bundle.
 * Bản dev/Storybook giữ nguyên (apply: 'build') để dễ đọc khi debug.
 * Chỉ thu gọn an toàn: KHÔNG xóa khoảng trắng quanh ':' hay '(' vì `.a :hover` ≠ `.a:hover`.
 */
export function minifyRawCss() {
  return {
    name: 'hui-minify-raw-css',
    apply: 'build',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith('.css?raw')) return null;
      const { readFile } = await import('node:fs/promises');
      const css = (await readFile(id.slice(0, -'?raw'.length), 'utf8'))
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{};,>])\s*/g, '$1')
        .replace(/;}/g, '}')
        .trim();
      return `export default ${JSON.stringify(css)};`;
    },
  };
}
