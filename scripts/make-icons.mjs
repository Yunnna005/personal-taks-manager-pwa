// Draws the app icon and renders every size the manifest and iOS need.
// Run with `npm run icons` after changing the design; the output is committed.
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const INK = '#1C1B33'
// Urgency colours, hot to cool, as stacked Due soon tabs
const BARS = [
  ['#FF6B57', 290],
  ['#FFB23F', 240],
  ['#FFE27A', 190],
  ['#DCD8FF', 140],
]

/** 512×512 artwork. Bars stay inside the maskable safe zone (centre 80% circle). */
function svg({ rounded }) {
  const bars = BARS.map(
    ([color, width], i) =>
      `<rect x="111" y="${119 + i * 74}" width="${width}" height="52" rx="26" fill="${color}"/>`,
  ).join('')
  const bg = rounded
    ? `<rect width="512" height="512" rx="112" fill="${INK}"/>`
    : `<rect width="512" height="512" fill="${INK}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg}${bars}</svg>`
}

const outputs = [
  // Rounded with transparent corners for browsers that show the icon as-is
  { file: 'public/icons/icon-192.png', size: 192, rounded: true },
  { file: 'public/icons/icon-512.png', size: 512, rounded: true },
  // Full bleed: Android crops maskable icons, iOS rounds the corners itself
  { file: 'public/icons/maskable-512.png', size: 512, rounded: false },
  { file: 'public/icons/apple-touch-icon.png', size: 180, rounded: false },
]

await mkdir('public/icons', { recursive: true })
await writeFile('public/favicon.svg', svg({ rounded: true }) + '\n')

const browser = await chromium.launch()
for (const { file, size, rounded } of outputs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg({ rounded })}`,
  )
  await page.screenshot({ path: file, omitBackground: true })
  await page.close()
  console.log(`wrote ${file}`)
}
await browser.close()
