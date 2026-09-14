import { Avatar, Card, TopBar } from '../components/ui'
import { GRY, HASLA, KATEGORIE, ZWYCIESTWA, count } from '../pl'
import type { Category, Player, Settings } from '../types'

export function HomeScreen({
  me,
  settings,
  categories,
  onLocal,
  onOnline,
  onSettings,
  onCategories,
  onStats,
  onSwitchPlayer,
  onRules,
}: {
  me: Player
  settings: Settings
  categories: Category[]
  onLocal: () => void
  onOnline: () => void
  onSettings: () => void
  onCategories: () => void
  onStats: () => void
  onSwitchPlayer: () => void
  onRules: () => void
}) {
  const selected = categories.filter((c) => settings.categoryIds.includes(c.id))
  const words = selected.reduce((n, c) => n + c.words.length, 0)

  return (
    <div className="content">
      <TopBar
        title="Kalambury"
        subtitle="1 na 1 · dwa koła · tajne hasła"
        right={
          <button className="btn icon" aria-label="Zmień gracza" onClick={onSwitchPlayer}>
            {me.emoji}
          </button>
        }
      />

      <Card tight>
        <div className="row">
          <Avatar emoji={me.emoji} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>Cześć, {me.name}!</b>
            <div className="hint">
              {me.stats.matches > 0
                ? `${count(me.stats.matches, GRY)} · ${count(me.stats.matchWins, ZWYCIESTWA)} · ${me.stats.points} pkt`
                : 'Jeszcze bez rozegranej gry – czas to zmienić.'}
            </div>
          </div>
          <button className="btn small ghost" onClick={onSwitchPlayer}>
            Zmień
          </button>
        </div>
      </Card>

      <button className="btn primary block huge" onClick={onOnline}>
        📱📱 Gra na dwóch telefonach
      </button>
      <button className="btn block huge" onClick={onLocal}>
        📱 Gra na jednym telefonie
      </button>

      <Card>
        <div className="stack" style={{ gap: 8 }}>
          <h3>Tak teraz gracie</h3>
          <div className="muted">
            Do {settings.targetWins} punktów ·{' '}
            {settings.timerEnabled ? `${settings.timerSeconds} s na hasło` : 'bez limitu czasu'}
          </div>
          <div className="muted">
            {count(selected.length, KATEGORIE)}, {count(words, HASLA)}
          </div>
          <div className="row" style={{ marginTop: 4 }}>
            <button className="btn small" style={{ flex: 1 }} onClick={onSettings}>
              ⚙️ Ustawienia
            </button>
            <button className="btn small" style={{ flex: 1 }} onClick={onCategories}>
              🗂 Kategorie
            </button>
          </div>
        </div>
      </Card>

      <div className="row">
        <button className="btn small" style={{ flex: 1 }} onClick={onStats}>
          📊 Statystyki
        </button>
        <button className="btn small" style={{ flex: 1 }} onClick={onRules}>
          ❓ Zasady
        </button>
      </div>
    </div>
  )
}
