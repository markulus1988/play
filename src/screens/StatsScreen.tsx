import { useState } from 'react'
import { Avatar, Card, TopBar } from '../components/ui'
import { GIER, RUNDY, ZAPISANE_GRY, ZGADNIETE_HASLA, ZWYCIESTWA, count } from '../pl'
import type { MatchRecord, Player } from '../types'

export function StatsScreen({
  players,
  history,
  onClearHistory,
  onBack,
}: {
  players: Player[]
  history: MatchRecord[]
  onClearHistory: () => void
  onBack: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const ranked = [...players].sort(
    (a, b) => b.stats.matchWins - a.stats.matchWins || b.stats.points - a.stats.points,
  )

  return (
    <div className="content">
      <TopBar title="Statystyki" subtitle={count(history.length, ZAPISANE_GRY)} onBack={onBack} />

      <Card>
        <div className="stack">
          <h3>Ranking graczy</h3>
          {ranked.length === 0 && <div className="hint">Brak graczy.</div>}
          {ranked.map((p, i) => (
            <div className="row" key={p.id}>
              <span className="muted" style={{ width: 18, textAlign: 'right' }}>
                {i + 1}.
              </span>
              <Avatar emoji={p.emoji} small />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{p.name}</b>
                <div className="hint">
                  {count(p.stats.matchWins, ZWYCIESTWA)} z {count(p.stats.matches, GIER)} ·{' '}
                  {count(p.stats.words, ZGADNIETE_HASLA)}
                </div>
              </div>
              <b style={{ fontSize: 18 }}>{p.stats.points}</b>
            </div>
          ))}
          <div className="hint">Ostatnia kolumna to suma punktów ze wszystkich gier.</div>
        </div>
      </Card>

      <Card>
        <div className="stack">
          <h3>Historia gier</h3>
          {history.length === 0 && <div className="hint">Jeszcze nic tu nie ma.</div>}
          <div className="list">
            {history
              .slice()
              .reverse()
              .map((m) => (
                <div className="list-item" key={m.id}>
                  <span>{m.mode === 'online' ? '📱📱' : '📱'}</span>
                  <div className="grow">
                    <div className="ell">
                      <b>{m.winner}</b> wygrał {Math.max(...m.scores)}:{Math.min(...m.scores)}
                    </div>
                    <div className="hint ell">
                      {m.players[0]} vs {m.players[1]} · {count(m.rounds, RUNDY)} ·{' '}
                      {new Date(m.finishedAt).toLocaleDateString('pl-PL')}
                    </div>
                  </div>
                </div>
              ))}
          </div>
          {history.length > 0 &&
            (confirm ? (
              <div className="stack">
                <div className="error-box">Wyczyścić całą historię gier?</div>
                <div className="row">
                  <button
                    className="btn bad"
                    style={{ flex: 1 }}
                    onClick={() => {
                      onClearHistory()
                      setConfirm(false)
                    }}
                  >
                    Tak, wyczyść
                  </button>
                  <button className="btn ghost" onClick={() => setConfirm(false)}>
                    Nie
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn ghost small" onClick={() => setConfirm(true)}>
                🗑 Wyczyść historię
              </button>
            ))}
        </div>
      </Card>
    </div>
  )
}
