let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(v: boolean): void {
  enabled = v
}

function audio(): AudioContext | null {
  if (!enabled) return null
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function beep(freq: number, ms: number, gain = 0.08, type: OscillatorType = 'sine'): void {
  const ac = audio()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, ac.currentTime)
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + ms / 1000)
  osc.connect(g).connect(ac.destination)
  osc.start()
  osc.stop(ac.currentTime + ms / 1000 + 0.02)
}

function vibrate(pattern: number | number[]): void {
  if (!enabled) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* nieobsługiwane */
  }
}

export const sfx = {
  /** Odblokowanie audio – wołane przy pierwszym dotknięciu ekranu. */
  unlock(): void {
    audio()
  },
  tick(): void {
    beep(880, 90, 0.05, 'triangle')
  },
  lastSeconds(): void {
    beep(1046, 120, 0.07, 'square')
    vibrate(40)
  },
  timeUp(): void {
    beep(300, 280, 0.1, 'sawtooth')
    setTimeout(() => beep(220, 420, 0.1, 'sawtooth'), 180)
    vibrate([120, 80, 220])
  },
  good(): void {
    beep(660, 110)
    setTimeout(() => beep(880, 150), 90)
    setTimeout(() => beep(1175, 200), 200)
    vibrate(60)
  },
  miss(): void {
    beep(330, 200, 0.08, 'triangle')
    vibrate(30)
  },
  spin(): void {
    beep(520, 70, 0.05, 'triangle')
    vibrate(25)
  },
  win(): void {
    ;[523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 240, 0.09), i * 130))
    vibrate([90, 60, 90, 60, 180])
  },
}
