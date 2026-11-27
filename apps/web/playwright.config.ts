import { defineConfig, devices } from '@playwright/test'

const base = process.env.VITE_BASE ?? '/'
const port = 4173

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}${base}`,
    locale: 'fr-FR',
    // Le service worker ne doit pas masquer les réponses simulées des API.
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // En CI, l'application est déjà construite par l'étape précédente.
    command: process.env.CI ? `pnpm exec vite preview --port ${port} --strictPort` : `pnpm exec vite build && pnpm exec vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
