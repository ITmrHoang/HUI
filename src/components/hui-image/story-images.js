/**
 * Ảnh minh họa cho stories — SVG tự sinh dạng data-URI (không dùng tài nguyên mạng).
 * Chỉ dùng trong *.stories.js, không export qua index.js.
 */

/**
 * @param {{w?: number, h?: number, hue?: number, label?: string}} [opts]
 * @returns {string} data:image/svg+xml…
 */
export function svgImage({ w = 800, h = 500, hue = 210, label = '' } = {}) {
  const m = Math.min(w, h);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 62%)"/>`
    + `<stop offset="1" stop-color="hsl(${(hue + 50) % 360} 65% 32%)"/></linearGradient></defs>`
    + '<rect width="100%" height="100%" fill="url(#g)"/>'
    + `<circle cx="${w * 0.74}" cy="${h * 0.3}" r="${m * 0.11}" fill="hsl(${hue} 95% 88%)" opacity=".85"/>`
    + `<path d="M0 ${h} L${w * 0.28} ${h * 0.52} L${w * 0.46} ${h * 0.74} L${w * 0.68} ${h * 0.42} L${w} ${h} Z" fill="hsl(${hue} 45% 18%)" opacity=".55"/>`
    + (label ? `<text x="50%" y="${h * 0.9}" font-family="system-ui, sans-serif" font-weight="600" font-size="${Math.round(m / 9)}" fill="#fff" text-anchor="middle">${label}</text>` : '')
    + '</svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** n ảnh khác màu: [{ src, thumb, alt, caption, w, h }] */
export function svgSet(n = 6, { w = 1200, h = 800, varied = false, prefix = 'Ảnh' } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const hh = varied ? [h, Math.round(h * 1.4), Math.round(h * 0.7), Math.round(h * 1.15)][i % 4] : h;
    const hue = (i * 47 + 190) % 360;
    const label = `${prefix} ${i + 1}`;
    return {
      src: svgImage({ w, h: hh, hue, label }),
      thumb: svgImage({ w: 320, h: Math.round((320 * hh) / w), hue, label }),
      alt: `${label} — phong cảnh minh họa`,
      caption: `${label}: chú thích mô tả ảnh số ${i + 1}`,
      w,
      h: hh,
    };
  });
}
