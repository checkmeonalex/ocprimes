'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useAdminProfileIdentity from '@/components/admin/useAdminProfileIdentity';
import { getProfileIdentityImageUrl, getProfileIdentityInitials } from '@/lib/user/profile-identity-cache';
import { useAdminTheme } from '@/context/AdminThemeContext';

const HEADER_META = [
  { match: '/backend/admin/dashboard', title: 'Dashboard', subtitle: 'Detailed information about your store' },
  { match: '/admin/dashboard', title: 'Dashboard', subtitle: 'Detailed information about your store' },
  { match: '/backend/admin/products', title: 'Products', subtitle: 'Manage products, stock, and visibility' },
  { match: '/admin/products', title: 'Products', subtitle: 'Manage products, stock, and visibility' },
  { match: '/backend/admin/notifications', title: 'Notifications', subtitle: 'Track account, catalog, and workflow alerts' },
  { match: '/admin/notifications', title: 'Notifications', subtitle: 'Track account, catalog, and workflow alerts' },
  { match: '/backend/admin/store-front', title: 'Store front', subtitle: 'Manage storefront structure and publishing' },
  { match: '/admin/store-front', title: 'Store front', subtitle: 'Manage storefront structure and publishing' },
  { match: '/backend/admin/orders', title: 'Orders', subtitle: 'Track sales and fulfillment status' },
  { match: '/admin/orders', title: 'Orders', subtitle: 'Track sales and fulfillment status' },
  { match: '/backend/admin/messages', title: 'Messages', subtitle: 'Reply to buyers and manage conversations' },
  { match: '/admin/messages', title: 'Messages', subtitle: 'Reply to buyers and manage conversations' },
  { match: '/backend/admin/reviews', title: 'Reviews', subtitle: 'Moderate and manage product reviews' },
  { match: '/admin/reviews', title: 'Reviews', subtitle: 'Moderate and manage product reviews' },
  { match: '/backend/admin/customers', title: 'Customers', subtitle: 'Review customer activity and profiles' },
  { match: '/admin/customers', title: 'Customers', subtitle: 'Review customer activity and profiles' },
  { match: '/backend/admin/categories', title: 'Categories', subtitle: 'Organize product collections' },
  { match: '/admin/categories', title: 'Categories', subtitle: 'Organize product collections' },
  { match: '/backend/admin/brands', title: 'Brands', subtitle: 'Manage brand records and assignments' },
  { match: '/admin/brands', title: 'Brands', subtitle: 'Manage brand records and assignments' },
  { match: '/backend/admin/tags', title: 'Tags', subtitle: 'Manage product labels and discovery tags' },
  { match: '/admin/tags', title: 'Tags', subtitle: 'Manage product labels and discovery tags' },
  { match: '/backend/admin/attributes', title: 'Attributes', subtitle: 'Configure product attributes and terms' },
  { match: '/admin/attributes', title: 'Attributes', subtitle: 'Configure product attributes and terms' },
  { match: '/backend/admin/library', title: 'Library', subtitle: 'Manage your uploaded media assets' },
  { match: '/admin/library', title: 'Library', subtitle: 'Manage your uploaded media assets' },
  { match: '/backend/admin/size-guides', title: 'Size Guides', subtitle: 'Maintain sizing information and charts' },
  { match: '/admin/size-guides', title: 'Size Guides', subtitle: 'Maintain sizing information and charts' },
  { match: '/backend/admin/logistics', title: 'Logistics', subtitle: 'Configure city delivery fees and ETA windows' },
  { match: '/admin/logistics', title: 'Logistics', subtitle: 'Configure city delivery fees and ETA windows' },
  { match: '/backend/admin/pages/home', title: 'Homepage layout', subtitle: 'Design and arrange homepage blocks' },
  { match: '/admin/pages/home', title: 'Homepage layout', subtitle: 'Design and arrange homepage blocks' },
  { match: '/backend/admin/pages', title: 'Pages', subtitle: 'Manage website page layouts' },
  { match: '/admin/pages', title: 'Pages', subtitle: 'Manage website page layouts' },
  { match: '/backend/admin/templates', title: 'Templates', subtitle: 'Pick the look and feel of your store.' },
  { match: '/admin/templates', title: 'Templates', subtitle: 'Pick the look and feel of your store.' },
  { match: '/backend/admin/settings', title: 'Settings', subtitle: 'Configure store and admin preferences' },
  { match: '/admin/settings', title: 'Settings', subtitle: 'Configure store and admin preferences' },
  { match: '/backend/admin/admin/users', title: 'Admin Users', subtitle: 'Manage administrator access' },
  { match: '/backend/admin/admin/brands', title: 'Admin Brands', subtitle: 'Manage internal brand directory' },
];

function resolveHeaderMeta(pathname) {
  if (!pathname) return { title: 'Dashboard', subtitle: 'Detailed information about your store' };
  const direct = HEADER_META.find((item) => pathname === item.match);
  if (direct) return direct;
  const prefixed = HEADER_META.find((item) => pathname.startsWith(`${item.match}/`));
  if (prefixed) return prefixed;
  if (pathname.startsWith('/backend/admin') || pathname.startsWith('/admin')) {
    return { title: 'Dashboard', subtitle: 'Detailed information about your store' };
  }
  return { title: 'Admin', subtitle: 'Manage your workspace' };
}

export default function AdminDesktopHeader({ noMargin = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const meta = useMemo(() => resolveHeaderMeta(pathname), [pathname]);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileIdentity = useAdminProfileIdentity()
  const profileInitials = getProfileIdentityInitials(profileIdentity?.displayName)
  const profileImageUrl = getProfileIdentityImageUrl(profileIdentity)
  const { isDark, toggleTheme } = useAdminTheme()

  // --- Global search ---
  const ADMIN_PAGES = [
    { label: 'Dashboard', path: '/admin/dashboard', description: 'Overview & analytics', keywords: 'home overview stats metrics' },
    { label: 'Orders', path: '/admin/orders', description: 'Track sales & fulfillment', keywords: 'sales purchases transactions' },
    { label: 'Products', path: '/admin/products', description: 'Manage products & stock', keywords: 'items catalog inventory sku' },
    { label: 'Customers', path: '/admin/customers', description: 'Customer profiles', keywords: 'users buyers accounts' },
    { label: 'Store Front', path: '/admin/store-front', description: 'Storefront structure', keywords: 'store homepage design layout' },
    { label: 'Templates', path: '/admin/templates', description: 'Design templates', keywords: 'theme style appearance' },
    { label: 'Pages', path: '/admin/pages', description: 'Manage page layouts', keywords: 'cms homepage content' },
    { label: 'Library', path: '/admin/library', description: 'Uploaded media assets', keywords: 'images files media uploads' },
    { label: 'Size Guides', path: '/admin/size-guides', description: 'Sizing charts', keywords: 'size measurement chart guide' },
    { label: 'Reviews', path: '/admin/reviews', description: 'Product reviews', keywords: 'ratings feedback comments' },
    { label: 'Messages', path: '/admin/messages', description: 'Buyer conversations', keywords: 'chat inbox support' },
    { label: 'Notifications', path: '/admin/notifications', description: 'Alerts & updates', keywords: 'alerts updates inbox' },
    { label: 'Categories', path: '/admin/categories', description: 'Product collections', keywords: 'groups taxonomy collection' },
    { label: 'Brands', path: '/admin/brands', description: 'Brand directory', keywords: 'vendor seller manufacturer' },
    { label: 'Attributes', path: '/admin/attributes', description: 'Product attributes', keywords: 'options variants specs' },
    { label: 'Tags', path: '/admin/tags', description: 'Product tags', keywords: 'labels filter discovery' },
    { label: 'Logistics', path: '/admin/logistics', description: 'Delivery & shipping fees', keywords: 'shipping delivery pickup zones' },
    { label: 'Settings', path: '/admin/settings', description: 'Store preferences', keywords: 'config options profile' },
    { label: 'Manage Sellers', path: '/backend/admin/admin/brands', description: 'Seller management', keywords: 'vendors sellers admins platform' },
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ products: [], customers: [], pages: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const matchPages = useCallback((q) => {
    const lower = q.toLowerCase();
    return ADMIN_PAGES.filter((page) =>
      page.label.toLowerCase().includes(lower) ||
      page.description.toLowerCase().includes(lower) ||
      page.keywords.includes(lower)
    ).slice(0, 4);
  }, []);

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults({ products: [], customers: [], pages: [] }); setSearchLoading(false); return; }
    setSearchLoading(true);
    const matchedPages = matchPages(q);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/admin/products?q=${encodeURIComponent(q)}&per_page=5`).then(r => r.json()).catch(() => null),
        fetch(`/api/admin/customers?q=${encodeURIComponent(q)}&per_page=4`).then(r => r.json()).catch(() => null),
      ]);
      setSearchResults({
        products: Array.isArray(pRes?.items) ? pRes.items : Array.isArray(pRes?.data) ? pRes.data : [],
        customers: Array.isArray(cRes?.items) ? cRes.items : Array.isArray(cRes?.data) ? cRes.data : [],
        pages: matchedPages,
      });
    } catch { setSearchResults({ products: [], customers: [], pages: matchedPages }); }
    finally { setSearchLoading(false); }
  }, [matchPages]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setSearchOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 300);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
  };

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasResults = searchResults.products.length > 0 || searchResults.customers.length > 0 || searchResults.pages.length > 0;
  const showDropdown = searchOpen && searchQuery.trim().length > 0;
  // --- end search ---

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch('/api/admin/notifications?page=1&per_page=1', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || cancelled) return;
        setUnreadCount(Number(payload?.summary?.unread || 0) || 0);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-20 hidden border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/75 dark:border-zinc-700/60 dark:bg-[#242426]/95 dark:supports-[backdrop-filter]:bg-[#242426]/90 sm:px-6 lg:flex lg:px-10 ${
        noMargin ? 'mb-0' : 'mb-4'
      }`}
    >
      <div className="flex w-full items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">{meta.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{meta.subtitle}</p>
        </div>

        <div className="flex min-w-[280px] flex-1 items-center justify-end gap-3">
          <div ref={searchRef} className="relative w-full max-w-[360px]">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-zinc-600/50 dark:bg-[#2c2c2e]">
              {searchLoading ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="6" />
                  <path d="m15.5 15.5 4 4" />
                </svg>
              )}
              <input
                type="search"
                placeholder="Search products, customers, pages…"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="text-slate-300 hover:text-slate-500">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {showDropdown && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-2xl border border-slate-200 bg-white shadow-xl flex flex-col max-h-[420px] dark:border-zinc-600/50 dark:bg-[#2c2c2e]">
                <div className="overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb:hover]:bg-slate-300">
                {!hasResults && !searchLoading && (
                  <p className="px-4 py-5 text-center text-xs text-slate-400">No results for "{searchQuery}"</p>
                )}
                {searchResults.products.length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Products</p>
                    {searchResults.products.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { router.push(`/backend/admin/products/${p.id}`); setSearchOpen(false); setSearchQuery(''); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-[#3a3a3c]"
                      >
                        {p.images?.[0]?.src || p.thumbnail ? (
                          <img src={p.images?.[0]?.src || p.thumbnail} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 4 7.5l8 4.5 8-4.5L12 3Z" /><path d="M4 7.5V16.5L12 21l8-4.5V7.5" /></svg>
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-800">{p.title || p.name || 'Untitled'}</p>
                          <p className="text-[11px] text-slate-400">{p.sku || p.status || ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.customers.length > 0 && (
                  <div className={searchResults.products.length > 0 ? 'border-t border-slate-100' : ''}>
                    <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Customers</p>
                    {searchResults.customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { router.push(`/backend/admin/customers/${c.id}`); setSearchOpen(false); setSearchQuery(''); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-[#3a3a3c]"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                          {(c.name || c.email || '?').charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-800">{c.name || 'Customer'}</p>
                          <p className="truncate text-[11px] text-slate-400">{c.email || ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.pages.length > 0 && (
                  <div className={(searchResults.products.length > 0 || searchResults.customers.length > 0) ? 'border-t border-slate-100' : ''}>
                    <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Pages</p>
                    {searchResults.pages.map((page) => (
                      <button
                        key={page.path}
                        type="button"
                        onClick={() => { router.push(page.path); setSearchOpen(false); setSearchQuery(''); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-[#3a3a3c]"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M6 4.5h9l3 3V19.5H6z" /><path d="M15 4.5V8h3" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-800">{page.label}</p>
                          <p className="truncate text-[11px] text-slate-400">{page.description}</p>
                        </div>
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-300">→</span>
                      </button>
                    ))}
                  </div>
                )}
                </div>
                <div className="shrink-0 border-t border-slate-100 px-4 py-2.5">
                  <p className="text-[10px] text-slate-300">Press Esc to close</p>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push('/admin/messages')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Messages"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5.5 6.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H12l-4.5 3v-3H5.5A1.5 1.5 0 0 1 4 15V8a1.5 1.5 0 0 1 1.5-1.5Z" />
              <path d="M8 10.5h8M8 13.5h5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {isDark ? (
              /* Moon → currently dark, click to go light */
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              /* Sun → currently light, click to go dark */
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3v1.5M12 19.5V21M4.9 4.9l1.1 1.1M18 18l1.1 1.1M3 12h1.5M19.5 12H21M4.9 19.1 6 18M18 6l1.1-1.1" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/notifications')}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Open notifications"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 19.25C15 20.0456 14.6839 20.8087 14.1213 21.3713C13.5587 21.9339 12.7956 22.25 12 22.25C11.2044 22.25 10.4413 21.9339 9.87869 21.3713C9.31608 20.8087 9 20.0456 9 19.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5.58096 18.25C5.09151 18.1461 4.65878 17.8626 4.36813 17.4553C4.07748 17.048 3.95005 16.5466 4.01098 16.05L5.01098 7.93998C5.2663 6.27263 6.11508 4.75352 7.40121 3.66215C8.68734 2.57077 10.3243 1.98054 12.011 1.99998V1.99998C13.6977 1.98054 15.3346 2.57077 16.6207 3.66215C17.9069 4.75352 18.7557 6.27263 19.011 7.93998L20.011 16.05C20.0723 16.5452 19.9462 17.0454 19.6576 17.4525C19.369 17.8595 18.9386 18.144 18.451 18.25C14.2186 19.2445 9.81332 19.2445 5.58096 18.25V18.25Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>
          <div
            className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-semibold text-white"
            title={profileIdentity?.displayName || 'Admin User'}
            aria-label={profileIdentity?.displayName || 'Admin User'}
          >
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={profileIdentity.displayName || 'Profile'} className="h-full w-full object-cover" />
            ) : (
              profileInitials
            )}
          </div>
          <button type="button" onClick={() => router.push('/admin/settings')} aria-label="Settings" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.7 14C10.623 14 9.74999 13.1046 9.74999 12C9.74999 10.8954 10.623 10 11.7 10C12.7769 10 13.65 10.8954 13.65 12C13.65 12.5304 13.4445 13.0391 13.0789 13.4142C12.7132 13.7893 12.2172 14 11.7 14Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16.8841 16.063V14.721C16.8841 14.3887 17.0128 14.07 17.2419 13.835L18.1672 12.886C18.6443 12.3967 18.6443 11.6033 18.1672 11.114L17.2419 10.165C17.0128 9.93001 16.8841 9.61131 16.8841 9.27899V7.93599C16.8841 7.24398 16.3371 6.68299 15.6624 6.68299H14.353C14.029 6.68299 13.7182 6.55097 13.4891 6.31599L12.5638 5.36699C12.0867 4.87767 11.3132 4.87767 10.8361 5.36699L9.91087 6.31599C9.68176 6.55097 9.37102 6.68299 9.04702 6.68299H7.73759C7.41341 6.68299 7.10253 6.81514 6.87339 7.05034C6.64425 7.28554 6.51566 7.6045 6.51592 7.93699V9.27899C6.51591 9.61131 6.3872 9.93001 6.15809 10.165L5.23282 11.114C4.75573 11.6033 4.75573 12.3967 5.23282 12.886L6.15809 13.835C6.3872 14.07 6.51591 14.3887 6.51592 14.721V16.063C6.51592 16.755 7.06288 17.316 7.73759 17.316H9.04702C9.37102 17.316 9.68176 17.448 9.91087 17.683L10.8361 18.632C11.3132 19.1213 12.0867 19.1213 12.5638 18.632L13.4891 17.683C13.7182 17.448 14.029 17.316 14.353 17.316H15.6614C15.9856 17.3163 16.2966 17.1844 16.5259 16.9493C16.7552 16.7143 16.8841 16.3955 16.8841 16.063Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
