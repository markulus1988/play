import { assert, newPhone, signIn } from './helpers.mjs'

/** Pełna partia na jednym telefonie: ustawienia, koła, podanie telefonu, zegar, wynik. */
export default async function run(browser, url, log) {
  const phone = await newPhone(browser, url, 'Ania')
  const { page } = phone

  log('ekran wyboru gracza')
  await phone.shot('01-wybor-gracza')
  await signIn(phone, 'Ania')
  await phone.shot('02-menu')

  log('ustawienia: gra do 3, 30 s')
  await page.getByRole('button', { name: /Ustawienia/ }).first().click()
  await page.getByRole('group', { name: 'Gra do ilu zwycięstw' }).getByRole('button', { name: '3' }).click()
  await page.getByRole('group', { name: 'Sekundy na zgadywanie' }).getByRole('button', { name: '30 s' }).click()
  await phone.shot('03-ustawienia')
  await page.getByRole('button', { name: 'Wróć' }).click()

  log('wybór przeciwnika')
  await page.getByRole('button', { name: /Gra na jednym telefonie/ }).click()
  await page.getByText('Kto z Tobą gra?').waitFor()
  await page.getByPlaceholder('np. Marek').fill('Marek')
  await page.getByRole('button', { name: 'Dodaj i zacznij' }).click()
  await page.getByText(/Runda 1/).waitFor()
  await phone.shot('04-tura')

  async function playRound(n) {
    await page.getByRole('button', { name: /Zakręć kołami/ }).click()
    await page.waitForTimeout(600)
    if (n === 1) await phone.shot('05-kreci-sie')

    const handoff = page.getByRole('button', { name: /Jestem .* – pokaż hasło/ })
    await handoff.waitFor({ timeout: 10000 })
    assert(
      (await page.locator('.word-card .word').count()) === 0,
      'Hasło widoczne przed podaniem telefonu!',
    )
    if (n === 1) await phone.shot('06-podaj-telefon')
    await handoff.click()

    await page.getByText('Twoje hasło').waitFor()
    const word = await page.locator('.word').first().innerText()
    if (n === 1) await phone.shot('07-haslo')

    await page.getByRole('button', { name: /^Start/ }).click()
    await page.waitForTimeout(1200)
    if (n === 1) await phone.shot('08-gra')

    const guessed = n % 3 !== 0
    await page.getByRole('button', { name: guessed ? /Zgadnięte/ : /Pas/ }).click()
    await page.getByRole('button', { name: /Następna runda|Rewanż/ }).waitFor()
    if (n === 1) await phone.shot('09-wynik')
    log(`  runda ${n}: „${word}” ${guessed ? '✅' : '❌'}`)

    const next = page.getByRole('button', { name: 'Następna runda →' })
    if (await next.count()) await next.click()
  }

  for (let i = 1; i <= 20; i++) {
    if (await page.getByRole('button', { name: /Rewanż/ }).count()) break
    await playRound(i)
  }
  await page.getByRole('button', { name: /Rewanż/ }).waitFor({ timeout: 8000 })
  log('mecz rozstrzygnięty')
  await phone.shot('10-koniec-meczu')

  log('statystyki zapisane')
  await page.getByRole('button', { name: 'Wyjdź do menu' }).click()
  await page.getByText('Cześć, Ania!').waitFor()
  await page.getByRole('button', { name: /Statystyki/ }).click()
  await page.getByText('Ranking graczy').waitFor()
  assert((await page.getByText(/wygrał/).count()) > 0, 'Brak wpisu w historii gier')
  await phone.shot('11-statystyki')
  await page.getByRole('button', { name: 'Wróć' }).click()

  log('odliczanie czasu do zera')
  await page.getByRole('button', { name: /Gra na jednym telefonie/ }).click()
  await page.getByRole('button', { name: 'Marek' }).click()
  await page.getByRole('button', { name: /Zakręć kołami/ }).click()
  const handoff = page.getByRole('button', { name: /Jestem .* – pokaż hasło/ })
  await handoff.waitFor({ timeout: 10000 })
  await handoff.click()
  await page.getByRole('button', { name: /^Start/ }).click()
  await page.getByText('Czas minął!').waitFor({ timeout: 45000 })
  await phone.shot('12-czas-minal')
  await page.getByRole('button', { name: /Pas/ }).click()
  await page.getByRole('button', { name: /Następna runda|Rewanż/ }).waitFor()
  await page.getByRole('button', { name: 'Zakończ grę' }).click()
  await page.getByText('Cześć, Ania!').waitFor()

  log('własna kategoria')
  await page.getByRole('button', { name: /Kategorie/ }).click()
  await page.getByRole('button', { name: /Nowa kategoria/ }).click()
  await page.getByPlaceholder('np. Nasze wakacje').fill('Nasze żarty')
  await page.locator('textarea').fill('ciocia Basia\nwyjazd na Mazury\nnasz stary fiat')
  await page.getByRole('button', { name: 'Zapisz kategorię' }).click()
  await page.getByText('Nasze żarty').first().waitFor()
  await phone.shot('13-kategorie')

  return phone.errors
}
