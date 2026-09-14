/**
 * Uruchamia komplet testów end-to-end w prawdziwej przeglądarce.
 *
 *   npm run test:e2e
 *
 * Skrypt sam buduje aplikację w trybie `e2e` (łączenie przez lokalny serwer
 * PeerJS zamiast publicznego), podnosi serwer łączenia i serwer statyczny,
 * a na końcu wszystko sprząta.
 */
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright'
import { SHOT_DIR, launchOptions } from './helpers.mjs'

const PEER_PORT = 9000
const WEB_PORT = 4178
const URL = `http://127.0.0.1:${WEB_PORT}/`
const OUT_DIR = 'dist-e2e'

const require = createRequire(import.meta.url)
// Uruchamiamy lokalne binarki bezpośrednio (bez npx), żeby dało się ubić
// całą grupę procesów – inaczej serwery zostają w tle po zakończeniu testów.
const VITE_BIN = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')

const children = []

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: 'inherit', detached: true, ...opts })
  children.push(child)
  return child
}

function cleanup() {
  for (const c of children) {
    try {
      process.kill(-c.pid, 'SIGKILL')
    } catch {
      try {
        c.kill('SIGKILL')
      } catch {
        /* już nie żyje */
      }
    }
  }
}
process.on('exit', cleanup)
process.on('SIGINT', () => {
  cleanup()
  process.exit(1)
})

async function waitFor(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 404) return
    } catch {
      /* jeszcze nie wstał */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Serwer ${url} nie wstał w ${timeoutMs} ms`)
}

async function exec(cmd, args) {
  await new Promise((resolve, reject) => {
    const c = spawn(cmd, args, { stdio: 'inherit' })
    c.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} → ${code}`))))
  })
}

console.log('▸ buduję aplikację w trybie e2e')
rmSync(OUT_DIR, { recursive: true, force: true })
rmSync(SHOT_DIR, { recursive: true, force: true })
await exec(process.execPath, [
  VITE_BIN,
  'build',
  '--mode',
  'e2e',
  '--outDir',
  OUT_DIR,
  '--logLevel',
  'warn',
])

console.log('▸ serwer łączenia PeerJS')
run('node', ['scripts/dev-peer-server.mjs'], { env: { ...process.env, PEER_PORT: String(PEER_PORT) } })

console.log('▸ serwer aplikacji')
run(process.execPath, [
  VITE_BIN,
  'preview',
  '--port',
  String(WEB_PORT),
  '--host',
  '127.0.0.1',
  '--outDir',
  OUT_DIR,
  '--logLevel',
  'warn',
])
await waitFor(URL)

const suites = [
  ['Jeden telefon', (await import('./one-phone.mjs')).default],
  ['Dwa telefony', (await import('./two-phones.mjs')).default],
  ['Własne zadania', (await import('./custom-mode.mjs')).default],
]

const browser = await chromium.launch(launchOptions())
let failed = 0
const allErrors = []

for (const [name, suite] of suites) {
  console.log(`\n=== ${name} ===`)
  const log = (msg) => console.log('  ·', msg)
  try {
    const errors = await suite(browser, URL, log)
    allErrors.push(...(errors ?? []))
    console.log(`  ✅ ${name}`)
  } catch (err) {
    failed++
    console.error(`  ❌ ${name}: ${err.message}`)
  }
}

await browser.close()
cleanup()

const noise = allErrors.filter((e) => !/favicon|manifest|sw\.js/i.test(e))
if (noise.length) {
  console.error('\nBłędy w konsoli przeglądarki:')
  for (const e of noise) console.error('  -', e)
}

console.log(
  `\n${failed === 0 && noise.length === 0 ? '✅ Wszystkie testy przeszły' : `❌ Problemy: ${failed} testów, ${noise.length} błędów konsoli`}`,
)
console.log(`Zrzuty ekranu: ${SHOT_DIR}`)
process.exit(failed === 0 && noise.length === 0 ? 0 : 1)
