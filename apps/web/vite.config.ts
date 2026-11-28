import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Sur GitHub Pages, l'app est servie sous /<nom-du-dépôt>/ : la CI fournit VITE_BASE.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Changer le nom du dossier d'icônes quand elles changent : Android ne met à jour l'icône installée que si son adresse change.
      includeAssets: ['icons-v2/favicon.svg', 'icons-v2/apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Mr Chef',
        short_name: 'Mr Chef',
        description: 'Générez vos recettes avec l’IA et envoyez-les sur votre robot Monsieur Cuisine.',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF6EE',
        theme_color: '#1B4332',
        categories: ['food', 'lifestyle'],
        icons: [
          { src: 'icons-v2/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons-v2/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons-v2/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons-v2/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  // Le SDK Claude est chargé à la demande dans son propre fichier (~590 ko).
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 650 },
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
} as never)
