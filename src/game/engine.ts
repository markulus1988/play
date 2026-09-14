import type { Category, GameState, ModeId, RoundResult, Settings } from '../types'

export function createGame(firstPerformerIdx: 0 | 1 = 0): GameState {
  return {
    phase: 'turn-intro',
    round: 1,
    performerIdx: firstPerformerIdx,
    scores: [0, 0],
    turnsPlayed: [0, 0],
    categoryId: null,
    categoryName: null,
    mode: null,
    word: null,
    wordVisible: false,
    spinSeed: 0,
    categoryWheelIndex: null,
    modeWheelIndex: null,
    startedAt: null,
    timeUpAt: null,
    lastResult: null,
    history: [],
    winnerIdx: null,
    usedWords: [],
  }
}

export function guesserIdx(state: GameState): 0 | 1 {
  return state.performerIdx === 0 ? 1 : 0
}

/** Kategorie, które trafiają na koło (kolejność = segmenty koła). */
export function wheelCategories(settings: Settings, all: Category[]): Category[] {
  const picked = settings.categoryIds
    .map((id) => all.find((c) => c.id === id))
    .filter((c): c is Category => !!c && c.words.length > 0)
  return picked.length ? picked : all.slice(0, 1)
}

export function wheelModes(settings: Settings): ModeId[] {
  return settings.modes.length ? settings.modes : ['pokazuje']
}

export interface SpinOutcome {
  categoryWheelIndex: number
  modeWheelIndex: number
  spinSeed: number
  categoryId: string
  categoryName: string
  mode: ModeId
  word: string
}

/**
 * Losuje wynik obu kół oraz hasło. Wywoływane tylko na jednym urządzeniu
 * (lokalnie albo u hosta) – wynik jest potem rozsyłany.
 */
export function rollSpin(
  state: GameState,
  settings: Settings,
  all: Category[],
): SpinOutcome {
  const cats = wheelCategories(settings, all)
  const modes = wheelModes(settings)
  const categoryWheelIndex = Math.floor(Math.random() * cats.length)
  const modeWheelIndex = Math.floor(Math.random() * modes.length)
  const category = cats[categoryWheelIndex]

  const fresh = category.words.filter((w) => !state.usedWords.includes(w))
  const pool = fresh.length ? fresh : category.words
  const word = pool[Math.floor(Math.random() * pool.length)]

  return {
    categoryWheelIndex,
    modeWheelIndex,
    spinSeed: Math.floor(Math.random() * 1_000_000),
    categoryId: category.id,
    categoryName: category.name,
    mode: modes[modeWheelIndex],
    word,
  }
}

/**
 * Zastosuj wynik losowania. `visible` = czy TO urządzenie może wyświetlić hasło.
 * Stan hosta trzyma hasło zawsze; przed wysłaniem do przeciwnika usuwa je `stripWord`.
 */
export function applySpin(
  state: GameState,
  outcome: SpinOutcome,
  visible: boolean,
): GameState {
  return {
    ...state,
    phase: 'spinning',
    categoryId: outcome.categoryId,
    categoryName: outcome.categoryName,
    mode: outcome.mode,
    word: outcome.word,
    wordVisible: visible,
    categoryWheelIndex: outcome.categoryWheelIndex,
    modeWheelIndex: outcome.modeWheelIndex,
    spinSeed: outcome.spinSeed,
  }
}

export function startPlaying(state: GameState): GameState {
  return { ...state, phase: 'playing', startedAt: Date.now(), timeUpAt: null }
}

export function markTimeUp(state: GameState): GameState {
  if (state.phase !== 'playing') return state
  return { ...state, timeUpAt: Date.now() }
}

export function finishRound(
  state: GameState,
  settings: Settings,
  guessed: boolean,
  playerIds: [string, string],
  wordOverride?: string | null,
): GameState {
  const gIdx = guesserIdx(state)
  const scorerIdx = guessed ? gIdx : null
  const scores: [number, number] = [...state.scores]
  if (scorerIdx !== null) scores[scorerIdx] += 1

  const turnsPlayed: [number, number] = [...state.turnsPlayed]
  turnsPlayed[state.performerIdx] += 1

  const secondsUsed =
    state.startedAt && settings.timerEnabled
      ? Math.min(
          settings.timerSeconds,
          Math.round(((state.timeUpAt ?? Date.now()) - state.startedAt) / 1000),
        )
      : null

  const result: RoundResult = {
    round: state.round,
    performerId: playerIds[state.performerIdx],
    guesserId: playerIds[gIdx],
    categoryName: state.categoryName ?? '—',
    mode: state.mode ?? 'pokazuje',
    word: wordOverride ?? state.word ?? '—',
    guessed,
    secondsUsed,
  }

  const reached = scores.findIndex((s) => s >= settings.targetWins)
  const equalTurns = turnsPlayed[0] === turnsPlayed[1]
  const over = reached >= 0 && equalTurns
  // Przy remisie na styku (oba dobiły do celu) wygrywa ten, kto ma więcej punktów.
  let winnerIdx: 0 | 1 | null = null
  if (over) winnerIdx = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1

  return {
    ...state,
    phase: over && winnerIdx !== null ? 'match-over' : 'result',
    scores,
    turnsPlayed,
    lastResult: result,
    history: [...state.history, result],
    usedWords: [...state.usedWords, result.word],
    winnerIdx,
  }
}

export function nextTurn(state: GameState): GameState {
  return {
    ...state,
    phase: 'turn-intro',
    round: state.round + 1,
    performerIdx: state.performerIdx === 0 ? 1 : 0,
    categoryId: null,
    categoryName: null,
    mode: null,
    word: null,
    wordVisible: false,
    categoryWheelIndex: null,
    modeWheelIndex: null,
    startedAt: null,
    timeUpAt: null,
  }
}

/** Stan bez hasła – to trafia na urządzenie przeciwnika. */
export function stripWord(state: GameState): GameState {
  return { ...state, word: null, wordVisible: false }
}
