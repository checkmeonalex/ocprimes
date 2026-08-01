import type { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'

const safeCompare = (a: string, b: string) => {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export const isMcpAdminRequest = (request: NextRequest): boolean => {
  const secret = process.env.MCP_ADMIN_API_TOKEN
  if (!secret) return false

  const header = request.headers.get('authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match) return false

  return safeCompare(match[1], secret)
}

export const getMcpServiceUserId = (): string | null =>
  process.env.MCP_SERVICE_USER_ID || null
