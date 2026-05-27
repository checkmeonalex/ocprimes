import { createHash, randomUUID } from 'crypto'

export function createSecurityAnswerHash(answer: string) {
  const salt = randomUUID()
  const hash = createHash('sha256')
    .update(`${String(answer || '').trim()}:${salt}`)
    .digest('hex')

  return { hash, salt }
}

export function verifySecurityAnswer({
  answer,
  hash,
  salt,
}: {
  answer: string
  hash: string
  salt: string
}) {
  if (!answer || !hash || !salt) return false

  const nextHash = createHash('sha256')
    .update(`${String(answer || '').trim()}:${String(salt || '').trim()}`)
    .digest('hex')

  return nextHash === String(hash || '').trim()
}
