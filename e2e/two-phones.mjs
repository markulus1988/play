import { SPIN_WAIT, assert, createRoom, joinRoom, newPhone, signIn } from './helpers.mjs'

/**
 * Najważniejszy test: dwa telefony w jednym pokoju, a hasło w każdej rundzie
 * widoczne DOKŁADNIE na jednym z nich – tym, który wykonuje zadanie.
 */
export default async function run(browser, url, log) {
  const host = await newPhone(browser, url, 'Ania')
  const guest = await newPhone(browser, url, 'Marek')
  await signIn(host, 'Ania')
  await signIn(guest, 'Marek')

  log('gospodarz skraca mecz do 2 punktów')
  await host.page.getByRole('button', { name: /Ustawienia/ }).first().click()
  await host.page.locator('input[type=number]').fill('2')
  await host.page.getByRole('button', { name: 'Wróć' }).click()

  const code = await createRoom(host)
  log(`pokój ${code}`)
  await host.shot('20-pokoj')
  await joinRoom(guest, code)

  await host.page.getByText('Marek').first().waitFor({ timeout: 30000 })
  await guest.page.getByText('Ania').first().waitFor({ timeout: 30000 })
  log('telefony połączone')
  await host.shot('21-poczekalnia-host')
  await guest.shot('22-poczekalnia-gosc')

  await host.page.getByRole('button', { name: /Zacznij grę/ }).click()
  await host.page.getByText(/Runda 1/).waitFor({ timeout: 20000 })
  await guest.page.getByText(/Runda 1/).waitFor({ timeout: 20000 })

  async function round(n) {
    const hostSpins = (await host.page.getByRole('button', { name: /Zakręć kołami/ }).count()) > 0
    const spinner = hostSpins ? host : guest
    const waiting = hostSpins ? guest : host
    await waiting.page
      .getByRole('button', { name: new RegExp(`Kręci ${spinner.name}`) })
      .waitFor({ timeout: 10000 })
    await spinner.page.getByRole('button', { name: /Zakręć kołami/ }).click()
    await host.page.waitForTimeout(SPIN_WAIT)

    const hostWord = await host.page.locator('.word-card .word').count()
    const guestWord = await guest.page.locator('.word-card .word').count()
    assert(
      hostWord + guestWord === 1,
      `Hasło widoczne na ${hostWord + guestWord} telefonach zamiast dokładnie 1`,
    )
    const performer = hostWord ? host : guest
    const guesser = hostWord ? guest : host
    const word = await performer.page.locator('.word-card .word').first().innerText()
    await guesser.page.getByText(/Hasło widzi tylko/).waitFor({ timeout: 8000 })
    log(`  runda ${n}: kręci ${spinner.name}, „${word}” tylko u ${performer.name}`)
    if (n === 1) {
      await performer.shot('23-wykonawca-haslo')
      await guesser.shot('24-zgadujacy-bez-hasla')
    }

    await performer.page.getByRole('button', { name: /^Start/ }).click()
    await guesser.page.getByText(/Zgaduj!/).waitFor({ timeout: 12000 })
    if (n === 1) {
      await host.page.waitForTimeout(1200)
      await performer.shot('25-wykonawca-gra')
      await guesser.shot('26-zgadujacy-gra')
    }

    // wynik zgłasza zgadujący ze swojego telefonu – host musi go policzyć
    const guessed = n % 3 !== 0
    await guesser.page.getByRole('button', { name: guessed ? /Zgadnięte/ : /Pas/ }).click()
    for (const p of [host, guest]) {
      await p.page.getByRole('button', { name: /Następna runda|Rewanż/ }).waitFor({ timeout: 12000 })
    }
    const seen = await Promise.all([
      host.page.getByText(word, { exact: true }).count(),
      guest.page.getByText(word, { exact: true }).count(),
    ])
    assert(seen[0] > 0 && seen[1] > 0, 'Po rundzie hasło nie jest widoczne u obu graczy')

    const next = host.page.getByRole('button', { name: 'Następna runda →' })
    if (await next.count()) {
      // raz klika gospodarz, raz gość – sprawdzamy oba kierunki sterowania
      const clicker = n % 2 === 0 ? guest : host
      await clicker.page.getByRole('button', { name: 'Następna runda →' }).click()
      await host.page.getByText(new RegExp(`Runda ${n + 1}`)).waitFor({ timeout: 12000 })
    }
  }

  for (let i = 1; i <= 20; i++) {
    if (await host.page.getByRole('button', { name: /Rewanż/ }).count()) break
    await round(i)
  }
  for (const p of [host, guest]) {
    await p.page.getByRole('button', { name: /Rewanż/ }).waitFor({ timeout: 12000 })
  }
  log('mecz zakończony na obu telefonach')
  await host.shot('27-koniec-host')
  await guest.shot('28-koniec-gosc')

  await guest.page.getByRole('button', { name: /Rewanż/ }).click()
  await host.page.getByText(/Runda 1/).waitFor({ timeout: 12000 })
  await guest.page.getByText(/Runda 1/).waitFor({ timeout: 12000 })
  log('rewanż uruchomiony z telefonu gościa')

  return [...host.errors, ...guest.errors]
}
