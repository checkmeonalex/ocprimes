import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  redirect_uris: z.array(z.string().url()).min(1),
  client_name: z.string().max(200).optional(),
  token_endpoint_auth_method: z.string().optional(),
})

export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'invalid_client_metadata' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json({ error: 'invalid_client_metadata' }, { status: 400 })
  }

  const clientId = randomUUID()
  const db = createAdminSupabaseClient()
  const { error } = await db.from('mcp_oauth_clients').insert({
    client_id: clientId,
    client_name: parsed.data.client_name || null,
    redirect_uris: parsed.data.redirect_uris,
    token_endpoint_auth_method: 'none',
  })

  if (error) {
    console.error('mcp oauth client registration failed:', error.message)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }

  return Response.json(
    {
      client_id: clientId,
      client_name: parsed.data.client_name || undefined,
      redirect_uris: parsed.data.redirect_uris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
    { status: 201 },
  )
}
