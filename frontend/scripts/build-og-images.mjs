/**
 * Build-time script: converts OG SVG images to PNG format.
 *
 * Social media platforms (Facebook, LinkedIn, Slack, Discord) require
 * image/png or image/jpeg for Open Graph previews — SVGs are unreliable.
 *
 * Run via: node scripts/build-og-images.mjs
 * Triggered automatically as a prebuild step in package.json.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const PUBLIC_DIR = resolve(import.meta.dirname, '..', 'public')

const OG_IMAGES = [
  { svg: 'og-image.svg', png: 'og-image.png' },
  { svg: 'og-contact-sales.svg', png: 'og-contact-sales.png' },
]

let converted = 0

for (const { svg, png } of OG_IMAGES) {
  const svgPath = join(PUBLIC_DIR, svg)
  const pngPath = join(PUBLIC_DIR, png)

  try {
    const svgData = readFileSync(svgPath, 'utf-8')

    const resvg = new Resvg(svgData, {
      fitTo: { mode: 'width', value: 1200 },
      background: 'transparent',
    })

    const pngBuffer = resvg.render().asPng()
    writeFileSync(pngPath, pngBuffer)

    const sizeKb = (pngBuffer.byteLength / 1024).toFixed(1)
    console.log(`  ✓ ${svg} → ${png} (${sizeKb} KB)`)
    converted++
  } catch (err) {
    console.error(`  ✗ Failed to convert ${svg}:`, err.message)
    process.exit(1)
  }
}

console.log(`\n  ${converted}/${OG_IMAGES.length} OG images converted to PNG.`)
