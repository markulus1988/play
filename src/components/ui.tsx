import type { ReactNode } from 'react'

export function TopBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <div className="topbar">
      {onBack && (
        <button className="btn icon ghost" onClick={onBack} aria-label="Wróć">
          ←
        </button>
      )}
      <div className="title">
        <h1>{title}</h1>
        {subtitle && <div className="muted">{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}

export function Card({
  children,
  tight,
  style,
}: {
  children: ReactNode
  tight?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div className={tight ? 'card tight' : 'card'} style={style}>
      {children}
    </div>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label?: string
}) {
  return (
    <div className="stack" style={{ gap: 7 }}>
      {label && <h3>{label}</h3>}
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <div className="switch-row">
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 650 }}>{label}</div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      <button
        className="switch"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      />
    </div>
  )
}

export function Avatar({ emoji, small }: { emoji: string; small?: boolean }) {
  return (
    <div className={small ? 'avatar sm' : 'avatar'} aria-hidden="true">
      {emoji}
    </div>
  )
}
