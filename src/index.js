/**
 * GOM TOÀN BỘ COMPONENT CHÍNH CỦA THƯ VIỆN HUI (HUI-Lib)
 * File này dùng làm cổng chính (Entry point) để Vite build ra cục bundle bự.
 */

// Import 1: Nhúng Design Tokens và CSS Reset (Global Variables)
import './styles/tokens.css';
import './styles/reset.css';

// Import 2: Xuất xưởng toàn bộ Component trong hệ sinh thái
export { default as HuiButton } from './components/hui-button/index.js';
export { default as HuiInput } from './components/hui-input/index.js';
export { default as HuiModal } from './components/hui-modal/index.js';

// Các Component tiếp theo sẽ được Export tại đây khi code xong:
export { default as HuiDemo } from './components/hui-demo/index.js';
// export { default as HuiCard } from './components/hui-card/index.js';
// export { default as HuiBadge } from './components/hui-badge/index.js';
// export { default as HuiAlert } from './components/hui-alert/index.js';
// export { default as HuiTooltip } from './components/hui-tooltip/index.js';
// export { default as HuiSpinner } from './components/hui-spinner/index.js';

console.info('🧩 HUI-Lib Loaded! Hệ thống Component Sẵn Sàng.');
