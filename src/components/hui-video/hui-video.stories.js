import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { parseVideoSource } from './index.js';
import { svgImage } from '../hui-image/story-images.js';

// ID giả (đúng định dạng) — test chỉ kiểm tra URL iframe được tạo, không chờ tải
const FAKE_YT = 'AbCdEfGhIj0';
const POSTER = svgImage({ w: 1280, h: 720, hue: 260, label: 'Ảnh bìa video' });
const POSTER_2 = svgImage({ w: 1280, h: 720, hue: 170, label: 'Vimeo' });
const POSTER_3 = svgImage({ w: 1280, h: 720, hue: 20, label: 'MP4' });
// data: URL rỗng — không gọi mạng
const FAKE_MP4 = 'data:video/mp4;base64,';

const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);

export default {
  title: 'Molecules/HuiVideo',
  component: 'hui-video',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Video** — nhúng YouTube / Vimeo / MP4 dạng **facade**: chỉ hiện ảnh bìa + nút play, bấm mới tạo iframe (\`youtube-nocookie.com\` / \`player.vimeo.com\`) hoặc \`<video>\` → trang nhẹ hơn.
Ảnh bìa YouTube tự lấy từ \`i.ytimg.com\` **khi không có \`poster\`** (tài nguyên mạng bên ngoài — các story dưới đây đều dùng poster tự sinh).

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`src\` | — | URL / ID YouTube (11 ký tự), URL / ID Vimeo, hoặc file video |
| \`provider\` | \`auto\` | \`auto\` \\| \`youtube\` \\| \`vimeo\` \\| \`file\` |
| \`poster\` | — | Ảnh bìa (slot \`poster\` để thay hẳn) |
| \`title\` | — | Tiêu đề: nhãn nút play ("Phát video: …") + \`title\` của iframe |
| \`ratio\` | \`16/9\` | Tỉ lệ khung |
| \`mode\` | \`inline\` | \`inline\` \\| \`popup\` (mở trong hộp thoại top-layer, đóng → gỡ trình phát) |
| \`autoplay-on-view\` | — | (file) tắt tiếng + lặp, phát khi cuộn tới, dừng khi ra khỏi màn hình; giảm chuyển động → không tự phát |
| \`muted\` / \`loop\` / \`start\` | — | (file) tắt tiếng / lặp; giây bắt đầu (mọi loại) |
| \`no-animation\` | — | Tắt hiệu ứng popup |

**Methods:** \`play()\`, \`stop()\`, \`openPopup()\`, \`closePopup()\` · **Chỉ đọc:** \`source\` {type, id, url}, \`embedUrl\`, \`player\`
· **Hàm:** \`parseVideoSource(src, provider)\`

**Events:** \`hui-play\` {type, id, src} · \`hui-open\` / \`hui-close\` (popup)

**Slots:** (mặc định) nội dung phủ trên ảnh bìa · \`poster\` · \`play-icon\` · **Parts:** base, poster, play, play-icon, player, dialog, mask, panel, close

**CSS:** \`--hui-video-radius\`, \`-bg\`, \`-play-size\`, \`-play-bg\`, \`-play-hover-bg\`, \`-play-color\`, \`-overlay\`, \`-popup-width\`, \`-mask-bg\`, \`-focus-color\`

**Bàn phím:** Tab tới nút play · Enter / Space phát (focus chuyển vào trình phát) · popup: Esc đóng, Tab chạy vòng trong hộp.
        `,
      },
    },
  },
};

export const YouTube = {
  render: () => html`
    <hui-video style="max-width: 640px" src="https://www.youtube.com/watch?v=${FAKE_YT}" poster=${POSTER} title="Giới thiệu sản phẩm"></hui-video>
  `,
  play: async ({ canvasElement }) => {
    const v = canvasElement.querySelector('hui-video');
    await expect(v.source).toEqual({ type: 'youtube', id: FAKE_YT, url: `https://www.youtube.com/watch?v=${FAKE_YT}` });
    await expect(part(v, 'poster').getAttribute('src')).toBe(POSTER);
    const play = part(v, 'play');
    await expect(play.textContent).toContain('Giới thiệu sản phẩm');
    let played = null;
    v.addEventListener('hui-play', (e) => { played = e.detail; });
    play.click();
    // Đọc ngay rồi gỡ iframe — không chờ trình phát tải
    const iframe = part(v, 'player');
    const src = iframe?.getAttribute('src');
    const title = iframe?.getAttribute('title');
    const allow = iframe?.getAttribute('allow');
    v.stop();
    await expect(src).toBe(`https://www.youtube-nocookie.com/embed/${FAKE_YT}?autoplay=1&rel=0&playsinline=1`);
    await expect(title).toBe('Giới thiệu sản phẩm');
    await expect(allow).toContain('autoplay');
    await expect(played.type).toBe('youtube');
    await expect(part(v, 'player')).toBe(null);
    await expect(part(v, 'play').getBoundingClientRect().width).toBeGreaterThan(0);
  },
};

export const SourceParsing = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px">
      <hui-video src="https://vimeo.com/123456789" poster=${POSTER_2} title="Video Vimeo" start="30"></hui-video>
      <hui-video src="https://youtu.be/${FAKE_YT}" poster=${POSTER} ratio="4/3" title="youtu.be + ratio 4/3"></hui-video>
      <hui-video src=${FAKE_MP4} provider="file" poster=${POSTER_3} title="File MP4"></hui-video>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [vimeo, short, file] = canvasElement.querySelectorAll('hui-video');
    await expect(vimeo.embedUrl).toBe('https://player.vimeo.com/video/123456789?autoplay=1&dnt=1#t=30s');
    await expect(short.source.id).toBe(FAKE_YT);
    await expect(getComputedStyle(part(short, 'base')).aspectRatio).toContain('4');
    // Bảng nhận diện
    await expect(parseVideoSource(FAKE_YT).type).toBe('youtube');
    await expect(parseVideoSource(`https://www.youtube.com/embed/${FAKE_YT}`).id).toBe(FAKE_YT);
    await expect(parseVideoSource(`https://www.youtube.com/shorts/${FAKE_YT}`).id).toBe(FAKE_YT);
    await expect(parseVideoSource('https://player.vimeo.com/video/987654321').id).toBe('987654321');
    await expect(parseVideoSource('/media/intro.mp4').type).toBe('file');
    await expect(parseVideoSource('').type).toBe(null);
    // File: bấm → <video controls>
    part(file, 'play').click();
    const video = part(file, 'player');
    await expect(video.localName).toBe('video');
    await expect(video.controls).toBe(true);
    file.stop();
  },
};

export const Popup = {
  render: () => html`
    <hui-video style="max-width: 420px" mode="popup" src=${FAKE_MP4} provider="file" poster=${POSTER_3} title="Video trong popup">
      <span style="position: absolute; left: 12px; bottom: 10px; font-weight: 600">Xem video giới thiệu · 2:30</span>
    </hui-video>
  `,
  play: async ({ canvasElement }) => {
    const v = canvasElement.querySelector('hui-video');
    const events = [];
    v.addEventListener('hui-open', () => events.push('open'));
    v.addEventListener('hui-close', () => events.push('close'));
    part(v, 'play').click();
    const dialog = part(v, 'dialog');
    await expect(dialog.open).toBe(true);
    await expect(part(v, 'panel').querySelector('video')).toBeTruthy();
    await expect(events).toEqual(['open']);
    await waitFor(() => expect(v.shadowRoot.activeElement).toBe(part(v, 'close')));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(dialog.open).toBe(false));
    await expect(part(v, 'panel').querySelector('video')).toBe(null);
    await expect(events).toEqual(['open', 'close']);
  },
};

export const AutoplayOnView = {
  render: () => html`
    <p style="margin: 0 0 12px">MP4 tắt tiếng, phát khi cuộn tới và dừng khi ra khỏi màn hình (ở đây là data-URL rỗng nên chỉ thấy khung đen).</p>
    <hui-video style="max-width: 480px" src=${FAKE_MP4} provider="file" autoplay-on-view title="Video nền"></hui-video>
  `,
  play: async ({ canvasElement }) => {
    const v = canvasElement.querySelector('hui-video');
    const video = part(v, 'player');
    await expect(video?.localName).toBe('video');
    await expect(video.muted).toBe(true);
    await expect(video.loop).toBe(true);
    await expect(video.controls).toBe(false);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-video.brand {
        --hui-video-radius: 24px;
        --hui-video-play-size: 84px;
        --hui-video-play-bg: var(--hui-danger);
        --hui-video-play-hover-bg: var(--hui-danger-hover);
        --hui-video-overlay: linear-gradient(135deg, color-mix(in srgb, var(--hui-primary) 45%, transparent), transparent);
      }
      hui-video.brand::part(poster) { filter: grayscale(0.4); }
      hui-video.brand::part(play-icon) { border: 3px solid var(--hui-text-light-solid); }
    </style>
    <hui-video class="brand" style="max-width: 640px" src=${FAKE_YT} poster=${POSTER} title="Video tùy biến"></hui-video>
  `,
};
