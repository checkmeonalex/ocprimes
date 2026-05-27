const asDate = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const getDayKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatThreadDayLabel = (value, nowValue = Date.now()) => {
  const parsed = asDate(value)
  if (!parsed) return ''

  const now = asDate(nowValue) || new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())

  if (target.getTime() === today.getTime()) return 'Today'
  if (target.getTime() === yesterday.getTime()) return 'Yesterday'

  return parsed.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const buildThreadItemsWithDateSeparators = (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) return []

  const items = []
  let previousDayKey = ''

  messages.forEach((message) => {
    const createdAt = String(message?.createdAt || '').trim()
    const parsed = asDate(createdAt)

    if (parsed) {
      const dayKey = getDayKey(parsed)
      if (dayKey !== previousDayKey) {
        items.push({
          type: 'day',
          id: `day-${dayKey}`,
          label: formatThreadDayLabel(parsed),
        })
        previousDayKey = dayKey
      }
    }

    items.push({
      type: 'message',
      id: String(message?.id || ''),
      message,
    })
  })

  return items
}
