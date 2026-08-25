'use client'

import CustomSelect from '@/components/common/CustomSelect'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import AdminShell from '@/components/admin/AdminShell'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'
import { toProfileIdentity, writeProfileIdentityCache } from '@/lib/user/profile-identity-cache'
import {
  loadUserProfileBootstrap,
  primeUserProfileBootstrap,
} from '@/lib/user/profile-bootstrap-client'

const navItems = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'social', label: 'Social profile' },
  { id: 'connections', label: 'Connections' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'delete', label: 'Delete account' },
]

const mobileMenuItems = [
  { label: 'Notifications', href: '/backend/admin/notifications', icon: 'notifications' },
  { label: 'Reviews', href: '/backend/admin/reviews', icon: 'reviews' },
  { label: 'Store front', href: '/backend/admin/store-front', icon: 'storefront' },
  { label: 'Attributes', href: '/backend/admin/attributes', icon: 'attributes' },
]

const mobileMenuSections = [
  {
    id: 'catalog',
    title: 'Catalog',
    items: [
      { label: 'Pages', href: '/admin/pages' },
      { label: 'Templates', href: '/admin/templates' },
      { label: 'Categories', href: '/admin/categories' },
      { label: 'Brands', href: '/admin/brands' },
      { label: 'Tags', href: '/admin/tags' },
      { label: 'Library', href: '/admin/library' },
      { label: 'Size Guides', href: '/admin/size-guides' },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    items: [
      { label: 'Customers', href: '/admin/customers' },
      { label: 'Logistics', href: '/admin/logistics' },
      { label: 'Settings', href: '/admin/settings' },
      { label: 'Extra', href: '/admin/extra' },
      { label: 'Shortcut', href: '/admin/shortcut' },
    ],
  },
  {
    id: 'vendors',
    title: 'Vendor Admin',
    items: [
      { label: 'Manage Sellers', href: '/backend/admin/admin/brands' },
    ],
  },
]

const mobileSupportItems = [
  { label: 'Contact Us', href: '#', icon: 'contact' },
  { label: 'Terms & condition', href: '#', icon: 'terms' },
  { label: 'Privacy Policy', href: '#', icon: 'privacy' },
  { label: 'Get Help', href: '#', icon: 'help' },
]

const emptySocials = {
  website: '',
  x: '',
  snapchat: '',
  instagram: '',
  threads: '',
  facebook: '',
}

const emptyNotifications = {
  emailUpdates: true,
  productReviewAlerts: true,
  securityAlerts: true,
}
const buildSafeProfilePayload = (profile, patch = {}) => {
  const base = profile && typeof profile === 'object' ? profile : {}
  const contactInfo = base.contactInfo && typeof base.contactInfo === 'object' ? base.contactInfo : {}
  return {
    ...base,
    firstName: String(base.firstName || '').trim() || 'User',
    country: String(base.country || base.location || 'Nigeria').trim() || 'Nigeria',
    contactInfo,
    ...patch,
  }
}

const sectionTitleClass = 'text-3xl font-semibold tracking-tight text-slate-900 dark:text-white'
const blockTitleClass = 'text-[34px] font-semibold tracking-tight text-slate-900 dark:text-white'
const inputClass =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-white/25'
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-500 dark:text-zinc-400'
const skeletonClass = 'animate-pulse rounded-xl bg-slate-200/85 dark:bg-white/10'

const MOBILE_SECTION_KEYS = new Set(['profile', 'security', 'social', 'connections'])

export default function SettingsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isVendor, setIsVendor] = useState(false)
  const [storeIdentity, setStoreIdentity] = useState({ name: '', logoUrl: '' })
  const initialDesktopTab = searchParams.get('section') || 'profile'
  const [activeTab, setActiveTab] = useState(initialDesktopTab)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingSocial, setIsSavingSocial] = useState(false)
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isProfileQuickMenuOpen, setIsProfileQuickMenuOpen] = useState(false)
  const initialMobileSection = MOBILE_SECTION_KEYS.has(searchParams.get('section'))
    ? searchParams.get('section')
    : 'menu'
  const [mobileSection, setMobileSection] = useState(initialMobileSection)
  const [expandedMobileMenuSections, setExpandedMobileMenuSections] = useState({})
  const [mcpUrlCopied, setMcpUrlCopied] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')

  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    authorName: '',
    slogan: '',
    email: '',
    location: '',
  })
  const [socialForm, setSocialForm] = useState({ ...emptySocials })
  const [siteSocialForm, setSiteSocialForm] = useState({
    instagram_url: '',
    tiktok_url: '',
    x_url: '',
    facebook_url: '',
  })
  const [isSavingSiteSocial, setIsSavingSiteSocial] = useState(false)
  const [notificationsForm, setNotificationsForm] = useState({ ...emptyNotifications })
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const locationOptions = useMemo(
    () => [''].concat(ACCEPTED_COUNTRIES),
    [],
  )

  const redirectToSignIn = () => {
    if (typeof window === 'undefined') return
    window.location.href = '/login?next=/backend/admin/settings'
  }

  const shouldRedirectForAuthFailure = (status) => status === 401 || status === 403

  const loadProfile = async () => {
    setIsLoading(true)
    setError('')
    try {
      let payload = await loadUserProfileBootstrap()
      if (!payload) {
        const response = await fetch('/api/user/profile', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (shouldRedirectForAuthFailure(response.status)) {
          redirectToSignIn()
          return
        }
        payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error || 'Unable to load account settings.')
        primeUserProfileBootstrap(payload)
      }

      const nextProfile = payload?.profile && typeof payload.profile === 'object' ? payload.profile : {}
      const authorNameFallback = `${String(nextProfile?.firstName || '').trim()} ${String(nextProfile?.lastName || '').trim()}`.trim()
      const nextEmail =
        String(nextProfile?.contactInfo?.email || '').trim() || String(payload?.email || '').trim()

      setProfile(nextProfile)
      setAvatarUrl(String(payload?.avatar_url || '').trim())
      writeProfileIdentityCache(toProfileIdentity(payload))
      setProfileForm({
        displayName:
          String(nextProfile?.displayName || '').trim() ||
          String(nextProfile?.nickname || '').trim() ||
          authorNameFallback,
        authorName: String(nextProfile?.authorName || '').trim() || authorNameFallback,
        slogan: String(nextProfile?.slogan || '').trim(),
        email: nextEmail,
        location: String(nextProfile?.location || nextProfile?.country || '').trim(),
      })
      setSocialForm({
        ...emptySocials,
        ...(nextProfile?.socials && typeof nextProfile.socials === 'object' ? nextProfile.socials : {}),
      })
      setNotificationsForm({
        ...emptyNotifications,
        ...(nextProfile?.notifications && typeof nextProfile.notifications === 'object'
          ? nextProfile.notifications
          : {}),
      })
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load account settings.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let active = true
    const loadRole = async () => {
      try {
        const response = await fetch('/api/auth/role', { cache: 'no-store', credentials: 'include' })
        const payload = await response.json().catch(() => null)
        if (active && response.ok) {
          setIsAdmin(Boolean(payload?.is_admin))
          setIsVendor(Boolean(payload?.is_vendor))
        }
      } catch {
        // Non-fatal: admin-only sections just stay hidden.
      }
    }
    loadRole()
    return () => {
      active = false
    }
  }, [])

  // A vendor's identity usually lives on their store/brand record, not the
  // personal profile fields below (which they're never required to fill
  // in) — fall back to their store name/logo so Profile isn't just blank
  // dashes for every vendor who hasn't set a personal display name.
  useEffect(() => {
    if (!isVendor) return undefined
    let active = true
    fetch('/api/admin/store-front', { cache: 'no-store', credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active) return
        const item = payload?.item
        if (!item) return
        setStoreIdentity({
          name: String(item.name || '').trim(),
          logoUrl: String(item.logo_url || item.logo_full_url || '').trim(),
        })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isVendor])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    const loadSiteSocials = async () => {
      try {
        const response = await fetch('/api/admin/social-links', { credentials: 'include' })
        if (!response.ok) return
        const payload = await response.json().catch(() => null)
        if (cancelled || !payload?.item) return
        setSiteSocialForm({
          instagram_url: payload.item.instagram_url || '',
          tiktok_url: payload.item.tiktok_url || '',
          x_url: payload.item.x_url || '',
          facebook_url: payload.item.facebook_url || '',
        })
      } catch {
        // Non-fatal: the section just stays empty until saved.
      }
    }
    loadSiteSocials()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  useEffect(() => {
    if (!avatarPreview) return undefined
    return () => URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  const saveProfileSection = async () => {
    setError('')
    setSuccess('')
    if (!String(profileForm.displayName || '').trim()) {
      setError('Display name is required.')
      return
    }

    setIsSavingProfile(true)
    try {
      const currentProfile = buildSafeProfilePayload(profile)
      const authorName = String(profileForm.authorName || '').trim()
      const nameParts = authorName.split(/\s+/).filter(Boolean)
      const firstName = String(currentProfile.firstName || '').trim() || nameParts[0] || 'User'
      const lastName = String(currentProfile.lastName || '').trim() || nameParts.slice(1).join(' ')

      const payload = buildSafeProfilePayload(currentProfile, {
        firstName,
        lastName,
        displayName: String(profileForm.displayName || '').trim(),
        authorName,
        nickname: String(profileForm.displayName || '').trim(),
        slogan: String(profileForm.slogan || '').trim(),
        location: String(profileForm.location || '').trim(),
        country: String(currentProfile.country || profileForm.location || 'Nigeria').trim() || 'Nigeria',
        contactInfo: {
          ...(currentProfile.contactInfo || {}),
          email: String(profileForm.email || '').trim(),
        },
      })

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Unable to save profile settings.')
      setProfile(result?.profile || payload)
      primeUserProfileBootstrap(result)
      writeProfileIdentityCache(
        toProfileIdentity({
          ...(result && typeof result === 'object' ? result : {}),
          avatar_url: avatarUrl,
        }),
      )
      setSuccess('Profile settings saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save profile settings.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const saveSiteSocialSection = async () => {
    setError('')
    setSuccess('')
    setIsSavingSiteSocial(true)
    try {
      const response = await fetch('/api/admin/social-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(siteSocialForm),
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save footer social links.')
      }
      setSiteSocialForm({
        instagram_url: payload?.item?.instagram_url || '',
        tiktok_url: payload?.item?.tiktok_url || '',
        x_url: payload?.item?.x_url || '',
        facebook_url: payload?.item?.facebook_url || '',
      })
      setSuccess('Footer social links saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save footer social links.')
    } finally {
      setIsSavingSiteSocial(false)
    }
  }

  const saveSocialSection = async () => {
    setError('')
    setSuccess('')
    setIsSavingSocial(true)
    try {
      const currentProfile = buildSafeProfilePayload(profile)
      const payload = buildSafeProfilePayload(currentProfile, {
        socials: { ...emptySocials, ...socialForm },
      })
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Unable to save social profiles.')
      setProfile(result?.profile || payload)
      primeUserProfileBootstrap(result)
      setSuccess('Social profiles saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save social profiles.')
    } finally {
      setIsSavingSocial(false)
    }
  }

  const saveNotificationsSection = async () => {
    setError('')
    setSuccess('')
    setIsSavingNotifications(true)
    try {
      const currentProfile = buildSafeProfilePayload(profile)
      const payload = buildSafeProfilePayload(currentProfile, {
        notifications: { ...emptyNotifications, ...notificationsForm },
      })
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Unable to save notifications.')
      setProfile(result?.profile || payload)
      primeUserProfileBootstrap(result)
      setSuccess('Notification settings saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save notifications.')
    } finally {
      setIsSavingNotifications(false)
    }
  }

  const changePassword = async () => {
    setError('')
    setSuccess('')
    if (!securityForm.currentPassword || !securityForm.newPassword || !securityForm.confirmPassword) {
      setError('Fill all password fields.')
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: securityForm.currentPassword,
          new_password: securityForm.newPassword,
          confirm_password: securityForm.confirmPassword,
        }),
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to update password.')
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSuccess('Password updated successfully.')
    } catch (passwordError) {
      setError(passwordError?.message || 'Unable to update password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setSuccess('')
    setIsUploadingAvatar(true)
    setAvatarPreview(URL.createObjectURL(file))

    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/user/avatar/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to upload avatar.')
      setAvatarUrl(String(payload?.avatar_url || '').trim())
      writeProfileIdentityCache(
        toProfileIdentity({
          profile,
          avatar_url: String(payload?.avatar_url || '').trim(),
          email: profileForm.email,
        }),
      )
      setAvatarPreview('')
      setSuccess('Avatar updated.')
    } catch (uploadError) {
      setError(uploadError?.message || 'Unable to upload avatar.')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const deleteAccount = async () => {
    setError('')
    setSuccess('')
    if (String(deleteConfirmation || '').trim() !== 'DELETE') {
      setError('Type DELETE to confirm account deletion.')
      return
    }

    setIsDeletingAccount(true)
    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmation: deleteConfirmation.trim() }),
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to delete account.')
      window.location.href = '/login'
    } catch (deleteError) {
      setError(deleteError?.message || 'Unable to delete account.')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const jumpToSection = (id) => {
    setActiveTab(id)
    const node = document.getElementById(`settings-${id}`)
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Deep-link support so a card elsewhere (e.g. the storefront's "AI
  // connector" card) can jump straight to a specific section instead of
  // always landing on the top of the page / mobile menu list.
  useEffect(() => {
    const section = searchParams.get('section')
    if (!section) return
    const node = document.getElementById(`settings-${section}`)
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const avatarSrc = avatarPreview || avatarUrl || storeIdentity.logoUrl
  const mobileDisplayName = String(
    profileForm.displayName || profileForm.authorName || storeIdentity.name || '',
  ).trim()
  const mobileSubtitle = String(profileForm.location || (storeIdentity.name ? 'Vendor' : '')).trim()

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    setIsLogoutConfirmOpen(false)
    router.push('/login')
  }

  const mcpEndpointUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '/api/mcp'

  const copyMcpUrl = async () => {
    try {
      await navigator.clipboard.writeText(mcpEndpointUrl)
      setMcpUrlCopied(true)
      setTimeout(() => setMcpUrlCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — the URL is still visible to copy manually.
    }
  }

  const openSectionFromQuickMenu = (sectionId) => {
    setIsProfileQuickMenuOpen(false)
    setActiveTab(sectionId)
    setMobileSection(sectionId)
  }

  const toggleMobileMenuSection = (sectionId) => {
    setExpandedMobileMenuSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }))
  }

  return (
    <AdminShell bg="bg-[#f6f7f9]" noPad>
      <div className='mx-auto w-full max-w-6xl'>
            <section className='mb-6 space-y-4 lg:hidden'>
              {mobileSection === 'menu' ? (
                <>
                  <div className='px-4'>
                    <h1 className='text-xl font-semibold text-slate-900 dark:text-white'>Profile</h1>
                  </div>

                  <div className='flex items-center justify-between bg-white px-3 py-3 dark:bg-[#000000]'>
                    <div className='flex min-w-0 items-center gap-3'>
                      {isLoading ? (
                        <>
                          <div className='h-10 w-10 animate-pulse rounded-full bg-slate-200/85 dark:bg-white/10' />
                          <div className='min-w-0 space-y-2'>
                            <div className='h-3.5 w-28 animate-pulse rounded-md bg-slate-200/85 dark:bg-white/10' />
                            <div className='h-3 w-20 animate-pulse rounded-md bg-slate-200/80 dark:bg-white/10' />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className='h-10 w-10 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10'>
                            {avatarSrc ? <img src={avatarSrc} alt='Profile avatar' className='h-full w-full object-cover' /> : null}
                          </div>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-semibold text-slate-900 dark:text-white'>{mobileDisplayName || '--'}</p>
                            <p className='truncate text-xs text-slate-500 dark:text-zinc-400'>{mobileSubtitle || '--'}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      type='button'
                      onClick={() => setIsProfileQuickMenuOpen(true)}
                      disabled={isLoading}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 dark:border-white/10 dark:text-zinc-300'
                      aria-label='Edit profile'
                    >
                      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m4 20 4.5-1 9-9-3.5-3.5-9 9L4 20Z' />
                        <path d='m13.5 6.5 3.5 3.5' />
                      </svg>
                    </button>
                  </div>

                  <div className='overflow-hidden bg-white dark:bg-[#000000]'>
                    {mobileMenuItems.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                      const rowClass = `flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 dark:border-white/5 ${
                        isActive ? 'bg-slate-50 text-slate-900 dark:bg-white/10 dark:text-white' : 'text-slate-700 dark:text-zinc-300'
                      }`
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={rowClass}
                        >
                          <span className='font-medium'>{item.label}</span>
                          <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400 dark:text-zinc-500' fill='none' stroke='currentColor' strokeWidth='1.8'>
                            <path d='m9 6 6 6-6 6' />
                          </svg>
                        </Link>
                      )
                    })}
                  </div>

                  {mobileMenuSections.map((section) => {
                    const isExpanded = Boolean(expandedMobileMenuSections[section.id])
                    const visibleItems = isExpanded ? section.items : section.items.slice(0, 3)
                    const hasMoreItems = section.items.length > 3

                    return (
                      <div key={section.id} className='overflow-hidden bg-white dark:bg-[#000000]'>
                        <div className='flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/5'>
                          <span className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500'>
                            {section.title}
                          </span>
                          {hasMoreItems ? (
                            <button
                              type='button'
                              onClick={() => toggleMobileMenuSection(section.id)}
                              className='inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-zinc-400'
                            >
                              <span>{isExpanded ? 'Show less' : 'Show all'}</span>
                              <svg
                                viewBox='0 0 24 24'
                                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='1.8'
                              >
                                <path d='m6 9 6 6 6-6' />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                        {visibleItems.map((item) => {
                          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 dark:border-white/5 ${
                                isActive ? 'bg-slate-50 text-slate-900 dark:bg-white/10 dark:text-white' : 'text-slate-700 dark:text-zinc-300'
                              }`}
                            >
                              <span className='font-medium'>{item.label}</span>
                              <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400 dark:text-zinc-500' fill='none' stroke='currentColor' strokeWidth='1.8'>
                                <path d='m9 6 6 6-6 6' />
                              </svg>
                            </Link>
                          )
                        })}
                      </div>
                    )
                  })}

                  <div className='overflow-hidden rounded-2xl bg-white dark:bg-[#000000]'>
                    {mobileSupportItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className='flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-b-0 dark:border-white/5 dark:text-zinc-300'
                      >
                        <span className='font-medium'>{item.label}</span>
                        <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400 dark:text-zinc-500' fill='none' stroke='currentColor' strokeWidth='1.8'>
                          <path d='m9 6 6 6-6 6' />
                        </svg>
                      </Link>
                    ))}
                    <button
                      type='button'
                      onClick={() => setIsLogoutConfirmOpen(true)}
                      className='flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-zinc-300'
                    >
                      <span>Log out</span>
                      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400 dark:text-zinc-500' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m9 6 6 6-6 6' />
                      </svg>
                    </button>
                  </div>
                </>
              ) : null}

              {mobileSection === 'profile' ? (
                <div className='space-y-5'>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setMobileSection('menu')}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#000000] dark:text-zinc-300'
                      aria-label='Back'
                    >
                      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m15 6-6 6 6 6' />
                      </svg>
                    </button>
                    <h2 className='text-3xl font-semibold tracking-tight text-slate-900 dark:text-white'>Profile</h2>
                  </div>

                  {isLoading ? (
                    <div className='space-y-4'>
                      <div className='flex items-center gap-3'>
                        <div className='h-14 w-14 animate-pulse rounded-full bg-slate-200/85 dark:bg-white/10' />
                        <div className='flex-1 space-y-2'>
                          <div className={`h-3.5 w-3/4 ${skeletonClass}`} />
                          <div className={`h-3 w-1/2 ${skeletonClass}`} />
                          <div className={`h-8 w-28 ${skeletonClass}`} />
                        </div>
                      </div>
                      <div className={`h-12 w-full ${skeletonClass}`} />
                      <div className={`h-12 w-full ${skeletonClass}`} />
                      <div className={`h-12 w-full ${skeletonClass}`} />
                      <div className='grid grid-cols-2 gap-3'>
                        <div className={`h-12 w-full ${skeletonClass}`} />
                        <div className={`h-12 w-full ${skeletonClass}`} />
                      </div>
                      <div className={`h-10 w-32 ${skeletonClass}`} />
                    </div>
                  ) : (
                    <>
                      <div className='flex items-center gap-3'>
                        <div className='h-14 w-14 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10'>
                          {avatarSrc ? <img src={avatarSrc} alt='Profile avatar' className='h-full w-full object-cover' /> : null}
                        </div>
                        <div>
                          <p className='text-xs text-slate-500 dark:text-zinc-400'>
                            Update your avatar by clicking the image 288x288 px size recommended in PNG or JPG format only.
                          </p>
                          <label className='mt-2 inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10'>
                            {isUploadingAvatar ? 'Uploading...' : 'Upload avatar'}
                            <input
                              type='file'
                              accept='image/png,image/jpeg,image/jpg,image/webp'
                              onChange={handleAvatarUpload}
                              className='hidden'
                            />
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Display name</label>
                        <input
                          className={inputClass}
                          value={profileForm.displayName}
                          onChange={(event) => setProfileForm((prev) => ({ ...prev, displayName: event.target.value }))}
                          placeholder='Author Name'
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Author Name</label>
                        <input
                          className={inputClass}
                          value={profileForm.authorName}
                          onChange={(event) => setProfileForm((prev) => ({ ...prev, authorName: event.target.value }))}
                          placeholder='Author Name'
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Slogan</label>
                        <input
                          className={inputClass}
                          value={profileForm.slogan}
                          onChange={(event) => setProfileForm((prev) => ({ ...prev, slogan: event.target.value }))}
                          placeholder='i.e. Daily curated premium assets for startups and creators.'
                        />
                      </div>
                      <div className='grid grid-cols-2 gap-3'>
                        <div>
                          <label className={labelClass}>Email</label>
                          <input
                            className={inputClass}
                            type='email'
                            value={profileForm.email}
                            onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                            placeholder='designer@example.com'
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Location</label>
                          <CustomSelect
                            className={inputClass}
                            value={profileForm.location}
                            onChange={(event) => setProfileForm((prev) => ({ ...prev, location: event.target.value }))}
                          >
                            <option value=''>Select location</option>
                            {locationOptions.filter(Boolean).map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </CustomSelect>
                        </div>
                      </div>
                      <button
                        type='button'
                        onClick={saveProfileSection}
                        disabled={isSavingProfile}
                        className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
                      >
                        {isSavingProfile ? 'Saving...' : 'Save profile'}
                      </button>
                      <div className='space-y-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/40 dark:bg-rose-950/20'>
                        <h3 className='text-sm font-semibold text-rose-700 dark:text-rose-400'>Delete account</h3>
                        <p className='text-xs text-rose-600 dark:text-rose-400/80'>
                          This is permanent. It removes your account and related data from this platform.
                        </p>
                        <div>
                          <label className={labelClass}>Type DELETE to confirm</label>
                          <input
                            className={inputClass}
                            value={deleteConfirmation}
                            onChange={(event) => setDeleteConfirmation(event.target.value)}
                            placeholder='DELETE'
                          />
                        </div>
                        <button
                          type='button'
                          onClick={deleteAccount}
                          disabled={isDeletingAccount || deleteConfirmation.trim() !== 'DELETE'}
                          className='rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60'
                        >
                          {isDeletingAccount ? 'Deleting...' : 'Delete account'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {mobileSection === 'security' ? (
                <div className='space-y-4'>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setMobileSection('menu')}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#000000] dark:text-zinc-300'
                      aria-label='Back'
                    >
                      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m15 6-6 6 6 6' />
                      </svg>
                    </button>
                    <h2 className='text-3xl font-semibold tracking-tight text-slate-900 dark:text-white'>Security</h2>
                  </div>

                  <div>
                    <label className={labelClass}>Current password</label>
                    <input
                      className={inputClass}
                      type='password'
                      value={securityForm.currentPassword}
                      onChange={(event) => setSecurityForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                      placeholder='••••••••'
                    />
                  </div>
                  <div>
                    <label className={labelClass}>New password</label>
                    <input
                      className={inputClass}
                      type='password'
                      value={securityForm.newPassword}
                      onChange={(event) => setSecurityForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                      placeholder='••••••••'
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Confirm new password</label>
                    <input
                      className={inputClass}
                      type='password'
                      value={securityForm.confirmPassword}
                      onChange={(event) => setSecurityForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      placeholder='••••••••'
                    />
                  </div>
                  <button
                    type='button'
                    onClick={changePassword}
                    disabled={isChangingPassword}
                    className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
                  >
                    {isChangingPassword ? 'Updating...' : 'Update password'}
                  </button>
                </div>
              ) : null}

              {mobileSection === 'social' ? (
                <div className='space-y-4'>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setMobileSection('menu')}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#000000] dark:text-zinc-300'
                      aria-label='Back'
                    >
                      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m15 6-6 6 6 6' />
                      </svg>
                    </button>
                    <h2 className='text-3xl font-semibold tracking-tight text-slate-900 dark:text-white'>Social profiles</h2>
                  </div>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div>
                      <label className={labelClass}>Website</label>
                      <input className={inputClass} value={socialForm.website} onChange={(event) => setSocialForm((prev) => ({ ...prev, website: event.target.value }))} placeholder='https://yoursite.com' />
                    </div>
                    <div>
                      <label className={labelClass}>X</label>
                      <input className={inputClass} value={socialForm.x} onChange={(event) => setSocialForm((prev) => ({ ...prev, x: event.target.value }))} placeholder='x.com/username' />
                    </div>
                    <div>
                      <label className={labelClass}>Snapchat</label>
                      <input className={inputClass} value={socialForm.snapchat} onChange={(event) => setSocialForm((prev) => ({ ...prev, snapchat: event.target.value }))} placeholder='snapchat.com/add/username' />
                    </div>
                    <div>
                      <label className={labelClass}>Instagram</label>
                      <input className={inputClass} value={socialForm.instagram} onChange={(event) => setSocialForm((prev) => ({ ...prev, instagram: event.target.value }))} placeholder='instagram.com/username' />
                    </div>
                    <div>
                      <label className={labelClass}>Threads</label>
                      <input className={inputClass} value={socialForm.threads} onChange={(event) => setSocialForm((prev) => ({ ...prev, threads: event.target.value }))} placeholder='threads.net/username' />
                    </div>
                    <div>
                      <label className={labelClass}>Facebook</label>
                      <input className={inputClass} value={socialForm.facebook} onChange={(event) => setSocialForm((prev) => ({ ...prev, facebook: event.target.value }))} placeholder='facebook.com/username' />
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={saveSocialSection}
                    disabled={isSavingSocial}
                    className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
                  >
                    {isSavingSocial ? 'Saving...' : 'Save social profiles'}
                  </button>
                </div>
              ) : null}

              {mobileSection === 'connections' ? (
                <div className='space-y-4'>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setMobileSection('menu')}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-[#000000] dark:text-zinc-300'
                      aria-label='Back'
                    >
                      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m15 6-6 6 6 6' />
                      </svg>
                    </button>
                    <h2 className='text-3xl font-semibold tracking-tight text-slate-900 dark:text-white'>Connections</h2>
                  </div>
                  <p className='text-sm text-slate-500 dark:text-zinc-400'>
                    Connect an AI tool (like Claude) to your store using this address. You'll sign in and
                    approve the connection with your own account — it will only ever be able to see and
                    manage {isAdmin ? 'the full store' : 'your own products, media, and storefront'}, the
                    same as what you can already do from this dashboard.
                  </p>
                  <div>
                    <label className={labelClass}>MCP address</label>
                    <input
                      readOnly
                      value={mcpEndpointUrl}
                      onFocus={(event) => event.target.select()}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type='button'
                    onClick={copyMcpUrl}
                    className='rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10'
                  >
                    {mcpUrlCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <p className='text-xs text-slate-400 dark:text-zinc-500'>
                    Paste this address into your AI tool's MCP or connector settings. It will ask you to sign
                    in here and approve access before it can do anything.
                  </p>
                </div>
              ) : null}
            </section>
            {isProfileQuickMenuOpen ? (
              <div className='fixed inset-0 z-[72] flex items-end bg-slate-900/40 lg:hidden'>
                <div className='w-full rounded-t-3xl bg-white px-5 pb-6 pt-4 shadow-[0_-10px_30px_rgba(15,23,42,0.2)] dark:bg-[#0a0a0a]'>
                  <h3 className='text-center text-lg font-semibold text-slate-900 dark:text-white'>Edit profile</h3>
                  <div className='mt-4 space-y-2'>
                    <button
                      type='button'
                      onClick={() => openSectionFromQuickMenu('profile')}
                      className='flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 dark:border-white/10 dark:text-zinc-200'
                    >
                      <span>Profile</span>
                      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400 dark:text-zinc-500' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m9 6 6 6-6 6' />
                      </svg>
                    </button>
                    <button
                      type='button'
                      onClick={() => openSectionFromQuickMenu('security')}
                      className='flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 dark:border-white/10 dark:text-zinc-200'
                    >
                      <span>Security</span>
                      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400 dark:text-zinc-500' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m9 6 6 6-6 6' />
                      </svg>
                    </button>
                    <button
                      type='button'
                      onClick={() => openSectionFromQuickMenu('social')}
                      className='flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 dark:border-white/10 dark:text-zinc-200'
                    >
                      <span>Social profile</span>
                      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400 dark:text-zinc-500' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m9 6 6 6-6 6' />
                      </svg>
                    </button>
                    <button
                      type='button'
                      onClick={() => openSectionFromQuickMenu('connections')}
                      className='flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 dark:border-white/10 dark:text-zinc-200'
                    >
                      <span>Connections</span>
                      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400 dark:text-zinc-500' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m9 6 6 6-6 6' />
                      </svg>
                    </button>
                  </div>
                  <button
                    type='button'
                    onClick={() => setIsProfileQuickMenuOpen(false)}
                    className='mt-4 h-11 w-full rounded-full border border-slate-300 text-sm font-semibold text-slate-700 dark:border-white/15 dark:text-zinc-200'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {isLogoutConfirmOpen ? (
              <div className='fixed inset-0 z-[70] flex items-end bg-slate-900/40 lg:hidden'>
                <div className='w-full rounded-t-3xl bg-white px-5 pb-6 pt-4 shadow-[0_-10px_30px_rgba(15,23,42,0.2)] dark:bg-[#0a0a0a]'>
                  <h3 className='text-center text-lg font-semibold text-slate-900 dark:text-white'>Logout</h3>
                  <div className='my-3 border-t border-slate-200 dark:border-white/10' />
                  <p className='text-center text-sm text-slate-500 dark:text-zinc-400'>Are you sure you want to log out?</p>
                  <div className='mt-5 grid grid-cols-2 gap-3'>
                    <button
                      type='button'
                      onClick={() => setIsLogoutConfirmOpen(false)}
                      className='h-11 rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-700 dark:border-white/15 dark:bg-transparent dark:text-zinc-200'
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={handleSignOut}
                      className='h-11 rounded-full bg-lime-300 text-sm font-semibold text-slate-900'
                    >
                      Yes, Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <div className='hidden gap-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]'>
              <aside className='lg:sticky lg:top-6 lg:self-start'>
                <div className='space-y-2 rounded-3xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#000000]'>
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => jumpToSection(item.id)}
                      className={`w-full rounded-full border px-4 py-2 text-left text-sm font-medium transition ${
                        activeTab === item.id
                          ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500/60 dark:bg-sky-500/10 dark:text-sky-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </aside>

              <div className='space-y-12'>
                <div>
                  <h1 className={blockTitleClass}>Account settings</h1>
                  <p className='mt-2 text-sm text-slate-500 dark:text-zinc-400'>Manage your profile, security, social links, and notifications.</p>
                </div>

                {error ? <p className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400'>{error}</p> : null}
                {success ? <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400'>{success}</p> : null}

                <section id='settings-profile' className='space-y-5'>
                  <h2 className={sectionTitleClass}>Profile</h2>

                {isLoading ? (
                    <div className='space-y-4'>
                      <div className='flex items-center gap-3'>
                        <div className='h-16 w-16 animate-pulse rounded-full bg-slate-200/85' />
                        <div className='flex-1 space-y-2'>
                          <div className={`h-3.5 w-3/5 ${skeletonClass}`} />
                          <div className={`h-3 w-2/5 ${skeletonClass}`} />
                          <div className={`h-8 w-32 ${skeletonClass}`} />
                        </div>
                      </div>
                      <div className={`h-12 w-full ${skeletonClass}`} />
                      <div className={`h-12 w-full ${skeletonClass}`} />
                      <div className={`h-12 w-full ${skeletonClass}`} />
                      <div className='grid gap-4 sm:grid-cols-2'>
                        <div className={`h-12 w-full ${skeletonClass}`} />
                        <div className={`h-12 w-full ${skeletonClass}`} />
                      </div>
                      <div className={`h-10 w-32 ${skeletonClass}`} />
                    </div>
                  ) : (
                    <>
                      <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
                        <div className='h-16 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10'>
                          {avatarSrc ? (
                            <img src={avatarSrc} alt='Profile avatar' className='h-full w-full object-cover' />
                          ) : null}
                        </div>
                        <div>
                          <p className='text-xs text-slate-500 dark:text-zinc-400'>Update your avatar by clicking the image 288x288 px size recommended in PNG or JPG format only.</p>
                          <label className='mt-2 inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10'>
                            {isUploadingAvatar ? 'Uploading...' : 'Upload avatar'}
                            <input
                              type='file'
                              accept='image/png,image/jpeg,image/jpg,image/webp'
                              onChange={handleAvatarUpload}
                              className='hidden'
                            />
                          </label>
                        </div>
                      </div>

                      <div className='grid gap-4'>
                        <div>
                          <label className={labelClass}>Display name</label>
                          <input
                            className={inputClass}
                            value={profileForm.displayName}
                            onChange={(event) => setProfileForm((prev) => ({ ...prev, displayName: event.target.value }))}
                            placeholder='Author Name'
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Author Name</label>
                          <input
                            className={inputClass}
                            value={profileForm.authorName}
                            onChange={(event) => setProfileForm((prev) => ({ ...prev, authorName: event.target.value }))}
                            placeholder='Author Name'
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Slogan</label>
                          <input
                            className={inputClass}
                            value={profileForm.slogan}
                            onChange={(event) => setProfileForm((prev) => ({ ...prev, slogan: event.target.value }))}
                            placeholder='i.e. Daily curated premium assets for startups and creators.'
                          />
                        </div>
                        <div className='grid gap-4 sm:grid-cols-2'>
                          <div>
                            <label className={labelClass}>Email</label>
                            <input
                              className={inputClass}
                              type='email'
                              value={profileForm.email}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                              placeholder='designer@example.com'
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Location</label>
                            <CustomSelect
                              className={inputClass}
                              value={profileForm.location}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, location: event.target.value }))}
                            >
                              <option value=''>Select location</option>
                              {locationOptions.filter(Boolean).map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </CustomSelect>
                          </div>
                        </div>
                        <div>
                          <button
                            type='button'
                            onClick={saveProfileSection}
                            disabled={isSavingProfile}
                            className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
                          >
                            {isSavingProfile ? 'Saving...' : 'Save profile'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </section>

                <section id='settings-security' className='space-y-4'>
                  <h2 className={sectionTitleClass}>Security</h2>
                  <div>
                    <label className={labelClass}>Current password</label>
                    <input
                      className={inputClass}
                      type='password'
                      value={securityForm.currentPassword}
                      onChange={(event) => setSecurityForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                      placeholder='••••••••'
                    />
                  </div>
                  <div>
                    <label className={labelClass}>New password</label>
                    <input
                      className={inputClass}
                      type='password'
                      value={securityForm.newPassword}
                      onChange={(event) => setSecurityForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                      placeholder='••••••••'
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Confirm new password</label>
                    <input
                      className={inputClass}
                      type='password'
                      value={securityForm.confirmPassword}
                      onChange={(event) => setSecurityForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      placeholder='••••••••'
                    />
                  </div>
                  <button
                    type='button'
                    onClick={changePassword}
                    disabled={isChangingPassword}
                    className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
                  >
                    {isChangingPassword ? 'Updating...' : 'Update password'}
                  </button>
                </section>

                <section id='settings-social' className='space-y-4'>
                  <h2 className={sectionTitleClass}>Social profiles</h2>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div>
                      <label className={labelClass}>Website</label>
                      <input className={inputClass} value={socialForm.website} onChange={(event) => setSocialForm((prev) => ({ ...prev, website: event.target.value }))} placeholder='https://yoursite.com' />
                    </div>
                    <div>
                      <label className={labelClass}>X</label>
                      <input className={inputClass} value={socialForm.x} onChange={(event) => setSocialForm((prev) => ({ ...prev, x: event.target.value }))} placeholder='x.com/username' />
                    </div>
                    <div>
                      <label className={labelClass}>Snapchat</label>
                      <input className={inputClass} value={socialForm.snapchat} onChange={(event) => setSocialForm((prev) => ({ ...prev, snapchat: event.target.value }))} placeholder='snapchat.com/add/username' />
                    </div>
                    <div>
                      <label className={labelClass}>Instagram</label>
                      <input className={inputClass} value={socialForm.instagram} onChange={(event) => setSocialForm((prev) => ({ ...prev, instagram: event.target.value }))} placeholder='instagram.com/username' />
                    </div>
                    <div>
                      <label className={labelClass}>Threads</label>
                      <input className={inputClass} value={socialForm.threads} onChange={(event) => setSocialForm((prev) => ({ ...prev, threads: event.target.value }))} placeholder='threads.net/username' />
                    </div>
                    <div>
                      <label className={labelClass}>Facebook</label>
                      <input className={inputClass} value={socialForm.facebook} onChange={(event) => setSocialForm((prev) => ({ ...prev, facebook: event.target.value }))} placeholder='facebook.com/username' />
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={saveSocialSection}
                    disabled={isSavingSocial}
                    className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
                  >
                    {isSavingSocial ? 'Saving...' : 'Save social profiles'}
                  </button>
                </section>

                {isAdmin ? (
                  <section id='settings-footer-social' className='space-y-4'>
                    <div>
                      <h2 className={sectionTitleClass}>Footer social links</h2>
                      <p className='mt-1 text-sm text-slate-500'>
                        Shown in the storefront footer on every page. Leave a field blank to hide that icon.
                      </p>
                    </div>
                    <div className='grid gap-4 sm:grid-cols-2'>
                      <div>
                        <label className={labelClass}>Instagram</label>
                        <input
                          className={inputClass}
                          value={siteSocialForm.instagram_url}
                          onChange={(event) => setSiteSocialForm((prev) => ({ ...prev, instagram_url: event.target.value }))}
                          placeholder='https://instagram.com/alxora'
                        />
                      </div>
                      <div>
                        <label className={labelClass}>TikTok</label>
                        <input
                          className={inputClass}
                          value={siteSocialForm.tiktok_url}
                          onChange={(event) => setSiteSocialForm((prev) => ({ ...prev, tiktok_url: event.target.value }))}
                          placeholder='https://tiktok.com/@alxora'
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Twitter / X</label>
                        <input
                          className={inputClass}
                          value={siteSocialForm.x_url}
                          onChange={(event) => setSiteSocialForm((prev) => ({ ...prev, x_url: event.target.value }))}
                          placeholder='https://x.com/alxora'
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Facebook</label>
                        <input
                          className={inputClass}
                          value={siteSocialForm.facebook_url}
                          onChange={(event) => setSiteSocialForm((prev) => ({ ...prev, facebook_url: event.target.value }))}
                          placeholder='https://facebook.com/alxora'
                        />
                      </div>
                    </div>
                    <button
                      type='button'
                      onClick={saveSiteSocialSection}
                      disabled={isSavingSiteSocial}
                      className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
                    >
                      {isSavingSiteSocial ? 'Saving...' : 'Save footer social links'}
                    </button>
                  </section>
                ) : null}

                <section id='settings-connections' className='space-y-4'>
                  <div>
                    <h2 className={sectionTitleClass}>Connections</h2>
                    <p className='mt-1 text-sm text-slate-500 dark:text-zinc-400'>
                      Let an AI tool like Claude manage {isAdmin ? 'your store' : 'your own products, orders, media, and storefront'} for you.
                    </p>
                  </div>
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                    <input
                      readOnly
                      value={mcpEndpointUrl}
                      onFocus={(event) => event.target.select()}
                      className={`${inputClass} sm:max-w-md`}
                    />
                    <button
                      type='button'
                      onClick={copyMcpUrl}
                      className='h-12 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10'
                    >
                      {mcpUrlCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <ol className='space-y-1.5 text-xs text-slate-500 dark:text-zinc-400'>
                    <li>1. Copy the address above.</li>
                    <li>2. In your AI tool, open its connector / MCP settings and paste it in.</li>
                    <li>3. You'll be asked to sign in and approve access — it can only do what you can already do here, nothing more.</li>
                  </ol>
                </section>

                <section id='settings-notifications' className='space-y-4'>
                  <h2 className={sectionTitleClass}>Notifications</h2>
                  <div className='space-y-3'>
                    <label className='flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5'>
                      <span className='text-sm font-medium text-slate-700 dark:text-zinc-200'>Email updates</span>
                      <input
                        type='checkbox'
                        checked={Boolean(notificationsForm.emailUpdates)}
                        onChange={(event) =>
                          setNotificationsForm((prev) => ({ ...prev, emailUpdates: event.target.checked }))
                        }
                      />
                    </label>
                    <label className='flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5'>
                      <span className='text-sm font-medium text-slate-700 dark:text-zinc-200'>Product review alerts</span>
                      <input
                        type='checkbox'
                        checked={Boolean(notificationsForm.productReviewAlerts)}
                        onChange={(event) =>
                          setNotificationsForm((prev) => ({ ...prev, productReviewAlerts: event.target.checked }))
                        }
                      />
                    </label>
                    <label className='flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5'>
                      <span className='text-sm font-medium text-slate-700 dark:text-zinc-200'>Security alerts</span>
                      <input
                        type='checkbox'
                        checked={Boolean(notificationsForm.securityAlerts)}
                        onChange={(event) =>
                          setNotificationsForm((prev) => ({ ...prev, securityAlerts: event.target.checked }))
                        }
                      />
                    </label>
                  </div>
                  <button
                    type='button'
                    onClick={saveNotificationsSection}
                    disabled={isSavingNotifications}
                    className='rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
                  >
                    {isSavingNotifications ? 'Saving...' : 'Save notifications'}
                  </button>
                </section>

                <section id='settings-delete' className='space-y-4 pb-8'>
                  <h2 className={sectionTitleClass}>Delete account</h2>
                  <p className='text-sm text-slate-500 dark:text-zinc-400'>This is permanent. It removes your account and related data from this platform.</p>
                  <div className='max-w-sm'>
                    <label className={labelClass}>Type DELETE to confirm</label>
                    <input
                      className={inputClass}
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      placeholder='DELETE'
                    />
                  </div>
                  <button
                    type='button'
                    onClick={deleteAccount}
                    disabled={isDeletingAccount || deleteConfirmation.trim() !== 'DELETE'}
                    className='rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60'
                  >
                    {isDeletingAccount ? 'Deleting...' : 'Delete account'}
                  </button>
                </section>
              </div>
            </div>
      </div>
    </AdminShell>
  )
}
