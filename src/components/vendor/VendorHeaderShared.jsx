'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useOptionalCart } from '@/context/CartContext';
import { useAuthUser } from '@/lib/auth/useAuthUser';
import VendorMiniCart from './VendorMiniCart';
import VendorMiniWishlist from './VendorMiniWishlist';

// ── 10 logo font options ──────────────────────────────────────────────────────
export const VENDOR_LOGO_FONTS = {
  playfair:    { label: 'Playfair Display',   family: '"Playfair Display", serif',    google: 'Playfair+Display:wght@700',         cls: 'font-bold' },
  cormorant:   { label: 'Cormorant Garamond', family: '"Cormorant Garamond", serif',   google: 'Cormorant+Garamond:wght@700',        cls: 'font-bold' },
  montserrat:  { label: 'Montserrat',         family: '"Montserrat", sans-serif',      google: 'Montserrat:wght@700',               cls: 'font-bold tracking-wide' },
  josefin:     { label: 'Josefin Sans',       family: '"Josefin Sans", sans-serif',    google: 'Josefin+Sans:wght@600',             cls: 'font-semibold tracking-[0.18em] uppercase' },
  raleway:     { label: 'Raleway',            family: '"Raleway", sans-serif',         google: 'Raleway:wght@700',                  cls: 'font-bold' },
  dm_serif:    { label: 'DM Serif Display',   family: '"DM Serif Display", serif',     google: 'DM+Serif+Display',                  cls: '' },
  bebas:       { label: 'Bebas Neue',         family: '"Bebas Neue", sans-serif',      google: 'Bebas+Neue',                        cls: 'tracking-widest' },
  baskerville: { label: 'Libre Baskerville',  family: '"Libre Baskerville", serif',    google: 'Libre+Baskerville:ital,wght@0,700', cls: 'font-bold' },
  cinzel:      { label: 'Cinzel',             family: '"Cinzel", serif',               google: 'Cinzel:wght@600',                   cls: 'tracking-[0.12em]' },
  italiana:    { label: 'Italiana',           family: '"Italiana", serif',             google: 'Italiana',                          cls: '' },
}

export function useLoadGoogleFont(fontKey) {
  useEffect(() => {
    const font = VENDOR_LOGO_FONTS[fontKey]
    if (!font) return
    const id = `gfont-${fontKey}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
    document.head.appendChild(link)
  }, [fontKey])
}

// ── Vendor logo renderer ──────────────────────────────────────────────────────
export function VendorLogo({ name, logoUrl, logoFullUrl, logoFont, isLight = false }) {
  useLoadGoogleFont(logoFont)
  const font = VENDOR_LOGO_FONTS[logoFont]

  if (logoFullUrl) {
    return (
      <img
        src={logoFullUrl}
        alt={name}
        className={`h-8 lg:h-10 w-auto max-w-[180px] object-contain ${isLight ? 'brightness-0 invert' : ''}`}
      />
    )
  }

  if (font) {
    return (
      <span
        className={`text-lg lg:text-2xl leading-none ${font.cls} ${isLight ? 'text-white' : 'text-gray-900'}`}
        style={{ fontFamily: font.family }}
      >
        {name}
      </span>
    )
  }

  const initials = (name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
  return (
    <div className="flex items-center gap-2.5">
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="h-8 w-8 rounded-full object-cover border border-white/10" />
      ) : (
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${isLight ? 'bg-white/20 text-white' : 'bg-gray-900 text-white'}`}>
          {initials}
        </div>
      )}
      <span className={`text-sm lg:text-base font-bold tracking-tight ${isLight ? 'text-white' : 'text-gray-900'}`}>
        {name}
      </span>
    </div>
  )
}

// ── Powered by Alxora mini bar ────────────────────────────────────────────────
export function PoweredByBar() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="h-8 w-full bg-[#0a0a0a] flex items-center justify-between px-3 sm:px-5 relative">
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-[11px] font-medium"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="hidden sm:inline">Alxora</span>
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 w-52 rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden z-[42]">
            <div className="py-1">
              <Link href="/products" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                Browse Marketplace
              </Link>
              <Link href="/help-center" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                Help Center
              </Link>
              <div className="my-1 h-px bg-gray-100" />
              <Link href="/sellersignup" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Start Selling
              </Link>
            </div>
          </div>
        )}
      </div>

      <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-[10px] font-medium text-white/35 uppercase tracking-[0.2em]">Powered by</span>
        <span className="text-[11px] font-bold text-white/80 tracking-[0.15em] uppercase">Alxora</span>
      </Link>

      <Link href="/products" className="text-[11px] font-medium text-white/40 hover:text-white/80 transition-colors hidden sm:block">
        Explore →
      </Link>
    </div>
  )
}

// ── Cart / Wishlist / Account icons with AJAX drawers ────────────────────────
export function HeaderIcons({ initialAuthUser = null, isLight = false }) {
  const cart = useOptionalCart()
  const cartCount = cart?.summary?.itemCount ?? 0
  const { user } = useAuthUser(initialAuthUser, Boolean(initialAuthUser))
  const avatarLetter = (user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase()
  const [cartOpen, setCartOpen] = useState(false)
  const [wishlistOpen, setWishlistOpen] = useState(false)

  const btn = isLight
    ? 'relative flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors'
    : 'relative flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors'

  return (
    <>
      <div className="flex items-center gap-0.5">
        {/* Wishlist — hidden on mobile, visible sm+ */}
        <button type="button" onClick={() => setWishlistOpen(true)}
          className={`hidden sm:flex ${btn.replace('flex ', '')}`} aria-label="Wishlist">
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>

        {/* Cart — always visible */}
        <button type="button" onClick={() => setCartOpen(true)} className={btn} aria-label="Cart">
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-[9px] font-bold text-white leading-none">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>

        {/* Account — always visible */}
        <Link
          href={user ? '/account' : '/login'}
          className={`flex h-8 w-8 items-center justify-center rounded-full overflow-hidden text-[11px] font-bold transition-opacity hover:opacity-80 ${isLight ? 'bg-white/15 text-white border border-white/20' : 'bg-gray-900 text-white'}`}
          aria-label="Account"
        >
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : avatarLetter}
        </Link>
      </div>

      {/* AJAX drawers */}
      <VendorMiniCart open={cartOpen} onClose={() => setCartOpen(false)} isLight={isLight} />
      <VendorMiniWishlist open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
    </>
  )
}
