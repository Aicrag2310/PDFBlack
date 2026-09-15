import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import { resolve } from 'path'

export default defineConfig({
  // MUY IMPORTANTE PARA ELECTRON
  base: './',

  plugins: [
    react(),

    electron({
      entry: 'electron/main.js',
    }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },

  worker: {
    format: 'es',
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['pdf-lib'],
          'pdfjs': ['pdfjs-dist'],
        },
      },
    },
  },

  server: {
    allowedHosts: ['.ngrok-free.dev'],

    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})