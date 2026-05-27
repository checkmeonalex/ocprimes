import type { WeightedSignal } from '@/lib/personalization/signal-types'

const MAX_SIGNAL_ITEMS = 40
const MAX_SIGNAL_WEIGHT = 50
const MAX_SIGNAL_TOKEN = 80

const normalizeToken = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const normalizeKeyValue = (value: string) => {
  const [rawKey, ...rest] = value.split('=')
  if (!rest.length) return normalizeToken(value)
  const rawValue = rest.join('=')
  const key = normalizeToken(rawKey)
  const val = normalizeToken(rawValue)
  if (!key || !val) return ''
  return `${key}=${val}`
}

const parseWeightSuffix = (value: string) => {
  const match = value.match(/^(.*?):(\d+)$/)
  if (!match) return { id: value, weight: 1 }
  const weight = Number.parseInt(match[2], 10)
  return { id: match[1], weight: Number.isFinite(weight) ? weight : 1 }
}

const coerceToCsv = (input: unknown) => {
  if (Array.isArray(input)) return input.join(',')
  if (typeof input === 'string') return input
  return ''
}

export const parseWeightedSignals = (input: unknown): WeightedSignal[] => {
  const csv = coerceToCsv(input)
  if (!csv) return []

  const tokens = csv.split(',').map((token) => token.trim())
  const collected = new Map<string, number>()

  for (const rawToken of tokens) {
    if (!rawToken) continue
    const { id: rawId, weight } = parseWeightSuffix(rawToken)
    const normalized = normalizeKeyValue(rawId)
    if (!normalized) continue
    if (normalized.length > MAX_SIGNAL_TOKEN) continue

    const current = collected.get(normalized) || 0
    const next = Math.min(
      current + Math.max(1, Math.min(MAX_SIGNAL_WEIGHT, weight)),
      MAX_SIGNAL_WEIGHT,
    )
    collected.set(normalized, next)
    if (collected.size >= MAX_SIGNAL_ITEMS) break
  }

  return [...collected.entries()].map(([id, weight]) => ({ id, weight }))
}

export const hasActiveSignals = (signals: WeightedSignal[]) =>
  Array.isArray(signals) && signals.some((signal) => signal.weight > 0)

export const normalizeAttributeValue = normalizeToken
export const normalizeAttributePair = normalizeKeyValue
