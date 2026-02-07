'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuthUser } from '@/lib/auth/useAuthUser.ts'
import { USER_MENU_ITEMS } from '@/lib/user/menu-items'

const getDisplayName = (email) => {
  if (!email) return 'Guest'
  const [local] = email.split('@')
  return local || email
}

export default function UserMenu() {
  const router = useRouter()
  const { user, isLoading } = useAuthUser()
  const [isOpen, setIsOpen] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    setIsOpen(false)
    router.refresh()
    router.push('/login')
  }

  const handleRequestAdmin = async () => {
    if (isRequesting) return
    setIsRequesting(true)
    setRequestMessage('')
    try {
      const response = await fetch('/api/auth/request-admin', { method: 'POST' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setRequestMessage(payload?.error || 'Unable to submit request.')
        return
      }
      setRequestMessage('Request submitted for admin approval.')
    } catch {
      setRequestMessage('Unable to submit request.')
    } finally {
      setIsRequesting(false)
    }
  }

  const displayName = getDisplayName(user?.email)
  const isSignedIn = Boolean(user)

  return (
    <div
      className='relative'
      ref={menuRef}
      onMouseEnter={() => {
        if (hoverTimeout) clearTimeout(hoverTimeout)
        setIsOpen(true)
      }}
      onMouseLeave={() => {
        const timeout = setTimeout(() => setIsOpen(false), 150)
        setHoverTimeout(timeout)
      }}
    >
      <button
        type='button'
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          isSignedIn
            ? 'flex items-center space-x-2'
            : 'flex items-center space-x-3 rounded-md px-3 py-2 text-gray-900'
        }
        aria-expanded={isOpen}
        aria-haspopup='menu'
      >
        {isSignedIn ? (
          <>
            <div className='w-8 h-8 bg-pink-400 rounded-full flex items-center justify-center'>
              <svg
                className='h-4 w-4 text-white'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                aria-hidden='true'
              >
                <path
                  d='M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z'
                  stroke='currentColor'
                  strokeWidth='1.5'
                />
                <path
                  d='M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                />
              </svg>
            </div>
            <span className='flex flex-col leading-none text-gray-700'>
              <span className='text-xs font-medium'>
                {isLoading ? 'Hi' : `Hi ${displayName}`}
              </span>
              <span className='text-sm font-semibold'>Your account</span>
            </span>
          </>
        ) : (
          <>
            <svg
              className='h-5 w-5'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'
            >
              <path
                d='M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z'
                stroke='currentColor'
                strokeWidth='1.5'
              />
              <path
                d='M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
            </svg>
            <span className='flex flex-col leading-none'>
              <span className='text-xs font-medium'>Sign In</span>
              <span className='text-sm font-semibold'>Account</span>
            </span>
          </>
        )}
        <svg
          className='h-6 w-6 text-gray-700'
          viewBox='0 0 20 20'
          version='1.1'
          xmlns='http://www.w3.org/2000/svg'
          fill='currentColor'
          aria-hidden='true'
        >
          <g id='layer1'>
            <path d='M 9.4980469 1 L 8.671875 1.0371094 L 7.8515625 1.1425781 L 7.0410156 1.3242188 L 6.2519531 1.5742188 L 5.484375 1.890625 L 4.75 2.2695312 L 4.0507812 2.7167969 L 3.3945312 3.2207031 L 2.7832031 3.78125 L 2.2246094 4.3945312 L 1.7167969 5.0507812 L 1.2734375 5.7480469 L 0.890625 6.484375 L 0.57421875 7.2480469 L 0.32421875 8.0429688 L 0.14257812 8.8496094 L 0.037109375 9.6738281 L 0 10.5 L 0.037109375 11.326172 L 0.14257812 12.150391 L 0.32421875 12.957031 L 0.57421875 13.748047 L 0.890625 14.515625 L 1.2734375 15.251953 L 1.7167969 15.949219 L 2.2246094 16.605469 L 2.7832031 17.21875 L 3.3945312 17.779297 L 4.0507812 18.283203 L 4.75 18.726562 L 5.484375 19.109375 L 6.2519531 19.425781 L 7.0410156 19.675781 L 7.8515625 19.857422 L 8.671875 19.962891 L 9.4980469 20 L 10.328125 19.962891 L 11.148438 19.857422 L 11.958984 19.675781 L 12.748047 19.425781 L 13.515625 19.109375 L 14.25 18.726562 L 14.949219 18.283203 L 15.605469 17.779297 L 16.216797 17.21875 L 16.775391 16.605469 L 17.279297 15.949219 L 17.726562 15.251953 L 18.109375 14.515625 L 18.425781 13.748047 L 18.673828 12.957031 L 18.853516 12.150391 L 18.962891 11.326172 L 19 10.5 L 18.962891 9.6738281 L 18.853516 8.8496094 L 18.673828 8.0429688 L 18.425781 7.2480469 L 18.109375 6.484375 L 17.726562 5.7480469 L 17.279297 5.0507812 L 16.775391 4.3945312 L 16.216797 3.78125 L 15.605469 3.2207031 L 14.949219 2.7167969 L 14.25 2.2695312 L 13.515625 1.890625 L 12.748047 1.5742188 L 11.958984 1.3242188 L 11.148438 1.1425781 L 10.328125 1.0371094 L 9.4980469 1 z M 11.175781 2.2871094 L 11.861328 2.4570312 L 12.529297 2.6835938 L 13.179688 2.9667969 L 13.798828 3.3046875 L 14.388672 3.6914062 L 14.945312 4.1269531 L 15.462891 4.6074219 L 15.935547 5.1308594 L 16.365234 5.6953125 L 15.056641 6.0058594 L 13.732422 6.2519531 L 13.421875 5.5253906 L 13.0625 4.8183594 L 12.65625 4.1386719 L 12.205078 3.4882812 L 11.712891 2.8710938 L 11.175781 2.2871094 z M 8.6914062 2.5410156 L 8.4257812 3.8671875 L 8.2050781 5.2050781 L 8.0351562 6.5488281 L 7.0175781 6.4726562 L 6.0078125 6.359375 L 4.9980469 6.2089844 L 5.3847656 5.5585938 L 5.8242188 4.9472656 L 6.3144531 4.3710938 L 6.8476562 3.8417969 L 7.4238281 3.3535156 L 8.0410156 2.9199219 L 8.6914062 2.5410156 z M 9.8359375 2.5546875 L 10.412109 3.1035156 L 10.945312 3.6933594 L 11.431641 4.3242188 L 11.869141 4.9921875 L 12.259766 5.6855469 L 12.591797 6.4082031 L 11.449219 6.515625 L 10.302734 6.5761719 L 9.1542969 6.5859375 L 9.3320312 5.2324219 L 9.5585938 3.8867188 L 9.8359375 2.5546875 z M 6.4804688 2.6796875 L 5.8476562 3.2480469 L 5.2636719 3.8671875 L 4.7382812 4.5351562 L 4.2636719 5.2421875 L 3.8535156 5.9882812 L 2.6347656 5.6953125 L 3.0644531 5.1308594 L 3.5410156 4.6054688 L 4.0566406 4.125 L 4.6171875 3.6875 L 5.2070312 3.296875 L 5.8300781 2.9609375 L 6.4804688 2.6796875 z M 2.0332031 6.6894531 L 3.4082031 7.03125 L 3.1445312 7.859375 L 2.953125 8.703125 L 2.8378906 9.5605469 L 2.7929688 10.423828 L 1.9609375 10.253906 L 1.1308594 10.066406 L 1.1972656 9.3632812 L 1.3203125 8.671875 L 1.5039062 7.9921875 L 1.7402344 7.328125 L 2.0332031 6.6894531 z M 16.966797 6.6894531 L 17.259766 7.328125 L 17.496094 7.9921875 L 17.679688 8.671875 L 17.802734 9.3632812 L 17.869141 10.066406 L 16.763672 10.3125 L 15.646484 10.527344 L 14.525391 10.703125 L 14.509766 9.8496094 L 14.431641 9 L 14.292969 8.15625 L 14.091797 7.3261719 L 15.056641 7.1484375 L 16.015625 6.9355469 L 16.966797 6.6894531 z M 4.5136719 7.2597656 L 5.6484375 7.4394531 L 6.7871094 7.5722656 L 7.9316406 7.6621094 L 7.8652344 8.7792969 L 7.828125 9.9003906 L 7.828125 11.019531 L 6.5175781 10.933594 L 5.2109375 10.800781 L 3.9140625 10.619141 L 3.9316406 9.9335938 L 4 9.25 L 4.1210938 8.5722656 L 4.2949219 7.90625 L 4.5136719 7.2597656 z M 12.976562 7.4882812 L 13.181641 8.3125 L 13.326172 9.1503906 L 13.398438 9.9960938 L 13.40625 10.84375 L 11.921875 10.976562 L 10.435547 11.046875 L 8.9453125 11.052734 L 8.9453125 9.9355469 L 8.9824219 8.8203125 L 9.0507812 7.703125 L 10.361328 7.6914062 L 11.671875 7.6230469 L 12.976562 7.4882812 z M 1.1503906 11.216797 L 1.9960938 11.404297 L 2.8496094 11.574219 L 2.9511719 12.263672 L 3.09375 12.947266 L 3.2871094 13.621094 L 3.5234375 14.277344 L 3.8066406 14.917969 L 2.9667969 14.720703 L 2.1328125 14.498047 L 1.8300781 13.876953 L 1.5761719 13.238281 L 1.3808594 12.578125 L 1.2363281 11.904297 L 1.1503906 11.216797 z M 17.849609 11.216797 L 17.763672 11.904297 L 17.619141 12.578125 L 17.423828 13.238281 L 17.169922 13.876953 L 16.867188 14.498047 L 15.765625 14.789062 L 14.65625 15.027344 L 13.535156 15.224609 L 13.859375 14.408203 L 14.119141 13.568359 L 14.318359 12.710938 L 14.453125 11.84375 L 15.589844 11.669922 L 16.722656 11.460938 L 17.849609 11.216797 z M 4 11.763672 L 5.2851562 11.933594 L 6.5683594 12.060547 L 7.8613281 12.140625 L 7.9277344 13.261719 L 8.0273438 14.380859 L 8.1640625 15.494141 L 7.1816406 15.427734 L 6.2011719 15.324219 L 5.2246094 15.1875 L 4.8710938 14.548828 L 4.5703125 13.880859 L 4.3242188 13.191406 L 4.1347656 12.484375 L 4 11.763672 z M 13.308594 11.980469 L 13.181641 12.6875 L 13.011719 13.388672 L 12.792969 14.070312 L 12.525391 14.742188 L 12.21875 15.392578 L 11.246094 15.472656 L 10.271484 15.517578 L 9.2949219 15.529297 L 9.1542969 14.414062 L 9.0507812 13.294922 L 8.9824219 12.173828 L 10.425781 12.164062 L 11.869141 12.099609 L 13.308594 11.980469 z M 3.0898438 15.902344 L 3.8203125 16.064453 L 4.5546875 16.205078 L 4.9785156 16.785156 L 5.4414062 17.332031 L 5.9453125 17.845703 L 6.4804688 18.320312 L 5.8378906 18.042969 L 5.2207031 17.708984 L 4.6347656 17.326172 L 4.0800781 16.896484 L 3.5644531 16.417969 L 3.0898438 15.902344 z M 15.910156 15.902344 L 15.435547 16.417969 L 14.919922 16.896484 L 14.365234 17.326172 L 13.779297 17.705078 L 13.162109 18.039062 L 12.519531 18.320312 L 11.855469 18.546875 L 11.175781 18.712891 L 11.662109 18.185547 L 12.115234 17.628906 L 12.535156 17.044922 L 12.916016 16.439453 L 13.919922 16.294922 L 14.919922 16.115234 L 15.910156 15.902344 z M 6.1484375 16.445312 L 7.2421875 16.554688 L 8.3339844 16.623047 L 8.5019531 17.544922 L 8.6914062 18.458984 L 7.9921875 18.046875 L 7.328125 17.568359 L 6.7148438 17.033203 L 6.1484375 16.445312 z M 11.501953 16.576172 L 10.996094 17.242188 L 10.439453 17.869141 L 9.8359375 18.445312 L 9.6425781 17.548828 L 9.4726562 16.648438 L 10.488281 16.628906 L 11.501953 16.576172 z ' />
          </g>
        </svg>
      </button>

      {isOpen && (
        <div
          className='absolute right-0 mt-3 w-56 rounded-2xl border border-gray-200 bg-white shadow-lg p-3 z-50'
          role='menu'
          onMouseEnter={() => {
            if (hoverTimeout) clearTimeout(hoverTimeout)
          }}
          onMouseLeave={() => {
            const timeout = setTimeout(() => setIsOpen(false), 150)
            setHoverTimeout(timeout)
          }}
        >
          {user ? (
            <>
              <div className='flex items-center gap-3 px-2 py-2'>
                <div className='w-9 h-9 bg-pink-400 rounded-full flex items-center justify-center'>
                  <svg
                    className='h-4 w-4 text-white'
                    viewBox='0 0 24 24'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                    aria-hidden='true'
                  >
                    <path
                      d='M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z'
                      stroke='currentColor'
                      strokeWidth='1.5'
                    />
                    <path
                      d='M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                    />
                  </svg>
                </div>
                <div>
                  <p className='text-sm font-semibold text-gray-900'>
                    {displayName}
                  </p>
                  <p className='text-xs text-gray-500'>{user.email}</p>
                </div>
              </div>
              <div className='mt-1 space-y-1'>
                {USER_MENU_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className='w-full flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50'
                  >
                    <span className='inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-gray-500'>
                      <svg
                        className='h-3.5 w-3.5'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                        aria-hidden='true'
                      >
                        <path
                          d='M7 7h10M7 12h10M7 17h10'
                          stroke='currentColor'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                        />
                      </svg>
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
              {requestMessage ? (
                <p className='px-2 text-xs text-gray-500'>{requestMessage}</p>
              ) : null}
              <button
                onClick={handleRequestAdmin}
                disabled={isRequesting}
                className='mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-60'
              >
                {isRequesting ? 'Submitting...' : 'Request admin access'}
              </button>
              <button
                onClick={handleLogout}
                className='mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300'
              >
                Logout
              </button>
            </>
          ) : (
            <div className='space-y-2'>
              <p className='text-sm text-gray-600 px-2'>You are not signed in.</p>
              <Link
                href='/login'
                className='block w-full rounded-xl bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white'
              >
                Sign in
              </Link>
              <Link
                href='/signup'
                className='block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-gray-700'
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
