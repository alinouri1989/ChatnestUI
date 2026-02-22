import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    https: true, // Enables HTTPS support
    // host: '0.0.0.0', // optional, allows external access if needed
    // port: 3000, // optional, define port if needed
  },
  plugins: [
    mkcert(), // For HTTPS with local certificates
    react(), // React plugin support
    tailwindcss(), // Tailwind v4 integration
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern', // SCSS preprocessor options
      },
    },
  },
  // Media file handling (like mp3, images, etc.)
  assetsInclude: ['**/*.mp3', '**/*.wav', '**/*.jpg', '**/*.png', '**/*.gif'], // Handle media files
  resolve: {
    alias: {
      '@': '/src', // If you want to use `@` as an alias for the `src` directory
    },
  },
});
