import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
// The app is served from GitHub Pages under /transitops/, so every asset,
// route and redirect is relative to this base (import.meta.env.BASE_URL).
export default defineConfig({
  base: '/transitops/',
  plugins: [react()],
});
