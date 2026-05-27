import { jsonError } from '@/lib/http/response'
export async function POST() {
  return jsonError(
    'This endpoint is disabled. Use /vendor/signup and complete the review flow.',
    410,
  )
}
