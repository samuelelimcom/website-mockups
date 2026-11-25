import { defineConfig } from 'astro/config';

// Static output only: the built dist/ folder is what gets deployed.
export default defineConfig({
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
