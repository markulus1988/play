import type { Category, MatchRecord, ModeDef, PersistedData, Player, Settings } from './types'
import { BUILTIN_CATEGORIES, DEFAULT_MODES, MODES } from './data/words'

const KEY = 'kalambury:v1'

export const DEFAULT_SETTINGS: Settings = {
  targetWins: 5,
  timerSeconds: 60,
  timerEnabled: true,
  modes: [...DEFAULT_MODES],
  categoryIds: ['zwierzeta', 'filmy', 'zawody', 'jedzenie', 'czynnosci', 'przedmioty'],
  spinner: 'guesser',
  sound: true,
}

const EMPTY: PersistedData = {
  version: 1,
  players: [],
  activePlayerId: null,
  settings: DEFAULT_SETTINGS,
  customCategories: [],
  customModes: [],
  history: [],
  lastLocalOpponentId: null,
}

export const PLAYER_EMOJIS = [
  '🦊', '🐼', '🐯', '🐸', '🦁', '🐙', '🦄', '🐵', '🐨', '🐧',
  '🦉', '🐝', '🦋', '🐢', '🦖', '🐳', '🦔', '🐻',
]

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function load(): PersistedData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<PersistedData>
    const data: PersistedData = {
      ...EMPTY,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      players: (parsed.players ?? []).map((p) => {
        const stats = (p.stats ?? {}) as Partial<Player['stats']>
        return {
          ...p,
          stats: {
            matches: stats.matches ?? 0,
            matchWins: stats.matchWins ?? 0,
            points: stats.points ?? 0,
            words: stats.words ?? 0,
          },
        }
      }),
      customCategories: parsed.customCategories ?? [],
      customModes: parsed.customModes ?? [],
      history: parsed.history ?? [],
    }
    // Usuń kategorie, które już nie istnieją.
    const valid = new Set([
      ...BUILTIN_CATEGORIES.map((c) => c.id),
      ...data.customCategories.map((c) => c.id),
    ])
    data.settings.categoryIds = data.settings.categoryIds.filter((id) => valid.has(id))
    if (data.settings.categoryIds.length === 0) {
      data.settings.categoryIds = DEFAULT_SETTINGS.categoryIds.filter((id) => valid.has(id))
    }
    const validModes = new Set([
      ...MODES.map((m) => m.id),
      ...data.customModes.map((m) => m.id),
    ])
    data.settings.modes = data.settings.modes.filter((id) => validModes.has(id))
    if (data.settings.modes.length === 0) data.settings.modes = [...DEFAULT_MODES]
    return data
  } catch {
    return { ...EMPTY }
  }
}

export function save(data: PersistedData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Brak miejsca / tryb prywatny – gra działa dalej, tylko bez zapisu.
  }
}

export function makePlayer(name: string, usedEmojis: string[] = []): Player {
  const free = PLAYER_EMOJIS.filter((e) => !usedEmojis.includes(e))
  const pool = free.length ? free : PLAYER_EMOJIS
  return {
    id: uid(),
    name: name.trim() || 'Gracz',
    emoji: pool[Math.floor(Math.random() * pool.length)],
    createdAt: Date.now(),
    stats: { matches: 0, matchWins: 0, points: 0, words: 0 },
  }
}

export const MODE_COLORS = ['#ff6b6b', '#4da6ff', '#6be5a5', '#ffd93d', '#f57dff', '#ff9f45', '#42d6d6']

export function makeMode(label: string, emoji: string, rules: string, taken: number): ModeDef {
  const name = label.trim() || 'Własne zadanie'
  return {
    id: 'm_' + uid(),
    label: name,
    short: name.length > 10 ? name.slice(0, 9) + '…' : name,
    rules: rules.trim(),
    color: MODE_COLORS[taken % MODE_COLORS.length],
    emoji,
    custom: true,
  }
}

export function makeCategory(name: string, emoji: string, words: string[]): Category {
  return { id: 'c_' + uid(), name: name.trim(), emoji, words, custom: true }
}

export function makeMatchRecord(
  r: Omit<MatchRecord, 'id' | 'finishedAt'>,
): MatchRecord {
  return { ...r, id: uid(), finishedAt: Date.now() }
}
