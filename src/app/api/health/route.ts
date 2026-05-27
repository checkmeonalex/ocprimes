import { jsonOk } from '@/lib/http/response'

export const dynamic = 'force-dynamic'

export async function GET() {
  return jsonOk({
    ok: true,
    service: 'alxora-web',
    timestamp: new Date().toISOString(),
  })
}
