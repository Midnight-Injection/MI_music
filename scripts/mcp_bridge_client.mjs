import fs from 'node:fs'

const endpoint = process.env.MCP_BRIDGE_URL ?? 'ws://127.0.0.1:9223'
const raw = process.argv[2] ?? fs.readFileSync(0, 'utf8')

if (!raw.trim()) {
  console.error('Expected JSON payload as argv[2] or stdin')
  process.exit(1)
}

const payload = JSON.parse(raw)
const ws = new WebSocket(endpoint)
let settled = false

const finish = (code) => {
  if (settled) return
  settled = true
  process.exit(code)
}

const timer = setTimeout(() => {
  console.error(JSON.stringify({ error: 'timeout', endpoint }, null, 2))
  finish(2)
}, 8000)

ws.addEventListener('open', () => {
  ws.send(JSON.stringify(payload))
})

ws.addEventListener('message', (event) => {
  const message = JSON.parse(String(event.data))

  if (message.id !== payload.id) {
    return
  }

  clearTimeout(timer)
  console.log(JSON.stringify(message, null, 2))
  ws.close()
  finish(message.success === false ? 1 : 0)
})

ws.addEventListener('error', (event) => {
  clearTimeout(timer)
  console.error(JSON.stringify({ error: String(event.message ?? event.type ?? event) }, null, 2))
  finish(1)
})

ws.addEventListener('close', () => {
  clearTimeout(timer)
  finish(0)
})
