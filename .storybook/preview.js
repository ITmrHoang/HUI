/**
 * Decorator đổi theme cho toàn bộ story:
 * - auto: theo prefers-color-scheme của hệ điều hành (không đặt data-theme)
 * - light / dark: ép theme bằng <html data-theme="...">
 * Nền trang dùng var(--hui-bg) để thấy đúng màu component trên nền tối.
 */
const withTheme = (story, context) => {
  const theme = context.globals.theme;
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  document.body.style.background = 'var(--hui-bg)';
  document.body.style.color = 'var(--hui-text)';
  return story();
};

/** @type { import('@storybook/web-components-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo"
    }
  },

  globalTypes: {
    theme: {
      description: 'Theme của HUI (data-theme trên <html>)',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'auto', title: 'Auto (theo hệ điều hành)' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    theme: 'auto',
  },

  decorators: [withTheme],
};

export default preview;
