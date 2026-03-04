const VOICE_MESSAGE_PREFIXES = ['__chat_voice__:', '__chat_voice_:']

const toSafeDuration = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(600, Math.round(numeric)))
}

export const buildVoiceMessageBody = (params: {
  url: string
  durationSeconds?: number
}) => {
  const url = String(params?.url || '').trim()
  if (!url) return ''
  const payload = {
    url,
    durationSeconds: toSafeDuration(params?.durationSeconds),
  }
  return `${VOICE_MESSAGE_PREFIXES[0]}${JSON.stringify(payload)}`
}

export const parseVoiceMessageBody = (value: unknown) => {
  const text = String(value || '').trim()
  if (!text) return null

  const matchedPrefix = VOICE_MESSAGE_PREFIXES.find((prefix) => text.includes(prefix))
  const fallbackPrefixIndex = text.toLowerCase().indexOf('chat_voice')
  if (!matchedPrefix && fallbackPrefixIndex < 0) return null

  const prefixIndex = matchedPrefix
    ? text.indexOf(matchedPrefix) + matchedPrefix.length
    : fallbackPrefixIndex
  if (prefixIndex < 0) return null

  const rawPayloadSource = text.slice(prefixIndex).trim()
  const firstBraceIndex = rawPayloadSource.indexOf('{')
  const rawPayload =
    firstBraceIndex >= 0 ? rawPayloadSource.slice(firstBraceIndex).trim() : rawPayloadSource
  if (!rawPayload) return null

  try {
    const parseCandidates = [rawPayload]
    const lastBraceIndex = rawPayload.lastIndexOf('}')
    if (lastBraceIndex > 0) {
      parseCandidates.push(rawPayload.slice(0, lastBraceIndex + 1).trim())
    }
    if (rawPayload.includes('\\"')) {
      parseCandidates.push(rawPayload.replace(/\\"/g, '"'))
      if (lastBraceIndex > 0) {
        parseCandidates.push(rawPayload.slice(0, lastBraceIndex + 1).trim().replace(/\\"/g, '"'))
      }
    }

    let parsed = null as any
    for (const candidate of parseCandidates) {
      if (!candidate) continue
      try {
        parsed = JSON.parse(candidate)
      } catch {
        // Try parsing when payload was wrapped as a quoted JSON string.
        try {
          const unquoted = JSON.parse(`"${candidate.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
          parsed = JSON.parse(String(unquoted || '').trim())
        } catch {
          parsed = null
        }
      }
      if (parsed) break
    }
    if (!parsed) {
      const urlMatch = text.match(/https?:\/\/[^\s"'`<>()]+/i)
      if (!urlMatch?.[0]) return null
      return {
        url: String(urlMatch[0]).trim(),
        durationSeconds: 0,
      }
    }
    const url = String(parsed?.url || '').trim()
    if (!url) return null
    return {
      url,
      durationSeconds: toSafeDuration(parsed?.durationSeconds),
    }
  } catch {
    return null
  }
}

export const formatVoiceDurationLabel = (value: unknown) => {
  const seconds = toSafeDuration(value)
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

export const toChatMessagePreview = (value: unknown, fallback = 'No messages yet.') => {
  const text = String(value || '').trim()
  if (!text) return fallback
  const voice = parseVoiceMessageBody(text)
  if (voice) return 'Voice message'
  if (text.toLowerCase().includes('chat_voice')) return 'Voice message'
  return text
}

export const isVoiceMessageBody = (value: unknown) => Boolean(parseVoiceMessageBody(value))
