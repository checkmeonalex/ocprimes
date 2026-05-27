type InquiryContext = {
  orderId?: string | null
  orderNumber?: string | null
  trackId?: string | null
  orderStatus?: string | null
  reportReasonLabel?: string | null
}

type ComposeInquiryMessageBodyInput = {
  text: string
  inquiryContext?: InquiryContext | null
  detailLabel?: string
}

export type ParsedOrderInquiryMessage = {
  orderId: string
  order: string
  reference: string
  status: string
  reason: string
  question: string
}

export const composeInquiryMessageBody = ({
  text,
  inquiryContext,
  detailLabel = 'Question',
}: ComposeInquiryMessageBodyInput) => {
  const cleanText = String(text || '').trim()
  const contextOrderLabel = String(inquiryContext?.orderNumber || inquiryContext?.orderId || '').trim()
  const contextOrderId = String(inquiryContext?.orderId || '').trim()
  const contextTrack = String(inquiryContext?.trackId || '').trim()
  const contextStatus = String(inquiryContext?.orderStatus || '').trim()
  const contextReason = String(inquiryContext?.reportReasonLabel || '').trim()
  const hasInquiryContext = Boolean(contextOrderLabel || contextTrack || contextStatus || contextReason)

  if (!hasInquiryContext) return cleanText

  return [
    '[Order Inquiry]',
    contextOrderId ? `Order ID: ${contextOrderId}` : '',
    contextOrderLabel ? `Order: ${contextOrderLabel}` : '',
    contextTrack ? `Reference: ${contextTrack}` : '',
    contextStatus ? `Status: ${contextStatus}` : '',
    contextReason ? `Reason: ${contextReason}` : '',
    '',
    `${detailLabel}: ${cleanText}`,
  ]
    .filter(Boolean)
    .join('\n')
}

const readField = (lines: string[], keys: string[]) => {
  const loweredKeys = keys.map((key) => key.toLowerCase())
  const line = lines.find((entry) => {
    const lowered = String(entry || '').toLowerCase()
    return loweredKeys.some((key) => lowered.startsWith(`${key}:`))
  })
  if (!line) return ''
  const separatorIndex = line.indexOf(':')
  if (separatorIndex < 0) return ''
  return String(line.slice(separatorIndex + 1) || '').trim()
}

export const parseOrderInquiryMessage = (value: string): ParsedOrderInquiryMessage | null => {
  const raw = String(value || '')
  if (!raw.startsWith('[Order Inquiry]')) return null
  const lines = raw.split('\n').map((line) => String(line || '').trim())

  const questionLineIndex = lines.findIndex((line) => {
    const lowered = line.toLowerCase()
    return lowered.startsWith('question:') || lowered.startsWith('details:')
  })
  const question = (() => {
    if (questionLineIndex < 0) return ''
    const currentLine = String(lines[questionLineIndex] || '')
    const separatorIndex = currentLine.indexOf(':')
    const firstLine = separatorIndex >= 0 ? currentLine.slice(separatorIndex + 1).trim() : currentLine
    return [firstLine, ...lines.slice(questionLineIndex + 1)].filter(Boolean).join('\n').trim()
  })()

  return {
    orderId: readField(lines, ['Order ID']),
    order: readField(lines, ['Order']),
    reference: readField(lines, ['Reference', 'Ref']),
    status: readField(lines, ['Status']),
    reason: readField(lines, ['Reason']),
    question,
  }
}
