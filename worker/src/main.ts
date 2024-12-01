import { validateString, type UpdateResponse } from '@meyfa/ddns-common'

interface Config {
  DDNS_SECRET: string
  CLOUDFLARE_API_TOKEN: string
  CLOUDFLARE_ZONE_ID: string
  CLOUDFLARE_RECORD_NAME: string
}

function validateEnvironment(env: Record<string, string | undefined>): Config {
  return {
    DDNS_SECRET: validateString(env, 'DDNS_SECRET'),
    CLOUDFLARE_API_TOKEN: validateString(env, 'CLOUDFLARE_API_TOKEN'),
    CLOUDFLARE_ZONE_ID: validateString(env, 'CLOUDFLARE_ZONE_ID'),
    CLOUDFLARE_RECORD_NAME: validateString(env, 'CLOUDFLARE_RECORD_NAME')
  }
}

const API = new URL('https://api.cloudflare.com/client/v4/')
const RATE_LIMIT_MS = 30_000

let lastRequest = 0

export default {
  async fetch(req: Request, env: Record<string, string | undefined>, ctx: unknown): Promise<Response> {
    const config = validateEnvironment(env)

    const url = new URL(req.url)
    const remoteAddress = req.headers.get('CF-Connecting-IP')
    if (remoteAddress == null) {
      return new Response('Internal Server Error', { status: 500 })
    }

    // Validate request
    if (req.method !== 'PUT' || url.pathname !== '/') {
      return new Response('Not Found', { status: 404 })
    }

    // Authorize request
    const auth = req.headers.get('Authorization') ?? ''
    if (!timingSafeEqual(auth, `Bearer ${config.DDNS_SECRET}`)) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Throttle updates to not overload the Cloudflare API
    const now = Date.now()
    if (now - lastRequest < RATE_LIMIT_MS) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((lastRequest + RATE_LIMIT_MS - now) / 1000).toString()
        }
      })
    }
    lastRequest = now

    // TOOD support IPv6
    if (!/(\d+\.){3}(\d+)/.test(remoteAddress)) {
      return new Response('Bad Request', { status: 400 })
    }

    // Update records
    let modified = false
    try {
      modified = await updateRecords(config, remoteAddress)
    } catch (err: unknown) {
      console.error(err)
      return new Response('Internal Server Error', { status: 500 })
    }

    if (modified) {
      console.log(`Updated IP address to ${remoteAddress}`)
    }

    // Let the client know the IP address
    const response: UpdateResponse = {
      ip: remoteAddress,
      modified
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

function timingSafeEqual(a: string, b: string) {
  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)
  if (aBytes.byteLength !== bBytes.byteLength) {
    return false
  }
  // @ts-ignore - timingSafeEqual is Cloudflare-specific
  return crypto.subtle.timingSafeEqual(aBytes, bBytes)
}

async function updateRecords(config: Config, address: string): Promise<boolean> {
  const record = await getRecord(config, config.CLOUDFLARE_ZONE_ID, config.CLOUDFLARE_RECORD_NAME)
  if (record.content === address) {
    return false
  }
  await updateRecord(config, config.CLOUDFLARE_ZONE_ID, record.id, address)
  return true
}

interface DnsRecord {
  id: string
  type: string
  name: string
  content: string
  proxied: boolean
}

async function getRecord(config: Config, zoneId: string, recordName: string): Promise<DnsRecord> {
  const url = new URL(`zones/${encodeURIComponent(zoneId)}/dns_records`, API)
  url.searchParams.set('name', recordName)

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.CLOUDFLARE_API_TOKEN}`
    }
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch records: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  if (typeof data !== 'object' || data == null || !('result' in data) || !Array.isArray(data.result)) {
    throw new Error('Invalid response')
  }

  if (data.result.length === 0) {
    throw new Error('Record not found')
  }

  return data.result[0]
}

async function updateRecord(config: Config, zoneId: string, recordId: string, address: string): Promise<void> {
  const url = new URL(`zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, API)

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${config.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: address
    })
  })

  if (!res.ok) {
    throw new Error(`Failed to update record: ${res.status} ${res.statusText}`)
  }
}
