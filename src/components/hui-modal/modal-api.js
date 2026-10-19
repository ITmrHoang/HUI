/**
 * Hộp thoại gọi bằng hàm (Ant Modal.confirm / info / success / error / warning)
 *   import { modal } from '@itmrhoang/h-ui/hui-modal';
 *   const ok = await modal.confirm({ title: 'Xóa mục này?', content: 'Không thể hoàn tác.', okType: 'danger' });
 *   modal.confirm({ title: 'Gửi?', onOk: () => api.send() });   // onOk trả Promise → nút OK loading tới khi xong
 * Mỗi lần gọi tạo một <hui-modal confirm-type="..."> gắn vào <body>, đóng xong tự gỡ.
 */

import HuiModal from './hui-modal.js';

/** Các hộp đang mở — modal.destroyAll() */
const active = new Set();

/**
 * @typedef {object} ConfirmOptions
 * @property {string} [title] - Tiêu đề
 * @property {string|Node} [content] - Nội dung (chuỗi chèn dạng text)
 * @property {string} [okText] - Chữ nút OK (mặc định locale modal.ok)
 * @property {string} [cancelText] - Chữ nút Hủy (mặc định locale modal.cancel)
 * @property {string} [okType='primary'] - Variant nút OK: primary | danger | ...
 * @property {() => any|Promise<any>} [onOk] - Trả Promise → nút OK loading tới khi resolve; reject → giữ hộp mở
 * @property {() => void} [onCancel] - Bấm Hủy / Esc / nút X / mask
 * @property {number|string} [width=416] - Chiều rộng
 * @property {boolean} [centered=false] - Căn giữa theo chiều dọc
 * @property {boolean} [maskClosable=false] - Click mask để đóng (= Hủy)
 * @property {string} [icon] - Tên icon thay icon mặc định theo loại
 */

/**
 * Mở hộp xác nhận. Promise resolve `true` khi bấm OK (sau khi onOk xong), `false` khi Hủy/Esc.
 * Promise có thêm `.close()` để đóng từ code (resolve false).
 * @param {'confirm'|'info'|'success'|'error'|'warning'} type
 * @param {ConfirmOptions} [opts]
 * @returns {Promise<boolean> & { close: () => void }}
 */
function openConfirm(type, opts = {}) {
  const el = /** @type {HuiModal} */ (document.createElement('hui-modal'));
  el.confirmType = type;
  el.title = opts.title ?? '';
  el.width = String(opts.width ?? 416);
  el.centered = Boolean(opts.centered);
  el.maskClosable = opts.maskClosable ? 'true' : 'false';
  if (opts.okText) el.okText = opts.okText;
  if (opts.cancelText) el.cancelText = opts.cancelText;
  if (opts.okType) el.okType = opts.okType;

  if (opts.content !== undefined && opts.content !== null) {
    el.append(opts.content instanceof Node ? opts.content : document.createTextNode(String(opts.content)));
  }

  let resolveResult;
  const promise = new Promise((resolve) => { resolveResult = resolve; });
  let settled = false;
  const settle = (value) => {
    if (settled) return;
    settled = true;
    resolveResult(value);
  };

  el.addEventListener('hui-ok', async (e) => {
    e.preventDefault(); // tự đóng sau khi onOk xong
    if (el.confirmLoading) return;
    try {
      const result = opts.onOk?.();
      if (result && typeof result.then === 'function') {
        el.confirmLoading = true;
        await result;
      }
    } catch (err) {
      // onOk bị reject → giữ hộp mở để người dùng thử lại
      el.confirmLoading = false;
      console.error(err);
      return;
    }
    el.confirmLoading = false;
    settle(true);
    el.close();
  });

  el.addEventListener('hui-cancel', (e) => {
    // Đang chờ onOk → không cho đóng ngang
    if (el.confirmLoading) {
      e.preventDefault();
      return;
    }
    opts.onCancel?.();
    settle(false);
  });

  el.addEventListener('hui-close', () => settle(false));
  el.addEventListener('hui-after-close', () => {
    active.delete(el);
    el.remove();
  });

  active.add(el);
  document.body.appendChild(el);
  el.open();

  promise.close = () => el.close();
  return promise;
}

/** Hộp thoại gọi bằng hàm — mỗi hàm trả Promise<boolean> (true = OK) */
export const modal = {
  /** Xác nhận: nút OK + Hủy, icon cảnh báo */
  confirm: (opts) => openConfirm('confirm', opts),
  /** Thông tin: chỉ nút OK */
  info: (opts) => openConfirm('info', opts),
  success: (opts) => openConfirm('success', opts),
  error: (opts) => openConfirm('error', opts),
  warning: (opts) => openConfirm('warning', opts),
  /** Đóng mọi hộp đang mở bằng hàm (resolve false) */
  destroyAll() {
    active.forEach((el) => el.close());
  },
};

export default modal;
