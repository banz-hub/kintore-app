import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // 相対パスで出力し、任意のディレクトリに置いても動くようにする
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg', 'apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        name: '筋トレログ',
        short_name: '筋トレログ',
        description: '持っている機材と使える時間に合わせて筋トレメニューを提案し、記録を残すアプリ',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1216',
        theme_color: '#0f1216',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Android のアイコン切り抜きに耐えるよう、絵柄は中央60%に収めてある
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  server: {
    // スマホの実機から同じLAN内で確認できるようにする
    host: true,
  },
})
