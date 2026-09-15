import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import electron from 'vite-plugin-electron/simple'
export default defineConfig({
  base: './',
  plugins: [react(), electron({
    main: {
      entry: 'electron/main.js', // Aquí vivirá el código de la ventana nativa
    }
  }),],
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
