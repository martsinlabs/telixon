// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { AVAILABLE_PACKAGES } from './src/package-registry';

export default defineConfig({
  site: 'https://telixon.dev',
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
      // tokens.css first: theme.css derives from the brand channels it declares.
      customCss: ['./src/styles/tokens.css', './src/styles/theme.css'],
      head: [
        // Brand fonts, shared with the landing page; theme.css maps them onto --sl-font and --sl-font-mono.
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            // Variable range: discrete faces would round the 650 and 750 weights up to 700 and 800.
            href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=JetBrains+Mono:wght@400;500;600&display=swap',
          },
        },
        // Browser chrome color per scheme; values mirror the docs canvas backgrounds.
        { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#161618' } },
        { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#f7f8f8' } },
        // No social card image exists, so declare the plain summary card instead of the default large-image card.
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' } },
      ],
      // One group per available package, labeled by npm name; PackageSidebar matches on that label.
      sidebar: AVAILABLE_PACKAGES.map((pkg) => ({
        label: pkg.name,
        items: [{ slug: pkg.base }],
      })),
      components: {
        Sidebar: './src/components/PackageSidebar.astro',
        ThemeSelect: './src/components/ThemeToggle.astro',
      },
    }),
  ],
});
