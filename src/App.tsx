import { useCallback, useEffect, useMemo, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { PlayersScreen } from './screens/PlayersScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { CategoriesScreen } from './screens/CategoriesScreen'
import { StatsScreen } from './screens/StatsScreen'
import { RulesScreen } from './screens/RulesScreen'
import { LocalGameScreen } from './screens/LocalGameScreen'
import { OnlineGameScreen } from './screens/OnlineGameScreen'
import { getAllCategories, getAllModes } from './data/words'
import { load, makeMatchRecord, save } from './storage'
import { setSoundEnabled, sfx } from './game/sfx'
import type { GameState, PersistedData, Player } from './types'

type Route =
  | 'home'
  | 'players'
  | 'settings'
  | 'categories'
  | 'stats'
  | 'rules'
  | 'local'
  | 'online'

export default function App() {
  const [data, setData] = useState<PersistedData>(() => load())
  /** Stos ekranów – dzięki temu ustawienia otwarte w trakcie gry nie gubią meczu. */
  const [stack, setStack] = useState<Route[]>(['home'])
  const route = stack[stack.length - 1]

  useEffect(() => {
    save(data)
  }, [data])

  useEffect(() => {
    setSoundEnabled(data.settings.sound)
  }, [data.settings.sound])

  useEffect(() => {
    const unlock = () => sfx.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const categories = useMemo(() => getAllCategories(data.customCategories), [data.customCategories])
  const modeDefs = useMemo(() => getAllModes(data.customModes), [data.customModes])
  const me = data.players.find((p) => p.id === data.activePlayerId) ?? null

  // Stos ekranów trzymamy też w historii przeglądarki, żeby systemowy
  // przycisk "wstecz" na Androidzie cofał ekran, a nie zamykał aplikacji.
  useEffect(() => {
    history.replaceState({ stack: ['home'] }, '')
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { stack?: Route[] } | null)?.stack
      setStack(Array.isArray(s) && s.length ? s : ['home'])
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const push = useCallback((r: Route) => {
    setStack((s) => {
      const next = [...s, r]
      history.pushState({ stack: next }, '')
      return next
    })
  }, [])
  const back = useCallback(() => {
    if (history.state?.stack?.length > 1) history.back()
    else setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  }, [])
  const home = useCallback(() => {
    const depth = (history.state as { stack?: Route[] } | null)?.stack?.length ?? 1
    if (depth > 1) history.go(-(depth - 1))
    else setStack(['home'])
  }, [])

  const patch = useCallback((p: Partial<PersistedData>) => setData((d) => ({ ...d, ...p })), [])

  const recordMatch = useCallback(
    (state: GameState, ids: [string, string], mode: 'local' | 'online') => {
      setData((d) => {
        const namesById = new Map(d.players.map((p) => [p.id, p.name]))
        const name = (id: string, fallback: string) => namesById.get(id) ?? fallback
        const winnerIdx = state.winnerIdx
        const players = d.players.map((p) => {
          const idx = ids.indexOf(p.id)
          if (idx < 0) return p
          const guessed = state.history.filter((h) => h.guesserId === p.id && h.guessed).length
          return {
            ...p,
            stats: {
              matches: p.stats.matches + 1,
              matchWins: p.stats.matchWins + (winnerIdx === idx ? 1 : 0),
              points: p.stats.points + state.scores[idx],
              words: p.stats.words + guessed,
            },
          }
        })
        const record = makeMatchRecord({
          mode,
          players: [name(ids[0], 'Gracz 1'), name(ids[1], 'Gracz 2')],
          scores: state.scores,
          winner: winnerIdx !== null ? name(ids[winnerIdx], `Gracz ${winnerIdx + 1}`) : 'Remis',
          targetWins: d.settings.targetWins,
          rounds: state.history.length,
        })
        return { ...d, players, history: [...d.history, record].slice(-100) }
      })
    },
    [],
  )

  // Bez wybranego gracza zawsze pokazujemy wybór gracza.
  if (!me || route === 'players') {
    return (
      <div className="app">
        <PlayersScreen
          players={data.players}
          activeId={data.activePlayerId}
          mustPick={!me}
          onPick={(id) => {
            patch({ activePlayerId: id })
            home()
          }}
          onChange={(players) =>
            setData((d) => ({
              ...d,
              players,
              activePlayerId: players.some((p) => p.id === d.activePlayerId)
                ? d.activePlayerId
                : players[0]?.id ?? null,
            }))
          }
          onBack={back}
        />
      </div>
    )
  }

  const addPlayer = (p: Player) => setData((d) => ({ ...d, players: [...d.players, p] }))
  const hasLocal = stack.includes('local')
  const hasOnline = stack.includes('online')

  return (
    <div className="app">
      {/* Ekrany gry zostają zamontowane, nawet gdy na wierzchu są ustawienia. */}
      {hasLocal && (
        <div className="layer" hidden={route !== 'local'}>
          <LocalGameScreen
            players={data.players}
            activePlayerId={data.activePlayerId}
            settings={data.settings}
            categories={categories}
            modeDefs={modeDefs}
            onAddPlayer={addPlayer}
            onMatchFinished={(state, ids) => recordMatch(state, ids, 'local')}
            onOpenSettings={() => push('settings')}
            onExit={home}
          />
        </div>
      )}

      {hasOnline && (
        <div className="layer" hidden={route !== 'online'}>
          <OnlineGameScreen
            me={me}
            settings={data.settings}
            categories={categories}
            modeDefs={modeDefs}
            onMatchFinished={(state, ids) => recordMatch(state, ids, 'online')}
            onOpenSettings={() => push('settings')}
            onExit={home}
          />
        </div>
      )}

      {route === 'home' && (
        <HomeScreen
          me={me}
          settings={data.settings}
          categories={categories}
          onLocal={() => push('local')}
          onOnline={() => push('online')}
          onSettings={() => push('settings')}
          onCategories={() => push('categories')}
          onStats={() => push('stats')}
          onSwitchPlayer={() => push('players')}
          onRules={() => push('rules')}
        />
      )}

      {route === 'settings' && (
        <SettingsScreen
          settings={data.settings}
          categories={categories}
          customModes={data.customModes}
          onChange={(settings) => patch({ settings })}
          onChangeCustomModes={(customModes) => patch({ customModes })}
          onOpenCategories={() => push('categories')}
          onBack={back}
        />
      )}

      {route === 'categories' && (
        <CategoriesScreen
          customCategories={data.customCategories}
          selectedIds={data.settings.categoryIds}
          onChangeSelection={(categoryIds) =>
            setData((d) => ({ ...d, settings: { ...d.settings, categoryIds } }))
          }
          onChangeCustom={(customCategories) => patch({ customCategories })}
          onBack={back}
        />
      )}

      {route === 'stats' && (
        <StatsScreen
          players={data.players}
          history={data.history}
          onClearHistory={() => patch({ history: [] })}
          onBack={back}
        />
      )}

      {route === 'rules' && <RulesScreen modes={modeDefs} onBack={back} />}
    </div>
  )
}
