import { useEffect, useRef, useState } from 'react'

export const SPIN_MS = 3400

const PALETTE = [
  '#ff6b6b',
  '#ffd93d',
  '#6be5a5',
  '#4da6ff',
  '#a78bfa',
  '#f57dff',
  '#ff9f45',
  '#42d6d6',
  '#ff7ab0',
  '#9ee04a',
]

export interface WheelSegment {
  label: string
  emoji?: string
  color?: string
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function wedgePath(cx: number, cy: number, r: number, from: number, to: number): string {
  if (to - from >= 359.99) {
    // Pełne koło – dwa półokręgi, bo łuk 360° jest zdegenerowany.
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`
  }
  const a = polar(cx, cy, r, from)
  const b = polar(cx, cy, r, to)
  const large = to - from > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y} Z`
}

function shortLabel(label: string, count: number): string {
  const max = count <= 4 ? 14 : count <= 6 ? 11 : count <= 9 ? 9 : 7
  if (label.length <= max) return label
  return label.slice(0, max - 1).trimEnd() + '…'
}

export function Wheel({
  segments,
  targetIndex,
  spinToken,
  onDone,
  caption,
}: {
  segments: WheelSegment[]
  targetIndex: number | null
  /** Zmiana tej wartości uruchamia kręcenie. */
  spinToken: number | null
  onDone?: () => void
  caption?: string
}) {
  const count = Math.max(segments.length, 1)
  const seg = 360 / count
  const [rotation, setRotation] = useState(0)
  const [animating, setAnimating] = useState(false)
  const rotationRef = useRef(0)
  const lastToken = useRef<number | null>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (spinToken === null || targetIndex === null) return
    if (lastToken.current === spinToken) return
    lastToken.current = spinToken

    const center = (targetIndex + 0.5) * seg
    const jitter = (((spinToken % 1000) / 1000) * 2 - 1) * seg * 0.3
    const turns = 4 + (spinToken % 3)
    const wanted = ((360 - center + jitter) % 360 + 360) % 360
    const from = rotationRef.current
    let target = Math.ceil((from + turns * 360) / 360) * 360 + wanted
    if (target <= from + turns * 360) target += 360

    rotationRef.current = target
    setAnimating(true)
    setRotation(target)
    const t = window.setTimeout(() => {
      setAnimating(false)
      doneRef.current?.()
    }, SPIN_MS)
    return () => window.clearTimeout(t)
  }, [spinToken, targetIndex, seg])

  const R = 94
  const C = 100

  return (
    <div className="wheel-box">
      {caption && <div className="wheel-label">{caption}</div>}
      <div className="wheel-wrap">
        <div className="wheel-pointer" />
        <svg viewBox="0 0 200 200" role="img" aria-label={caption ?? 'Koło losujące'}>
          <circle cx={C} cy={C} r={R + 4} fill="rgba(255,255,255,0.12)" />
          <g
            className="wheel-spin"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: animating
                ? `transform ${SPIN_MS}ms cubic-bezier(0.16, 0.84, 0.16, 1)`
                : 'none',
            }}
          >
            {segments.map((s, i) => {
              const from = i * seg
              const to = (i + 1) * seg
              const mid = from + seg / 2
              const color = s.color ?? PALETTE[i % PALETTE.length]
              const textR = R * 0.58
              const pos = polar(C, C, textR, mid)
              const fontSize = count <= 4 ? 13 : count <= 6 ? 11 : count <= 9 ? 9.5 : 8
              return (
                <g key={`${s.label}-${i}`}>
                  <path
                    d={wedgePath(C, C, R, from, to)}
                    fill={color}
                    stroke="rgba(20,15,43,0.55)"
                    strokeWidth="1.2"
                  />
                  <text
                    x={count === 1 ? C : pos.x}
                    y={count === 1 ? C - R * 0.45 : pos.y}
                    fill="#1b1233"
                    fontSize={fontSize}
                    fontWeight="800"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={
                      count === 1
                        ? // Jedyny segment – kontrujemy obrót koła, żeby napis został czytelny.
                          `rotate(${-rotation} ${C} ${C})`
                        : `rotate(${mid > 180 ? mid + 90 : mid - 90} ${pos.x} ${pos.y})`
                    }
                  >
                    {shortLabel(s.label, count)}
                  </text>
                </g>
              )
            })}
          </g>
          <circle cx={C} cy={C} r="13" fill="#fff" />
          <circle cx={C} cy={C} r="5" fill="#140f2b" />
        </svg>
      </div>
    </div>
  )
}
