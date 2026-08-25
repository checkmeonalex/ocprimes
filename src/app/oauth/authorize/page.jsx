import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getUserRoleInfoSafe } from '@/lib/auth/roles'
import { isValidCodeChallenge } from '@/lib/mcp/pkce'

const buildLoginRedirect = (searchParams) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (typeof value === 'string') params.set(key, value)
  }
  const next = `/oauth/authorize?${params.toString()}`
  return `/login?next=${encodeURIComponent(next)}`
}

export default async function OAuthAuthorizePage({ searchParams }) {
  const params = await searchParams
  const clientId = typeof params?.client_id === 'string' ? params.client_id : ''
  const redirectUri = typeof params?.redirect_uri === 'string' ? params.redirect_uri : ''
  const state = typeof params?.state === 'string' ? params.state : ''
  const codeChallenge = typeof params?.code_challenge === 'string' ? params.code_challenge : ''
  const codeChallengeMethod =
    typeof params?.code_challenge_method === 'string' ? params.code_challenge_method : ''
  const resource = typeof params?.resource === 'string' ? params.resource : ''
  const scope = typeof params?.scope === 'string' ? params.scope : ''

  if (!clientId || !redirectUri || !codeChallenge || codeChallengeMethod !== 'S256') {
    return (
      <div className='mx-auto max-w-md px-6 py-16 text-center'>
        <h1 className='text-xl font-semibold text-gray-900'>Invalid authorization request</h1>
        <p className='mt-2 text-sm text-gray-600'>
          This connector request is missing required parameters. Close this window and try
          connecting again from the app that sent you here.
        </p>
      </div>
    )
  }

  if (!isValidCodeChallenge(codeChallenge)) {
    return (
      <div className='mx-auto max-w-md px-6 py-16 text-center'>
        <h1 className='text-xl font-semibold text-gray-900'>Invalid authorization request</h1>
        <p className='mt-2 text-sm text-gray-600'>Malformed PKCE challenge.</p>
      </div>
    )
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  const user = error ? null : data?.user || null

  if (!user) {
    redirect(buildLoginRedirect(params))
  }

  const roleInfo = await getUserRoleInfoSafe(supabase, user.id, user.email || '')
  if (!roleInfo.isAdmin && !roleInfo.isVendor) {
    return (
      <div className='mx-auto max-w-md px-6 py-16 text-center'>
        <h1 className='text-xl font-semibold text-gray-900'>Not authorized</h1>
        <p className='mt-2 text-sm text-gray-600'>
          Only admin or vendor accounts can connect this integration.
        </p>
      </div>
    )
  }

  const db = createAdminSupabaseClient()
  const { data: client } = await db
    .from('mcp_oauth_clients')
    .select('client_id, client_name, redirect_uris')
    .eq('client_id', clientId)
    .maybeSingle()

  if (!client?.client_id || !Array.isArray(client.redirect_uris) || !client.redirect_uris.includes(redirectUri)) {
    return (
      <div className='mx-auto max-w-md px-6 py-16 text-center'>
        <h1 className='text-xl font-semibold text-gray-900'>Unknown connector</h1>
        <p className='mt-2 text-sm text-gray-600'>
          This app is not registered, or its redirect URL does not match what was registered.
        </p>
      </div>
    )
  }

  const scopeDescription = roleInfo.isAdmin
    ? 'full admin access to your store — it will be able to view and edit products, orders, and vendor storefronts'
    : 'access to manage your own store — products, orders, media, and your storefront, exactly as you can from your own dashboard'

  return (
    <div className='mx-auto max-w-md px-6 py-16'>
      <h1 className='text-xl font-semibold text-gray-900'>Connect to OCPrimes</h1>
      <p className='mt-2 text-sm text-gray-600'>
        <strong>{client.client_name || 'This app'}</strong> is requesting {scopeDescription}, signed
        in as <strong>{user.email}</strong>.
      </p>
      <form action='/oauth/authorize/approve' method='POST' className='mt-8 flex gap-3'>
        <input type='hidden' name='client_id' value={clientId} />
        <input type='hidden' name='redirect_uri' value={redirectUri} />
        <input type='hidden' name='state' value={state} />
        <input type='hidden' name='code_challenge' value={codeChallenge} />
        <input type='hidden' name='resource' value={resource} />
        <input type='hidden' name='scope' value={scope} />
        <button
          type='submit'
          name='decision'
          value='allow'
          className='flex-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800'
        >
          Allow
        </button>
        <button
          type='submit'
          name='decision'
          value='deny'
          className='flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50'
        >
          Deny
        </button>
      </form>
    </div>
  )
}
