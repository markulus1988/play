import Peer from 'peerjs'
import type { DataConnection, PeerOptions } from 'peerjs'
import type { GameState, ModeDef, ModeId, Settings } from '../types'

const ID_PREFIX = 'kalambury-pl-'
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Domyślnie korzystamy z publicznego serwera PeerJS (zero konfiguracji).
 * Własny serwer i TURN można podać przez zmienne środowiskowe przy budowaniu –
 * szczegóły w README.
 */
function peerOptions(): PeerOptions {
  const env = import.meta.env
  const iceServers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] },
  ]
  if (env.VITE_TURN_URL) {
    iceServers.push({
      urls: env.VITE_TURN_URL,
      username: env.VITE_TURN_USERNAME,
      credential: env.VITE_TURN_CREDENTIAL,
    })
  }
  const opts: PeerOptions = { debug: 0, config: { iceServers } }
  if (env.VITE_PEER_HOST) {
    opts.host = env.VITE_PEER_HOST
    opts.path = env.VITE_PEER_PATH || '/'
    opts.secure = env.VITE_PEER_SECURE !== 'false'
    if (env.VITE_PEER_PORT) opts.port = Number(env.VITE_PEER_PORT)
  }
  return opts
}

export function randomCode(len = 4): string {
  let out = ''
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length]
  return out
}

/** Zostawia tylko znaki, które mogą wystąpić w kodzie pokoju. */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .split('')
    .filter((c) => CODE_ALPHABET.includes(c))
    .join('')
    .slice(0, 4)
}

export interface PeerPlayerInfo {
  id: string
  name: string
  emoji: string
}

export interface WheelLabel {
  id: string
  name: string
  emoji: string
}

export interface RoomSync {
  settings: Settings
  categories: WheelLabel[]
  modes: ModeId[]
  /** Definicje zadań gospodarza – także tych własnych. */
  modeDefs: ModeDef[]
}

export type Intent =
  | { action: 'spin' }
  | { action: 'start' }
  | { action: 'timeup' }
  | { action: 'result'; guessed: boolean }
  | { action: 'next' }
  | { action: 'rematch' }
  | { action: 'quit' }

export type Msg =
  | { t: 'hello'; player: PeerPlayerInfo }
  | { t: 'welcome'; player: PeerPlayerInfo; sync: RoomSync }
  | { t: 'sync'; sync: RoomSync }
  | { t: 'state'; state: GameState; youAre: 0 | 1 }
  | { t: 'intent'; intent: Intent }
  | { t: 'chat'; text: string }

export type ConnStatus =
  | 'idle'
  | 'starting'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export interface PeerHandlers {
  onStatus: (status: ConnStatus, detail?: string) => void
  onCode: (code: string) => void
  onMessage: (msg: Msg) => void
}

/**
 * Cienka warstwa nad PeerJS: host tworzy pokój o czytelnym kodzie,
 * gość dołącza tym kodem. Dane lecą bezpośrednio między telefonami (WebRTC),
 * publiczny serwer PeerJS służy tylko do "przedstawienia" urządzeń.
 */
export class Room {
  private peer: Peer | null = null
  private conn: DataConnection | null = null
  private handlers: PeerHandlers
  private destroyed = false
  private attempts = 0
  isHost = false
  code = ''

  constructor(handlers: PeerHandlers) {
    this.handlers = handlers
  }

  get connected(): boolean {
    return !!this.conn && this.conn.open
  }

  host(): void {
    this.isHost = true
    this.attempts = 0
    this.handlers.onStatus('starting')
    this.openHostPeer()
  }

  private openHostPeer(): void {
    if (this.destroyed) return
    this.attempts += 1
    const code = randomCode()
    this.code = code
    const peer = new Peer(ID_PREFIX + code, peerOptions())
    this.peer = peer

    peer.on('open', () => {
      if (this.destroyed) return
      this.handlers.onCode(code)
      this.handlers.onStatus('waiting')
    })

    peer.on('connection', (conn) => {
      if (this.conn && this.conn.open) {
        // Pokój 1 na 1 – drugie połączenie odrzucamy.
        conn.close()
        return
      }
      this.bind(conn)
    })

    peer.on('error', (err: Error & { type?: string }) => {
      if (this.destroyed) return
      if (err.type === 'unavailable-id' && this.attempts < 5) {
        peer.destroy()
        this.openHostPeer()
        return
      }
      this.handlers.onStatus('error', describeError(err))
    })

    peer.on('disconnected', () => {
      if (this.destroyed) return
      try {
        peer.reconnect()
      } catch {
        /* ignorujemy – status i tak pokaże rozłączenie */
      }
    })
  }

  join(code: string): void {
    this.isHost = false
    this.code = code
    this.handlers.onStatus('connecting')
    const peer = new Peer(peerOptions())
    this.peer = peer

    peer.on('open', () => {
      if (this.destroyed) return
      const conn = peer.connect(ID_PREFIX + code, { reliable: true })
      this.bind(conn)
    })

    peer.on('error', (err: Error & { type?: string }) => {
      if (this.destroyed) return
      this.handlers.onStatus('error', describeError(err))
    })
  }

  private bind(conn: DataConnection): void {
    this.conn = conn
    conn.on('open', () => {
      if (this.destroyed) return
      this.handlers.onStatus('connected')
    })
    conn.on('data', (data) => {
      if (this.destroyed) return
      if (data && typeof data === 'object' && 't' in (data as object)) {
        this.handlers.onMessage(data as Msg)
      }
    })
    conn.on('close', () => {
      if (this.destroyed) return
      this.conn = null
      this.handlers.onStatus('disconnected')
    })
    conn.on('error', (err: Error) => {
      if (this.destroyed) return
      this.handlers.onStatus('error', describeError(err))
    })
  }

  send(msg: Msg): void {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg)
      } catch {
        /* połączenie padło – obsłuży to zdarzenie 'close' */
      }
    }
  }

  destroy(): void {
    this.destroyed = true
    try {
      this.conn?.close()
    } catch {
      /* nic */
    }
    try {
      this.peer?.destroy()
    } catch {
      /* nic */
    }
    this.conn = null
    this.peer = null
  }
}

function describeError(err: Error & { type?: string }): string {
  switch (err.type) {
    case 'peer-unavailable':
      return 'Nie znaleziono pokoju o tym kodzie. Sprawdź kod albo poproś o nowy.'
    case 'network':
      return 'Problem z siecią. Sprawdź internet i spróbuj ponownie.'
    case 'server-error':
      return 'Serwer łączenia nie odpowiada. Spróbuj ponownie za chwilę.'
    case 'browser-incompatible':
      return 'Ta przeglądarka nie obsługuje połączeń WebRTC.'
    case 'unavailable-id':
      return 'Kod pokoju jest zajęty. Spróbuj ponownie.'
    case 'webrtc':
      return 'Nie udało się nawiązać bezpośredniego połączenia. Spróbujcie tej samej sieci Wi‑Fi.'
    default:
      return err.message || 'Nieznany błąd połączenia.'
  }
}
