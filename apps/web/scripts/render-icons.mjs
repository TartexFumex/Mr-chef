// Rend les icônes PNG de la PWA à partir des SVG (Playwright / Chromium).
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url))
const jobs = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-maskable-512.png', 512],
  ['icon-maskable.svg', 'apple-touch-icon.png', 180],
]
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const [src, out, size] of jobs) {
  const svg = await readFile(dir + src, 'utf8')
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.locator('svg').screenshot({ path: dir + out, omitBackground: true })
  console.log('écrit', out)
}
await browser.close()
