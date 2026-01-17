'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const buildTabs = (customerId) => [
  { label: 'Overview', href: `/backend/admin/customers/${customerId}` },
  { label: 'About', href: `/backend/admin/customers/${customerId}/about` },
  { label: 'Addresses', href: `/backend/admin/customers/${customerId}/addresses` },
  { label: 'Contact', href: `/backend/admin/customers/${customerId}/contact` },
  { label: 'Security', href: `/backend/admin/customers/${customerId}/security` },
]

export default function CustomerTabs({ customerId }) {
  const pathname = usePathname()
  const tabs = buildTabs(customerId)

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
              isActive
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </Link>
        )}
      )}
    </div>
  )
}
