import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In dev the API runs on :3000; OAuth redirects go to APP_URL, so open the app from the server port in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:3000', '/oauth': 'http://127.0.0.1:3000' }
  }
});
