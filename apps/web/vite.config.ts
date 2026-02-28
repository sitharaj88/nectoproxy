import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8889',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8889',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'vendor-codemirror': [
            '@codemirror/lang-html',
            '@codemirror/lang-json',
            '@codemirror/lang-xml',
            '@codemirror/view',
            '@uiw/react-codemirror',
          ],
          'vendor-motion': ['framer-motion'],
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-virtual'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
});
