/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Własny serwer łączenia PeerJS (domyślnie: publiczny serwer PeerJS). */
  readonly VITE_PEER_HOST?: string
  readonly VITE_PEER_PORT?: string
  readonly VITE_PEER_PATH?: string
  /** 'false' wyłącza HTTPS/WSS – tylko do testów lokalnych. */
  readonly VITE_PEER_SECURE?: string
  /** Opcjonalny serwer TURN dla sieci komórkowych za restrykcyjnym NAT-em. */
  readonly VITE_TURN_URL?: string
  readonly VITE_TURN_USERNAME?: string
  readonly VITE_TURN_CREDENTIAL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
