import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar, Card, TopBar } from '../components/ui'
import { GameBoard } from '../game/GameBoard'
import {
  applySpin,
  createGame,
  finishRound,
  guesserIdx,
  markTimeUp,
  nextTurn,
  rollSpin,
  startPlaying,
  stripWord,
  wheelCategories,
  wheelModes,
} from '../game/engine'
import { KATEGORIE, count } from '../pl'
import { PLAYER_EMOJIS } from '../storage'
import { Room, normalizeCode } from '../net/peer'
import type { ConnStatus, Intent, Msg, PeerPlayerInfo, RoomSync } from '../net/peer'
import type { Category, GameState, ModeDef, Player, Settings } from '../types'

type Role = 'host' | 'guest'

export function OnlineGameScreen({
  me,
  settings,
  categories,
  modeDefs,
  onMatchFinished,
  onOpenSettings,
  onExit,
}: {
  me: Player
  settings: Settings
  categories: Category[]
  modeDefs: ModeDef[]
  onMatchFinished: (state: GameState, ids: [string, string]) => void
  onOpenSettings: () => void
  onExit: () => void
}) {
  const [role, setRole] = useState<Role | null>(null)
  const [status, setStatus] = useState<ConnStatus>('idle')
  const [detail, setDetail] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [peerInfo, setPeerInfo] = useState<PeerPlayerInfo | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [sync, setSync] = useState<RoomSync | null>(null)

  const roomRef = useRef<Room | null>(null)
  const roleRef = useRef<Role | null>(null)
  const stateRef = useRef<GameState | null>(null)
  const settingsRef = useRef(settings)
  const categoriesRef = useRef(categories)
  const modeDefsRef = useRef(modeDefs)
  const savedRef = useRef(false)

  settingsRef.current = settings
  categoriesRef.current = categories
  modeDefsRef.current = modeDefs
  stateRef.current = gameState
  roleRef.current = role

  const meInfo: PeerPlayerInfo = { id: me.id, name: me.name, emoji: me.emoji }

  // Oba telefony losują awatary niezależnie, więc czasem wypadnie ten sam –
  // przeciwnikowi podmieniamy go lokalnie, żeby dało się ich odróżnić.
  const peer: PeerPlayerInfo | null = peerInfo
    ? {
        ...peerInfo,
        emoji:
          peerInfo.emoji === me.emoji ? distinctEmoji(peerInfo.id, me.emoji) : peerInfo.emoji,
      }
    : null

  const buildSync = useCallback((): RoomSync => {
    const s = settingsRef.current
    const cats = wheelCategories(s, categoriesRef.current)
    const modeIds = wheelModes(s)
    return {
      settings: s,
      categories: cats.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji })),
      modes: modeIds,
      modeDefs: modeDefsRef.current.filter((m) => modeIds.includes(m.id)),
    }
  }, [])

  /** Host: rozsyła stan, usuwając hasło, jeśli gość nie jest wykonawcą. */
  const broadcast = useCallback((next: GameState) => {
    const room = roomRef.current
    if (!room) return
    const guestIsPerformer = next.performerIdx === 1
    const forGuest: GameState = guestIsPerformer
      ? { ...next, wordVisible: true }
      : stripWord(next)
    room.send({ t: 'state', state: forGuest, youAre: 1 })
  }, [])

  const setAndBroadcast = useCallback(
    (updater: (s: GameState) => GameState) => {
      setGameState((prev) => {
        if (!prev) return prev
        const next = updater(prev)
        broadcast(next)
        return next
      })
    },
    [broadcast],
  )

  const handleIntent = useCallback(
    (intent: Intent) => {
      const s = stateRef.current
      if (roleRef.current !== 'host') return
      if (intent.action === 'quit') {
        setDetail('Przeciwnik opuścił grę.')
        return
      }
      if (!s) return
      const cfg = settingsRef.current
      const gIdx = guesserIdx(s)
      const spinnerIdx = cfg.spinner === 'guesser' ? gIdx : s.performerIdx

      switch (intent.action) {
        case 'spin':
          if (s.phase !== 'turn-intro' || spinnerIdx !== 1) return
          setAndBroadcast((prev) =>
            applySpin(prev, rollSpin(prev, cfg, categoriesRef.current), prev.performerIdx === 0),
          )
          return
        case 'start':
          if (s.phase !== 'spinning' || s.performerIdx !== 1) return
          setAndBroadcast(startPlaying)
          return
        case 'timeup':
          if (s.phase !== 'playing') return
          setAndBroadcast(markTimeUp)
          return
        case 'result':
          if (s.phase !== 'playing') return
          setAndBroadcast((prev) =>
            finishRound(prev, cfg, intent.guessed, [me.id, peerInfo?.id ?? 'guest']),
          )
          return
        case 'next':
          if (s.phase !== 'result') return
          setAndBroadcast(nextTurn)
          return
        case 'rematch':
          if (s.phase !== 'match-over') return
          savedRef.current = false
          setAndBroadcast(() => createGame(Math.random() < 0.5 ? 0 : 1))
          return
        default:
          return
      }
    },
    [me.id, peerInfo?.id, setAndBroadcast],
  )

  const onMessage = useCallback(
    (msg: Msg) => {
      if (msg.t === 'hello') {
        setPeerInfo(msg.player)
        roomRef.current?.send({ t: 'welcome', player: meInfo, sync: buildSync() })
        // Wznowienie po chwilowym rozłączeniu – dogrywamy aktualny stan.
        const s = stateRef.current
        if (s) broadcast(s)
        setDetail(null)
        return
      }
      if (msg.t === 'welcome') {
        setPeerInfo(msg.player)
        setSync(msg.sync)
        setDetail(null)
        return
      }
      if (msg.t === 'sync') {
        setSync(msg.sync)
        return
      }
      if (msg.t === 'state') {
        setGameState(msg.state)
        return
      }
      if (msg.t === 'intent') {
        handleIntent(msg.intent)
      }
    },
    [broadcast, buildSync, handleIntent, meInfo],
  )

  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const openRoom = useCallback(
    (as: Role, joinWith?: string) => {
      roomRef.current?.destroy()
      setDetail(null)
      setPeerInfo(null)
      setGameState(null)
      setSync(null)
      savedRef.current = false
      const room = new Room({
        onStatus: (st, d) => {
          setStatus(st)
          if (d) setDetail(d)
        },
        onCode: (c) => setCode(c),
        onMessage: (m) => onMessageRef.current(m),
      })
      roomRef.current = room
      setRole(as)
      roleRef.current = as
      if (as === 'host') room.host()
      else room.join(joinWith ?? '')
    },
    [],
  )

  // Gość przedstawia się, gdy tylko połączenie stanie.
  useEffect(() => {
    if (status === 'connected' && role === 'guest') {
      roomRef.current?.send({ t: 'hello', player: meInfo })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role])

  // Host rozsyła zmiany ustawień w trakcie oczekiwania.
  useEffect(() => {
    if (role === 'host' && status === 'connected') {
      roomRef.current?.send({ t: 'sync', sync: buildSync() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status, settings, categories, modeDefs])

  useEffect(() => {
    return () => {
      roomRef.current?.destroy()
      roomRef.current = null
    }
  }, [])

  // Zapis wyniku meczu – tylko u hosta (ma pełne dane obu graczy).
  useEffect(() => {
    if (
      role === 'host' &&
      gameState?.phase === 'match-over' &&
      !savedRef.current &&
      peerInfo
    ) {
      savedRef.current = true
      onMatchFinished(gameState, [me.id, peerInfo.id])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.phase, role, peerInfo?.id])

  function leave() {
    roomRef.current?.send({ t: 'intent', intent: { action: 'quit' } })
    roomRef.current?.destroy()
    roomRef.current = null
    onExit()
  }

  const sendIntent = (intent: Intent) => roomRef.current?.send({ t: 'intent', intent })

  /* ---------------- ekrany ---------------- */

  if (!role) {
    return (
      <LobbyMenu
        me={me}
        joinCode={joinCode}
        setJoinCode={setJoinCode}
        onHost={() => openRoom('host')}
        onJoin={(c) => openRoom('guest', c)}
        onExit={onExit}
      />
    )
  }

  const effectiveSettings: Settings = role === 'host' ? settings : sync?.settings ?? settings
  const wheelCats =
    role === 'host'
      ? wheelCategories(settings, categories).map((c) => ({
          id: c.id,
          name: c.name,
          emoji: c.emoji,
        }))
      : sync?.categories ?? []
  const wheelModeIds = role === 'host' ? wheelModes(settings) : sync?.modes ?? ['pokazuje']
  const effectiveModeDefs = role === 'host' ? modeDefs : sync?.modeDefs ?? []

  if (gameState && peerInfo && peer) {
    const meIdx: 0 | 1 = role === 'host' ? 0 : 1
    const p0 = role === 'host' ? meInfo : peer
    const p1 = role === 'host' ? peer : meInfo
    return (
      <>
        <TopBar
          title={`Pokój ${code || joinCode}`}
          subtitle={`${p0.name} vs ${p1.name}`}
          onBack={leave}
          right={
            role === 'host' ? (
              <button className="btn icon" aria-label="Ustawienia" onClick={onOpenSettings}>
                ⚙️
              </button>
            ) : undefined
          }
        />
        <GameBoard
          state={gameState}
          settings={effectiveSettings}
          players={[
            { name: p0.name, emoji: p0.emoji },
            { name: p1.name, emoji: p1.emoji },
          ]}
          wheelCategories={wheelCats}
          wheelModes={wheelModeIds}
          modeDefs={effectiveModeDefs}
          meIdx={meIdx}
          isAuthority={role === 'host'}
          disabled={status !== 'connected'}
          statusBar={<ConnBanner status={status} detail={detail} onRetry={() => openRoom(role, joinCode)} />}
          onSpin={() =>
            role === 'host'
              ? setAndBroadcast((prev) =>
                  applySpin(
                    prev,
                    rollSpin(prev, effectiveSettings, categories),
                    prev.performerIdx === 0,
                  ),
                )
              : sendIntent({ action: 'spin' })
          }
          onStart={() =>
            role === 'host' ? setAndBroadcast(startPlaying) : sendIntent({ action: 'start' })
          }
          onTimeUp={() =>
            role === 'host' ? setAndBroadcast(markTimeUp) : sendIntent({ action: 'timeup' })
          }
          onResult={(guessed) =>
            role === 'host'
              ? setAndBroadcast((prev) =>
                  finishRound(prev, effectiveSettings, guessed, [me.id, peerInfo.id]),
                )
              : sendIntent({ action: 'result', guessed })
          }
          onNext={() => (role === 'host' ? setAndBroadcast(nextTurn) : sendIntent({ action: 'next' }))}
          onRematch={() => {
            if (role === 'host') {
              savedRef.current = false
              setAndBroadcast(() => createGame(Math.random() < 0.5 ? 0 : 1))
            } else {
              sendIntent({ action: 'rematch' })
            }
          }}
          onExit={leave}
        />
      </>
    )
  }

  return (
    <WaitingRoom
      role={role}
      me={me}
      code={code}
      status={status}
      detail={detail}
      peerInfo={peer}
      settings={effectiveSettings}
      categoriesCount={wheelCats.length}
      onStart={() => {
        const fresh = createGame(Math.random() < 0.5 ? 0 : 1)
        savedRef.current = false
        setGameState(fresh)
        broadcast(fresh)
      }}
      onRetry={() => openRoom(role, joinCode)}
      onOpenSettings={onOpenSettings}
      onExit={leave}
    />
  )
}

/* ------------------------------------------------------------------ */

function LobbyMenu({
  me,
  joinCode,
  setJoinCode,
  onHost,
  onJoin,
  onExit,
}: {
  me: Player
  joinCode: string
  setJoinCode: (c: string) => void
  onHost: () => void
  onJoin: (code: string) => void
  onExit: () => void
}) {
  return (
    <div className="content">
      <TopBar title="Dwa telefony" subtitle="Każdy widzi tylko swoje hasło" onBack={onExit} />

      <Card tight>
        <div className="row">
          <Avatar emoji={me.emoji} />
          <div>
            <b>{me.name}</b>
            <div className="hint">Grasz na tym telefonie</div>
          </div>
        </div>
      </Card>

      <button className="btn primary block huge" onClick={onHost}>
        🎲 Utwórz pokój
      </button>

      <Card>
        <div className="stack">
          <h3>Dołącz do pokoju</h3>
          <input
            className="code-input"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="KOD"
            value={joinCode}
            maxLength={4}
            onChange={(e) => setJoinCode(normalizeCode(e.target.value))}
          />
          <button
            className="btn block"
            disabled={joinCode.length < 4}
            onClick={() => onJoin(joinCode)}
          >
            Dołącz →
          </button>
        </div>
      </Card>

      <div className="hint">
        Telefony łączą się bezpośrednio (WebRTC). Najlepiej działa, gdy oba są w tej samej sieci
        Wi‑Fi, ale zwykle działa też przez internet. Ustawienia gry – kategorie, czas, liczba
        zwycięstw – bierzemy od gracza, który tworzy pokój.
      </div>
    </div>
  )
}

function WaitingRoom({
  role,
  me,
  code,
  status,
  detail,
  peerInfo,
  settings,
  categoriesCount,
  onStart,
  onRetry,
  onOpenSettings,
  onExit,
}: {
  role: Role
  me: Player
  code: string
  status: ConnStatus
  detail: string | null
  peerInfo: PeerPlayerInfo | null
  settings: Settings
  categoriesCount: number
  onStart: () => void
  onRetry: () => void
  onOpenSettings: () => void
  onExit: () => void
}) {
  const both = !!peerInfo && status === 'connected'
  return (
    <div className="content">
      <TopBar
        title={role === 'host' ? 'Twój pokój' : 'Dołączanie'}
        onBack={onExit}
        right={
          role === 'host' ? (
            <button className="btn icon" aria-label="Ustawienia" onClick={onOpenSettings}>
              ⚙️
            </button>
          ) : undefined
        }
      />

      <ConnBanner status={status} detail={detail} onRetry={onRetry} />

      {role === 'host' && (
        <Card>
          <div className="stack center" style={{ gap: 4 }}>
            <h3>Kod pokoju</h3>
            <div className="room-code">{code || '····'}</div>
            <div className="hint">Podaj ten kod drugiemu graczowi – wpisuje go w „Dołącz”.</div>
          </div>
        </Card>
      )}

      <Card>
        <div className="stack">
          <h3>Gracze</h3>
          <div className="row">
            <Avatar emoji={me.emoji} />
            <div style={{ flex: 1 }}>
              <b>{me.name}</b>
              <div className="hint">{role === 'host' ? 'gospodarz' : 'gość'} · gotowy</div>
            </div>
            <span className="badge live">✓</span>
          </div>
          {peerInfo ? (
            <div className="row">
              <Avatar emoji={peerInfo.emoji} />
              <div style={{ flex: 1 }}>
                <b>{peerInfo.name}</b>
                <div className="hint">{role === 'host' ? 'gość' : 'gospodarz'} · połączony</div>
              </div>
              <span className="badge live">✓</span>
            </div>
          ) : (
            <div className="row">
              <div className="avatar">⏳</div>
              <div style={{ flex: 1 }} className="pulse">
                <b>Czekamy na drugiego gracza</b>
                <div className="hint">
                  {role === 'host' ? 'Niech wpisze kod powyżej' : 'Łączymy z pokojem'}
                  <span className="dots" />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="stack" style={{ gap: 6 }}>
          <h3>Zasady tej gry</h3>
          <div className="muted">
            Gra do {settings.targetWins} pkt ·{' '}
            {settings.timerEnabled ? `${settings.timerSeconds} s na zgadywanie` : 'bez limitu czasu'}{' '}
            · {count(categoriesCount, KATEGORIE)}
          </div>
          <div className="hint">
            Kołami kręci {settings.spinner === 'guesser' ? 'zgadujący' : 'wykonawca'}. Hasło
            wyświetla się tylko na telefonie wykonawcy.
          </div>
        </div>
      </Card>

      {role === 'host' ? (
        <button className="btn primary block huge" disabled={!both} onClick={onStart}>
          {both ? '▶️ Zacznij grę' : 'Czekamy na gracza…'}
        </button>
      ) : (
        <div className="card center pulse">
          {both ? (
            <>
              Gotowe! Czekamy, aż gospodarz zacznie grę<span className="dots" />
            </>
          ) : (
            <>
              Łączymy<span className="dots" />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ConnBanner({
  status,
  detail,
  onRetry,
}: {
  status: ConnStatus
  detail: string | null
  onRetry: () => void
}) {
  if (status === 'connected' && !detail) return null
  const label: Record<ConnStatus, string> = {
    idle: 'Brak połączenia',
    starting: 'Tworzymy pokój…',
    waiting: 'Pokój otwarty – czekamy na gracza',
    connecting: 'Łączymy…',
    connected: 'Połączono',
    disconnected: 'Rozłączono',
    error: 'Błąd połączenia',
  }
  const bad = status === 'error' || status === 'disconnected'
  return (
    <div className={bad ? 'error-box' : 'card tight'}>
      <div className="row">
        <span className={`badge ${status === 'connected' ? 'live' : bad ? 'off' : ''}`}>
          {label[status]}
        </span>
        <div className="grow" />
        {bad && (
          <button className="btn small" onClick={onRetry}>
            Połącz ponownie
          </button>
        )}
      </div>
      {detail && <div className="hint" style={{ marginTop: 8 }}>{detail}</div>}
    </div>
  )
}

/** Deterministyczny, inny niż `taken` awatar dla przeciwnika. */
function distinctEmoji(seed: string, taken: string): string {
  const pool = PLAYER_EMOJIS.filter((e) => e !== taken)
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return pool[hash % pool.length]
}
