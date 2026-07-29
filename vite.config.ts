import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base path so assets load correctly on Vercel, GitHub Pages, or any host
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
