import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './',
  publicDir: 'public',
  server: {
    port: 5173,
    open: '/', // open root (index.html)
    fs: {
      strict: false
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        login: path.resolve(__dirname, 'public/pages/login.html'),
        signup: path.resolve(__dirname, 'public/pages/signup.html'),
        confirmed: path.resolve(__dirname, 'public/pages/confirmed.html'),
        main: path.resolve(__dirname, 'public/pages/main.html'),
        // keep adding more if needed
      }
    }
  }
});
