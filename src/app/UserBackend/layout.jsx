import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserBackendNav from '@/components/user-backend/UserBackendNav'
import StickySidebar from '@/components/user-backend/StickySidebar'
import UserBackendMobileHeader from '@/components/user-backend/UserBackendMobileHeader'
import AccountShell from '@/components/user-backend/AccountShell'

export const dynamic = 'force-dynamic'

const getDisplayName = (user) => {
  const metaName = user?.user_metadata?.full_name
  if (metaName) return metaName
  const email = user?.email || ''
  const [local] = email.split('@')
  return local || email || 'User'
}

export default async function UserBackendLayout({ children }) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  const user = error ? null : data?.user || null

  if (!user) {
    redirect('/signup?next=/UserBackend')
  }

  const displayName = getDisplayName(user)
  const avatarUrl = String(
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  ).trim()

  return (
    <div className='min-h-screen w-full overflow-x-clip bg-white pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-2'>
      <UserBackendMobileHeader />
      <div className='w-full lg:pt-2'>
        <AccountShell
          sidebar={
            <StickySidebar topOffset={120} collapsedTopOffset={56} collapseAfter={20}>
              <UserBackendNav
                displayName={displayName}
                email={user?.email || 'guest@alxora.com'}
                avatarUrl={avatarUrl}
                bimojiCharacterId={String(user?.user_metadata?.bimoji_character || '')}
              />
            </StickySidebar>
          }
        >
          {children}
        </AccountShell>
      </div>
    </div>
  )
}
