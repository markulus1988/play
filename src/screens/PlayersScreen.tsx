import { useState } from 'react'
import { Avatar, Card, TopBar } from '../components/ui'
import { PLAYER_EMOJIS, makePlayer } from '../storage'
import { GRY, ZWYCIESTWA, count } from '../pl'
import type { Player } from '../types'

export function PlayersScreen({
  players,
  activeId,
  mustPick,
  onPick,
  onChange,
  onBack,
}: {
  players: Player[]
  activeId: string | null
  mustPick: boolean
  onPick: (id: string) => void
  onChange: (players: Player[]) => void
  onBack: () => void
}) {
  const [adding, setAdding] = useState(players.length === 0)
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  function add() {
    const name = newName.trim()
    if (!name) return
    const p = makePlayer(name, players.map((x) => x.emoji))
    onChange([...players, p])
    setNewName('')
    setAdding(false)
    onPick(p.id)
  }

  function remove(id: string) {
    onChange(players.filter((p) => p.id !== id))
    if (editId === id) setEditId(null)
  }

  return (
    <div className="content">
      <TopBar
        title={mustPick ? 'Kto gra?' : 'Gracze'}
        subtitle={mustPick ? 'Wybierz siebie – aplikacja zapamięta.' : undefined}
        onBack={mustPick ? undefined : onBack}
      />

      <div className="stack">
        {players.map((p) =>
          editId === p.id ? (
            <PlayerEditor
              key={p.id}
              player={p}
              used={players.filter((x) => x.id !== p.id).map((x) => x.emoji)}
              onSave={(next) => {
                onChange(players.map((x) => (x.id === next.id ? next : x)))
                setEditId(null)
              }}
              onCancel={() => setEditId(null)}
              onDelete={() => remove(p.id)}
            />
          ) : (
            <div className="row" key={p.id}>
              <button
                className="btn player-tile"
                style={{
                  flex: 1,
                  borderColor: p.id === activeId ? 'rgba(255,217,61,0.65)' : undefined,
                  background: p.id === activeId ? 'rgba(255,217,61,0.12)' : undefined,
                }}
                onClick={() => onPick(p.id)}
              >
                <Avatar emoji={p.emoji} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 17 }}>{p.name}</span>
                  <span className="hint">
                    {count(p.stats.matches, GRY)} · {count(p.stats.matchWins, ZWYCIESTWA)} ·{' '}
                    {p.stats.points} pkt
                  </span>
                </span>
                {p.id === activeId && <span style={{ fontSize: 18 }}>✓</span>}
              </button>
              <button
                className="btn icon"
                aria-label={`Zmień nazwę: ${p.name}`}
                onClick={() => setEditId(p.id)}
              >
                ✏️
              </button>
            </div>
          ),
        )}

        {adding ? (
          <Card>
            <div className="stack">
              <label className="field">
                Imię gracza
                <input
                  type="text"
                  value={newName}
                  autoFocus
                  maxLength={18}
                  placeholder="np. Ania"
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && add()}
                />
              </label>
              <div className="row">
                <button className="btn primary" style={{ flex: 1 }} onClick={add}>
                  Dodaj
                </button>
                {players.length > 0 && (
                  <button className="btn ghost" onClick={() => setAdding(false)}>
                    Anuluj
                  </button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <button className="btn block" onClick={() => setAdding(true)}>
            ➕ Dodaj gracza
          </button>
        )}
      </div>

      <div className="hint">
        Bez haseł i logowania – wybrany gracz zostaje zapamiętany na tym telefonie. Nazwę i awatar
        możesz zmienić w każdej chwili ✏️.
      </div>
    </div>
  )
}

function PlayerEditor({
  player,
  used,
  onSave,
  onCancel,
  onDelete,
}: {
  player: Player
  used: string[]
  onSave: (p: Player) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(player.name)
  const [emoji, setEmoji] = useState(player.emoji)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Card>
      <div className="stack">
        <label className="field">
          Nazwa
          <input
            type="text"
            value={name}
            maxLength={18}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <h3>Awatar</h3>
        <div className="row-wrap">
          {PLAYER_EMOJIS.map((e) => (
            <button
              key={e}
              className="chip"
              aria-pressed={e === emoji}
              disabled={used.includes(e) && e !== emoji}
              style={{ fontSize: 20, padding: '8px 11px' }}
              onClick={() => setEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="row">
          <button
            className="btn primary"
            style={{ flex: 1 }}
            onClick={() => onSave({ ...player, name: name.trim() || player.name, emoji })}
          >
            Zapisz
          </button>
          <button className="btn ghost" onClick={onCancel}>
            Anuluj
          </button>
        </div>
        {confirmDelete ? (
          <div className="stack">
            <div className="error-box">Usunąć gracza {player.name} wraz z jego statystykami?</div>
            <div className="row">
              <button className="btn bad" style={{ flex: 1 }} onClick={onDelete}>
                Tak, usuń
              </button>
              <button className="btn ghost" onClick={() => setConfirmDelete(false)}>
                Nie
              </button>
            </div>
          </div>
        ) : (
          <button className="btn ghost small" onClick={() => setConfirmDelete(true)}>
            🗑 Usuń gracza
          </button>
        )}
      </div>
    </Card>
  )
}
