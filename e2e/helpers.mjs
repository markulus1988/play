import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'screenshots')

/**
 * Playwright domyślnie szuka przeglądarki w wersji zgodnej z pakietem.
 * W środowiskach z preinstalowanym Chromium (PLAYWRIGHT_BROWSERS_PATH)
 * wersja bywa inna, więc dobieramy pierwszy pasujący katalog.
 */
export function findChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !existsSync(root)) return undefined
  for (const dir of readdirSync(root)) {
    if (!dir.startsWith('chromium-')) continue
    const bin = join(root, dir, 'chrome-linux', 'chrome')
    if (existsSync(bin)) return bin
  }
  return undefined
}

export function launchOptions() {
  const executablePath = findChromium()
  return executablePath ? { executablePath } : {}
}

export async function newPhone(browser, url, name) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`)
  })
  await page.goto(url, { waitUntil: 'networkidle' })
  const phone = { page, ctx, errors, name }
  phone.shot = async (file) => {
    mkdirSync(SHOT_DIR, { recursive: true })
    await page.screenshot({ path: join(SHOT_DIR, `${file}.png`) })
  }
  return phone
}

/** Przechodzi ekran wyboru gracza, tworząc profil o podanym imieniu. */
export async function signIn(phone, name) {
  await phone.page.getByPlaceholder('np. Ania').fill(name)
  await phone.page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await phone.page.getByText(`Cześć, ${name}!`).waitFor()
}

export async function createRoom(host) {
  await host.page.getByRole('button', { name: /Gra na dwóch telefonach/ }).click()
  await host.page.getByRole('button', { name: /Utwórz pokój/ }).click()
  await host.page.waitForFunction(
    () => /^[A-Z0-9]{4}$/.test(document.querySelector('.room-code')?.textContent.trim() ?? ''),
    null,
    { timeout: 25000 },
  )
  return (await host.page.locator('.room-code').innerText()).trim()
}

export async function joinRoom(guest, code) {
  await guest.page.getByRole('button', { name: /Gra na dwóch telefonach/ }).click()
  await guest.page.locator('.code-input').fill(code)
  await guest.page.getByRole('button', { name: /Dołącz →/ }).click()
}

export const SPIN_WAIT = 4200

export function assert(cond, message) {
  if (!cond) throw new Error(message)
}
