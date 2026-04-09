import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [vue()],
  clearScreen: false,
  define: {
    'import.meta.env.VITE_UI_MODE': JSON.stringify(process.env.VITE_UI_MODE || 'pc'),
  },
  server: {
    port: 1520,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
      sass: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        'lyrics-window': fileURLToPath(new URL('./lyrics-window.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.ts'],
  },
}))
