const SIZE_TOKENS = new Set(['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl'])

const cleanToken = (value) =>
  String(value || '')
    .replace(/^pa_/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const formatSingleToken = (token, preserveCase) => {
  const raw = String(token || '').trim()
  if (!raw) return ''

  const lower = raw.toLowerCase()
  if (SIZE_TOKENS.has(lower)) return lower.toUpperCase()
  if (/^\d+[a-z]{1,5}$/i.test(raw)) {
    return raw.replace(/[a-z]+$/i, (match) => match.toUpperCase())
  }
  if (preserveCase) return raw
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export const formatVariationToken = (value) => {
  const cleaned = cleanToken(value)
  if (!cleaned) return ''

  const preserveCase = /[A-Z]/.test(cleaned)
  return cleaned
    .split(' ')
    .map((token) => formatSingleToken(token, preserveCase))
    .filter(Boolean)
    .join(' ')
}

export const formatVariationLabel = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  return raw
    .split('/')
    .map((segment) => {
      const cleaned = String(segment || '').trim()
      if (!cleaned) return ''

      const separatorIndex = cleaned.indexOf(':')
      if (separatorIndex === -1) {
        return formatVariationToken(cleaned)
      }

      const key = formatVariationToken(cleaned.slice(0, separatorIndex))
      const labelValue = formatVariationToken(cleaned.slice(separatorIndex + 1))
      if (key && labelValue) return `${key}: ${labelValue}`
      return key || labelValue
    })
    .filter(Boolean)
    .join(' / ')
}
