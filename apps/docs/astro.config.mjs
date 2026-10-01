// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLlmsTxt from 'starlight-llms-txt';
import { AVAILABLE_PACKAGES, groupLabel } from './src/package-registry';

/** Starlight sidebar items for a registry sidebar. */
function toItems(sidebar) {
  return sidebar.map((entry) =>
    typeof entry === 'string' ? { slug: entry } : { label: entry.label, items: entry.items.map((slug) => ({ slug })) },
  );
}

export default defineConfig({
  site: 'https://telixon.dev',
  // The playground umbrella points at its only room until further rooms exist.
  redirects: { '/playground': '/playground/input' },
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
      // llms.txt, llms-full.txt, and llms-small.txt for AI assistant retrieval.
      plugins: [starlightLlmsTxt()],
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
        // Social card, shared with the landing page. og:image needs an absolute URL.
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://telixon.dev/og.png' } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1280' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '640' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
      ],
      // One group per line of every available package, labeled through the registry; PackageSidebar
      // matches on that label. The pages inside a group come from the registry's sidebar fields.
      sidebar: AVAILABLE_PACKAGES.flatMap((pkg) => [
        { label: groupLabel(pkg, null), items: toItems(pkg.sidebar ?? [pkg.base]) },
        ...(pkg.lines?.archived ?? []).map((line) => ({ label: groupLabel(pkg, line), items: toItems(line.sidebar) })),
      ]),
      components: {
        Banner: './src/components/LineBanner.astro',
        Sidebar: './src/components/PackageSidebar.astro',
        ThemeSelect: './src/components/ThemeToggle.astro',
      },
    }),
  ],
});
