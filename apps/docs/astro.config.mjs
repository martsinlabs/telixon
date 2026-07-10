// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://docs.telixon.dev',
  integrations: [
    starlight({
      title: 'Telixon',
      logo: {
        dark: './src/assets/logo-dark.svg',
        light: './src/assets/logo-light.svg',
        replacesTitle: true,
      },
      description:
        'Phone number parsing, validation, formatting, and a headless input controller for JavaScript and TypeScript. Verified against Google libphonenumber.',
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/martsinlabs/telixon' }],
      editLink: { baseUrl: 'https://github.com/martsinlabs/telixon/edit/main/apps/docs/' },
      lastUpdated: true,
      customCss: ['./src/styles/theme.css'],
      head: [
        // Brand fonts, shared with the landing page; theme.css maps them onto --sl-font and --sl-font-mono.
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
          },
        },
        // Browser chrome color per scheme; values mirror the docs canvas backgrounds.
        { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#161618' } },
        { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#f7f8f8' } },
        // No social card image exists, so declare the plain summary card instead of the default large-image card.
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' } },
      ],
      sidebar: [
        {
          label: '@telixon/core',
          items: [{ slug: 'core' }],
        },
        {
          label: '@telixon/web-sdk',
          items: [{ slug: 'web-sdk' }],
        },
      ],
      components: {
        Sidebar: './src/components/PackageSidebar.astro',
        ThemeSelect: './src/components/ThemeToggle.astro',
      },
    }),
  ],
});
