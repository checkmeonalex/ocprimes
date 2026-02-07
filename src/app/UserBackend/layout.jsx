import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import UserBackendNav from '@/components/user-backend/UserBackendNav'
import StickySidebar from '@/components/user-backend/StickySidebar'

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

  if (error || !data?.user) {
    redirect('/login?next=/UserBackend')
  }

  const displayName = getDisplayName(data.user)

  return (
    <div className='max-w-6xl mx-auto px-4 py-8 min-h-screen'>
      <div className='grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6 overflow-visible'>
        <StickySidebar>
          <UserBackendNav
            displayName={displayName}
            email={data.user.email || ''}
          />
        </StickySidebar>
        <main>{children}</main>
      </div>
    </div>
  )
}
