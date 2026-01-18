import type { NextRequest } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler'
import { getUserRole } from '@/lib/auth/roles'

export async function requireAdmin(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return { supabase, applyCookies, user: null, isAdmin: false }
  }

  const role = await getUserRole(supabase, data.user.id)

  return {
    supabase,
    applyCookies,
    user: data.user,
    isAdmin: role === 'admin',
  }
}
