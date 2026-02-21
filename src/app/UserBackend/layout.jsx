import { createServerSupabaseClient } from '@/lib/supabase/server'
import UserBackendNav from '@/components/user-backend/UserBackendNav'
import StickySidebar from '@/components/user-backend/StickySidebar'
import UserBackendMobileHeader from '@/components/user-backend/UserBackendMobileHeader'

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
  const displayName = getDisplayName(user)

  return (
    <div className='min-h-screen w-full bg-white pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-2'>
      <UserBackendMobileHeader />
      <div className='w-full'>
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr] lg:gap-0 overflow-visible'>
          <div className='hidden lg:block'>
            <StickySidebar topOffset={120} collapsedTopOffset={56} collapseAfter={20}>
              <UserBackendNav
                displayName={displayName}
                email={user?.email || 'guest@ocprimes.com'}
              />
            </StickySidebar>
          </div>
          <main className='bg-transparent'>{children}</main>
        </div>
      </div>
    </div>
  )
}
