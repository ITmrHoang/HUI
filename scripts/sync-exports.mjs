/**
 * Đồng bộ trường "exports" trong package.json theo thư mục src/components/*.
 * Chạy tự động trước mỗi lần build (npm run build → prebuild).
 *
 * Vite chỉ build định dạng ES nên mỗi entry chỉ có "import"/"default" (không có "require").
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const entry = (name) => ({
  types: `./dist/types/${name}.d.ts`,
  import: `./dist/${name}.esm.js`,
  default: `./dist/${name}.esm.js`,
});

const components = readdirSync(resolve(root, 'src/components'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(resolve(root, 'src/components', d.name, 'index.js')))
  .map((d) => d.name)
  .filter((name) => name !== 'hui-demo') // Component tài liệu, không phát hành lẻ
  .sort();

const exportsField = {
  '.': entry('index'),
  './core': entry('core'),
};
for (const name of components) exportsField[`./${name}`] = entry(name);
exportsField['./style.css'] = './dist/style.css';
// Kiểu cho framework (chỉ có types): tsconfig → compilerOptions.types: ['hui-lib/types/vue']
exportsField['./types/vue'] = { types: './dist/types/vue.d.ts' };
exportsField['./types/react'] = { types: './dist/types/react.d.ts' };
exportsField['./custom-elements.json'] = './dist/custom-elements.json';
exportsField['./package.json'] = './package.json';

pkg.main = './dist/index.esm.js';
pkg.module = './dist/index.esm.js';
pkg.types = './dist/types/index.d.ts';
pkg.exports = exportsField;
// Mỗi file component tự đăng ký thẻ khi được import → là "side effect".
// Khai báo để bundler KHÔNG xóa các dòng `import 'hui-lib/hui-button'`.
pkg.sideEffects = ['**/*.css', './dist/index.esm.js', './dist/hui-*.esm.js'];
pkg.customElements = './dist/custom-elements.json';

writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.info(`✔ exports: ${components.length} component + core + index`);
