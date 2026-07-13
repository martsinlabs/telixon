// @ts-check
import expressiveCode from 'astro-expressive-code';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://telixon.dev',
  // Code blocks share the site-wide Expressive Code palette defined in ec.config.mjs.
  integrations: [expressiveCode()],
});
