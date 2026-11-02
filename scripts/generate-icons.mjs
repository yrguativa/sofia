// Genera los iconos PNG de la PWA sin dependencias externas.
// Dibuja tres barras sobre fondo negro (#121212) y las escribe en public/.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const BG = [18, 18, 18]
const FG = [255, 255, 255]
const ACCENT = [201, 236, 110]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function pixelColor(x, y, size) {
  const s = size / 512
  const bars = [
    { x: 120, w: 80, top: 260 },
    { x: 216, w: 80, top: 180 },
    { x: 312, w: 80, top: 100 },
  ]
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]
    const bx = b.x * s
    const bw = b.w * s
    const by = b.top * s
    const bottom = 412 * s
    if (x >= bx && x < bx + bw && y >= by && y < bottom) return i === 2 ? ACCENT : FG
  }
  return BG
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelColor(x, y, size)
      raw[p++] = r
      raw[p++] = g
      raw[p++] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `pwa-${size}.png`), png(size))
  console.log(`pwa-${size}.png`)
}
