import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'

export function createAdminSupabaseClient() {
  const { url } = getSupabaseConfig()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}
