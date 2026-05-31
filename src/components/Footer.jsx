'use client'

import Link from 'next/link'
import { ArrowUp, ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import BrandLogo from './common/BrandLogo'
import CountryFlagIcon from './common/CountryFlagIcon'
import { useUserI18n } from '@/lib/i18n/useUserI18n'
import { INTERNATIONAL_COUNTRY, LANGUAGE_OPTIONS, LOCALE_COUNTRY_OPTIONS } from '@/lib/i18n/locale-config'

function InstagramIcon(props) {
  return (
    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' {...props}>
      <rect x='3.25' y='3.25' width='17.5' height='17.5' rx='5.25' stroke='currentColor' strokeWidth='1.8' />
      <circle cx='12' cy='12' r='4.1' stroke='currentColor' strokeWidth='1.8' />
      <circle cx='17.4' cy='6.7' r='1.2' fill='currentColor' />
    </svg>
  )
}

function TikTokIcon(props) {
  return (
    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' {...props}>
      <path
        d='M14.6 4.5c.5 1.6 1.7 2.9 3.3 3.4v3.1a8 8 0 0 1-3.3-1V15a5 5 0 1 1-5-5h.5v3.2h-.5a1.8 1.8 0 1 0 1.8 1.8V4.5h3.2Z'
        fill='currentColor'
      />
    </svg>
  )
}

function XIcon(props) {
  return (
    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' {...props}>
      <path d='M5 4.5h3.6l4 5.3 4.4-5.3H19l-5.6 6.7L19.4 19H15.8l-4.3-5.7L6.7 19H5l5.8-6.9L5 4.5Z' fill='currentColor' />
    </svg>
  )
}

function FacebookIcon(props) {
  return (
    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true' {...props}>
      <path
        d='M13.4 20v-6.2h2.1l.4-2.7h-2.5V9.3c0-.8.3-1.4 1.5-1.4H16V5.5c-.4-.1-1.2-.2-2.2-.2-2.2 0-3.7 1.3-3.7 3.9v1.9H8v2.7h2.1V20h3.3Z'
        fill='currentColor'
      />
    </svg>
  )
}

const socialPlatforms = [
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'TikTok', Icon: TikTokIcon },
  { label: 'Twitter / X', Icon: XIcon },
  { label: 'Facebook', Icon: FacebookIcon },
]

const footerGroups = [
  {
    title: 'LEGAL',
    links: [
      { label: 'Terms of Service', href: '/legal/terms-of-service' },
      { label: 'Privacy Policy', href: '/legal/privacy-policy' },
      { label: 'Returns Policy', href: '/legal/returns-policy' },
      { label: 'Order Protection Policy', href: '/legal/order-protection-policy' },
      { label: 'Seller Policy', href: '/legal/seller-policy' },
      { label: 'Acceptable Use', href: '/legal/acceptable-use' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', href: '/login' },
      { label: 'Create account', href: '/signup' },
      { label: 'Orders', href: '/account/orders' },
      { label: 'Messages', href: '/account/messages' },
    ],
  },
  {
    title: 'About Alxora',
    links: [
      { label: 'About us', href: '/about/about-us' },
      { label: 'How Alxora works', href: '/about/how-alxora-works' },
      { label: 'Pricing & currency info', href: '/about/pricing-currency-info' },
      { label: 'Careers (future)', href: '/about/careers' },
      { label: 'Sell On Alxora', href: '/about/sell-on-alxora' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact support', href: '/account/messages?help_center=1' },
      { label: 'Track your order', href: '/help/orders-delivery/track-your-order' },
      { label: 'Delivery information', href: '/help/orders-delivery/delivery-timelines' },
      { label: 'Returns & refunds', href: '/help/returns-refunds/how-to-return-an-item' },
    ],
  },
]

export default function Footer({ showBackToTop = true, topMargin = true }) {
  const { locale, setLocale } = useUserI18n()
  const year = new Date().getFullYear()
  const isInternational = locale.country === INTERNATIONAL_COUNTRY
  const [openMenu, setOpenMenu] = useState(null)
  const languageMenuRef = useRef(null)
  const countryMenuRef = useRef(null)

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (languageMenuRef.current?.contains(target) || countryMenuRef.current?.contains(target)) {
        return
      }
      setOpenMenu(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  return (
    <footer className={`${topMargin ? 'mt-16' : ''} border-t border-gray-200 bg-[#121212] text-white`}>
      <div className='mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8'>
        <div className='grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1.1fr,1.9fr]'>
          <div className='max-w-md'>
            <BrandLogo
              href='/'
              className='inline-flex flex-col items-start gap-2 text-white'
              markClassName='h-9 w-9 shrink-0 text-[#f5d10b]'
              labelClassName='text-xl font-semibold tracking-[0.08em] text-white'
              taglineClassName='text-[10px] font-medium uppercase tracking-[0.38em] text-white/55'
              showTagline
            />
            <p className='mt-4 text-sm leading-7 text-white/68'>
              Find everyday essentials and more, all in one place.
            </p>

            <div className='mt-6 rounded-xl border border-white/12 bg-transparent p-4 text-white'>
              <p className='text-lg font-semibold text-white'>We Accept</p>
              <div className='mt-3 flex flex-wrap items-center gap-3'>
                <span className='text-2xl font-extrabold tracking-tight text-[#1A1F71]'>VISA</span>
                <svg
                  viewBox='0 -222 2000 2000'
                  className='h-10 w-16'
                  xmlns='http://www.w3.org/2000/svg'
                  aria-label='Mastercard'
                  role='img'
                >
                  <path fill='#ff5f00' d='M1270.57 1104.15H729.71v-972h540.87Z' />
                  <path
                    fill='#eb001b'
                    d='M764 618.17c0-197.17 92.32-372.81 236.08-486A615.46 615.46 0 0 0 618.09 0C276.72 0 0 276.76 0 618.17s276.72 618.17 618.09 618.17a615.46 615.46 0 0 0 382-132.17C856.34 991 764 815.35 764 618.17'
                  />
                  <path
                    fill='#f79e1b'
                    d='M2000.25 618.17c0 341.41-276.72 618.17-618.09 618.17a615.65 615.65 0 0 1-382.05-132.17c143.8-113.19 236.12-288.82 236.12-486s-92.32-372.81-236.12-486A615.65 615.65 0 0 1 1382.15 0c341.37 0 618.09 276.76 618.09 618.17'
                  />
                </svg>
                <span className='rounded bg-[#2E77BC] px-2.5 py-1.5 text-xs font-bold text-white'>
                  AMEX
                </span>
                <span className='rounded bg-[#0b1d4d] px-2.5 py-1.5 text-xs font-bold text-white'>
                  VERVE
                </span>
                <span className='inline-flex h-8 items-center justify-center rounded border border-white/20 bg-white/5 px-2.5 text-xs font-bold text-white/80'>
                  BANK
                </span>
                <span className='inline-flex h-8 items-center justify-center rounded border border-emerald-400/40 bg-emerald-400/10 px-2.5 text-xs font-bold text-emerald-300'>
                  *737#
                </span>
                <span className='inline-flex h-8 items-center justify-center rounded border border-white/20 bg-white/5 px-2.5 text-xs font-bold text-white/80'>
                  BANK TRANSFER
                </span>
              </div>
            </div>
          </div>

          <div className='grid gap-8 sm:grid-cols-2 xl:grid-cols-4'>
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className='text-sm font-semibold uppercase tracking-[0.16em] text-white'>
                  {group.title}
                </h2>
                <ul className='mt-4 space-y-3'>
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className='inline-flex items-center gap-2 text-sm text-white/68 transition hover:text-white'
                      >
                        <span>{link.label}</span>
                        <ArrowUpRight className='h-3.5 w-3.5' aria-hidden='true' />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className='flex flex-col gap-4 py-5 text-sm text-white/56 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <span>&copy; {year} Alxora.</span>
              <span className='hidden sm:inline'>All rights reserved.</span>
            </div>
            <div className='flex flex-wrap items-center gap-4 text-white/74'>
              {socialPlatforms.map(({ label, Icon }) => (
                <span key={label} className='inline-flex items-center gap-2 text-sm text-white/74'>
                  <Icon className='h-4 w-4 shrink-0' />
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <div className='relative' ref={languageMenuRef}>
              <button
                type='button'
                onClick={() => setOpenMenu((current) => (current === 'language' ? null : 'language'))}
                className='inline-flex min-w-[46px] items-center justify-center rounded-full border border-white/40 px-4 py-2 text-xs font-semibold tracking-[0.08em] text-white transition hover:bg-white/5'
                aria-haspopup='menu'
                aria-expanded={openMenu === 'language'}
              >
                {String(locale.language || '').toUpperCase()}
              </button>
              {openMenu === 'language' ? (
                <div className='absolute bottom-full left-0 z-20 mb-2 min-w-[160px] overflow-hidden rounded-2xl border border-white/12 bg-[#161616] py-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)]'>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.code}
                      type='button'
                      onClick={() => {
                        setLocale({ language: option.code })
                        setOpenMenu(null)
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-white/6 ${
                        locale.language === option.code ? 'text-white' : 'text-white/72'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className='text-[11px] font-semibold tracking-[0.08em]'>{option.code}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className='relative' ref={countryMenuRef}>
              <button
                type='button'
                onClick={() => setOpenMenu((current) => (current === 'country' ? null : 'country'))}
                className='inline-flex min-w-[92px] items-center justify-center gap-2 rounded-full border border-white/40 px-4 py-2 text-xs font-semibold tracking-[0.08em] text-white transition hover:bg-white/5'
                aria-haspopup='menu'
                aria-expanded={openMenu === 'country'}
              >
                <CountryFlagIcon
                  country={locale.country}
                  className='h-3.5 w-5 rounded-[2px] object-cover'
                />
                {isInternational ? 'INTERNATIONAL' : 'NIGERIA'}
              </button>
              {openMenu === 'country' ? (
                <div className='absolute bottom-full left-0 z-20 mb-2 min-w-[210px] overflow-hidden rounded-2xl border border-white/12 bg-[#161616] py-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)]'>
                  {LOCALE_COUNTRY_OPTIONS.map((country) => (
                    <button
                      key={country}
                      type='button'
                      onClick={() => {
                        setLocale({ country })
                        setOpenMenu(null)
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-white/6 ${
                        locale.country === country ? 'text-white' : 'text-white/72'
                      }`}
                    >
                      <CountryFlagIcon
                        country={country}
                        className='h-4 w-6 rounded-[2px] object-cover'
                      />
                      <span>{country}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {showBackToTop ? (
              <button
                type='button'
                onClick={handleBackToTop}
                className='inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/5'
              >
                <ArrowUp className='h-3.5 w-3.5' aria-hidden='true' />
                Back to top
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  )
}
