import { describe, it, expect } from 'vitest';
import {
  encodeQR, encodeData, reedSolomon, getFormatBits, getVersionBits, getAlignmentPositions,
  getDataCodewords, getTotalCodewords, getBlockInfo, detectMode,
} from '../src/components/hui-qrcode/qr-encoder.js';

// =====================================================
// BỘ GIẢI MÃ ĐỘC LẬP (chỉ dùng cho test) — đọc ngược ma trận theo đặc tả ISO 18004
// =====================================================

const ECL_FROM_BITS = { 1: 'L', 0: 'M', 3: 'Q', 2: 'H' };
const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

/** GF(256) riêng của test (không dùng lại bảng của encoder) */
const gf = (() => {
  const exp = [];
  const log = [];
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
    x &= 0xff;
  }
  return {
    mul: (a, b) => (a && b ? exp[(log[a] + log[b]) % 255] : 0),
    pow: (n) => exp[n % 255],
  };
})();

/** Chia đa thức nhị phân để kiểm tra mã BCH: phần dư của value chia gen */
function bchRemainder(value, gen) {
  const genLen = gen.toString(2).length;
  let v = value;
  for (let bit = v.toString(2).length; bit >= genLen; bit--) {
    if ((v >>> (bit - 1)) & 1) v ^= gen << (bit - genLen);
  }
  return v;
}

function readFormat(m) {
  const size = m.length;
  const b = (r, c) => (m[r][c] ? 1 : 0);
  let a = 0;
  let z = 0;
  const first = [];
  for (let i = 0; i <= 5; i++) first[i] = b(i, 8);
  first[6] = b(7, 8);
  first[7] = b(8, 8);
  first[8] = b(8, 7);
  for (let i = 9; i < 15; i++) first[i] = b(8, 14 - i);
  const second = [];
  for (let i = 0; i < 8; i++) second[i] = b(8, size - 1 - i);
  for (let i = 8; i < 15; i++) second[i] = b(size - 15 + i, 8);
  first.forEach((bit, i) => { a |= bit << i; });
  second.forEach((bit, i) => { z |= bit << i; });
  return { first: a, second: z };
}

/** Vùng chức năng — dựng lại độc lập theo đặc tả */
function functionMap(ver) {
  const size = ver * 4 + 17;
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const mark = (r0, c0, h, w) => {
    for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) if (r >= 0 && c >= 0 && r < size && c < size) fn[r][c] = true;
  };
  mark(0, 0, 9, 9); // finder + separator + format trên-trái
  mark(0, size - 8, 9, 8);
  mark(size - 8, 0, 8, 9);
  mark(6, 0, 1, size);
  mark(0, 6, size, 1);
  const pos = getAlignmentPositions(ver);
  for (const r of pos) {
    for (const c of pos) {
      const overlapsFinder = (r < 9 && c < 9) || (r < 9 && c > size - 9) || (r > size - 9 && c < 9);
      if (!overlapsFinder) mark(r - 2, c - 2, 5, 5);
    }
  }
  if (ver >= 7) {
    mark(0, size - 11, 6, 3);
    mark(size - 11, 0, 3, 6);
  }
  return fn;
}

const MASK_FN = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** Giải mã ma trận → { text, ecl, mask, version, blocksValid } */
function decode(matrix) {
  const size = matrix.length;
  const ver = (size - 17) / 4;
  const { first, second } = readFormat(matrix);
  const raw = first ^ 0x5412;
  if (bchRemainder(raw, 0b10100110111) !== 0) throw new Error('Format BCH sai');
  if (first !== second) throw new Error('Hai bản format không khớp');
  const ecl = ECL_FROM_BITS[raw >>> 13];
  const mask = (raw >>> 10) & 7;

  if (ver >= 7) {
    let v1 = 0;
    let v2 = 0;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      v1 |= (matrix[b][a] ? 1 : 0) << i;
      v2 |= (matrix[a][b] ? 1 : 0) << i;
    }
    if (v1 !== v2 || v1 >>> 12 !== ver || bchRemainder(v1, 0b1111100100101) !== 0) throw new Error('Version info sai');
  }

  // Đọc bit theo zigzag
  const fn = functionMap(ver);
  const bits = [];
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;
    for (let i = 0; i < size; i++) {
      const r = upward ? size - 1 - i : i;
      for (const c of [right, right - 1]) {
        if (fn[r][c]) continue;
        bits.push(matrix[r][c] !== MASK_FN[mask](r, c) ? 1 : 0);
      }
    }
    upward = !upward;
  }
  const total = getTotalCodewords(ver);
  const codewords = [];
  for (let i = 0; i < total; i++) codewords.push(bits.slice(i * 8, i * 8 + 8).reduce((a, b) => (a << 1) | b, 0));

  // Gỡ xen kẽ
  const { blocks, eccPerBlock } = getBlockInfo(ver, ecl);
  const numShort = blocks - (total % blocks);
  const shortData = Math.floor(total / blocks) - eccPerBlock;
  const dataBlocks = Array.from({ length: blocks }, () => []);
  let k = 0;
  for (let i = 0; i <= shortData; i++) {
    for (let j = 0; j < blocks; j++) if (i < shortData || j >= numShort) dataBlocks[j].push(codewords[k++]);
  }
  const eccBlocks = Array.from({ length: blocks }, () => []);
  for (let i = 0; i < eccPerBlock; i++) for (let j = 0; j < blocks; j++) eccBlocks[j].push(codewords[k++]);

  // Syndrome = 0 ⇔ khối là codeword Reed–Solomon hợp lệ
  const blocksValid = dataBlocks.every((d, j) => {
    const poly = [...d, ...eccBlocks[j]];
    for (let s = 0; s < eccPerBlock; s++) {
      let acc = 0;
      for (const coef of poly) acc = gf.mul(acc, gf.pow(s)) ^ coef;
      if (acc !== 0) return false;
    }
    return true;
  });

  // Đọc bitstream
  const data = dataBlocks.flat();
  const stream = data.flatMap((byte) => [7, 6, 5, 4, 3, 2, 1, 0].map((i) => (byte >>> i) & 1));
  let p = 0;
  const read = (n) => {
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | stream[p++];
    return v;
  };
  const ci = ver <= 9 ? 0 : ver <= 26 ? 1 : 2;
  const modeBits = read(4);
  let text = '';
  if (modeBits === 0b0100) {
    const n = read([8, 16, 16][ci]);
    const bytes = new Uint8Array(n);
    for (let i = 0; i < n; i++) bytes[i] = read(8);
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } else if (modeBits === 0b0010) {
    let n = read([9, 11, 13][ci]);
    for (; n >= 2; n -= 2) {
      const v = read(11);
      text += ALNUM[Math.floor(v / 45)] + ALNUM[v % 45];
    }
    if (n) text += ALNUM[read(6)];
  } else if (modeBits === 0b0001) {
    let n = read([10, 12, 14][ci]);
    for (; n >= 3; n -= 3) text += String(read(10)).padStart(3, '0');
    if (n === 2) text += String(read(7)).padStart(2, '0');
    if (n === 1) text += String(read(4));
  } else {
    throw new Error(`Mode không hỗ trợ: ${modeBits}`);
  }
  return { text, ecl, mask, version: ver, blocksValid };
}

// =====================================================
// TEST
// =====================================================

describe('qr-encoder: giá trị chuẩn từ đặc tả / tài liệu tham khảo', () => {
  it('ISO 18004 Annex I: "01234567" 1-M — codeword dữ liệu + ECC', () => {
    const { version, mode, codewords } = encodeData('01234567', { ecl: 'M' });
    expect(version).toBe(1);
    expect(mode).toBe('numeric');
    expect(codewords).toEqual([0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11]);
    expect(reedSolomon(codewords, 10)).toEqual([0xa5, 0x24, 0xd4, 0xc1, 0xed, 0x36, 0xc7, 0x87, 0x2c, 0x55]);
  });

  it('"HELLO WORLD" 1-M (thonky.com QR tutorial) — alphanumeric + ECC', () => {
    const { version, mode, codewords } = encodeData('HELLO WORLD', { ecl: 'M' });
    expect(version).toBe(1);
    expect(mode).toBe('alphanumeric');
    expect(codewords).toEqual([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]);
    expect(reedSolomon(codewords, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it('format info khớp bảng chuẩn (mặt nạ 0 của 4 mức) và là mã BCH(15,5) hợp lệ', () => {
    expect(getFormatBits('L', 0)).toBe(0b111011111000100);
    expect(getFormatBits('M', 0)).toBe(0b101010000010010);
    expect(getFormatBits('Q', 0)).toBe(0b011010101011111);
    expect(getFormatBits('H', 0)).toBe(0b001011010001001);
    for (const e of ['L', 'M', 'Q', 'H']) {
      for (let m = 0; m < 8; m++) expect(bchRemainder(getFormatBits(e, m) ^ 0x5412, 0b10100110111)).toBe(0);
    }
  });

  it('version info khớp bảng chuẩn (v7, v8, v40) và là mã BCH(18,6) hợp lệ', () => {
    expect(getVersionBits(7)).toBe(0x07c94);
    expect(getVersionBits(8)).toBe(0x085bc);
    expect(getVersionBits(40)).toBe(0x28c69);
    for (let v = 7; v <= 40; v++) expect(bchRemainder(getVersionBits(v), 0b1111100100101)).toBe(0);
  });

  it('toạ độ alignment khớp bảng Annex E', () => {
    expect(getAlignmentPositions(1)).toEqual([]);
    expect(getAlignmentPositions(2)).toEqual([6, 18]);
    expect(getAlignmentPositions(7)).toEqual([6, 22, 38]);
    expect(getAlignmentPositions(10)).toEqual([6, 28, 50]);
    expect(getAlignmentPositions(14)).toEqual([6, 26, 46, 66]);
    expect(getAlignmentPositions(22)).toEqual([6, 26, 50, 74, 98]);
    expect(getAlignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138]);
    expect(getAlignmentPositions(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
  });

  it('dung lượng codeword khớp bảng ISO (Table 7/9)', () => {
    expect([1, 2, 3, 4].map((e) => getDataCodewords(1, 'LMQH'[e - 1]))).toEqual([19, 16, 13, 9]);
    expect(getTotalCodewords(1)).toBe(26);
    expect(getTotalCodewords(7)).toBe(196);
    expect(getTotalCodewords(40)).toBe(3706);
    expect(getDataCodewords(5, 'Q')).toBe(62);
    expect(getDataCodewords(10, 'M')).toBe(216);
    expect(getDataCodewords(40, 'L')).toBe(2956);
    expect(getDataCodewords(40, 'H')).toBe(1276);
  });

  it('chọn phiên bản đúng ngưỡng dung lượng byte (v1-L 17, v10-M 213, v40-L 2953)', () => {
    const cases = [[1, 'L', 17], [1, 'H', 7], [2, 'M', 26], [10, 'M', 213], [7, 'M', 122], [7, 'L', 154], [40, 'L', 2953]];
    for (const [ver, ecl, cap] of cases) {
      expect(encodeData('a'.repeat(cap), { ecl }).version).toBe(ver);
      if (ver < 40) expect(encodeData('a'.repeat(cap + 1), { ecl }).version).toBe(ver + 1);
    }
    expect(() => encodeData('a'.repeat(2954), { ecl: 'L' })).toThrow(RangeError);
    // Numeric / alphanumeric v1-L: 41 chữ số, 25 ký tự
    expect(encodeData('1'.repeat(41), { ecl: 'L' }).version).toBe(1);
    expect(encodeData('1'.repeat(42), { ecl: 'L' }).version).toBe(2);
    expect(encodeData('A'.repeat(25), { ecl: 'L' }).version).toBe(1);
  });

  it('detectMode: numeric / alphanumeric / byte', () => {
    expect(detectMode('0123')).toBe('numeric');
    expect(detectMode('HELLO WORLD')).toBe('alphanumeric');
    expect(detectMode('https://example.com')).toBe('byte');
    expect(detectMode('Việt Nam')).toBe('byte');
  });
});

describe('qr-encoder: cấu trúc ma trận', () => {
  const finderOk = (m, r0, c0) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const d = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        if (m[r0 + r][c0 + c] !== (d !== 2)) return false;
      }
    }
    return true;
  };

  it('finder, separator, timing, dark module đúng vị trí (v1 → v40)', () => {
    for (const minVersion of [1, 2, 6, 7, 15, 25, 40]) {
      const { size, version, modules: m } = encodeQR('hui', { ecl: 'M', minVersion });
      expect(version).toBe(minVersion);
      expect(size).toBe(version * 4 + 17);
      expect(finderOk(m, 0, 0)).toBe(true);
      expect(finderOk(m, 0, size - 7)).toBe(true);
      expect(finderOk(m, size - 7, 0)).toBe(true);
      for (let i = 0; i < 8; i++) {
        expect(m[7][i]).toBe(false); // separator
        expect(m[i][7]).toBe(false);
        expect(m[7][size - 1 - i]).toBe(false);
        expect(m[size - 8][i]).toBe(false);
      }
      for (let i = 8; i < size - 8; i++) {
        expect(m[6][i]).toBe(i % 2 === 0);
        expect(m[i][6]).toBe(i % 2 === 0);
      }
      expect(m[size - 8][8]).toBe(true);
    }
  });

  it('mẫu alignment 5×5 có tâm tối, vòng sáng, viền tối', () => {
    const { size, modules: m } = encodeQR('alignment', { minVersion: 7 });
    for (const r of getAlignmentPositions(7)) {
      for (const c of getAlignmentPositions(7)) {
        if ((r < 9 && c < 9) || (r < 9 && c > size - 9) || (r > size - 9 && c < 9)) continue;
        expect(m[r][c]).toBe(true);
        expect(m[r - 1][c]).toBe(false);
        expect(m[r - 2][c - 2]).toBe(true);
      }
    }
  });

  it('ép mặt nạ 0–7: format đọc lại đúng mức + mặt nạ, giải mã ra đúng chuỗi', () => {
    for (let mask = 0; mask < 8; mask++) {
      const qr = encodeQR('HELLO WORLD', { ecl: 'Q', mask });
      const d = decode(qr.modules);
      expect(d).toMatchObject({ text: 'HELLO WORLD', ecl: 'Q', mask, version: 1, blocksValid: true });
    }
  });

  it('tự chọn mặt nạ có điểm phạt thấp nhất trong 8 mặt nạ', async () => {
    const { penaltyScore } = await import('../src/components/hui-qrcode/qr-encoder.js');
    const auto = encodeQR('https://example.com', { ecl: 'M' });
    const scores = [0, 1, 2, 3, 4, 5, 6, 7].map((mask) => penaltyScore(encodeQR('https://example.com', { ecl: 'M', mask }).modules));
    expect(penaltyScore(auto.modules)).toBe(Math.min(...scores));
    expect(scores.indexOf(Math.min(...scores))).toBe(auto.mask);
  });
});

describe('qr-encoder: mã hóa ↔ giải mã (round-trip)', () => {
  const samples = [
    ['HELLO WORLD', 'M'],
    ['https://example.com', 'L'],
    ['01234567', 'M'],
    ['Xin chào Việt Nam — Tiếng Việt có dấu: ắ ằ ẳ ẵ ặ đ Đ ơ ư', 'H'],
    ['😀 emoji + 中文 + русский', 'Q'],
    ['', 'M'],
  ];

  it.each(samples)('"%s" (%s)', (text, ecl) => {
    const qr = encodeQR(text, { ecl });
    const d = decode(qr.modules);
    expect(d.text).toBe(text);
    expect(d.ecl).toBe(ecl);
    expect(d.blocksValid).toBe(true);
    expect(d.mask).toBe(qr.mask);
  });

  it('nhiều phiên bản / nhiều khối xen kẽ (v1–v40, cả 4 mức) đều giải mã đúng', () => {
    for (const ver of [3, 5, 7, 9, 10, 13, 20, 26, 27, 33, 40]) {
      for (const ecl of ['L', 'M', 'Q', 'H']) {
        const cap = Math.floor((getDataCodewords(ver, ecl) * 8 - 4 - (ver <= 9 ? 8 : 16)) / 8);
        // Nội dung đổi theo vị trí để lộ lỗi xen kẽ sai thứ tự
        const text = Array.from({ length: cap }, (_, i) => String.fromCharCode(97 + ((i * 7 + ver) % 26))).join('');
        const qr = encodeQR(text, { ecl, mode: 'byte' });
        expect(qr.version).toBe(ver);
        const d = decode(qr.modules);
        expect(d.blocksValid).toBe(true);
        expect(d.text).toBe(text);
      }
    }
  });

  it('minVersion ép phiên bản lớn hơn; mức sửa lỗi sai → RangeError', () => {
    expect(encodeQR('a', { minVersion: 12 }).version).toBe(12);
    expect(decode(encodeQR('a', { minVersion: 12 }).modules).text).toBe('a');
    expect(() => encodeQR('a', { ecl: 'X' })).toThrow(RangeError);
  });
});
