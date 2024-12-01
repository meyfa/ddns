import type { UpdateResponse } from '@meyfa/ddns-common'

export interface UpdateOptions {
  url: URL
  secret: string
  signal?: AbortSignal
}

export async function update(options: UpdateOptions): Promise<UpdateResponse> {
  const res = await fetch(options.url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${options.secret}`
    },
    signal: options.signal
  })

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as UpdateResponse
}
