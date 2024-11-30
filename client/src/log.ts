type LogLevel = 'info' | 'error'

export function log(level: LogLevel, message: string) {
  const str = `${new Date().toISOString()} [${level}] ${message}`
  if (level === 'error') {
    process.stderr.write(str + '\n')
    return
  }
  process.stdout.write(str + '\n')
}
