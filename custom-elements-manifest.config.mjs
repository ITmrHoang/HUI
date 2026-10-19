/**
 * Cấu hình sinh dist/custom-elements.json (chuẩn Custom Elements Manifest).
 * File manifest dùng cho: VS Code gợi ý thẻ/attribute, Storybook docs, sinh .d.ts cho Vue/React (scripts/gen-types.mjs).
 *
 * Plugin `huiPlugin` bổ sung những gì analyzer không tự hiểu từ HuiElement:
 * - Tên thẻ đăng ký qua defineElement('hui-x', Class) (analyzer chỉ biết customElements.define)
 * - Từ `static properties`: tên attribute kebab-case, giá trị mặc định, mô tả từ JSDoc của từng mục
 */

const toKebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function huiPlugin() {
  return {
    name: 'hui-element',
    analyzePhase({ ts, node, moduleDoc }) {
      // 1. defineElement('hui-button', HuiButton)
      if (ts.isCallExpression(node) && node.expression.getText() === 'defineElement') {
        const [tagArg, classArg] = node.arguments;
        if (!tagArg || !classArg || !ts.isStringLiteral(tagArg)) return;
        const className = classArg.getText();
        const decl = moduleDoc.declarations?.find((d) => d.name === className);
        if (decl) {
          decl.tagName = tagArg.text;
          decl.customElement = true;
        }
        moduleDoc.exports = moduleDoc.exports || [];
        moduleDoc.exports.push({
          kind: 'custom-element-definition',
          name: tagArg.text,
          declaration: { name: className, module: moduleDoc.path },
        });
        return;
      }

      // 2. static properties = { name: { type, default, attribute }, ... }
      if (!ts.isClassDeclaration(node) || !node.name) return;
      const decl = moduleDoc.declarations?.find((d) => d.name === node.name.text);
      if (!decl) return;

      const propsNode = node.members.find(
        (m) => ts.isPropertyDeclaration(m) && m.name?.getText() === 'properties' &&
          m.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.StaticKeyword)
      );
      if (!propsNode?.initializer || !ts.isObjectLiteralExpression(propsNode.initializer)) return;

      const source = node.getSourceFile();
      for (const prop of propsNode.initializer.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isObjectLiteralExpression(prop.initializer)) continue;
        const name = prop.name.getText().replace(/['"]/g, '');
        const opts = Object.fromEntries(
          prop.initializer.properties
            .filter(ts.isPropertyAssignment)
            .map((p) => [p.name.getText(), p.initializer.getText()])
        );

        // Mô tả: comment /** ... */ ngay phía trên mục khai báo
        const ranges = ts.getLeadingCommentRanges(source.text, prop.getFullStart()) || [];
        const description = ranges
          .map((r) => source.text.slice(r.pos, r.end))
          .filter((c) => c.startsWith('/**'))
          .map((c) => c.replace(/^\/\*\*|\*\/$/g, '').replace(/^\s*\*\s?/gm, '').trim())
          .join('\n');

        const attrName = opts.attribute === 'false' ? null : (opts.attribute?.replace(/['"]/g, '') || toKebab(name));
        const defaultValue = opts.default ?? (opts.type === 'Boolean' ? 'false' : undefined);

        const member = decl.members?.find((m) => m.name === name && m.kind === 'field');
        if (member) {
          if (defaultValue !== undefined) member.default = defaultValue;
          if (description) member.description = description;
          if (attrName) member.attribute = attrName;
          if (opts.reflect !== 'false') member.reflects = true;
        }

        decl.attributes = (decl.attributes || []).filter((a) => a.fieldName !== name);
        if (attrName) {
          decl.attributes.push({
            name: attrName,
            fieldName: name,
            type: member?.type,
            ...(defaultValue !== undefined ? { default: defaultValue } : {}),
            ...(description ? { description } : {}),
          });
        }
      }
    },
  };
}

export default {
  globs: ['src/core/*.js', 'src/components/**/*.js'],
  exclude: ['src/**/*.stories.js', 'src/components/hui-demo/**', 'src/**/index.js'],
  outdir: 'dist',
  litelement: true,
  plugins: [huiPlugin()],
};
