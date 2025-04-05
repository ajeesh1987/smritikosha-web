// vite.config.js
export default {
    root: './', // Tell Vite where your root folder is
    build: {
      outDir: 'dist', // The output folder for production build
    },
    server: {
      open: '/login.html', // Automatically open the login page in the browser
    },
  };
  