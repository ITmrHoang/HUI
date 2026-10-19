/**
 * Tô màu cú pháp tối giản (không thư viện) cho hui-code-block: js / ts / html / css / json / bash.
 * Chỉ tách token (chuỗi, chú thích, từ khóa, số, thẻ/thuộc tính…) — KHÔNG phân tích cú pháp đầy đủ.
 * Kết quả là mảng { type, text }; component dựng DOM bằng textContent → không bao giờ chèn HTML của người dùng.
 */

const JS_KEYWORDS = 'abstract as async await break case catch class const continue debugger declare default delete do else enum export extends false finally for from function get if implements import in instanceof interface keyof let namespace new null of private protected public readonly return satisfies set static super switch this throw true try type typeof undefined var void while with yield';
const BASH_KEYWORDS = 'if then else elif fi for while until do done case esac in function return export local readonly source alias unset shift exit break continue';

const words = (list) => new RegExp(`\\b(?:${list.split(' ').join('|')})\\b`, 'y');

/** Bí danh ngôn ngữ → tên chuẩn */
const ALIASES = {
  javascript: 'js', mjs: 'js', cjs: 'js', jsx: 'js',
  typescript: 'ts', tsx: 'ts',
  xml: 'html', svg: 'html', vue: 'html', htm: 'html',
  scss: 'css', less: 'css',
  sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash', terminal: 'bash',
  jsonc: 'json', json5: 'json',
};

export function normalizeLanguage(lang) {
  const l = String(lang || '').trim().toLowerCase();
  return ALIASES[l] || l;
}

// Quy tắc [loại, regex sticky] — thử lần lượt tại mỗi vị trí, cái nào khớp trước thắng
const JS_RULES = [
  ['comment', /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y],
  ['string', /`(?:\\[\s\S]|[^\\`])*`?|"(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?/y],
  ['number', /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?n?|\.\d+)(?![\w$])/y],
  ['keyword', words(JS_KEYWORDS)],
  ['function', /[A-Za-z_$][\w$]*(?=\s*\()/y],
  ['class', /[A-Z][\w$]*/y],
  ['plain', /[A-Za-z_$][\w$]*/y],
  ['operator', /=>|[=+\-*/%!<>&|^~?]+/y],
  ['punctuation', /[{}()[\];,.:@#]/y],
];

const JSON_RULES = [
  ['property', /"(?:\\.|[^\\"\n])*"(?=\s*:)/y],
  ['string', /"(?:\\.|[^\\"\n])*"?/y],
  ['number', /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y],
  ['keyword', /\b(?:true|false|null)\b/y],
  ['comment', /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y],
  ['punctuation', /[{}[\],:]/y],
];

const CSS_RULES = [
  ['comment', /\/\*[\s\S]*?(?:\*\/|$)/y],
  ['string', /"(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?/y],
  ['keyword', /@[\w-]+/y],
  // Selector: đoạn không chứa { } ; đứng ngay trước "{"
  ['selector', /[^\s{};@/][^{};/]*?(?=\s*\{)/y],
  // Thuộc tính: tên + ":" mà phía sau KHÔNG mở khối (loại a:hover {)
  ['property', /-{0,2}[A-Za-z][\w-]*(?=\s*:(?![^{};]*\{))/y],
  ['number', /#[\da-fA-F]{3,8}(?![\w-])|-?(?:\d+\.?\d*|\.\d+)(?:%|[A-Za-z]+)?/y],
  ['function', /[\w-]+(?=\()/y],
  ['keyword', /!important/y],
  ['plain', /[\w-]+/y],
  ['punctuation', /[{}();:,>+~*]/y],
];

/** Tách token theo bảng quy tắc; khoảng trắng / ký tự lạ → plain */
function scan(code, rules, hook) {
  const out = [];
  let pos = 0;
  const push = (type, text) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  while (pos < code.length) {
    const ws = /\s+/y;
    ws.lastIndex = pos;
    const w = ws.exec(code);
    if (w) {
      push(hook ? hook('ws', w[0], code, pos) : 'plain', w[0]);
      pos += w[0].length;
      continue;
    }
    let matched = false;
    for (const [type, re] of rules) {
      re.lastIndex = pos;
      const m = re.exec(code);
      if (m && m[0].length) {
        const finalType = hook ? hook(type, m[0], code, pos) : type;
        push(finalType, m[0]);
        pos += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      push('plain', code[pos]);
      pos += 1;
    }
  }
  return out;
}

/** HTML: máy trạng thái nhỏ — ngoài thẻ / trong thẻ (tên thẻ, thuộc tính, giá trị) */
function scanHtml(code) {
  const out = [];
  const push = (type, text) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  const re = (src) => new RegExp(src, 'y');
  const R = {
    comment: re('<!--[\\s\\S]*?(?:-->|$)'),
    doctype: re('<![^>]*>?'),
    open: re('(</?)([A-Za-z][\\w:.-]*)'),
    entity: re('&#?\\w+;'),
    text: re('[^<&]+'),
    ws: re('\\s+'),
    attr: re('[^\\s=>/"\']+'),
    eq: re('='),
    value: re('"[^"]*"?|\'[^\']*\'?|[^\\s>"\']+'),
    end: re('/?>'),
  };
  const at = (r, pos) => {
    r.lastIndex = pos;
    return r.exec(code);
  };
  let pos = 0;
  while (pos < code.length) {
    let m;
    if ((m = at(R.comment, pos))) { push('comment', m[0]); pos += m[0].length; continue; }
    if ((m = at(R.doctype, pos))) { push('keyword', m[0]); pos += m[0].length; continue; }
    if ((m = at(R.open, pos))) {
      push('punctuation', m[1]);
      push('tag', m[2]);
      pos += m[0].length;
      // Trong thẻ: thuộc tính tới khi gặp > hoặc />
      let afterEq = false;
      while (pos < code.length) {
        if ((m = at(R.ws, pos))) { push('plain', m[0]); pos += m[0].length; continue; }
        if ((m = at(R.end, pos))) { push('punctuation', m[0]); pos += m[0].length; break; }
        if (afterEq && (m = at(R.value, pos))) { push('string', m[0]); pos += m[0].length; afterEq = false; continue; }
        if ((m = at(R.eq, pos))) { push('punctuation', m[0]); pos += 1; afterEq = true; continue; }
        if ((m = at(R.attr, pos))) { push('attr', m[0]); pos += m[0].length; continue; }
        push('plain', code[pos]);
        pos += 1;
      }
      continue;
    }
    if ((m = at(R.entity, pos))) { push('number', m[0]); pos += m[0].length; continue; }
    if ((m = at(R.text, pos))) { push('plain', m[0]); pos += m[0].length; continue; }
    push('plain', code[pos]);
    pos += 1;
  }
  return out;
}

/** Bash: chú thích #, chuỗi, biến $X, cờ --x, lệnh đầu dòng / sau | && ; */
function scanBash(code) {
  const rules = [
    ['comment', /#[^\n]*/y],
    ['string', /"(?:\\[\s\S]|[^\\"])*"?|'[^']*'?/y],
    ['variable', /\$(?:\{[^}\n]*\}?|\(|[\w@#?$!*-]+)?/y],
    ['keyword', words(BASH_KEYWORDS)],
    ['number', /\d+(?![\w-])/y],
    ['operator', /&&|\|\||[|;&<>]+/y],
    ['punctuation', /[()[\]{}]/y],
    ['word', /[^\s|&;<>"'$#()[\]{}]+/y],
  ];
  let expectCommand = true;
  return scan(code, rules, (type, text, src, pos) => {
    const prev = pos > 0 ? src[pos - 1] : '\n';
    if (type === 'ws') {
      if (text.includes('\n')) expectCommand = true;
      return 'plain';
    }
    if (type === 'comment' && !/\s/.test(prev)) return 'plain';
    // "$ npm i" — dấu nhắc lệnh đầu dòng
    if (type === 'variable' && text === '$' && prev === '\n') return 'prompt';
    if (type === 'operator' || (type === 'variable' && text === '$(')) {
      expectCommand = true;
      return type === 'variable' ? 'variable' : 'operator';
    }
    if (type === 'keyword') {
      expectCommand = true;
      return type;
    }
    if (type === 'word') {
      if (/^-{1,2}[\w-]/.test(text)) return 'attr';
      if (expectCommand) {
        expectCommand = false;
        return 'function';
      }
      return 'plain';
    }
    if (type !== 'comment') expectCommand = false;
    return type;
  });
}

/**
 * Tách code thành token theo ngôn ngữ; ngôn ngữ lạ → một token plain.
 * @returns {{type: string, text: string}[]}
 */
export function tokenize(code, language) {
  const lang = normalizeLanguage(language);
  const src = String(code ?? '');
  switch (lang) {
    case 'js':
    case 'ts': return scan(src, JS_RULES);
    case 'json': return scan(src, JSON_RULES);
    case 'css': return scan(src, CSS_RULES);
    case 'html': return scanHtml(src);
    case 'bash': return scanBash(src);
    default: return src ? [{ type: 'plain', text: src }] : [];
  }
}

/** Chia token theo dòng (token nhiều dòng như chú thích khối bị cắt ra từng dòng) */
export function splitLines(tokens) {
  const lines = [[]];
  for (const tok of tokens) {
    const parts = tok.text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type: tok.type, text: part });
    });
  }
  return lines;
}

/** "2,4-6" → Set{2,4,5,6} */
export function parseLineRanges(spec) {
  const set = new Set();
  for (const part of String(spec || '').split(/[\s,]+/)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let i = Math.min(a, b); i <= Math.max(a, b) && i - Math.min(a, b) < 10000; i++) set.add(i);
  }
  return set;
}

/** Bỏ dòng trống đầu/cuối và phần thụt lề chung (code viết lồng trong HTML) */
export function dedent(code) {
  const lines = String(code ?? '').replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n');
}
