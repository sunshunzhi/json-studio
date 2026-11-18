import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@codemirror/') || id.includes('/node_modules/@lezer/')) {
            return 'editor';
          }
        },
      },
    },
  },
});
