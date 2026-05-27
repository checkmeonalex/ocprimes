const SENSITIVE_REVIEW_TERMS = [
  'fuck',
  'fucking',
  'fucked',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'pussy',
  'cunt',
  'whore',
  'slut',
  'nigga',
  'nigger',
  'faggot',
  'retard',
  'rape',
  'rapist',
  'kill yourself',
  'kys',
]

const LEETSPEAK_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
}

const normalizeReviewText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .split('')
    .map((char) => LEETSPEAK_MAP[char] || char)
    .join('')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const evaluateReviewContentForModeration = (content: string) => {
  const normalized = normalizeReviewText(content)
  if (!normalized) {
    return {
      requiresModeration: false,
      matchedTerms: [] as string[],
    }
  }

  const matchedTerms = SENSITIVE_REVIEW_TERMS.filter((term) => {
    const normalizedTerm = normalizeReviewText(term)
    if (!normalizedTerm) return false
    return normalized.includes(normalizedTerm)
  })

  return {
    requiresModeration: matchedTerms.length > 0,
    matchedTerms,
  }
}

