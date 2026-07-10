// Expressive Code config: two site-wide themes switched by [data-theme]. Blocks that must stay
// dark regardless of page theme are wrapped in data-theme="dark" at the call site.
import { defineEcConfig, ExpressiveCodeTheme } from '@astrojs/starlight/expressive-code';

const telixonDark = new ExpressiveCodeTheme({
  name: 'telixon-dark',
  type: 'dark',
  colors: {
    'editor.background': '#0b0d0e',
    'editor.foreground': '#e8eaec',
  },
  tokenColors: [
    { scope: ['comment'], settings: { foreground: '#666b71' } },
    { scope: ['string', 'punctuation.definition.string'], settings: { foreground: '#1fd8a4' } },
    { scope: ['keyword.control', 'storage.type', 'storage.modifier'], settings: { foreground: '#79c0ff' } },
    { scope: ['storage.type.function.arrow'], settings: { foreground: '#e8eaec' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#d2a8ff' } },
  ],
});

const telixonLight = new ExpressiveCodeTheme({
  name: 'telixon-light',
  type: 'light',
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#17191b',
  },
  tokenColors: [
    { scope: ['comment'], settings: { foreground: '#7d838a' } },
    { scope: ['string', 'punctuation.definition.string'], settings: { foreground: '#208368' } },
    { scope: ['keyword.control', 'storage.type', 'storage.modifier'], settings: { foreground: '#0969da' } },
    { scope: ['storage.type.function.arrow'], settings: { foreground: '#17191b' } },
    { scope: ['entity.name.function', 'support.function'], settings: { foreground: '#8250df' } },
  ],
});

const dark = (theme) => theme.type === 'dark';

export default defineEcConfig({
  // Light first: the dark theme's selector block is emitted later, so a nested data-theme="dark"
  // wrapper wins the source-order tie against the page-level light attribute.
  themes: [telixonLight, telixonDark],
  themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
  useDarkModeMediaQuery: false,
  styleOverrides: {
    borderRadius: '12px',
    borderWidth: '1px',
    borderColor: ({ theme }) => (dark(theme) ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.12)'),
    codeBackground: ({ theme }) => (dark(theme) ? '#0b0d0e' : '#ffffff'),
    codeFontFamily: "'JetBrains Mono', ui-monospace, monospace",
    codeFontSize: '13px',
    codeLineHeight: '1.75',
    codePaddingBlock: '20px',
    codePaddingInline: '22px',
    uiFontFamily: "'JetBrains Mono', ui-monospace, monospace",
    frames: {
      editorBackground: ({ theme }) => (dark(theme) ? '#0b0d0e' : '#ffffff'),
      editorTabBarBackground: ({ theme }) => (dark(theme) ? '#101213' : '#f7f8f8'),
      editorTabBarBorderBottomColor: ({ theme }) => (dark(theme) ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.09)'),
      editorActiveTabBackground: 'transparent',
      editorActiveTabForeground: ({ theme }) => (dark(theme) ? '#8a9096' : '#4c5257'),
      editorActiveTabIndicatorTopColor: 'transparent',
      editorActiveTabIndicatorBottomColor: 'transparent',
      terminalBackground: ({ theme }) => (dark(theme) ? '#0b0d0e' : '#ffffff'),
      terminalTitlebarBackground: ({ theme }) => (dark(theme) ? '#101213' : '#f7f8f8'),
      frameBoxShadowCssValue: ({ theme }) =>
        dark(theme) ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.03), 0 3px 8px -5px rgba(0, 0, 0, 0.06)',
      inlineButtonBackground: ({ theme }) => (dark(theme) ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)'),
      inlineButtonForeground: ({ theme }) => (dark(theme) ? '#9aa0a6' : '#4c5257'),
      inlineButtonBorder: ({ theme }) => (dark(theme) ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.15)'),
      tooltipSuccessBackground: ({ theme }) => (dark(theme) ? '#2a7e68' : '#26997b'),
      tooltipSuccessForeground: '#ffffff',
    },
  },
});
