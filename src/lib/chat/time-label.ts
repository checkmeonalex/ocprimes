const ONE_DAY_MS = 24 * 60 * 60 * 1000

const asDate = (value: unknown) => {
  if (!value) return null
  const parsed = new Date(value as string | number | Date)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export const formatMessageTimeLabel = (value: unknown) => {
  const parsed = asDate(value)
  if (!parsed) return ''
  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatConversationLastMessageLabel = (
  value: unknown,
  nowValue: unknown = Date.now(),
) => {
  const parsed = asDate(value)
  if (!parsed) return ''
  const now = asDate(nowValue) || new Date()
  const ageMs = now.getTime() - parsed.getTime()

  if (ageMs >= ONE_DAY_MS) {
    return parsed.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    })
  }

  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}
