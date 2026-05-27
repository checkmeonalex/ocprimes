export const safeText = (value: unknown) => String(value || '').trim()

export const escapeHtml = (value: unknown) =>
  safeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const stripHtml = (value: unknown) =>
  safeText(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const truncateText = (value: unknown, maxLength: number) => {
  const text = safeText(value)
  if (!text || text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

export const buildAbsoluteUrl = (baseUrl: string, path: string) => {
  const safeBaseUrl = safeText(baseUrl)
  const safePath = safeText(path)
  if (!safeBaseUrl) return safePath

  try {
    return new URL(safePath.startsWith('/') ? safePath : `/${safePath}`, safeBaseUrl).toString()
  } catch {
    return safePath
  }
}
