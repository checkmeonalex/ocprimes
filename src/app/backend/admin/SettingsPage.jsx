'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminDesktopHeader from '@/components/admin/AdminDesktopHeader'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'
import { toProfileIdentity, writeProfileIdentityCache } from '@/lib/user/profile-identity-cache'
import {
  normalizeOrderProtectionConfig,
  ORDER_PROTECTION_DEFAULTS,
} from '@/lib/order-protection/config'

const navItems = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'social', label: 'Social profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'delete', label: 'Delete account' },
]

const mobileMenuItems = [
  { label: 'Notifications', href: '/backend/admin/notifications', icon: 'notifications' },
  { label: 'Reviews', href: '/backend/admin/reviews', icon: 'reviews' },
  { label: 'Store front', href: '/backend/admin/store-front', icon: 'storefront' },
  { label: 'Attributes', href: '/backend/admin/attributes', icon: 'attributes' },
  { label: 'Tags', href: '/backend/admin/tags', icon: 'tags' },
  { label: 'Library', href: '/backend/admin/library', icon: 'library' },
  { label: 'Shortcut', href: '/backend/admin/shortcut', icon: 'settings' },
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
const defaultCheckoutProgress = {
  enabled: true,
  standardFreeShippingThreshold: 50,
  expressFreeShippingThreshold: 100,
}
const defaultOrderProtectionSettings = {
  ...ORDER_PROTECTION_DEFAULTS,
}

const buildSafeProfilePayload = (profile, patch = {}) => {
  const base = profile && typeof profile === 'object' ? profile : {}
  const contactInfo = base.contactInfo && typeof base.contactInfo === 'object' ? base.contactInfo : {}
  return {
    ...base,
    firstName: String(base.firstName || '').trim() || 'User',
    country: String(base.country || base.location || 'USA').trim() || 'USA',
    contactInfo,
    ...patch,
  }
}

const sectionTitleClass = 'text-3xl font-semibold tracking-tight text-slate-900'
const blockTitleClass = 'text-[34px] font-semibold tracking-tight text-slate-900'
const inputClass =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400'
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-500'
const skeletonClass = 'animate-pulse rounded-xl bg-slate-200/85'

export default function SettingsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingCartShippingProgress, setIsSavingCartShippingProgress] = useState(false)
  const [isSavingOrderProtection, setIsSavingOrderProtection] = useState(false)
  const [isSavingSocial, setIsSavingSocial] = useState(false)
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isProfileQuickMenuOpen, setIsProfileQuickMenuOpen] = useState(false)
  const [mobileSection, setMobileSection] = useState('menu')

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
  const [notificationsForm, setNotificationsForm] = useState({ ...emptyNotifications })
  const [checkoutProgressForm, setCheckoutProgressForm] = useState({ ...defaultCheckoutProgress })
  const [orderProtectionForm, setOrderProtectionForm] = useState({
    ...defaultOrderProtectionSettings,
  })
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const locationOptions = useMemo(
    () => [''].concat(ACCEPTED_COUNTRIES.map((item) => item.name)),
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
      const response = await fetch('/api/user/profile', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load account settings.')

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

  const loadCartShippingProgressSettings = async () => {
    try {
      const response = await fetch('/api/admin/cart-shipping-progress-settings', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      if (!response.ok) return
      const payload = await response.json().catch(() => null)
      setCheckoutProgressForm({
        enabled: payload?.enabled !== false,
        standardFreeShippingThreshold:
          Number(payload?.standardFreeShippingThreshold) >= 0
            ? Number(payload.standardFreeShippingThreshold)
            : defaultCheckoutProgress.standardFreeShippingThreshold,
        expressFreeShippingThreshold:
          Number(payload?.expressFreeShippingThreshold) >= 0
            ? Number(payload.expressFreeShippingThreshold)
            : defaultCheckoutProgress.expressFreeShippingThreshold,
      })
    } catch {
      setCheckoutProgressForm({ ...defaultCheckoutProgress })
    }
  }

  const loadOrderProtectionSettings = async () => {
    try {
      const response = await fetch('/api/admin/order-protection-settings', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      if (!response.ok) return
      const payload = await response.json().catch(() => null)
      const normalized = normalizeOrderProtectionConfig(payload)
      setOrderProtectionForm(normalized)
    } catch {
      setOrderProtectionForm({ ...defaultOrderProtectionSettings })
    }
  }

  useEffect(() => {
    loadProfile()
    loadCartShippingProgressSettings()
    loadOrderProtectionSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        country: String(currentProfile.country || profileForm.location || 'USA').trim() || 'USA',
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
      setSuccess('Social profiles saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save social profiles.')
    } finally {
      setIsSavingSocial(false)
    }
  }

  const saveOrderProtectionSection = async () => {
    setError('')
    setSuccess('')
    setIsSavingOrderProtection(true)
    try {
      const normalized = normalizeOrderProtectionConfig(orderProtectionForm)
      const response = await fetch('/api/admin/order-protection-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(normalized),
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save order protection settings.')
      }
      setOrderProtectionForm(normalizeOrderProtectionConfig(payload))
      setSuccess('Order protection settings saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save order protection settings.')
    } finally {
      setIsSavingOrderProtection(false)
    }
  }

  const saveCartShippingProgressSection = async () => {
    setError('')
    setSuccess('')
    setIsSavingCartShippingProgress(true)
    try {
      const payload = {
        enabled: Boolean(checkoutProgressForm.enabled),
        standardFreeShippingThreshold: Math.max(
          0,
          Number(checkoutProgressForm.standardFreeShippingThreshold) || 0,
        ),
        expressFreeShippingThreshold: Math.max(
          0,
          Number(checkoutProgressForm.expressFreeShippingThreshold) || 0,
        ),
      }

      const response = await fetch('/api/admin/cart-shipping-progress-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (shouldRedirectForAuthFailure(response.status)) {
        redirectToSignIn()
        return
      }
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to save shipping progress settings.')
      }
      setCheckoutProgressForm({
        enabled: data?.enabled !== false,
        standardFreeShippingThreshold: Number(data?.standardFreeShippingThreshold) || 0,
        expressFreeShippingThreshold: Number(data?.expressFreeShippingThreshold) || 0,
      })
      setSuccess('Shipping progress settings saved.')
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save shipping progress settings.')
    } finally {
      setIsSavingCartShippingProgress(false)
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

  const avatarSrc = avatarPreview || avatarUrl
  const mobileDisplayName = String(profileForm.displayName || profileForm.authorName || '').trim()
  const mobileSubtitle = String(profileForm.location || '').trim()

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    setIsLogoutConfirmOpen(false)
    router.push('/login')
  }

  const openSectionFromQuickMenu = (sectionId) => {
    setIsProfileQuickMenuOpen(false)
    setActiveTab(sectionId)
    setMobileSection(sectionId)
  }

  return (
    <div className='min-h-screen bg-[#f6f7f9] text-slate-900'>
      <div className='flex min-h-screen'>
        <AdminSidebar />
        <main className='flex-1 px-4 pb-6 sm:px-6 lg:px-10'>
          <AdminDesktopHeader />
          <div className='mx-auto w-full max-w-6xl'>
            <section className='mb-6 space-y-4 lg:hidden'>
              {mobileSection === 'menu' ? (
                <>
                  <div className='flex items-center justify-between'>
                    <h1 className='text-xl font-semibold text-slate-900'>Profile</h1>
                    <button
                      type='button'
                      className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500'
                      aria-label='More'
                    >
                      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='currentColor'>
                        <circle cx='6' cy='12' r='1.7' />
                        <circle cx='12' cy='12' r='1.7' />
                        <circle cx='18' cy='12' r='1.7' />
                      </svg>
                    </button>
                  </div>

                  <div className='flex items-center justify-between rounded-2xl bg-white px-3 py-3'>
                    <div className='flex min-w-0 items-center gap-3'>
                      {isLoading ? (
                        <>
                          <div className='h-10 w-10 animate-pulse rounded-full bg-slate-200/85' />
                          <div className='min-w-0 space-y-2'>
                            <div className='h-3.5 w-28 animate-pulse rounded-md bg-slate-200/85' />
                            <div className='h-3 w-20 animate-pulse rounded-md bg-slate-200/80' />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className='h-10 w-10 overflow-hidden rounded-full bg-slate-200'>
                            {avatarSrc ? <img src={avatarSrc} alt='Profile avatar' className='h-full w-full object-cover' /> : null}
                          </div>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-semibold text-slate-900'>{mobileDisplayName || '--'}</p>
                            <p className='truncate text-xs text-slate-500'>{mobileSubtitle || '--'}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      type='button'
                      onClick={() => setIsProfileQuickMenuOpen(true)}
                      disabled={isLoading}
                      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600'
                      aria-label='Edit profile'
                    >
                      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m4 20 4.5-1 9-9-3.5-3.5-9 9L4 20Z' />
                        <path d='m13.5 6.5 3.5 3.5' />
                      </svg>
                    </button>
                  </div>

                  <div className='overflow-hidden rounded-2xl bg-white'>
                    {mobileMenuItems.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                      const rowClass = `flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 ${
                        isActive ? 'bg-slate-50 text-slate-900' : 'text-slate-700'
                      }`
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={rowClass}
                        >
                          <span className='font-medium'>{item.label}</span>
                          <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='1.8'>
                            <path d='m9 6 6 6-6 6' />
                          </svg>
                        </Link>
                      )
                    })}
                  </div>

                  <div className='overflow-hidden rounded-2xl bg-white'>
                    {mobileSupportItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className='flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-b-0'
                      >
                        <span className='font-medium'>{item.label}</span>
                        <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='1.8'>
                          <path d='m9 6 6 6-6 6' />
                        </svg>
                      </Link>
                    ))}
                    <button
                      type='button'
                      onClick={() => setIsLogoutConfirmOpen(true)}
                      className='flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700'
                    >
                      <span>Log out</span>
                      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='1.8'>
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
                      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600'
                      aria-label='Back'
                    >
                      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m15 6-6 6 6 6' />
                      </svg>
                    </button>
                    <h2 className='text-3xl font-semibold tracking-tight text-slate-900'>Profile</h2>
                  </div>

                  {isLoading ? (
                    <div className='space-y-4'>
                      <div className='flex items-center gap-3'>
                        <div className='h-14 w-14 animate-pulse rounded-full bg-slate-200/85' />
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
                        <div className='h-14 w-14 overflow-hidden rounded-full bg-slate-200'>
                          {avatarSrc ? <img src={avatarSrc} alt='Profile avatar' className='h-full w-full object-cover' /> : null}
                        </div>
                        <div>
                          <p className='text-xs text-slate-500'>
                            Update your avatar by clicking the image 288x288 px size recommended in PNG or JPG format only.
                          </p>
                          <label className='mt-2 inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50'>
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
                          <select
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
                          </select>
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
                      <div className='space-y-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4'>
                        <h3 className='text-sm font-semibold text-rose-700'>Delete account</h3>
                        <p className='text-xs text-rose-600'>
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
                      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600'
                      aria-label='Back'
                    >
                      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m15 6-6 6 6 6' />
                      </svg>
                    </button>
                    <h2 className='text-3xl font-semibold tracking-tight text-slate-900'>Security</h2>
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
                      className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600'
                      aria-label='Back'
                    >
                      <svg viewBox='0 0 24 24' className='h-4 w-4' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m15 6-6 6 6 6' />
                      </svg>
                    </button>
                    <h2 className='text-3xl font-semibold tracking-tight text-slate-900'>Social profiles</h2>
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
            </section>
            {isProfileQuickMenuOpen ? (
              <div className='fixed inset-0 z-[72] flex items-end bg-slate-900/40 lg:hidden'>
                <div className='w-full rounded-t-3xl bg-white px-5 pb-6 pt-4 shadow-[0_-10px_30px_rgba(15,23,42,0.2)]'>
                  <h3 className='text-center text-lg font-semibold text-slate-900'>Edit profile</h3>
                  <div className='mt-4 space-y-2'>
                    <button
                      type='button'
                      onClick={() => openSectionFromQuickMenu('profile')}
                      className='flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800'
                    >
                      <span>Profile</span>
                      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m9 6 6 6-6 6' />
                      </svg>
                    </button>
                    <button
                      type='button'
                      onClick={() => openSectionFromQuickMenu('security')}
                      className='flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800'
                    >
                      <span>Security</span>
                      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m9 6 6 6-6 6' />
                      </svg>
                    </button>
                    <button
                      type='button'
                      onClick={() => openSectionFromQuickMenu('social')}
                      className='flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800'
                    >
                      <span>Social profile</span>
                      <svg viewBox='0 0 24 24' className='h-4 w-4 text-slate-400' fill='none' stroke='currentColor' strokeWidth='1.8'>
                        <path d='m9 6 6 6-6 6' />
                      </svg>
                    </button>
                  </div>
                  <button
                    type='button'
                    onClick={() => setIsProfileQuickMenuOpen(false)}
                    className='mt-4 h-11 w-full rounded-full border border-slate-300 text-sm font-semibold text-slate-700'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {isLogoutConfirmOpen ? (
              <div className='fixed inset-0 z-[70] flex items-end bg-slate-900/40 lg:hidden'>
                <div className='w-full rounded-t-3xl bg-white px-5 pb-6 pt-4 shadow-[0_-10px_30px_rgba(15,23,42,0.2)]'>
                  <h3 className='text-center text-lg font-semibold text-slate-900'>Logout</h3>
                  <div className='my-3 border-t border-slate-200' />
                  <p className='text-center text-sm text-slate-500'>Are you sure you want to log out?</p>
                  <div className='mt-5 grid grid-cols-2 gap-3'>
                    <button
                      type='button'
                      onClick={() => setIsLogoutConfirmOpen(false)}
                      className='h-11 rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-700'
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
                <div className='space-y-2 rounded-3xl border border-slate-200 bg-white p-3'>
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => jumpToSection(item.id)}
                      className={`w-full rounded-full border px-4 py-2 text-left text-sm font-medium transition ${
                        activeTab === item.id
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                  <p className='mt-2 text-sm text-slate-500'>Manage your profile, security, social links, and notifications.</p>
                </div>

                {error ? <p className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>{error}</p> : null}
                {success ? <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>{success}</p> : null}

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
                        <div className='h-16 w-16 overflow-hidden rounded-full bg-slate-200'>
                          {avatarSrc ? (
                            <img src={avatarSrc} alt='Profile avatar' className='h-full w-full object-cover' />
                          ) : null}
                        </div>
                        <div>
                          <p className='text-xs text-slate-500'>Update your avatar by clicking the image 288x288 px size recommended in PNG or JPG format only.</p>
                          <label className='mt-2 inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50'>
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
                            <select
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
                            </select>
                          </div>
                        </div>
                        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                          <p className='text-sm font-semibold text-slate-900'>Cart shipping progress</p>
                          <p className='mt-1 text-xs text-slate-500'>
                            Configure standard and express free-shipping milestones shown in cart.
                          </p>
                          <div className='mt-3 grid gap-4 sm:grid-cols-2'>
                            <div>
                              <label className={labelClass}>Standard free-shipping threshold</label>
                              <input
                                className={inputClass}
                                type='number'
                                min='0'
                                value={checkoutProgressForm.standardFreeShippingThreshold}
                                onChange={(event) =>
                                  setCheckoutProgressForm((prev) => ({
                                    ...prev,
                                    standardFreeShippingThreshold: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Express free-shipping threshold</label>
                              <input
                                className={inputClass}
                                type='number'
                                min='0'
                                value={checkoutProgressForm.expressFreeShippingThreshold}
                                onChange={(event) =>
                                  setCheckoutProgressForm((prev) => ({
                                    ...prev,
                                    expressFreeShippingThreshold: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <label className='mt-3 inline-flex items-center gap-2 text-sm text-slate-700'>
                            <input
                              type='checkbox'
                              checked={Boolean(checkoutProgressForm.enabled)}
                              onChange={(event) =>
                                setCheckoutProgressForm((prev) => ({
                                  ...prev,
                                  enabled: event.target.checked,
                                }))
                              }
                              className='h-4 w-4 rounded border-slate-300 text-slate-900'
                            />
                            Enable progress bar in cart
                          </label>
                          <button
                            type='button'
                            onClick={saveCartShippingProgressSection}
                            disabled={isSavingCartShippingProgress}
                            className='mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60'
                          >
                            {isSavingCartShippingProgress ? 'Saving...' : 'Save shipping progress settings'}
                          </button>
                        </div>
                        <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                          <p className='text-sm font-semibold text-slate-900'>Order protection settings</p>
                          <p className='mt-1 text-xs text-slate-500'>
                            Controls fee calculation and claim deadline for all shoppers.
                          </p>
                          <div className='mt-3 grid gap-4 sm:grid-cols-2'>
                            <div>
                              <label className={labelClass}>Protection percentage (0-1)</label>
                              <input
                                className={inputClass}
                                type='number'
                                min='0.001'
                                max='1'
                                step='0.001'
                                value={orderProtectionForm.percentage}
                                onChange={(event) =>
                                  setOrderProtectionForm((prev) => ({
                                    ...prev,
                                    percentage: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Claim window (hours)</label>
                              <input
                                className={inputClass}
                                type='number'
                                min='1'
                                max='720'
                                step='1'
                                value={orderProtectionForm.claimWindowHours}
                                onChange={(event) =>
                                  setOrderProtectionForm((prev) => ({
                                    ...prev,
                                    claimWindowHours: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Minimum fee</label>
                              <input
                                className={inputClass}
                                type='number'
                                min='0'
                                step='0.01'
                                value={orderProtectionForm.minimumFee}
                                onChange={(event) =>
                                  setOrderProtectionForm((prev) => ({
                                    ...prev,
                                    minimumFee: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Maximum cap</label>
                              <input
                                className={inputClass}
                                type='number'
                                min='0'
                                step='0.01'
                                value={orderProtectionForm.maximumFee}
                                onChange={(event) =>
                                  setOrderProtectionForm((prev) => ({
                                    ...prev,
                                    maximumFee: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <button
                            type='button'
                            onClick={saveOrderProtectionSection}
                            disabled={isSavingOrderProtection}
                            className='mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60'
                          >
                            {isSavingOrderProtection ? 'Saving...' : 'Save order protection settings'}
                          </button>
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

                <section id='settings-notifications' className='space-y-4'>
                  <h2 className={sectionTitleClass}>Notifications</h2>
                  <div className='space-y-3'>
                    <label className='flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3'>
                      <span className='text-sm font-medium text-slate-700'>Email updates</span>
                      <input
                        type='checkbox'
                        checked={Boolean(notificationsForm.emailUpdates)}
                        onChange={(event) =>
                          setNotificationsForm((prev) => ({ ...prev, emailUpdates: event.target.checked }))
                        }
                      />
                    </label>
                    <label className='flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3'>
                      <span className='text-sm font-medium text-slate-700'>Product review alerts</span>
                      <input
                        type='checkbox'
                        checked={Boolean(notificationsForm.productReviewAlerts)}
                        onChange={(event) =>
                          setNotificationsForm((prev) => ({ ...prev, productReviewAlerts: event.target.checked }))
                        }
                      />
                    </label>
                    <label className='flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3'>
                      <span className='text-sm font-medium text-slate-700'>Security alerts</span>
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
                  <p className='text-sm text-slate-500'>This is permanent. It removes your account and related data from this platform.</p>
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
        </main>
      </div>
    </div>
  )
}
