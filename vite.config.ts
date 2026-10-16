import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import vercel from './vercel.json' with { type: 'json' }

// Header keamanan produksi ada di vercel.json. `vite preview`, yang dipakai E2E, mengirim header yang sama
// supaya pelanggaran CSP ketahuan di test, bukan di HP pengguna.
const securityHeaders = Object.fromEntries(vercel.headers.find((h) => h.source === '/(.*)')!.headers.map((h) => [h.key, h.value]))

export default defineConfig({
  preview: { headers: securityHeaders },
  build: {
    rolldownOptions: {
      output: {
        // React dan Motion jarang berubah: dipisah supaya update aplikasi cukup mengunduh ulang kode kita saja.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'motion', test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/ },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Tookthel — Jadi Tumbal Boleh, Rugi Jangan',
        short_name: 'Tookthel',
        description: 'Yang bayarin dulu di kasir tetap balik modal. Bagi tagihan bareng teman lengkap dengan pajak & service.',
        lang: 'id',
        theme_color: '#F6F5F1',
        background_color: '#F6F5F1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
