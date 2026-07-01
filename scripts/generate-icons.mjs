import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pub = resolve(__dirname, '../public')

// App mark: four fingers crimping over a hangboard edge, on the brand purple.
const icon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7C4DFF"/>
      <stop offset="1" stop-color="#6200EE"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- the edge / board -->
  <rect x="96" y="300" width="320" height="70" rx="20" fill="#ffffff"/>
  <!-- four fingers curling over the edge -->
  <g fill="#ffffff">
    <rect x="118" y="150" width="52" height="180" rx="26"/>
    <rect x="188" y="132" width="52" height="198" rx="26"/>
    <rect x="258" y="140" width="52" height="190" rx="26"/>
    <rect x="328" y="164" width="52" height="166" rx="26"/>
  </g>
</svg>`

const targets = [
  { name: 'pwa-192.png', size: 192 },
  { name: 'pwa-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const t of targets) {
  await sharp(Buffer.from(icon(t.size)))
    .resize(t.size, t.size)
    .png()
    .toFile(resolve(pub, t.name))
  console.log('wrote', t.name)
}
