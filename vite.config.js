import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  cacheDir: './node_modules/.vite',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    fs: {
      strict: true,
      allow: ['.'],
    },
  },
});
