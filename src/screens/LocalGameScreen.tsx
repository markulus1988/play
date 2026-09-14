import { useEffect, useRef, useState } from 'react'
import { Avatar, Card, TopBar } from '../components/ui'
import { GameBoard } from '../game/GameBoard'
import {
  applySpin,
  createGame,
  finishRound,
  markTimeUp,
  nextTurn,
  rollSpin,
  startPlaying,
  wheelCategories,
  wheelModes,
} from '../game/engine'
import { GRY, count } from '../pl'
import { makePlayer } from '../storage'
import type { Category, GameState, ModeDef, Player, Settings } from '../types'

export function LocalGameScreen({
  players,
  activePlayerId,
  settings,
  categories,
  modeDefs,
  onAddPlayer,
  onMatchFinished,
  onOpenSettings,
  onExit,
}: {
  players: Player[]
  activePlayerId: string | null
  settings: Settings
  categories: Category[]
  modeDefs: ModeDef[]
  onAddPlayer: (p: Player) => void
  onMatchFinished: (state: GameState, ids: [string, string]) => void
  onOpenSettings: () => void
  onExit: () => void
}) {
  const me = players.find((p) => p.id === activePlayerId) ?? players[0]
  const [opponentId, setOpponentId] = useState<string | null>(null)
  const opponent = players.find((p) => p.id === opponentId) ?? null

  if (!me) {
    return (
      <div className="content">
        <TopBar title="Gra na jednym telefonie" onBack={onExit} />
        <div className="error-box">Najpierw dodaj gracza w zakładce „Gracze”.</div>
      </div>
    )
  }

  if (!opponent) {
    return (
      <OpponentPicker
        me={me}
        players={players}
        onAddPlayer={(p) => {
          onAddPlayer(p)
          setOpponentId(p.id)
        }}
        onPick={setOpponentId}
        onExit={onExit}
      />
    )
  }

  return (
    <LocalMatch
      p1={me}
      p2={opponent}
      settings={settings}
      categories={categories}
      modeDefs={modeDefs}
      onMatchFinished={onMatchFinished}
      onOpenSettings={onOpenSettings}
      onExit={onExit}
    />
  )
}

function OpponentPicker({
  me,
  players,
  onPick,
  onAddPlayer,
  onExit,
}: {
  me: Player
  players: Player[]
  onPick: (id: string) => void
  onAddPlayer: (p: Player) => void
  onExit: () => void
}) {
  const [name, setName] = useState('')
  const others = players.filter((p) => p.id !== me.id)

  return (
    <div className="content">
      <TopBar title="Kto z Tobą gra?" subtitle="Jeden telefon, dwóch graczy" onBack={onExit} />

      <Card tight>
        <div className="row">
          <Avatar emoji={me.emoji} />
          <div>
            <b>{me.name}</b>
            <div className="hint">Gracz 1 (Ty)</div>
          </div>
        </div>
      </Card>

      <div className="stack">
        {others.map((p) => (
          <button key={p.id} className="btn player-tile" onClick={() => onPick(p.id)}>
            <Avatar emoji={p.emoji} />
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 17 }}>{p.name}</span>
              <span className="hint">{count(p.stats.matches, GRY)}</span>
            </span>
            <span>→</span>
          </button>
        ))}
      </div>

      <Card>
        <div className="stack">
          <h3>Albo dodaj nowego</h3>
          <label className="field">
            Imię gracza 2
            <input
              type="text"
              value={name}
              maxLength={18}
              placeholder="np. Marek"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button
            className="btn primary"
            disabled={!name.trim()}
            onClick={() => onAddPlayer(makePlayer(name, players.map((p) => p.emoji)))}
          >
            Dodaj i zacznij
          </button>
        </div>
      </Card>
    </div>
  )
}

function LocalMatch({
  p1,
  p2,
  settings,
  categories,
  modeDefs,
  onMatchFinished,
  onOpenSettings,
  onExit,
}: {
  p1: Player
  p2: Player
  settings: Settings
  categories: Category[]
  modeDefs: ModeDef[]
  onMatchFinished: (state: GameState, ids: [string, string]) => void
  onOpenSettings: () => void
  onExit: () => void
}) {
  const [state, setState] = useState<GameState>(() =>
    createGame(Math.random() < 0.5 ? 0 : 1),
  )
  const ids: [string, string] = [p1.id, p2.id]
  const savedRef = useRef(false)

  useEffect(() => {
    if (state.phase === 'match-over' && !savedRef.current) {
      savedRef.current = true
      onMatchFinished(state, ids)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase])

  const cats = wheelCategories(settings, categories)
  const modes = wheelModes(settings)

  return (
    <>
      <TopBar
        title="Jeden telefon"
        subtitle={`${p1.name} vs ${p2.name}`}
        onBack={onExit}
        right={
          <button className="btn icon" aria-label="Ustawienia" onClick={onOpenSettings}>
            ⚙️
          </button>
        }
      />
      <GameBoard
        state={state}
        settings={settings}
        players={[
          { name: p1.name, emoji: p1.emoji },
          { name: p2.name, emoji: p2.emoji },
        ]}
        wheelCategories={cats.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji }))}
        wheelModes={modes}
        modeDefs={modeDefs}
        meIdx={null}
        isAuthority
        onSpin={() => setState((s) => applySpin(s, rollSpin(s, settings, categories), true))}
        onStart={() => setState(startPlaying)}
        onTimeUp={() => setState(markTimeUp)}
        onResult={(guessed) => setState((s) => finishRound(s, settings, guessed, ids))}
        onNext={() => setState(nextTurn)}
        onRematch={() => {
          savedRef.current = false
          setState(createGame(Math.random() < 0.5 ? 0 : 1))
        }}
        onExit={onExit}
      />
    </>
  )
}
