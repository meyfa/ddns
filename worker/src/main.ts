interface Env {
  DDNS_SECRET?: string
  CLOUDFLARE_API_TOKEN?: string
  CLOUDFLARE_ZONE_ID?: string
  CLOUDFLARE_RECORD_NAME?: string
}

interface UpdateResponse {
  ip: string
  modified: boolean
}

const API = new URL('https://api.cloudflare.com/client/v4/')
const RATE_LIMIT_MS = 30_000

let lastRequest = 0

export default {
  async fetch(req: Request, env: Env, ctx: unknown): Promise<Response> {
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
    if (!timingSafeEqual(auth, `Bearer ${env.DDNS_SECRET}`)) {
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
      modified = await updateRecords(env, remoteAddress)
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

async function updateRecords(env: Env, address: string): Promise<boolean> {
  if (env.CLOUDFLARE_API_TOKEN == null || env.CLOUDFLARE_API_TOKEN === '') {
    throw new Error('CLOUDFLARE_API_TOKEN is required')
  }
  if (env.CLOUDFLARE_ZONE_ID == null || env.CLOUDFLARE_ZONE_ID === '') {
    throw new Error('CLOUDFLARE_ZONE_ID is required')
  }
  if (env.CLOUDFLARE_RECORD_NAME == null || env.CLOUDFLARE_RECORD_NAME === '') {
    throw new Error('CLOUDFLARE_RECORD_NAME is required')
  }

  const record = await getRecord(env, env.CLOUDFLARE_ZONE_ID, env.CLOUDFLARE_RECORD_NAME)
  if (record.content === address) {
    return false
  }

  await updateRecord(env, env.CLOUDFLARE_ZONE_ID, record.id, address)

  return true
}

interface Record {
  id: string
  type: string
  name: string
  content: string
  proxied: boolean
}

async function getRecord(env: Env, zoneId: string, recordName: string): Promise<Record> {
  const url = new URL(`zones/${encodeURIComponent(zoneId)}/dns_records`, API)
  url.searchParams.set('name', recordName)

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`
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

async function updateRecord(env: Env, zoneId: string, recordId: string, address: string): Promise<void> {
  const url = new URL(`zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, API)

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
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