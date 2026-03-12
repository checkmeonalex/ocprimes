'use client'
import {
  ClipboardList,
  CreditCard,
  PackageSearch,
  RotateCcw,
  UserRound,
  Wrench,
} from 'lucide-react'

const browseTopics = [
  {
    label: 'Orders & Delivery',
    href: '#orders-delivery',
    icon: ClipboardList,
    accentClassName: 'bg-[#ff7a1a] text-white',
  },
  {
    label: 'Payments & Checkout',
    href: '#payments-checkout',
    icon: CreditCard,
    accentClassName: 'bg-[#d9e5fb] text-[#16416b]',
  },
  {
    label: 'Returns & Refunds',
    href: '#returns-refunds',
    icon: RotateCcw,
    accentClassName: 'bg-[#f5e7d1] text-[#7b5620]',
  },
  {
    label: 'Account & Security',
    href: '#account-security',
    icon: UserRound,
    accentClassName: 'bg-[#f7b63d] text-[#3f2600]',
  },
  {
    label: 'Products & Stores',
    href: '#products-sellers',
    icon: PackageSearch,
    accentClassName: 'bg-[#195a57] text-[#ffe38c]',
  },
  {
    label: 'Technical Issues',
    href: '#app-technical-issues',
    icon: Wrench,
    accentClassName: 'bg-[#d9e5fb] text-[#16416b]',
  },
]

export default function HelpCenterQuickAccess() {
  return (
    <section className='mt-8'>
      <div className='rounded-[28px] border border-[#d7e4f0] bg-[#edf5ff] p-6 shadow-[0_18px_45px_rgba(56,84,122,0.06)]'>
        <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7e90]'>
          Quick Access
        </p>
        <h2 className='mt-2 text-2xl font-semibold tracking-tight text-[#17352b]'>
          Browse Topics
        </h2>

        <div className='mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
          {browseTopics.map((topic) => {
            const Icon = topic.icon

            return (
              <a
                key={topic.label}
                href={topic.href}
                className='group rounded-[24px] border border-[#d7e4f0] bg-white p-4 shadow-[0_18px_40px_rgba(56,84,122,0.05)] transition hover:-translate-y-0.5 hover:border-[#bfd4ea] hover:shadow-[0_24px_50px_rgba(56,84,122,0.09)] sm:p-5'
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full transition group-hover:scale-[1.03] ${topic.accentClassName}`}
                >
                  <Icon className='h-7 w-7' strokeWidth={1.9} aria-hidden='true' />
                </div>
                <div className='mt-5 flex items-center justify-between gap-3'>
                  <h3 className='text-xl font-semibold tracking-tight text-[#17352b]'>
                    {topic.label}
                  </h3>
                  <span className='text-lg text-[#6f7e90] transition group-hover:text-[#17352b]'>
                    ↓
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
