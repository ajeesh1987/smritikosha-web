import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  root: './',
  publicDir: 'public',
  server: {
    port: 5173,
    open: '/',
    fs: {
      strict: false
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        login: path.resolve(__dirname, 'login.html'),
        signup: path.resolve(__dirname, 'signup.html'),
        main: path.resolve(__dirname, 'main.html'),
        map: path.resolve(__dirname, 'map.html'),
        upload: path.resolve(__dirname, 'upload.html')
      }
    }
  }
});
