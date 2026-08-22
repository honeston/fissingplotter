import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: {
    // amazon-cognito-identity-js が Node の global を参照するため
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  worker: {
    format: 'es',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // MobileCLIP / ONNX Runtime の WASM は初回利用時にネットワーク取得（precache しない）
        globIgnores: ['**/*ort-wasm*.wasm'],
      },
      manifest: {
        name: 'Fissing Plotter',
        short_name: 'Fissing',
        description: '釣り記録 — 気温・潮位・座標をワンタップ保存',
        theme_color: '#0e7490',
        background_color: '#f0f9ff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'ja',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  // EMFILE / inotify 上限回避（IDE と併用時に発生しやすい）
  server: {
    watch: {
      usePolling: true,
      interval: 300,
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    },
  },
})
