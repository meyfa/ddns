export interface Env {
  DDNS_URL: URL
  DDNS_SECRET: string
  DDNS_UPDATE_INTERVAL: number
  DDNS_REQUEST_TIMEOUT: number
}

export function validateEnvironment(env: NodeJS.ProcessEnv): Env {
  const result = {
    DDNS_URL: validateUrl(env, 'DDNS_URL'),
    DDNS_SECRET: validateString(env, 'DDNS_SECRET'),
    DDNS_UPDATE_INTERVAL: validatePositiveInteger(env, 'DDNS_UPDATE_INTERVAL'),
    DDNS_REQUEST_TIMEOUT: validatePositiveInteger(env, 'DDNS_REQUEST_TIMEOUT')
  }

  if (result.DDNS_UPDATE_INTERVAL < result.DDNS_REQUEST_TIMEOUT) {
    throw new Error('DDNS_UPDATE_INTERVAL must be greater than or equal to DDNS_REQUEST_TIMEOUT')
  }

  return result
}

function validateUrl(env: NodeJS.ProcessEnv, key: string): URL {
  const input = env[key]
  if (input == null || input === '' || !URL.canParse(input)) {
    throw new Error(`${key} must be a valid URL`)
  }
  return new URL(input)
}

function validateString(env: NodeJS.ProcessEnv, key: string): string {
  const input = env[key]
  if (input == null || input === '') {
    throw new Error(`${key} is required`)
  }
  return input
}

function validatePositiveInteger(env: NodeJS.ProcessEnv, key: string): number {
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
