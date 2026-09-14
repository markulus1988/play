import { SPIN_WAIT, assert, createRoom, joinRoom, newPhone, signIn } from './helpers.mjs'

/** Własne zadanie na drugim kole musi dojechać z telefonu gospodarza do gościa. */
export default async function run(browser, url, log) {
  const host = await newPhone(browser, url, 'Ania')
  const guest = await newPhone(browser, url, 'Marek')
  await signIn(host, 'Ania')
  await signIn(guest, 'Marek')

  log('gospodarz tworzy zadanie „Śpiewa”')
  await host.page.getByRole('button', { name: /Ustawienia/ }).first().click()
  await host.page.getByRole('button', { name: /Własne zadanie/ }).click()
  await host.page.getByRole('textbox', { name: 'Nazwa zadania' }).fill('Śpiewa')
  await host.page
    .locator('textarea')
    .fill('Śpiewasz hasło na dowolną melodię, bez wymawiania słów z hasła.')
  await host.shot('30-nowe-zadanie')
  await host.page.getByRole('button', { name: 'Zapisz zadanie' }).click()
  await host.page.getByText('Śpiewa').first().waitFor()

  // zostawiamy na kole wyłącznie własne zadanie
  for (const m of ['Pokazuje', 'Pisze', 'Mówi']) {
    await host.page.getByRole('button', { name: new RegExp(`${m}$`) }).first().click()
  }
  await host.page.locator('input[type=number]').fill('1')
  await host.shot('31-ustawienia-zadan')
  await host.page.getByRole('button', { name: 'Wróć' }).click()

  const code = await createRoom(host)
  await joinRoom(guest, code)
  await host.page.getByRole('button', { name: /Zacznij grę/ }).waitFor({ timeout: 30000 })
  await host.page.getByRole('button', { name: /Zacznij grę/ }).click()
  await guest.page.getByText(/Runda 1/).waitFor({ timeout: 20000 })

  assert(
    (await guest.page.getByText('Śpiewa').count()) > 0,
    'Gość nie widzi własnego zadania gospodarza na kole',
  )
  log('gość widzi zadanie gospodarza na kole')
  await guest.shot('32-gosc-wlasne-zadanie')

  const spinner = (await host.page.getByRole('button', { name: /Zakręć kołami/ }).count())
    ? host
    : guest
  await spinner.page.getByRole('button', { name: /Zakręć kołami/ }).click()
  await host.page.waitForTimeout(SPIN_WAIT)

  const performer = (await host.page.locator('.word-card .word').count()) ? host : guest
  await performer.page.getByText('Śpiewasz hasło na dowolną melodię').waitFor({ timeout: 8000 })
  log('wykonawca dostał zasady własnego zadania')
  await performer.shot('33-zasady-wlasnego-zadania')

  return [...host.errors, ...guest.errors]
}
