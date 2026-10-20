import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// The React page also renders on the server, through a second build of its server entry.
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('telixon-') } } })],
  build: isSsrBuild
    ? { outDir: 'dist/server' }
    : {
        outDir: 'dist/client',
        rolldownOptions: { input: { static: 'index.html', react: 'react/index.html', vue: 'vue/index.html' } },
      },
}));
