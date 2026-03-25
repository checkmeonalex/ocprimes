const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const SCRIPT_TAG_RE = /<script[\s\S]*?>[\s\S]*?<\/script>/gi
const HTML_TAG_RE = /<[^>]+>/g
const MULTISPACE_RE = /[^\S\r\n]{2,}/g
const MULTINEWLINE_RE = /\n{3,}/g

const coerceString = (value: unknown) => (typeof value === 'string' ? value : '')

const stripDangerousMarkup = (value: string) =>
  value
    .replace(SCRIPT_TAG_RE, ' ')
    .replace(HTML_TAG_RE, ' ')
    .replace(CONTROL_CHARS_RE, ' ')

export const sanitizePlainText = (value: unknown) => {
  const text = stripDangerousMarkup(coerceString(value))
    .replace(/\s+/g, ' ')
    .trim()
  return text
}

export const sanitizeMultilineText = (value: unknown) => {
  const text = stripDangerousMarkup(coerceString(value))
    .replace(/\r\n/g, '\n')
    .replace(MULTISPACE_RE, ' ')
    .replace(MULTINEWLINE_RE, '\n\n')
    .trim()
  return text
}

export const sanitizeOptionalPlainText = (value: unknown) => {
  const text = sanitizePlainText(value)
  return text.length ? text : undefined
}

export const sanitizeOptionalMultilineText = (value: unknown) => {
  const text = sanitizeMultilineText(value)
  return text.length ? text : undefined
}

export const sanitizeEmailInput = (value: unknown) => sanitizePlainText(value).toLowerCase()
