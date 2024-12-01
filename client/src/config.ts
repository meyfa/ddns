import { validatePositiveInteger, validateString, validateUrl } from '@meyfa/ddns-common'

export interface Config {
  DDNS_URL: URL
  DDNS_SECRET: string
  DDNS_UPDATE_INTERVAL: number
  DDNS_REQUEST_TIMEOUT: number
}

export function validateEnvironment(env: NodeJS.ProcessEnv): Config {
  const config = {
    DDNS_URL: validateUrl(env, 'DDNS_URL'),
    DDNS_SECRET: validateString(env, 'DDNS_SECRET'),
    DDNS_UPDATE_INTERVAL: validatePositiveInteger(env, 'DDNS_UPDATE_INTERVAL'),
    DDNS_REQUEST_TIMEOUT: validatePositiveInteger(env, 'DDNS_REQUEST_TIMEOUT')
  }

  if (config.DDNS_UPDATE_INTERVAL < config.DDNS_REQUEST_TIMEOUT) {
    throw new Error('DDNS_UPDATE_INTERVAL must be greater than or equal to DDNS_REQUEST_TIMEOUT')
  }

  return config
}
