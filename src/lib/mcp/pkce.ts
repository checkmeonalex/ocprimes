export const isValidCodeChallenge = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43,128}$/.test(value)
