// vite.config.ts (MODIFICATO E SICURO)
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve('.'),
    }
  }
});