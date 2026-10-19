/**
 * GOM TOÀN BỘ COMPONENT CHÍNH CỦA THƯ VIỆN HUI (HUI-Lib)
 * File này dùng làm cổng chính (Entry point) để Vite build ra cục bundle bự.
 */

// Import 1: Nhúng CSS Reset
// Design Tokens KHÔNG import ở đây nữa: mỗi component tự gọi ensureTokens() (src/utils/dom.js)
// để gắn tokens 1 lần vào <head> — tránh trùng 2 bản khi dùng bundle tổng.
import './styles/reset.css';

// Import 2: Lớp nền để tự viết component mới theo chuẩn HUI
export * from './core/index.js';

// Import 3: Xuất xưởng toàn bộ Component trong hệ sinh thái
export { default as HuiConfigProvider } from './components/hui-config-provider/index.js';
export { default as HuiIcon, registerIcon, getIcon, getIconNames } from './components/hui-icon/index.js';
export { default as HuiButton } from './components/hui-button/index.js';
export { default as HuiTextarea } from './components/hui-textarea/index.js';
export { default as HuiInputNumber } from './components/hui-input-number/index.js';
export { default as HuiSlider } from './components/hui-slider/index.js';
export { default as HuiRadioGroup, HuiRadio } from './components/hui-radio/index.js';
export { default as HuiCheckboxGroup } from './components/hui-checkbox-group/index.js';
export { default as HuiForm, HuiFormItem } from './components/hui-form/index.js';
export { default as HuiEmpty } from './components/hui-empty/index.js';
export { default as HuiText, HuiTitle, HuiParagraph, HuiLink } from './components/hui-typography/index.js';
export { default as HuiFlex } from './components/hui-flex/index.js';
export { default as HuiSpace } from './components/hui-space/index.js';
export { default as HuiRow, HuiCol } from './components/hui-grid/index.js';
export { default as HuiContainer } from './components/hui-container/index.js';
export { default as HuiLayout, HuiHeader, HuiSider, HuiContent, HuiFooter } from './components/hui-layout/index.js';
export { default as HuiSection } from './components/hui-section/index.js';
export { default as HuiCollapse, HuiCollapsePanel } from './components/hui-collapse/index.js';
export { default as HuiList, HuiListItem, HuiListItemMeta } from './components/hui-list/index.js';
export { default as HuiDescriptions, HuiDescriptionsItem } from './components/hui-descriptions/index.js';
export { default as HuiStatistic, HuiStatisticCountdown } from './components/hui-statistic/index.js';
export { default as HuiMessageContainer, message } from './components/hui-message/index.js';
export { default as HuiNotificationContainer, notification } from './components/hui-notification/index.js';
export { default as HuiDrawer } from './components/hui-drawer/index.js';
export { default as HuiProgress } from './components/hui-progress/index.js';
export {
  default as HuiSkeleton, HuiSkeletonButton, HuiSkeletonInput, HuiSkeletonAvatar, HuiSkeletonImage,
} from './components/hui-skeleton/index.js';
export { default as HuiPopover } from './components/hui-popover/index.js';
export { default as HuiPopconfirm } from './components/hui-popconfirm/index.js';
export { default as HuiResult } from './components/hui-result/index.js';
export { default as HuiTabs, HuiTabPanel } from './components/hui-tabs/index.js';
export {
  default as HuiMenu, HuiMenuItem, HuiSubMenu, HuiMenuGroup, HuiMenuDivider,
} from './components/hui-menu/index.js';
export { default as HuiDropdown, HuiDropdownButton } from './components/hui-dropdown/index.js';
export { default as HuiBreadcrumb, HuiBreadcrumbItem } from './components/hui-breadcrumb/index.js';
export { default as HuiPagination } from './components/hui-pagination/index.js';
export { default as HuiNavbar } from './components/hui-navbar/index.js';
export { default as HuiInput } from './components/hui-input/index.js';
export { default as HuiModal, modal } from './components/hui-modal/index.js';
export { default as HuiSelect } from './components/hui-select/index.js';
export { default as HuiCheckbox } from './components/hui-checkbox/index.js';
export { default as HuiCard, HuiCardMeta } from './components/hui-card/index.js';
export { default as HuiBadge, HuiBadgeRibbon } from './components/hui-badge/index.js';
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
