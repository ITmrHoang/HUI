/**
 * QR Code encoder — tự viết theo ISO/IEC 18004, không phụ thuộc thư viện (module thuần, không đụng DOM).
 *
 *   const { size, modules } = encodeQR('Xin chào Việt Nam', { ecl: 'M' });
 *   modules[row][col] === true → ô tối
 *
 * Hỗ trợ: chế độ numeric / alphanumeric / byte (UTF-8, tự chọn theo nội dung), phiên bản 1–40 tự chọn,
 * mức sửa lỗi L | M | Q | H, Reed–Solomon trên GF(256), chia khối + xen kẽ (interleave),
 * chọn mặt nạ theo điểm phạt (4 luật), format info (BCH 15,5) và version info (BCH 18,6).
 * Không hỗ trợ: Kanji mode, ECI, Structured Append, Micro QR.
 */

/** Mức sửa lỗi → chỉ số bảng + 2 bit format (L=01, M=00, Q=11, H=10) */
const ECL = {
  L: { index: 0, bits: 1 },
  M: { index: 1, bits: 0 },
  Q: { index: 2, bits: 3 },
  H: { index: 3, bits: 2 },
};

// Bảng ISO 18004 (Table 9): số codeword ECC mỗi khối và số khối, theo [mức][phiên bản] (chỉ số 0 bỏ trống)
const ECC_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

const MODE = {
  numeric: { bits: 0b0001, count: [10, 12, 14] },
  alphanumeric: { bits: 0b0010, count: [9, 11, 13] },
  byte: { bits: 0b0100, count: [8, 16, 16] },
};
const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

// =====================================================
// GF(256) với đa thức nguyên thủy x^8 + x^4 + x^3 + x^2 + 1 (0x11D)
// =====================================================

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

/** Nhân 2 phần tử GF(256) */
export function gfMul(a, b) {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

/** α^n trong GF(256) */
export function gfPow2(n) {
  return EXP[((n % 255) + 255) % 255];
}

const divisorCache = new Map();

/** Đa thức sinh g(x) = Π (x − α^i), i = 0..degree−1 — trả hệ số (bỏ hệ số bậc cao nhất = 1) */
function rsDivisor(degree) {
  let poly = divisorCache.get(degree);
  if (poly) return poly;
  poly = new Uint8Array(degree);
  poly[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      poly[j] = gfMul(poly[j], root);
      if (j + 1 < degree) poly[j] ^= poly[j + 1];
    }
    root = gfMul(root, 2);
  }
  divisorCache.set(degree, poly);
  return poly;
}

/** Codeword sửa lỗi Reed–Solomon: phần dư của data(x)·x^degree chia g(x) */
export function reedSolomon(data, degree) {
  const div = rsDivisor(degree);
  const out = new Array(degree).fill(0);
  for (const b of data) {
    const factor = b ^ out.shift();
    out.push(0);
    for (let i = 0; i < degree; i++) out[i] ^= gfMul(div[i], factor);
  }
  return out;
}

// =====================================================
// BẢNG DUNG LƯỢNG
// =====================================================

/** Số module dành cho dữ liệu + ECC (trừ mọi vùng chức năng), gồm cả bit dư */
function rawDataModules(ver) {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const align = Math.floor(ver / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

/** Tổng số codeword (data + ECC) của một phiên bản */
export function getTotalCodewords(ver) {
  return Math.floor(rawDataModules(ver) / 8);
}

/** Số codeword dữ liệu (không tính ECC) của phiên bản + mức sửa lỗi */
export function getDataCodewords(ver, ecl = 'M') {
  const e = ECL[ecl].index;
  return getTotalCodewords(ver) - ECC_PER_BLOCK[e][ver] * NUM_BLOCKS[e][ver];
}

/** Cấu trúc khối: { blocks, eccPerBlock } */
export function getBlockInfo(ver, ecl = 'M') {
  const e = ECL[ecl].index;
  return { blocks: NUM_BLOCKS[e][ver], eccPerBlock: ECC_PER_BLOCK[e][ver] };
}

/** Toạ độ tâm các mẫu căn chỉnh (alignment) theo một trục */
export function getAlignmentPositions(ver) {
  if (ver === 1) return [];
  const size = ver * 4 + 17;
  const count = Math.floor(ver / 7) + 2;
  const step = Math.floor((ver * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < count; pos -= step) out.splice(1, 0, pos);
  return out;
}

// =====================================================
// MÃ HÓA DỮ LIỆU
// =====================================================

/** Bộ ghi bit: push(value, length) — bit cao trước */
class BitBuffer {
  constructor() {
    this.bits = [];
  }

  push(value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
}

const countIndex = (ver) => (ver <= 9 ? 0 : ver <= 26 ? 1 : 2);

/** Chọn chế độ gọn nhất cho toàn bộ chuỗi (một segment) */
export function detectMode(text) {
  if (/^[0-9]*$/.test(text)) return 'numeric';
  if ([...text].every((c) => ALNUM.includes(c))) return 'alphanumeric';
  return 'byte';
}

/** Dữ liệu của segment: { mode, count (số ký tự / byte), write(buf) } */
function makeSegment(text, mode) {
  if (mode === 'numeric') {
    return {
      mode,
      count: text.length,
      bitLength: Math.floor(text.length / 3) * 10 + [0, 4, 7][text.length % 3],
      write(buf) {
        for (let i = 0; i < text.length; i += 3) {
          const chunk = text.slice(i, i + 3);
          buf.push(Number(chunk), chunk.length * 3 + 1);
        }
      },
    };
  }
  if (mode === 'alphanumeric') {
    return {
      mode,
      count: text.length,
      bitLength: Math.floor(text.length / 2) * 11 + (text.length % 2) * 6,
      write(buf) {
        let i = 0;
        for (; i + 1 < text.length; i += 2) buf.push(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
        if (i < text.length) buf.push(ALNUM.indexOf(text[i]), 6);
      },
    };
  }
  const bytes = new TextEncoder().encode(text); // UTF-8: tiếng Việt có dấu nhiều byte / ký tự
  return {
    mode: 'byte',
    count: bytes.length,
    bitLength: bytes.length * 8,
    write(buf) {
      for (const b of bytes) buf.push(b, 8);
    },
  };
}

/**
 * Mã hóa chuỗi thành các codeword dữ liệu (chưa có ECC), tự chọn phiên bản nhỏ nhất vừa đủ.
 * @returns {{ version:number, mode:string, codewords:number[] }}
 */
export function encodeData(text, { ecl = 'M', minVersion = 1, maxVersion = 40, mode = 'auto' } = {}) {
  if (!ECL[ecl]) throw new RangeError(`Mức sửa lỗi không hợp lệ: ${ecl}`);
  const str = String(text ?? '');
  const chosen = mode === 'auto' || !MODE[mode] ? detectMode(str) : mode;
  if (chosen === 'numeric' && !/^[0-9]*$/.test(str)) throw new RangeError('Chuỗi không phải toàn chữ số');
  if (chosen === 'alphanumeric' && ![...str].every((c) => ALNUM.includes(c))) throw new RangeError('Chuỗi có ký tự ngoài bảng alphanumeric');
  const seg = makeSegment(str, chosen);
  const lo = Math.min(Math.max(1, Math.floor(minVersion) || 1), 40);
  const hi = Math.min(Math.max(lo, Math.floor(maxVersion) || 40), 40);

  let version = 0;
  for (let v = lo; v <= hi; v++) {
    const ccBits = MODE[chosen].count[countIndex(v)];
    if (seg.count < 2 ** ccBits && 4 + ccBits + seg.bitLength <= getDataCodewords(v, ecl) * 8) {
      version = v;
      break;
    }
  }
  if (!version) throw new RangeError('Dữ liệu quá dài cho QR Code (vượt dung lượng phiên bản 40)');

  const capacity = getDataCodewords(version, ecl) * 8;
  const buf = new BitBuffer();
  buf.push(MODE[chosen].bits, 4);
  buf.push(seg.count, MODE[chosen].count[countIndex(version)]);
  seg.write(buf);
  // Terminator tối đa 4 bit 0 → làm tròn byte → byte đệm 0xEC / 0x11 xen kẽ
  buf.push(0, Math.min(4, capacity - buf.bits.length));
  buf.push(0, (8 - (buf.bits.length % 8)) % 8);
  for (let pad = 0xec; buf.bits.length < capacity; pad ^= 0xec ^ 0x11) buf.push(pad, 8);

  const codewords = [];
  for (let i = 0; i < buf.bits.length; i += 8) {
    codewords.push(buf.bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0));
  }
  return { version, mode: chosen, codewords };
}

/**
 * Chia khối, tính ECC từng khối rồi xen kẽ: data khối 1,2,… theo cột, sau đó ECC theo cột.
 * Khối ngắn đứng trước, khối dài (thêm 1 codeword dữ liệu) đứng sau.
 */
export function addEccAndInterleave(data, ver, ecl) {
  const { blocks: numBlocks, eccPerBlock } = getBlockInfo(ver, ecl);
  const total = getTotalCodewords(ver);
  const numShort = numBlocks - (total % numBlocks);
  const shortLen = Math.floor(total / numBlocks) - eccPerBlock; // số codeword dữ liệu của khối ngắn

  const dataBlocks = [];
  const eccBlocks = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const len = shortLen + (i < numShort ? 0 : 1);
    const block = data.slice(k, k + len);
    k += len;
    dataBlocks.push(block);
    eccBlocks.push(reedSolomon(block, eccPerBlock));
  }

  const out = [];
  for (let i = 0; i <= shortLen; i++) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (const block of eccBlocks) out.push(block[i]);
  }
  return out;
}

// =====================================================
// FORMAT / VERSION INFO (mã BCH)
// =====================================================

/** 15 bit format: 2 bit mức sửa lỗi + 3 bit mặt nạ + 10 bit BCH, XOR 0x5412 */
export function getFormatBits(ecl, mask) {
  const data = (ECL[ecl].bits << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** 18 bit version info (phiên bản ≥ 7): 6 bit phiên bản + 12 bit BCH */
export function getVersionBits(ver) {
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (ver << 12) | rem;
}

// =====================================================
// DỰNG MA TRẬN
// =====================================================

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** Ma trận rỗng + đánh dấu các vùng chức năng (finder, timing, alignment, format, version) */
function buildFunctionPatterns(ver) {
  const size = ver * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (r, c, dark) => {
    modules[r][c] = dark;
    fn[r][c] = true;
  };

  // Timing: hàng 6 và cột 6 xen kẽ tối / sáng
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // Finder 7×7 + dải phân cách sáng ở 3 góc
  for (const [cr, cc] of [[3, 3], [3, size - 4], [size - 4, 3]]) {
    for (let dr = -4; dr <= 4; dr++) {
      for (let dc = -4; dc <= 4; dc++) {
        const r = cr + dr;
        const c = cc + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const dist = Math.max(Math.abs(dr), Math.abs(dc));
        set(r, c, dist !== 2 && dist !== 4);
      }
    }
  }

  // Alignment 5×5 (bỏ 3 vị trí trùng finder)
  const pos = getAlignmentPositions(ver);
  const last = pos.length - 1;
  pos.forEach((r, i) => {
    pos.forEach((c, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
      }
    });
  });

  // Giữ chỗ format (ghi thật sau khi chọn mặt nạ) + version info
  drawFormat(modules, fn, 'M', 0);
  if (ver >= 7) {
    const bits = getVersionBits(ver);
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(b, a, dark); // khối trên-phải
      set(a, b, dark); // khối dưới-trái
    }
  }
  return { size, modules, fn };
}

/** Ghi 15 bit format vào 2 bản sao + ô tối cố định (dark module) */
function drawFormat(modules, fn, ecl, mask) {
  const size = modules.length;
  const bits = getFormatBits(ecl, mask);
  const bit = (i) => ((bits >>> i) & 1) === 1;
  const set = (r, c, dark) => {
    modules[r][c] = dark;
    fn[r][c] = true;
  };
  // Bản 1: quanh finder trên-trái
  for (let i = 0; i <= 5; i++) set(i, 8, bit(i));
  set(7, 8, bit(6));
  set(8, 8, bit(7));
  set(8, 7, bit(8));
  for (let i = 9; i < 15; i++) set(8, 14 - i, bit(i));
  // Bản 2: tách ở finder trên-phải và dưới-trái
  for (let i = 0; i < 8; i++) set(8, size - 1 - i, bit(i));
  for (let i = 8; i < 15; i++) set(size - 15 + i, 8, bit(i));
  set(size - 8, 8, true);
}

/** Đặt bit dữ liệu theo đường zigzag 2 cột từ góc dưới-phải, bỏ cột timing 6 */
function drawCodewords(modules, fn, codewords) {
  const size = modules.length;
  const totalBits = codewords.length * 8;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let v = 0; v < size; v++) {
      const r = upward ? size - 1 - v : v;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (fn[r][c]) continue;
        if (i < totalBits) {
          modules[r][c] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          i++;
        }
        // Bit dư (remainder) giữ sáng (0)
      }
    }
  }
}

function applyMask(modules, fn, mask) {
  const f = MASKS[mask];
  for (let r = 0; r < modules.length; r++) {
    for (let c = 0; c < modules.length; c++) {
      if (!fn[r][c] && f(r, c)) modules[r][c] = !modules[r][c];
    }
  }
}

/** Điểm phạt cho một dòng (hàng hoặc cột): luật 1 (chuỗi cùng màu ≥ 5) + luật 3 (mẫu giống finder) */
function linePenalty(line) {
  let score = 0;
  let run = 1;
  for (let i = 1; i <= line.length; i++) {
    if (i < line.length && line[i] === line[i - 1]) run++;
    else {
      if (run >= 5) score += PENALTY_N1 + (run - 5);
      run = 1;
    }
  }
  // 1:1:3:1:1 (tối-sáng-tối×3-sáng-tối) kèm 4 ô sáng ở một phía; ngoài biên coi là sáng (vùng lặng)
  const n = line.length;
  const at = (i) => (i >= 0 && i < n ? line[i] : false);
  for (let i = -4; i < n; i++) {
    if (at(i) && !at(i + 1) && at(i + 2) && at(i + 3) && at(i + 4) && !at(i + 5) && at(i + 6)) {
      const before = !at(i - 1) && !at(i - 2) && !at(i - 3) && !at(i - 4);
      const after = !at(i + 7) && !at(i + 8) && !at(i + 9) && !at(i + 10);
      if (before) score += PENALTY_N3;
      if (after) score += PENALTY_N3;
    }
  }
  return score;
}

/** Tổng điểm phạt của ma trận (thấp hơn = dễ quét hơn) */
export function penaltyScore(modules) {
  const size = modules.length;
  let score = 0;
  let dark = 0;
  for (let r = 0; r < size; r++) {
    score += linePenalty(modules[r]);
    score += linePenalty(modules.map((row) => row[r]));
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) dark++;
      if (r < size - 1 && c < size - 1) {
        const v = modules[r][c];
        if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) score += PENALTY_N2;
      }
    }
  }
  // Luật 4: tỉ lệ ô tối lệch khỏi 50% mỗi 5% → +10
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  score += Math.max(0, k) * PENALTY_N4;
  return score;
}

/**
 * Mã hóa văn bản thành QR Code.
 * @param {string} text
 * @param {object} [opts]
 * @param {'L'|'M'|'Q'|'H'} [opts.ecl='M']   mức sửa lỗi (~7% | 15% | 25% | 30%)
 * @param {number} [opts.minVersion=1]        phiên bản nhỏ nhất (1–40)
 * @param {number} [opts.maxVersion=40]
 * @param {number} [opts.mask=-1]             0–7 ép mặt nạ; −1 = tự chọn theo điểm phạt
 * @param {'auto'|'byte'|'alphanumeric'|'numeric'} [opts.mode='auto']
 * @returns {{ size:number, version:number, ecl:string, mask:number, mode:string, modules:boolean[][] }}
 */
export function encodeQR(text, { ecl = 'M', minVersion = 1, maxVersion = 40, mask = -1, mode = 'auto' } = {}) {
  const level = String(ecl).toUpperCase();
  const { version, mode: usedMode, codewords } = encodeData(text, { ecl: level, minVersion, maxVersion, mode });
  const all = addEccAndInterleave(codewords, version, level);
  const { size, modules, fn } = buildFunctionPatterns(version);
  drawCodewords(modules, fn, all);

  let best = Number.isInteger(mask) && mask >= 0 && mask <= 7 ? mask : -1;
  if (best < 0) {
    let min = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(modules, fn, m);
      drawFormat(modules, fn, level, m);
      const p = penaltyScore(modules);
      if (p < min) {
        min = p;
        best = m;
      }
      applyMask(modules, fn, m); // XOR lần 2 = gỡ mặt nạ
    }
  }
  applyMask(modules, fn, best);
  drawFormat(modules, fn, level, best);
  return { size, version, ecl: level, mask: best, mode: usedMode, modules };
}

export default encodeQR;
