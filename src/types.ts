/** Identyfikator zadania z drugiego koła – wbudowanego albo własnego. */
export type ModeId = string

export interface ModeDef {
  id: ModeId
  label: string
  /** Krótka forma używana na listach, np. „Pokaż”. */
  short: string
  rules: string
  color: string
  emoji: string
  custom?: boolean
}

export interface Category {
  id: string
  name: string
  emoji: string
  words: string[]
  custom?: boolean
}

export interface Player {
  id: string
  name: string
  emoji: string
  createdAt: number
  stats: {
    matches: number
    matchWins: number
    points: number
    words: number
  }
}

/** Kto kręci kołami w danej turze. */
export type SpinnerRole = 'guesser' | 'performer'

export interface Settings {
  targetWins: number
  timerSeconds: number
  timerEnabled: boolean
  modes: ModeId[]
  categoryIds: string[]
  spinner: SpinnerRole
  sound: boolean
}

/**
 * 'spinning' obejmuje też moment po zatrzymaniu kół (podanie telefonu,
 * pokazanie hasła wykonawcy) – ta część dzieje się lokalnie na każdym telefonie.
 */
export type Phase = 'turn-intro' | 'spinning' | 'playing' | 'result' | 'match-over'

export interface RoundResult {
  round: number
  performerId: string
  guesserId: string
  categoryName: string
  mode: ModeId
  word: string
  guessed: boolean
  secondsUsed: number | null
}

export interface GameState {
  phase: Phase
  round: number
  /** Indeks gracza, który w tej turze wykonuje zadanie (0 lub 1). */
  performerIdx: 0 | 1
  scores: [number, number]
  turnsPlayed: [number, number]
  categoryId: string | null
  categoryName: string | null
  mode: ModeId | null
  /** Wylosowane hasło – wysyłane WYŁĄCZNIE na urządzenie wykonawcy. */
  word: string | null
  /** Czy to urządzenie ma prawo widzieć hasło. */
  wordVisible: boolean
  spinSeed: number
  categoryWheelIndex: number | null
  modeWheelIndex: number | null
  startedAt: number | null
  timeUpAt: number | null
  lastResult: RoundResult | null
  history: RoundResult[]
  winnerIdx: 0 | 1 | null
  usedWords: string[]
}

export interface MatchRecord {
  id: string
  finishedAt: number
  mode: 'local' | 'online'
  players: [string, string]
  scores: [number, number]
  winner: string
  targetWins: number
  rounds: number
}

export interface PersistedData {
  version: number
  players: Player[]
  activePlayerId: string | null
  settings: Settings
  customCategories: Category[]
  customModes: ModeDef[]
  history: MatchRecord[]
  lastLocalOpponentId: string | null
}
