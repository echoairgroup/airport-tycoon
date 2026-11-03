import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs work both at a domain root and in a GitHub Pages project path.
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
  },
});
