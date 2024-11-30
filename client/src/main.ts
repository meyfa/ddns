import { update } from './client.js'
import { validateEnvironment } from './config.js'
import { log } from './log.js'
import { setTimeout as delay } from 'node:timers/promises'

const env = validateEnvironment(process.env)

const abortController = new AbortController()
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, (signal) => {
    log('info', `Received ${signal}, exiting...`)
    abortController.abort()
  })
}

function run() {
  log('info', 'Updating DDNS')

  const signal = AbortSignal.any([abortController.signal, AbortSignal.timeout(env.DDNS_REQUEST_TIMEOUT * 1000)])

  update({
    url: env.DDNS_URL,
    secret: env.DDNS_SECRET,
    signal
  })
    .then((result) => {
      log('info', result.modified ? `Updated IP address: ${result.ip}` : `IP address unchanged: ${result.ip}`)
    })
    .catch((err: unknown) => {
      log('error', err instanceof Error ? `${err.name}: ${err.message}` : String(err))
    })
}

while (!abortController.signal.aborted) {
  run()

  try {
    await delay(env.DDNS_UPDATE_INTERVAL * 1000, undefined, { signal: abortController.signal })
  } catch (ignored: unknown) {
    // aborted
  }
}
