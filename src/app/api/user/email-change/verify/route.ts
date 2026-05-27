import { jsonError } from '@/lib/http/response'

export async function POST() {
  return jsonError(
    'This legacy email code verification flow is disabled. Use the secure email link sent to your current email instead.',
    410,
  )
}
