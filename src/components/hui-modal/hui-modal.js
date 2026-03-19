/**
 * HUI Modal — Hộp thoại popup
 * Hỗ trợ: kích thước (sm/md/lg/full), đóng mở, overlay click, ESC key
 */

import { createElement, createStyle, injectTokens } from '../../utils/dom.js';
import { emitEvent } from '../../utils/events.js';

const STYLES = `
  :host {
    font-family: var(--hui-font-family);
  }

  .hui-modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--hui-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--hui-z-modal);
    opacity: 0;
    visibility: hidden;
    transition: all var(--hui-transition-slow);
    padding: var(--hui-space-lg);
  }

  .hui-modal-overlay--open {
    opacity: 1;
    visibility: visible;
  }

  .hui-modal {
    background: var(--hui-surface);
    border-radius: var(--hui-radius-xl);
    box-shadow: var(--hui-shadow-xl);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    transform: scale(0.95) translateY(10px);
    transition: transform var(--hui-transition-slow);
    overflow: hidden;
  }

  .hui-modal-overlay--open .hui-modal {
    transform: scale(1) translateY(0);
  }

  /* === Sizes === */
  .hui-modal--sm { width: 400px; max-width: 100%; }
  .hui-modal--md { width: 560px; max-width: 100%; }
  .hui-modal--lg { width: 800px; max-width: 100%; }
  .hui-modal--full { width: 95vw; height: 90vh; }

  .hui-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--hui-space-lg) var(--hui-space-xl);
    border-bottom: 1px solid var(--hui-border);
  }

  .hui-modal__title {
    font-size: var(--hui-font-lg);
    font-weight: var(--hui-font-weight-semibold, 600);
    color: var(--hui-text);
    margin: 0;
  }

  .hui-modal__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: var(--hui-radius);
    background: transparent;
    border: none;
    color: var(--hui-text-muted);
    cursor: pointer;
    font-size: var(--hui-font-lg);
    transition: all var(--hui-transition-fast);
  }

  .hui-modal__close:hover {
    background: var(--hui-bg-tertiary);
    color: var(--hui-text);
  }

  .hui-modal__body {
    padding: var(--hui-space-xl);
    overflow-y: auto;
    flex: 1;
    color: var(--hui-text-secondary);
    line-height: var(--hui-line-height, 1.6);
  }

  .hui-modal__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--hui-space-sm);
    padding: var(--hui-space-lg) var(--hui-space-xl);
    border-top: 1px solid var(--hui-border);
  }
`;

class HuiModal extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'title', 'size', 'closable', 'close-on-overlay'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._overlay = null;
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  connectedCallback() {
    injectTokens(this.shadowRoot);
    this.shadowRoot.appendChild(createStyle(STYLES));
    this._render();
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._handleKeyDown);
  }

  attributeChangedCallback(name) {
    if (this._overlay) {
      if (name === 'open') {
        this._toggleOpen();
      } else {
        this._render();
      }
    }
  }

  /** Mở modal */
  open() {
    this.setAttribute('open', '');
  }

  /** Đóng modal */
  close() {
    this.removeAttribute('open');
  }

  /** Xử lý phím ESC */
  _handleKeyDown(e) {
    if (e.key === 'Escape' && this.hasAttribute('open')) {
      const closable = this.getAttribute('closable') !== 'false';
      if (closable) this.close();
    }
  }

  /** Toggle hiển thị overlay */
  _toggleOpen() {
    const isOpen = this.hasAttribute('open');
    if (this._overlay) {
      this._overlay.classList.toggle('hui-modal-overlay--open', isOpen);
    }

    if (isOpen) {
      document.addEventListener('keydown', this._handleKeyDown);
      document.body.style.overflow = 'hidden';
      emitEvent(this, 'hui-open');
    } else {
      document.removeEventListener('keydown', this._handleKeyDown);
      document.body.style.overflow = '';
      emitEvent(this, 'hui-close');
    }
  }

  _render() {
    if (this._overlay) this._overlay.remove();

    const title = this.getAttribute('title') || '';
    const size = this.getAttribute('size') || 'md';
    const closable = this.getAttribute('closable') !== 'false';
    const closeOnOverlay = this.getAttribute('close-on-overlay') !== 'false';
    const isOpen = this.hasAttribute('open');

    // Nút đóng
    const closeBtn = closable
      ? createElement('button', {
          className: 'hui-modal__close',
          'aria-label': 'Close',
          onClick: () => this.close(),
        }, '✕')
      : null;

    // Header
    const header = createElement('div', { className: 'hui-modal__header' },
      createElement('h2', { className: 'hui-modal__title' }, title),
      ...[closeBtn].filter(Boolean)
    );

    // Body — slot mặc định
    const body = createElement('div', { className: 'hui-modal__body' },
      createElement('slot'));

    // Footer — slot tên "footer"
    const footer = createElement('div', { className: 'hui-modal__footer' },
      createElement('slot', { name: 'footer' }));

    // Modal container
    const modal = createElement('div', { className: `hui-modal hui-modal--${size}` },
      header, body, footer);

    // Ngăn click bên trong modal lan ra overlay
    modal.addEventListener('click', (e) => e.stopPropagation());

    // Overlay
    this._overlay = createElement('div', {
      className: `hui-modal-overlay${isOpen ? ' hui-modal-overlay--open' : ''}`,
      onClick: () => {
        if (closeOnOverlay && closable) this.close();
      },
    }, modal);

    this.shadowRoot.appendChild(this._overlay);

    // Quản lý body scroll
    if (isOpen) {
      document.addEventListener('keydown', this._handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
  }
}

if (!customElements.get('hui-modal')) {
  customElements.define('hui-modal', HuiModal);
}

export default HuiModal;
