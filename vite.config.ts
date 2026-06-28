// @ts-nocheck
import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certKeyPath = path.resolve(__dirname, "./certs/10.138.128.134+2-key.pem");
const certPath = path.resolve(__dirname, "./certs/10.138.128.134+2.pem");

const hasLocalCerts = fs.existsSync(certKeyPath) && fs.existsSync(certPath);

export default defineConfig(({ command, mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5173,

    // Only use local HTTPS certificates during dev server
    ...(command === "serve" && hasLocalCerts
      ? {
          https: {
            key: fs.readFileSync(certKeyPath),
            cert: fs.readFileSync(certPath),
          },
        }
      : {}),
  },

  plugins: [
    command === "serve" && mode !== "test" ? mkcert() : null,
    react(),
    tailwindcss(),
  ],

  css: {
    preprocessorOptions: {
      scss: {
        api: "modern",
      },
    },
  },

  assetsInclude: [
    "**/*.mp3",
    "**/*.wav",
    "**/*.jpg",
    "**/*.png",
    "**/*.gif",
    "**/*.webp",
    "**/*.svg",
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    // Default is 500 kB. Your current main bundle is around 2164 kB.
    // This only changes the warning threshold, not the output itself.
    chunkSizeWarningLimit: 2500,

    rolldownOptions: {
      checks: {
        // Hide SignalR invalid PURE annotation warning
        invalidAnnotation: false,
      },

      output: {
        codeSplitting: {
          minSize: 20000,
          groups: [
            {
              name: "react-vendor",
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
              priority: 30,
            },
            {
              name: "signalr",
              test: /[\\/]node_modules[\\/]@microsoft[\\/]signalr[\\/]/,
              priority: 25,
            },
            {
              name: "state-query",
              test: /[\\/]node_modules[\\/](@reduxjs|react-redux|@tanstack)[\\/]/,
              priority: 20,
            },
            {
              name: "ui-vendor",
              test: /[\\/]node_modules[\\/](react-icons|lucide-react|framer-motion)[\\/]/,
              priority: 15,
            },
            {
              name: "vendor",
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },

  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    globals: true,
  },
}));