import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Force full reload on code/style changes so you always see the latest after edits
const forceFullReload: Plugin = {
  name: 'force-full-reload',
  handleHotUpdate({ file, server }) {
    server.ws.send({ type: 'full-reload' });
    return [];
  },
};

export default defineConfig({
  plugins: [react(), forceFullReload],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    // On phone (same Wi‑Fi): run VITE_HOST=$(ipconfig getifaddr en0) npm run dev then open http://<that-IP>:3000
    host: process.env.VITE_HOST || '127.0.0.1',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
