import {
  Heart,
  History,
} from 'lucide-react'
import AccountSecurityIcon from '@/components/common/AccountSecurityIcon'

function SiteBellIcon({ className, ...props }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M15 19.25C15 20.0456 14.6839 20.8087 14.1213 21.3713C13.5587 21.9339 12.7956 22.25 12 22.25C11.2044 22.25 10.4413 21.9339 9.87869 21.3713C9.31608 20.8087 9 20.0456 9 19.25'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M5.58096 18.25C5.09151 18.1461 4.65878 17.8626 4.36813 17.4553C4.07748 17.048 3.95005 16.5466 4.01098 16.05L5.01098 7.93998C5.2663 6.27263 6.11508 4.75352 7.40121 3.66215C8.68734 2.57077 10.3243 1.98054 12.011 1.99998V1.99998C13.6977 1.98054 15.3346 2.57077 16.6207 3.66215C17.9069 4.75352 18.7557 6.27263 19.011 7.93998L20.011 16.05C20.0723 16.5452 19.9462 17.0454 19.6576 17.4525C19.369 17.8595 18.9386 18.144 18.451 18.25C14.2186 19.2445 9.81332 19.2445 5.58096 18.25V18.25Z'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

function SiteOrdersIcon({ className, ...props }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='M20.929 1.628A1 1 0 0 0 20 1H4a1 1 0 0 0-.929.628l-2 5A1.012 1.012 0 0 0 1 7V22a1 1 0 0 0 1 1H22a1 1 0 0 0 1-1V7a1.012 1.012 0 0 0-.071-.372ZM4.677 3H19.323l1.2 3H3.477ZM3 21V8H21V21Zm8-3a1 1 0 0 1-1 1H6a1 1 0 0 1 0-2h4A1 1 0 0 1 11 18Z' />
    </svg>
  )
}

function SiteMessagesIcon({ className, ...props }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M4 6.5h16v10H9l-5 3v-13z'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
      <path d='M8 10h8M8 13h6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  )
}

function SiteFollowedStoresIcon({ className, ...props }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M4 9h16l-1.2 10H5.2L4 9zM6 9l1-4h10l1 4'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
    </svg>
  )
}

function SiteAccountCenterIcon({ className, ...props }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <circle
        cx='12'
        cy='8'
        r='3.25'
        stroke='currentColor'
        strokeWidth='1.8'
      />
      <path
        d='M5 18.25C6.8 14.95 9.15 13.3 12 13.3C14.85 13.3 17.2 14.95 19 18.25'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

function SiteSecurityIcon({ className, ...props }) {
  return <AccountSecurityIcon className={className} aria-hidden='true' {...props} />
}

function SiteHelpCenterIcon({ className, ...props }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        d='M18 9L16 9C14.8954305 9 14 9.8954305 14 11L14 13C14 14.1045695 14.8954305 15 16 15C17.1045695 15 18 14.1045695 18 13L18 9C18 4.02943725 13.9705627 0 9 0C4.02943725 0 0 4.02943725 0 9L0 13C0 14.1045695 0.8954305 15 2 15C3.1045695 15 4 14.1045695 4 13L4 11C4 9.8954305 3.1045695 9 2 9L0 9'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        transform='translate(3 3)'
      />
      <path
        d='M21 14L21 18C21 20 20.3333333 21 19 21C17.6666667 21 16 21 14 21'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

function SiteQuickHelpIcon({ className, ...props }) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <circle cx='12' cy='12' r='8' stroke='currentColor' strokeWidth='1.5' />
      <path d='M9.75 9.75a2.25 2.25 0 1 1 3.8 1.63c-.92.88-1.55 1.42-1.55 2.37' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
      <circle cx='12' cy='16.5' r='0.75' fill='currentColor' />
    </svg>
  )
}

export const MOBILE_SIDEBAR_SECTIONS = [
  {
    id: 'quick-links',
    title: '',
    items: [
      {
        label: 'My Favourite',
        href: '/UserBackend/wishlist',
        icon: Heart,
      },
      {
        label: 'Browsing History',
        href: '/UserBackend/browsing-history',
        icon: History,
      },
    ],
  },
  {
    id: 'account',
    title: 'Your Account',
    items: [
      {
        label: 'Notifications',
        href: '/UserBackend/notifications',
        icon: SiteBellIcon,
      },
      {
        label: 'Orders',
        href: '/UserBackend/orders',
        icon: SiteOrdersIcon,
      },
      {
        label: 'Message',
        href: '/UserBackend/messages',
        icon: SiteMessagesIcon,
      },
      {
        label: 'Followed Stores',
        href: '/UserBackend/followed-stores',
        icon: SiteFollowedStoresIcon,
      },
    ],
  },
  {
    id: 'help',
    title: 'Help & Support',
    items: [
      {
        label: 'Account Center',
        href: '/UserBackend',
        icon: SiteAccountCenterIcon,
      },
      {
        label: 'Account and Security',
        href: '/UserBackend/account-security',
        icon: SiteSecurityIcon,
      },
      {
        label: 'Help Center',
        href: '/UserBackend/messages?help_center=1',
        icon: SiteHelpCenterIcon,
      },
      {
        label: 'Quick help',
        href: '/UserBackend/messages?help_center=1',
        icon: SiteQuickHelpIcon,
      },
    ],
  },
]
