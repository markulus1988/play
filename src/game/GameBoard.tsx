import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { SPIN_MS, Wheel } from '../components/Wheel'
import { Avatar, Card } from '../components/ui'
import { MODES, getModeDef } from '../data/words'
import { sfx } from './sfx'
import { RUNDY, ZGADNIETE_HASLA, count } from '../pl'
import { guesserIdx } from './engine'
import { useWakeLock } from './useWakeLock'
import type { GameState, ModeDef, ModeId, Settings } from '../types'

export interface BoardPlayer {
  name: string
  emoji: string
}

export interface WheelLabelLite {
  id: string
  name: string
  emoji: string
}

export interface GameBoardProps {
  state: GameState
  settings: Settings
  players: [BoardPlayer, BoardPlayer]
  wheelCategories: WheelLabelLite[]
  wheelModes: ModeId[]
  /** Pełne definicje zadań (wbudowanych i własnych) potrzebne do opisów. */
  modeDefs: ModeDef[]
  /** Który gracz siedzi przy TYM urządzeniu. `null` = jeden telefon dla obu. */
  meIdx: 0 | 1 | null
  /** Czy to urządzenie decyduje o przebiegu gry (tryb lokalny albo host). */
  isAuthority: boolean
  onSpin: () => void
  onStart: () => void
  onTimeUp: () => void
  onResult: (guessed: boolean) => void
  onNext: () => void
  onRematch: () => void
  onExit: () => void
  statusBar?: ReactNode
  disabled?: boolean
}

export function GameBoard(props: GameBoardProps) {
  const { state, settings, players, meIdx, isAuthority, disabled } = props
  const gIdx = guesserIdx(state)
  const performer = players[state.performerIdx]
  const guesser = players[gIdx]
  const spinnerIdx = settings.spinner === 'guesser' ? gIdx : state.performerIdx
  const isLocal = meIdx === null
  const iAmPerformer = isLocal ? false : meIdx === state.performerIdx
  const canSpin = isLocal || meIdx === spinnerIdx
  const canStart = isLocal || iAmPerformer
  const mode = state.mode ? getModeDef(state.mode, props.modeDefs) : null

  // Ekran nie może zgasnąć, kiedy trwa runda albo wykonawca czyta hasło.
  useWakeLock(state.phase === 'playing' || state.phase === 'spinning')

  // --- animacja kół (czysto lokalna) ---
  const [spinDone, setSpinDone] = useState(false)
  const [handoffAck, setHandoffAck] = useState(false)
  const spinTokenRef = useRef<number>(-1)

  useEffect(() => {
    if (state.phase === 'turn-intro') {
      setSpinDone(false)
      setHandoffAck(false)
      spinTokenRef.current = -1
      return
    }
    if (state.phase === 'spinning' && spinTokenRef.current !== state.spinSeed) {
      spinTokenRef.current = state.spinSeed
      setSpinDone(false)
      setHandoffAck(false)
      sfx.spin()
      const t = window.setTimeout(() => setSpinDone(true), SPIN_MS + 120)
      return () => window.clearTimeout(t)
    }
    if (state.phase === 'playing' || state.phase === 'result') {
      setSpinDone(true)
    }
  }, [state.phase, state.spinSeed])

  // --- zegar ---
  const [startedLocal, setStartedLocal] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const beeped = useRef<Set<number>>(new Set())
  const timeUpFired = useRef(false)

  useEffect(() => {
    if (state.phase !== 'playing') {
      setStartedLocal(null)
      beeped.current.clear()
      timeUpFired.current = false
      return
    }
    setStartedLocal(Date.now())
    setNow(Date.now())
    beeped.current.clear()
    timeUpFired.current = false
  }, [state.phase, state.round])

  useEffect(() => {
    if (state.phase !== 'playing' || !settings.timerEnabled || startedLocal === null) return
    const i = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(i)
  }, [state.phase, settings.timerEnabled, startedLocal])

  const elapsed = startedLocal === null ? 0 : (now - startedLocal) / 1000
  const timeLeft = settings.timerEnabled
    ? Math.max(0, settings.timerSeconds - Math.floor(elapsed))
    : null
  const timeIsUp = !!state.timeUpAt || (timeLeft !== null && timeLeft <= 0 && startedLocal !== null)

  useEffect(() => {
    if (state.phase !== 'playing' || timeLeft === null) return
    if (timeLeft > 0 && timeLeft <= 3 && !beeped.current.has(timeLeft)) {
      beeped.current.add(timeLeft)
      sfx.lastSeconds()
    }
    if (timeLeft === 0 && !timeUpFired.current) {
      timeUpFired.current = true
      sfx.timeUp()
      if (isAuthority && !state.timeUpAt) props.onTimeUp()
    }
  }, [timeLeft, state.phase, state.timeUpAt, isAuthority, props])

  // --- dźwięki wyników ---
  const lastAnnounced = useRef<number>(-1)
  useEffect(() => {
    if (state.phase === 'result' && state.lastResult && lastAnnounced.current !== state.round) {
      lastAnnounced.current = state.round
      if (state.lastResult.guessed) sfx.good()
      else sfx.miss()
    }
    if (state.phase === 'match-over' && lastAnnounced.current !== -2) {
      lastAnnounced.current = -2
      sfx.win()
    }
  }, [state.phase, state.round, state.lastResult])

  const catSegments = props.wheelCategories.map((c) => ({ label: c.name, emoji: c.emoji }))
  const modeSegments = props.wheelModes.map((m) => {
    const d = getModeDef(m, props.modeDefs)
    return { label: d.label, color: d.color, emoji: d.emoji }
  })

  return (
    <div className="content">
      {props.statusBar}

      <Scoreboard
        players={players}
        scores={state.scores}
        performerIdx={state.performerIdx}
        target={settings.targetWins}
        meIdx={meIdx}
      />

      {state.phase === 'match-over' ? (
        <MatchOver {...props} />
      ) : state.phase === 'result' ? (
        <ResultView {...props} />
      ) : state.phase === 'playing' ? (
        <PlayingView
          {...props}
          timeLeft={timeLeft}
          timeIsUp={timeIsUp}
          iAmPerformer={iAmPerformer}
        />
      ) : (
        <>
          <div className="wheels">
            <Wheel
              caption="Kategoria"
              segments={catSegments}
              targetIndex={state.categoryWheelIndex}
              spinToken={state.phase === 'spinning' ? state.spinSeed : null}
            />
            <Wheel
              caption="Zadanie"
              segments={modeSegments}
              targetIndex={state.modeWheelIndex}
              spinToken={state.phase === 'spinning' ? state.spinSeed : null}
            />
          </div>

          {state.phase === 'turn-intro' && (
            <TurnIntro
              round={state.round}
              performer={performer}
              guesser={guesser}
              spinnerName={players[spinnerIdx].name}
              canSpin={canSpin && !disabled}
              isLocal={isLocal}
              onSpin={props.onSpin}
            />
          )}

          {state.phase === 'spinning' && !spinDone && (
            <div className="card center">
              <div className="pulse" style={{ fontSize: 17, fontWeight: 700 }}>
                Losujemy<span className="dots" />
              </div>
            </div>
          )}

          {state.phase === 'spinning' && spinDone && (
            <>
              <div className="wheel-result-row card tight">
                <div className="row" style={{ justifyContent: 'space-around' }}>
                  <div className="center" style={{ minWidth: 0 }}>
                    <div className="wheel-label">Kategoria</div>
                    <div className="wheel-result">{state.categoryName}</div>
                  </div>
                  <div className="center" style={{ minWidth: 0 }}>
                    <div className="wheel-label">Zadanie</div>
                    <div className="wheel-result" style={{ color: mode?.color }}>
                      {mode?.emoji} {mode?.label}
                    </div>
                  </div>
                </div>
              </div>

              {isLocal && !handoffAck ? (
                <Handoff performer={performer} onAck={() => setHandoffAck(true)} />
              ) : state.wordVisible && state.word ? (
                <RevealWord
                  word={state.word}
                  def={mode}
                  canStart={canStart && !disabled}
                  timerSeconds={settings.timerEnabled ? settings.timerSeconds : null}
                  onStart={props.onStart}
                />
              ) : (
                <WaitingForPerformer performer={performer} def={mode} />
              )}
            </>
          )}
        </>
      )}

      <div className="spacer" />
      <button className="btn ghost small" onClick={props.onExit}>
        Zakończ grę
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Scoreboard({
  players,
  scores,
  performerIdx,
  target,
  meIdx,
}: {
  players: [BoardPlayer, BoardPlayer]
  scores: [number, number]
  performerIdx: 0 | 1
  target: number
  meIdx: 0 | 1 | null
}) {
  return (
    <Card tight>
      <div className="scoreboard">
        <SideScore player={players[0]} score={scores[0]} performing={performerIdx === 0} me={meIdx === 0} />
        <div className="score-sep">do {target}</div>
        <SideScore player={players[1]} score={scores[1]} performing={performerIdx === 1} me={meIdx === 1} />
      </div>
    </Card>
  )
}

function SideScore({
  player,
  score,
  performing,
  me,
}: {
  player: BoardPlayer
  score: number
  performing: boolean
  me: boolean
}) {
  return (
    <div className={`score-side${performing ? ' active' : ''}`}>
      <Avatar emoji={player.emoji} small />
      <div className="name">
        {player.name}
        {me ? ' (Ty)' : ''}
      </div>
      <div className="pts">{score}</div>
      <div className="role">{performing ? 'wykonuje' : 'zgaduje'}</div>
    </div>
  )
}

function TurnIntro({
  round,
  performer,
  guesser,
  spinnerName,
  canSpin,
  isLocal,
  onSpin,
}: {
  round: number
  performer: BoardPlayer
  guesser: BoardPlayer
  spinnerName: string
  canSpin: boolean
  isLocal: boolean
  onSpin: () => void
}) {
  return (
    <div className="stack">
      <Card>
        <div className="stack" style={{ gap: 8 }}>
          <h3>Runda {round}</h3>
          <div className="row">
            <Avatar emoji={performer.emoji} small />
            <div>
              <b>{performer.name}</b> wykonuje zadanie
            </div>
          </div>
          <div className="row">
            <Avatar emoji={guesser.emoji} small />
            <div>
              <b>{guesser.name}</b> zgaduje i zdobywa punkt
            </div>
          </div>
          <div className="hint">
            {isLocal
              ? `Kołami kręci ${spinnerName}. Hasło zobaczy tylko ${performer.name} po podaniu telefonu.`
              : `Kołami kręci ${spinnerName}. Hasło pojawi się wyłącznie na telefonie gracza ${performer.name}.`}
          </div>
        </div>
      </Card>
      <button className="btn primary block huge" disabled={!canSpin} onClick={onSpin}>
        {canSpin ? '🎡 Zakręć kołami' : `Kręci ${spinnerName}…`}
      </button>
    </div>
  )
}

function Handoff({ performer, onAck }: { performer: BoardPlayer; onAck: () => void }) {
  return (
    <div className="stack">
      <Card>
        <div className="center stack" style={{ gap: 10 }}>
          <div style={{ fontSize: 40 }}>📲</div>
          <h2>Podaj telefon</h2>
          <p className="muted">
            Telefon trafia do gracza <b style={{ color: 'var(--text)' }}>{performer.name}</b>.
            Reszta niech nie zagląda!
          </p>
        </div>
      </Card>
      <button className="btn primary block huge" onClick={onAck}>
        Jestem {performer.name} – pokaż hasło
      </button>
    </div>
  )
}

function RevealWord({
  word,
  def: maybeDef,
  canStart,
  timerSeconds,
  onStart,
}: {
  word: string
  def: ModeDef | null
  canStart: boolean
  timerSeconds: number | null
  onStart: () => void
}) {
  const def = maybeDef ?? MODES[0]
  return (
    <div className="stack">
      <div className="word-card">
        <div className="wheel-label" style={{ marginBottom: 8 }}>
          Twoje hasło
        </div>
        <div className={word.length > 22 ? 'word long' : 'word'}>{word}</div>
      </div>
      <div className="mode-banner" style={{ borderColor: def.color + '77' }}>
        <div className="big">{def.emoji}</div>
        <div className="txt">
          <b style={{ color: def.color }}>{def.label}</b>
          <div className="hint">{def.rules}</div>
        </div>
      </div>
      <button className="btn ok block huge" disabled={!canStart} onClick={onStart}>
        {timerSeconds ? `Start – mam ${timerSeconds} s` : 'Start'}
      </button>
    </div>
  )
}

function WaitingForPerformer({
  performer,
  def,
}: {
  performer: BoardPlayer
  def: ModeDef | null
}) {
  return (
    <div className="stack">
      <div className="secret-note">
        🔒 Hasło widzi tylko <b>{performer.name}</b> na swoim telefonie. U Ciebie zostaje ukryte.
      </div>
      {def && (
        <div className="mode-banner" style={{ borderColor: def.color + '77' }}>
          <div className="big">{def.emoji}</div>
          <div className="txt">
            <b style={{ color: def.color }}>{performer.name} {def.label.toLowerCase()}</b>
            <div className="hint">{def.rules}</div>
          </div>
        </div>
      )}
      <Card>
        <div className="center pulse" style={{ fontWeight: 700 }}>
          Czekam, aż {performer.name} wystartuje<span className="dots" />
        </div>
      </Card>
    </div>
  )
}

function PlayingView({
  state,
  settings,
  players,
  timeLeft,
  timeIsUp,
  iAmPerformer,
  meIdx,
  modeDefs,
  disabled,
  onResult,
}: GameBoardProps & { timeLeft: number | null; timeIsUp: boolean; iAmPerformer: boolean }) {
  const def = state.mode ? getModeDef(state.mode, modeDefs) : MODES[0]
  const performer = players[state.performerIdx]
  const showWord = state.wordVisible && state.word
  const isLocal = meIdx === null
  return (
    <div className="stack">
      {settings.timerEnabled ? (
        <TimerRing
          left={timeLeft ?? 0}
          total={settings.timerSeconds}
          over={timeIsUp}
        />
      ) : (
        <Card>
          <div className="center" style={{ fontWeight: 700 }}>
            ⏱️ Bez limitu czasu
          </div>
        </Card>
      )}

      <div className="mode-banner" style={{ borderColor: def.color + '77' }}>
        <div className="big">{def.emoji}</div>
        <div className="txt">
          <b style={{ color: def.color }}>
            {isLocal || iAmPerformer ? def.label : `${performer.name} ${def.label.toLowerCase()}`}
          </b>
          <div className="hint">
            Kategoria: {state.categoryName}
            {!showWord && ' · hasło ukryte'}
          </div>
        </div>
      </div>

      {showWord ? (
        <div className="word-card" style={{ padding: '16px 14px' }}>
          <div className={state.word!.length > 22 ? 'word long' : 'word'}>{state.word}</div>
        </div>
      ) : (
        <Card>
          <div className="center stack" style={{ gap: 6 }}>
            <div style={{ fontSize: 32 }}>🤔</div>
            <b>Zgaduj!</b>
            <div className="hint">Mów na głos wszystko, co Ci przychodzi do głowy.</div>
          </div>
        </Card>
      )}

      {timeIsUp && (
        <div className="error-box center">
          <b>Czas minął!</b> Zaznaczcie, czy hasło padło przed końcem.
        </div>
      )}

      <div className="row">
        <button
          className="btn ok"
          style={{ flex: 2 }}
          disabled={disabled}
          onClick={() => onResult(true)}
        >
          ✅ Zgadnięte
        </button>
        <button
          className="btn bad"
          style={{ flex: 1 }}
          disabled={disabled}
          onClick={() => onResult(false)}
        >
          ⏭ Pas
        </button>
      </div>
      <div className="hint center">
        Punkt dostaje zgadujący: {players[state.performerIdx === 0 ? 1 : 0].name}
      </div>
    </div>
  )
}

function TimerRing({ left, total, over }: { left: number; total: number; over: boolean }) {
  const pct = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0
  const r = 78
  const circ = 2 * Math.PI * r
  const warn = !over && left <= 10
  return (
    <div className={`timer${over ? ' over' : warn ? ' warn' : ''}`}>
      <svg viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={over ? '#ff7a7a' : warn ? '#ffb14d' : '#6be5a5'}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s ease' }}
        />
      </svg>
      <div className="val">{over ? 'KONIEC' : left}</div>
    </div>
  )
}

function ResultView({ state, players, settings, modeDefs, onNext, disabled }: GameBoardProps) {
  const r = state.lastResult
  if (!r) return null
  const gIdx = state.performerIdx === 0 ? 1 : 0
  const suddenDeath =
    state.scores[0] === state.scores[1] && state.scores[0] >= settings.targetWins
  return (
    <div className="stack">
      <Card>
        <div className="center stack" style={{ gap: 10 }}>
          <div style={{ fontSize: 42 }}>{r.guessed ? '🎉' : '😅'}</div>
          <h2>{r.guessed ? `Punkt dla ${players[gIdx].name}!` : 'Bez punktu'}</h2>
          <div className="wheel-label">Hasło</div>
          <div className={r.word.length > 22 ? 'word long' : 'word'}>{r.word}</div>
          <div className="hint">
            {r.categoryName} · {getModeDef(r.mode, modeDefs).label}
            {r.secondsUsed !== null && r.guessed ? ` · ${r.secondsUsed} s` : ''}
          </div>
        </div>
      </Card>
      {suddenDeath && (
        <div className="secret-note">
          ⚡ Remis {state.scores[0]}:{state.scores[1]} – dogrywka! Gramy do pierwszej przewagi po
          równej liczbie tur.
        </div>
      )}
      <button className="btn primary block huge" disabled={disabled} onClick={onNext}>
        Następna runda →
      </button>
    </div>
  )
}

function MatchOver({
  state,
  players,
  settings,
  modeDefs,
  onRematch,
  onExit,
  disabled,
}: GameBoardProps) {
  const w = state.winnerIdx
  const guessedCount = state.history.filter((h) => h.guessed).length
  return (
    <div className="stack">
      <div className="banner-win">
        <div style={{ fontSize: 46 }}>🏆</div>
        <div className="wheel-label">Zwycięzca</div>
        <div className="who">
          {w !== null ? `${players[w].emoji} ${players[w].name}` : 'Remis'}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          {state.scores[0]} : {state.scores[1]} (grali do {settings.targetWins})
        </div>
      </div>
      <Card>
        <div className="stack" style={{ gap: 6 }}>
          <h3>Podsumowanie</h3>
          <div className="muted">
            {count(state.history.length, RUNDY)} · {count(guessedCount, ZGADNIETE_HASLA)}
          </div>
        </div>
      </Card>
      {state.history.length > 0 && (
        <Card>
          <div className="stack" style={{ gap: 8 }}>
            <h3>Hasła z tej gry</h3>
            <div className="list">
              {state.history
                .slice()
                .reverse()
                .map((h, i) => (
                  <div className="list-item" key={`${h.round}-${i}`}>
                    <span>{h.guessed ? '✅' : '❌'}</span>
                    <span className="grow ell">{h.word}</span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {getModeDef(h.mode, modeDefs).short}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      )}
      <button className="btn primary block huge" disabled={disabled} onClick={onRematch}>
        🔄 Rewanż
      </button>
      <button className="btn ghost block" onClick={onExit}>
        Wyjdź do menu
      </button>
    </div>
  )
}
