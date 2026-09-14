import { useState } from 'react'
import { Card, Segmented, Switch, TopBar } from '../components/ui'
import { MODES } from '../data/words'
import { makeMode } from '../storage'
import { HASLA, count } from '../pl'
import type { Category, ModeDef, ModeId, Settings } from '../types'

const WIN_OPTIONS = [3, 5, 7, 10]
const TIME_OPTIONS = [30, 45, 60, 90, 120]
const MODE_EMOJIS = ['🎭', '🤫', '🎤', '🖍️', '🔊', '🕺', '📣', '🤌', '🦶', '🪄']

export function SettingsScreen({
  settings,
  categories,
  customModes,
  onChange,
  onChangeCustomModes,
  onOpenCategories,
  onBack,
}: {
  settings: Settings
  categories: Category[]
  customModes: ModeDef[]
  onChange: (s: Settings) => void
  onChangeCustomModes: (m: ModeDef[]) => void
  onOpenCategories: () => void
  onBack: () => void
}) {
  const [editing, setEditing] = useState<ModeDef | 'new' | null>(null)
  const selected = categories.filter((c) => settings.categoryIds.includes(c.id))
  const wordCount = selected.reduce((n, c) => n + c.words.length, 0)
  const allModes = [...MODES, ...customModes]

  function toggleMode(id: ModeId) {
    const has = settings.modes.includes(id)
    const next = has ? settings.modes.filter((m) => m !== id) : [...settings.modes, id]
    if (next.length === 0) return // przynajmniej jedno zadanie musi zostać
    onChange({ ...settings, modes: next })
  }

  function saveMode(mode: ModeDef) {
    const exists = customModes.some((m) => m.id === mode.id)
    onChangeCustomModes(
      exists ? customModes.map((m) => (m.id === mode.id ? mode : m)) : [...customModes, mode],
    )
    if (!settings.modes.includes(mode.id)) {
      onChange({ ...settings, modes: [...settings.modes, mode.id] })
    }
    setEditing(null)
  }

  function deleteMode(id: ModeId) {
    onChangeCustomModes(customModes.filter((m) => m.id !== id))
    const next = settings.modes.filter((m) => m !== id)
    onChange({ ...settings, modes: next.length ? next : [MODES[0].id] })
    setEditing(null)
  }

  if (editing) {
    return (
      <ModeEditor
        mode={editing === 'new' ? null : editing}
        taken={customModes.length}
        onSave={saveMode}
        onDelete={editing === 'new' ? undefined : () => deleteMode(editing.id)}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="content">
      <TopBar title="Ustawienia gry" onBack={onBack} />

      <Card>
        <div className="stack">
          <Segmented
            label="Gra do ilu zwycięstw"
            options={WIN_OPTIONS.map((v) => ({ value: v, label: String(v) }))}
            value={WIN_OPTIONS.includes(settings.targetWins) ? settings.targetWins : 0}
            onChange={(v) => onChange({ ...settings, targetWins: v })}
          />
          <label className="field">
            …albo własna liczba
            <input
              type="number"
              min={1}
              max={99}
              value={settings.targetWins}
              onChange={(e) =>
                onChange({
                  ...settings,
                  targetWins: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                })
              }
            />
          </label>
          <div className="hint">
            Punkt zdobywa gracz, który zgadł hasło. Mecz kończy się, gdy ktoś dobije do{' '}
            {settings.targetWins} pkt – zawsze po równej liczbie tur dla obu graczy. Przy remisie
            gramy dogrywkę.
          </div>
        </div>
      </Card>

      <Card>
        <div className="stack">
          <Switch
            label="Odliczanie czasu"
            hint="Zegar startuje, gdy wykonawca naciśnie Start."
            checked={settings.timerEnabled}
            onChange={(v) => onChange({ ...settings, timerEnabled: v })}
          />
          {settings.timerEnabled && (
            <Segmented
              label="Sekundy na zgadywanie"
              options={TIME_OPTIONS.map((v) => ({ value: v, label: `${v} s` }))}
              value={settings.timerSeconds}
              onChange={(v) => onChange({ ...settings, timerSeconds: v })}
            />
          )}
        </div>
      </Card>

      <Card>
        <div className="stack">
          <h3>Zadania na drugim kole</h3>
          <div className="row-wrap">
            {allModes.map((m) => (
              <button
                key={m.id}
                className="chip"
                aria-pressed={settings.modes.includes(m.id)}
                onClick={() => toggleMode(m.id)}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          {customModes.length > 0 && (
            <div className="list">
              {customModes.map((m) => (
                <div className="list-item" key={m.id}>
                  <span>{m.emoji}</span>
                  <div className="grow">
                    <div className="ell" style={{ color: m.color, fontWeight: 700 }}>
                      {m.label}
                    </div>
                    <div className="hint ell">{m.rules || 'bez dodatkowych zasad'}</div>
                  </div>
                  <button
                    className="btn icon small"
                    aria-label={`Edytuj ${m.label}`}
                    onClick={() => setEditing(m)}
                  >
                    ✏️
                  </button>
                </div>
              ))}
            </div>
          )}
          <button className="btn block small" onClick={() => setEditing('new')}>
            ➕ Własne zadanie
          </button>
          <div className="hint">
            {allModes
              .filter((m) => settings.modes.includes(m.id))
              .map((m) => `${m.label}: ${m.rules}`)
              .join(' ')}
          </div>
        </div>
      </Card>

      <Card>
        <div className="stack">
          <h3>Kategorie</h3>
          <div className="muted">
            Wybrane: <b style={{ color: 'var(--text)' }}>{selected.length}</b> ·{' '}
            {count(wordCount, HASLA)}
          </div>
          <div className="row-wrap">
            {selected.slice(0, 8).map((c) => (
              <span className="badge" key={c.id}>
                {c.emoji} {c.name}
              </span>
            ))}
            {selected.length > 8 && <span className="badge">+{selected.length - 8}</span>}
          </div>
          <button className="btn block" onClick={onOpenCategories}>
            Wybierz kategorie i dodaj własne →
          </button>
        </div>
      </Card>

      <Card>
        <div className="stack">
          <Segmented
            label="Kto kręci kołami"
            options={[
              { value: 'guesser', label: 'Zgadujący' },
              { value: 'performer', label: 'Wykonawca' },
            ]}
            value={settings.spinner}
            onChange={(v) => onChange({ ...settings, spinner: v })}
          />
          <div className="hint">
            {settings.spinner === 'guesser'
              ? 'Kołami kręci ten, kto zgaduje – hasło i tak trafia wyłącznie na telefon wykonawcy.'
              : 'Kołami kręci wykonawca na swoim telefonie i od razu widzi hasło.'}
          </div>
          <Switch
            label="Dźwięki i wibracje"
            checked={settings.sound}
            onChange={(v) => onChange({ ...settings, sound: v })}
          />
        </div>
      </Card>
    </div>
  )
}

function ModeEditor({
  mode,
  taken,
  onSave,
  onDelete,
  onCancel,
}: {
  mode: ModeDef | null
  taken: number
  onSave: (m: ModeDef) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(mode?.label ?? '')
  const [emoji, setEmoji] = useState(mode?.emoji ?? MODE_EMOJIS[0])
  const [rules, setRules] = useState(mode?.rules ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const canSave = label.trim().length > 0

  return (
    <div className="content">
      <TopBar
        title={mode ? 'Edytuj zadanie' : 'Nowe zadanie'}
        subtitle="Trafi na drugie koło"
        onBack={onCancel}
      />

      <Card>
        <div className="stack">
          <label className="field">
            Nazwa zadania
            <input
              type="text"
              value={label}
              maxLength={20}
              placeholder="np. Śpiewa"
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <h3>Ikona</h3>
          <div className="row-wrap">
            {MODE_EMOJIS.map((e) => (
              <button
                key={e}
                className="chip"
                aria-pressed={e === emoji}
                style={{ fontSize: 20, padding: '8px 11px' }}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
          <label className="field">
            Zasady – co wolno, a czego nie
            <textarea
              value={rules}
              style={{ minHeight: 90 }}
              placeholder="np. Śpiewasz hasło na dowolną melodię, nie wolno wymówić żadnego słowa z hasła."
              onChange={(e) => setRules(e.target.value)}
            />
          </label>
        </div>
      </Card>

      <button
        className="btn primary block huge"
        disabled={!canSave}
        onClick={() =>
          onSave(
            mode
              ? {
                  ...mode,
                  label: label.trim(),
                  short: label.trim().length > 10 ? label.trim().slice(0, 9) + '…' : label.trim(),
                  emoji,
                  rules: rules.trim(),
                }
              : makeMode(label, emoji, rules, taken),
          )
        }
      >
        Zapisz zadanie
      </button>

      {onDelete &&
        (confirmDelete ? (
          <div className="stack">
            <div className="error-box">Usunąć to zadanie z koła?</div>
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
            🗑 Usuń zadanie
          </button>
        ))}
    </div>
  )
}
