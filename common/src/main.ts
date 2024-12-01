export interface UpdateResponse {
  ip: string
  modified: boolean
}

type EnvDict = Record<string, string | undefined>

export function validateUrl(env: EnvDict, key: string): URL {
  const input = env[key]
  if (input == null || input === '' || !URL.canParse(input)) {
    throw new Error(`${key} must be a valid URL`)
  }
  return new URL(input)
}

export function validateString(env: EnvDict, key: string): string {
  const input = env[key]
  if (input == null || input === '') {
    throw new Error(`${key} must be a non-empty string`)
  }
  return input
}

export function validatePositiveInteger(env: EnvDict, key: string): number {
  const input = env[key]
  const error = `${key} must be a positive integer`
  if (input == null || input === '' || !/^\d+$/.test(input)) {
    throw new Error(error)
  }
  const value = Number.parseInt(input, 10)
  if (value <= 0) {
    throw new Error(error)
  }
  return value
}
