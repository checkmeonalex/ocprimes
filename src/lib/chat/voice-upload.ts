import { buildObjectKey } from '@/lib/storage/r2'

export const MAX_CHAT_VOICE_UPLOAD_BYTES = 2 * 1024 * 1024

export const ALLOWED_CHAT_VOICE_TYPES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
])

export const normalizeVoiceDurationSeconds = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(600, Math.round(numeric)))
}

export const validateVoiceFile = (file: File) => {
  if (!(file instanceof File) || file.size <= 0) {
    return 'Voice file is required.'
  }
  const contentType = String(file.type || '').trim().toLowerCase()
  if (!ALLOWED_CHAT_VOICE_TYPES.has(contentType)) {
    return 'Unsupported audio format.'
  }
  if (file.size > MAX_CHAT_VOICE_UPLOAD_BYTES) {
    return 'Voice message is too large.'
  }
  return ''
}

export const buildChatVoiceObjectKey = (
  file: File,
  params: {
    conversationId: string
    senderUserId: string
    scope: 'customer' | 'dashboard'
  },
) =>
  buildObjectKey(
    file,
    `chat/${params.scope}/voice/${String(params.conversationId || '').trim()}/${String(
      params.senderUserId || '',
    ).trim()}`,
  )

