/**
 * GOM TOÀN BỘ COMPONENT CHÍNH CỦA THƯ VIỆN HUI (HUI-Lib)
 * File này dùng làm cổng chính (Entry point) để Vite build ra cục bundle bự.
 */

// Import 1: Nhúng CSS Reset
// Design Tokens KHÔNG import ở đây nữa: mỗi component tự gọi ensureTokens() (src/utils/dom.js)
// để gắn tokens 1 lần vào <head> — tránh trùng 2 bản khi dùng bundle tổng.
import './styles/reset.css';

// Import 2: Xuất xưởng toàn bộ Component trong hệ sinh thái
export { default as HuiButton } from './components/hui-button/index.js';
export { default as HuiInput } from './components/hui-input/index.js';
export { default as HuiModal } from './components/hui-modal/index.js';
export { default as HuiSelect } from './components/hui-select/index.js';
export { default as HuiCheckbox } from './components/hui-checkbox/index.js';
export { default as HuiCard } from './components/hui-card/index.js';
export { default as HuiBadge } from './components/hui-badge/index.js';
export { default as HuiAlert } from './components/hui-alert/index.js';
export { default as HuiTooltip } from './components/hui-tooltip/index.js';
export { default as HuiSpinner } from './components/hui-spinner/index.js';

// Nhóm component cơ bản bổ sung (API tham khảo Ant Design + MUI)
export { default as HuiSwitch } from './components/hui-switch/index.js';
export { default as HuiTag } from './components/hui-tag/index.js';
export { default as HuiDivider } from './components/hui-divider/index.js';
export { default as HuiAvatar, HuiAvatarGroup } from './components/hui-avatar/index.js';

export { default as HuiDemo } from './components/hui-demo/index.js';

console.info('🧩 HUI-Lib Loaded! Hệ thống Component Sẵn Sàng.');
