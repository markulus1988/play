/**
 * Polska odmiana po liczebniku.
 *
 *   plural(1, ['gra', 'gry', 'gier'])  → 'gra'
 *   plural(2, ['gra', 'gry', 'gier'])  → 'gry'
 *   plural(5, ['gra', 'gry', 'gier'])  → 'gier'
 */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const abs = Math.abs(n)
  if (abs === 1) return one
  const last = abs % 10
  const lastTwo = abs % 100
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few
  return many
}

/** Liczba razem z odmienionym rzeczownikiem, np. „3 gry”. */
export function count(n: number, forms: [string, string, string]): string {
  return `${n} ${plural(n, forms)}`
}

export const GRY: [string, string, string] = ['gra', 'gry', 'gier']
export const GIER: [string, string, string] = ['gry', 'gier', 'gier']
export const ZWYCIESTWA: [string, string, string] = ['zwycięstwo', 'zwycięstwa', 'zwycięstw']
export const HASLA: [string, string, string] = ['hasło', 'hasła', 'haseł']
export const RUNDY: [string, string, string] = ['runda', 'rundy', 'rund']
export const KATEGORIE: [string, string, string] = ['kategoria', 'kategorie', 'kategorii']
export const ZGADNIETE_HASLA: [string, string, string] = [
  'zgadnięte hasło',
  'zgadnięte hasła',
  'zgadniętych haseł',
]
export const ZAPISANE_GRY: [string, string, string] = [
  'zapisana gra',
  'zapisane gry',
  'zapisanych gier',
]
export const WYBRANE_KATEGORIE: [string, string, string] = [
  'wybrana kategoria',
  'wybrane kategorie',
  'wybranych kategorii',
]
