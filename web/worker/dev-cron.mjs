/**
 * Local stand-in for the Cloudflare cron. Wrangler does not fire schedules
 * in `wrangler dev`, so this starts the worker and requests the scheduled
 * route once a minute. The key stays in worker/.dev.vars.
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = 8787
const intervalMs = 60_000
const scheduledUrl = `http://127.0.0.1:${port}/cdn-cgi/local/scheduled?cron=${encodeURIComponent('* * * * *')}`

const localKey = () => {
  const file = path.join(webRoot, 'worker', '.dev.vars')
  if (!existsSync(file)) return ''
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((row) => row.trim())
    .find((row) => row.startsWith('COINALYZE_API_KEY='))
  if (!line) return ''
  return line.slice('COINALYZE_API_KEY='.length).trim().replace(/^["']|["']$/g, '')
}

if (!localKey()) {
  console.error('Set COINALYZE_API_KEY in web/worker/.dev.vars. Wrangler loads that file for local samples.')
  process.exit(1)
}

const wrangler = spawn(
  process.execPath,
  [
    path.join(webRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
    'dev',
    '--config',
    'worker/wrangler.toml',
    '--port',
    String(port),
    '--test-scheduled',
  ],
  { cwd: webRoot, stdio: 'inherit' },
)

let timer
let stopped = false

const tick = async () => {
  try {
    const res = await fetch(scheduledUrl)
    console.log(`[oi-cron] ${new Date().toISOString()} scheduled ${res.status}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'request failed'
    console.log(`[oi-cron] ${new Date().toISOString()} ${message}`)
  }
}

const waitForWorker = async () => {
  const deadline = Date.now() + 60_000
  while (!stopped && Date.now() < deadline) {
    try {
      await fetch(`http://127.0.0.1:${port}/oi`)
      return true
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  return false
}

const shutdown = (code = 0) => {
  if (stopped) return
  stopped = true
  if (timer) clearInterval(timer)
  wrangler.kill()
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
wrangler.on('exit', (code) => {
  if (stopped) return
  stopped = true
  if (timer) clearInterval(timer)
  process.exit(code ?? 0)
})

const ready = await waitForWorker()
if (!ready || stopped) {
  console.error('[oi-cron] worker did not start')
  shutdown(1)
}
await tick()
timer = setInterval(() => {
  void tick()
}, intervalMs)
