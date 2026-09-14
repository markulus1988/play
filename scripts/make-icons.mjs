// Generuje ikony PWA (PNG) bez zewnętrznych bibliotek.
// Rysuje "koło kalamburowe": kolorowe segmenty na ciemnym tle.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = [0x14, 0x0f, 0x2b]
const SEGMENTS = [
  [0xff, 0x6b, 0x6b],
  [0xff, 0xd9, 0x3d],
  [0x6b, 0xe5, 0xa5],
  [0x4d, 0xa6, 0xff],
  [0xc084, 0, 0], // placeholder, nadpisane niżej
  [0xf5, 0x7d, 0xff],
]
SEGMENTS[4] = [0xa7, 0x8b, 0xfa]

function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })())
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  let p = 0
  for (let y = 0; y < height; y++) {
    raw[p++] = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      raw[p++] = rgb[i]
      raw[p++] = rgb[i + 1]
      raw[p++] = rgb[i + 2]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function drawIcon(size, { padding }) {
  const rgb = new Uint8Array(size * size * 3)
  const cx = size / 2
  const cy = size / 2
  const outer = (size / 2) * (1 - padding)
  const ring = outer * 0.86
  const hub = outer * 0.2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const d = Math.hypot(dx, dy)
      let color = BG
      if (d <= outer) {
        if (d > ring) {
          color = [0xff, 0xff, 0xff]
        } else if (d < hub) {
          color = [0xff, 0xff, 0xff]
        } else {
          let a = Math.atan2(dy, dx) + Math.PI / 2
          if (a < 0) a += Math.PI * 2
          const idx = Math.floor((a / (Math.PI * 2)) * SEGMENTS.length) % SEGMENTS.length
          const base = SEGMENTS[idx]
          // delikatny gradient od środka do krawędzi
          color = mix(base, [0xff, 0xff, 0xff], 0.22 * (1 - (d - hub) / (ring - hub)))
        }
        // antyaliasing krawędzi zewnętrznej
        if (outer - d < 1.5) color = mix(BG, color, Math.max(0, outer - d) / 1.5)
      }
      const i = (y * size + x) * 3
      rgb[i] = color[0]
      rgb[i + 1] = color[1]
      rgb[i + 2] = color[2]
    }
  }
  return encodePng(size, size, rgb)
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'icon-192.png'), drawIcon(192, { padding: 0.06 }))
writeFileSync(join(OUT_DIR, 'icon-512.png'), drawIcon(512, { padding: 0.06 }))
writeFileSync(join(OUT_DIR, 'icon-maskable-512.png'), drawIcon(512, { padding: 0.2 }))
console.log('Ikony zapisane w public/')
