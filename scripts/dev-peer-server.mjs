/**
 * Lokalny serwer łączenia PeerJS – przydatny do testów oraz jako punkt wyjścia,
 * gdyby ktoś chciał postawić własny serwer zamiast publicznego.
 *
 *   node scripts/dev-peer-server.mjs
 *
 * Aplikację buduje się wtedy ze zmiennymi z pliku .env.e2e (patrz README).
 */
import { PeerServer } from 'peer'

const port = Number(process.env.PEER_PORT || 9000)
const host = process.env.PEER_HOST || '127.0.0.1'
const path = process.env.PEER_PATH || '/pj'

PeerServer({ port, path, host }, () => {
  console.log(`Serwer łączenia PeerJS: http://${host}:${port}${path}`)
})
