import { useState } from 'react'
import { Card, TopBar } from '../components/ui'
import { BUILTIN_CATEGORIES } from '../data/words'
import { makeCategory } from '../storage'
import { HASLA, WYBRANE_KATEGORIE, count } from '../pl'
import type { Category } from '../types'

const CATEGORY_EMOJIS = [
  '🎯', '🎬', '🐶', '🍕', '⚽', '🎵', '🚗', '🏠', '🌍', '🧠',
  '🎨', '👻', '💼', '🧩', '🔥', '❤️', '🎁', '🧪', '📚', '🕺',
]

export function CategoriesScreen({
  customCategories,
  selectedIds,
  onChangeSelection,
  onChangeCustom,
  onBack,
}: {
  customCategories: Category[]
  selectedIds: string[]
  onChangeSelection: (ids: string[]) => void
  onChangeCustom: (cats: Category[]) => void
  onBack: () => void
}) {
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

  const all = [...BUILTIN_CATEGORIES, ...customCategories]

  function toggle(id: string) {
    const has = selectedIds.includes(id)
    const next = has ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    if (next.length === 0) return // co najmniej jedna kategoria musi zostać
    onChangeSelection(next)
  }

  function saveCategory(cat: Category) {
    const exists = customCategories.some((c) => c.id === cat.id)
    onChangeCustom(
      exists ? customCategories.map((c) => (c.id === cat.id ? cat : c)) : [...customCategories, cat],
    )
    if (!selectedIds.includes(cat.id)) onChangeSelection([...selectedIds, cat.id])
    setEditing(null)
  }

  function deleteCategory(id: string) {
    onChangeCustom(customCategories.filter((c) => c.id !== id))
    const next = selectedIds.filter((x) => x !== id)
    onChangeSelection(next.length ? next : [BUILTIN_CATEGORIES[0].id])
    setEditing(null)
  }

  if (editing) {
    return (
      <CategoryEditor
        category={editing === 'new' ? null : editing}
        onSave={saveCategory}
        onDelete={editing === 'new' ? undefined : () => deleteCategory(editing.id)}
        onCancel={() => setEditing(null)}
      />
    )
  }

  const totalWords = all
    .filter((c) => selectedIds.includes(c.id))
    .reduce((n, c) => n + c.words.length, 0)

  return (
    <div className="content">
      <TopBar
        title="Kategorie"
        subtitle={`${count(selectedIds.length, WYBRANE_KATEGORIE)} · ${count(totalWords, HASLA)}`}
        onBack={onBack}
      />

      <div className="row">
        <button
          className="btn small"
          style={{ flex: 1 }}
          onClick={() => onChangeSelection(all.map((c) => c.id))}
        >
          Zaznacz wszystkie
        </button>
        <button
          className="btn small"
          style={{ flex: 1 }}
          onClick={() => onChangeSelection([BUILTIN_CATEGORIES[0].id])}
        >
          Wyczyść
        </button>
      </div>

      <Card>
        <div className="stack">
          <h3>Gotowe zestawy</h3>
          <div className="row-wrap">
            {BUILTIN_CATEGORIES.map((c) => (
              <button
                key={c.id}
                className="chip"
                aria-pressed={selectedIds.includes(c.id)}
                onClick={() => toggle(c.id)}
              >
                {c.emoji} {c.name} <span className="count">{c.words.length}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="stack">
          <h3>Twoje kategorie</h3>
          {customCategories.length === 0 && (
            <div className="hint">
              Nie masz jeszcze własnych zestawów. Dodaj hasła z waszymi wewnętrznymi żartami,
              imionami znajomych albo tematami z pracy.
            </div>
          )}
          {customCategories.map((c) => (
            <div className="row" key={c.id}>
              <button
                className="chip"
                style={{ flex: 1, justifyContent: 'flex-start' }}
                aria-pressed={selectedIds.includes(c.id)}
                onClick={() => toggle(c.id)}
              >
                {c.emoji} {c.name} <span className="count">{c.words.length}</span>
              </button>
              <button
                className="btn icon"
                aria-label={`Edytuj ${c.name}`}
                onClick={() => setEditing(c)}
              >
                ✏️
              </button>
            </div>
          ))}
          <button className="btn block" onClick={() => setEditing('new')}>
            ➕ Nowa kategoria
          </button>
        </div>
      </Card>

      <div className="hint">
        W trybie na dwa telefony obowiązują kategorie gospodarza pokoju (tego, kto tworzy kod).
      </div>
    </div>
  )
}

function CategoryEditor({
  category,
  onSave,
  onDelete,
  onCancel,
}: {
  category: Category | null
  onSave: (c: Category) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [emoji, setEmoji] = useState(category?.emoji ?? CATEGORY_EMOJIS[0])
  const [text, setText] = useState((category?.words ?? []).join('\n'))
  const [confirmDelete, setConfirmDelete] = useState(false)

  const words = text
    .split('\n')
    .map((w) => w.trim())
    .filter(Boolean)
  const unique = Array.from(new Set(words))
  const canSave = name.trim().length > 0 && unique.length >= 2

  return (
    <div className="content">
      <TopBar
        title={category ? 'Edytuj kategorię' : 'Nowa kategoria'}
        subtitle={count(unique.length, HASLA)}
        onBack={onCancel}
      />

      <Card>
        <div className="stack">
          <label className="field">
            Nazwa kategorii
            <input
              type="text"
              value={name}
              maxLength={24}
              placeholder="np. Nasze wakacje"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <h3>Ikona</h3>
          <div className="row-wrap">
            {CATEGORY_EMOJIS.map((e) => (
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
            Hasła – każde w nowej linii
            <textarea
              value={text}
              placeholder={'ciocia Basia\nwyjazd na Mazury\nnasz stary fiat'}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          {!canSave && (
            <div className="hint">Potrzebna nazwa i przynajmniej 2 różne hasła.</div>
          )}
        </div>
      </Card>

      <button
        className="btn primary block huge"
        disabled={!canSave}
        onClick={() =>
          onSave(
            category
              ? { ...category, name: name.trim(), emoji, words: unique }
              : makeCategory(name, emoji, unique),
          )
        }
      >
        Zapisz kategorię
      </button>

      {onDelete &&
        (confirmDelete ? (
          <div className="stack">
            <div className="error-box">Usunąć tę kategorię razem z hasłami?</div>
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
            🗑 Usuń kategorię
          </button>
        ))}
    </div>
  )
}
