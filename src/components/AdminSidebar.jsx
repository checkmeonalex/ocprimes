'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import useAdminProfileIdentity from '@/components/admin/useAdminProfileIdentity';
import { getProfileIdentityImageUrl, getProfileIdentityInitials } from '@/lib/user/profile-identity-cache';

const DESKTOP_NAV_ITEMS = [
  { label: 'Dashboard', href: '/backend/admin/dashboard', icon: 'dashboard' },
  { label: 'Orders', href: '/backend/admin/orders', icon: 'orders' },
  { label: 'Messages', href: '/backend/admin/messages', icon: 'messages' },
  { label: 'Products', href: '/backend/admin/products', icon: 'products' },
  { label: 'Notifications', href: '/backend/admin/notifications', icon: 'notifications' },
  { label: 'Reviews', href: '/backend/admin/reviews', icon: 'reviews' },
  { label: 'Store front', href: '/backend/admin/store-front', icon: 'storefront' },
  { label: 'Attributes', href: '/backend/admin/attributes', icon: 'attributes' },
  {
    label: 'Pages',
    href: '/backend/admin/pages',
    icon: 'pages',
    subItems: [{ label: 'Home', href: '/backend/admin/pages/home' }],
  },
  { label: 'Categories', href: '/backend/admin/categories', icon: 'categories' },
  { label: 'Brands', href: '/backend/admin/brands', icon: 'brands' },
  { label: 'Tags', href: '/backend/admin/tags', icon: 'tags' },
  { label: 'Customers', href: '/backend/admin/customers', icon: 'customers' },
  { label: 'Library', href: '/backend/admin/library', icon: 'library' },
  { label: 'Size Guides', href: '/backend/admin/size-guides', icon: 'guides' },
  { label: 'Settings', href: '/backend/admin/settings', icon: 'settings' },
  { label: 'Shortcut', href: '/backend/admin/shortcut', icon: 'shortcut' },
  { label: 'Vendor Users', href: '/backend/admin/admin/users', icon: 'adminUsers' },
  { label: 'Vendor Brands', href: '/backend/admin/admin/brands', icon: 'adminBrands' },
];

const MOBILE_NAV_ITEMS = [
  { key: 'home', label: 'Home', href: '/backend/admin/dashboard' },
  { key: 'orders', label: 'Orders', href: '/backend/admin/orders' },
  { key: 'products', label: 'Products', href: '/backend/admin/products' },
  { key: 'more', label: 'More', href: '/backend/admin/settings' },
];

const NavIcon = ({ icon }) => {
  switch (icon) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 5.5h7v6H4zM13 5.5h7V10h-7zM4 13h7v5.5H4zM13 12h7v6.5h-7z" />
        </svg>
      );
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4.5" width="16" height="15" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case 'messages':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5.5 6.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H12l-4.5 3v-3H5.5A1.5 1.5 0 0 1 4 15V8a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path d="M8 10.5h8M8 13.5h5" strokeLinecap="round" />
        </svg>
      );
    case 'products':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3 4 7.5l8 4.5 8-4.5L12 3Z" />
          <path d="M4 7.5V16.5L12 21l8-4.5V7.5" />
        </svg>
      );
    case 'reviews':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m12 3.5 2.5 5.1 5.6.8-4 3.9.9 5.5L12 16.3 7 18.8l1-5.5-4-3.9 5.6-.8L12 3.5Z" />
        </svg>
      );
    case 'notifications':
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      );
    case 'storefront':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3.5 10.5h17" />
          <path d="M5 10.5V19h14v-8.5" />
          <path d="M4.5 6h15l1 4.5h-17Z" />
          <path d="M9.5 14h5V19h-5Z" />
        </svg>
      );
    case 'attributes':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 6h13M7 12h13M7 18h13M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
      );
    case 'pages':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 4.5h9l3 3V19.5H6z" />
          <path d="M15 4.5V8h3" />
        </svg>
      );
    case 'categories':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4.5 6.5h6v5h-6zM13.5 6.5h6v5h-6zM4.5 13.5h6v5h-6zM13.5 13.5h6v5h-6z" />
        </svg>
      );
    case 'brands':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 12.5 12 4l8 8.5-8 7.5-8-7.5Z" />
          <path d="M12 4v16" />
        </svg>
      );
    case 'tags':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M11 4H5v6l8.5 8.5a2.1 2.1 0 0 0 3 0l2-2a2.1 2.1 0 0 0 0-3Z" />
          <circle cx="8" cy="8" r="1.2" />
        </svg>
      );
    case 'customers':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case 'library':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 5h12v14H6zM9 5v14M13 5v14" />
        </svg>
      );
    case 'guides':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 5.5h6v13H5zM13 5.5h6v13h-6z" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" xmlns="http://www.w3.org/2000/svg">
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
      );
    case 'shortcut':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 7a3 3 0 1 1 0 6H6a3 3 0 0 0 0 6h3" />
          <path d="M16 17a3 3 0 1 1 0-6h2a3 3 0 0 0 0-6h-3" />
          <path d="M9 12h6" />
        </svg>
      );
    case 'adminUsers':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M3.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M1.5 18a4 4 0 0 1 4-4h2M11 20a5 5 0 0 1 9.5 0" />
        </svg>
      );
    case 'adminBrands':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 12h16M12 4l8 8-8 8-8-8Z" />
        </svg>
      );
    default:
      return null;
  }
};

const AdminSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState([]);
  const [role, setRole] = useState('unknown');
  const [isMobileDockVisible, setIsMobileDockVisible] = useState(true);
  const profileIdentity = useAdminProfileIdentity();
  const profileInitials = getProfileIdentityInitials(profileIdentity?.displayName);
  const profileImageUrl = getProfileIdentityImageUrl(profileIdentity);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      try {
        const response = await fetch('/api/auth/role', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });
        const payload = await response.json().catch(() => null);
        if (!isMounted) return;
        if (!response.ok) {
          setRole('unknown');
          return;
        }
        if (payload?.is_admin) {
          setRole('admin');
          return;
        }
        if (payload?.is_vendor) {
          setRole('vendor');
          return;
        }
        setRole(payload?.role === 'admin' || payload?.role === 'vendor' ? payload.role : 'unknown');
      } catch {
        if (isMounted) {
          setRole('unknown');
        }
      }
    };

    void loadRole();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const syncDockVisibility = () => {
      if (typeof window === 'undefined') return;
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const viewportHeight = window.innerHeight || 0;
      const documentHeight = document.documentElement?.scrollHeight || 0;
      const atTop = scrollTop <= 8;
      const atBottom = scrollTop + viewportHeight >= documentHeight - 8;

      if (atTop) {
        setIsMobileDockVisible(true);
        return;
      }
      if (atBottom) {
        setIsMobileDockVisible(false);
      }
    };

    syncDockVisibility();
    window.addEventListener('scroll', syncDockVisibility, { passive: true });
    window.addEventListener('resize', syncDockVisibility);
    return () => {
      window.removeEventListener('scroll', syncDockVisibility);
      window.removeEventListener('resize', syncDockVisibility);
    };
  }, []);

  const desktopNavItems = useMemo(() => {
    if (role === 'admin') return DESKTOP_NAV_ITEMS;
    return DESKTOP_NAV_ITEMS.filter(
      (item) =>
        item.href !== '/backend/admin/categories' &&
        item.href !== '/backend/admin/brands' &&
        item.href !== '/backend/admin/customers' &&
        item.href !== '/backend/admin/pages' &&
        item.href !== '/backend/admin/admin/users' &&
        item.href !== '/backend/admin/admin/brands',
    );
  }, [role]);

  const activeKey = useMemo(() => {
    if (pathname?.startsWith('/backend/admin/orders')) return 'orders';
    if (pathname?.startsWith('/backend/admin/products')) return 'products';
    if (pathname?.startsWith('/backend/admin/dashboard')) return 'home';
    return 'more';
  }, [pathname]);

  const isItemActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);

  const toggleExpand = (href) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href],
    );
  };

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[250px] flex-col border-r border-slate-200 bg-[#fcfcfd] px-4 py-5 lg:flex">
        <Link href="/" className="rounded-2xl px-2 py-2 transition hover:bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white">
              <svg className="h-5 w-5 text-[#f5d10b]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="3.2" r="2.2" />
                <circle cx="12" cy="20.8" r="2.2" />
                <circle cx="3.2" cy="12" r="2.2" />
                <circle cx="20.8" cy="12" r="2.2" />
                <circle cx="6.3" cy="6.3" r="2.2" />
                <circle cx="17.7" cy="17.7" r="2.2" />
                <circle cx="17.7" cy="6.3" r="2.2" />
                <circle cx="6.3" cy="17.7" r="2.2" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-900">OCPRIMES</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Admin</p>
            </div>
          </div>
        </Link>
        <nav className="mt-5 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {desktopNavItems.map((item) => (
            <div key={item.href}>
              {item.subItems ? (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.href)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      isItemActive(item.href) || expandedItems.includes(item.href)
                        ? 'border-slate-200 bg-slate-100 text-slate-900'
                        : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <NavIcon icon={item.icon} />
                      <span>{item.label}</span>
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-3.5 w-3.5 transition-transform ${expandedItems.includes(item.href) ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {expandedItems.includes(item.href) && (
                    <div className="ml-6 mt-1 space-y-1 border-l border-slate-200 pl-3">
                      {item.subItems.map((subItem) => (
                        <a
                          key={subItem.href}
                          href={subItem.href}
                          className={`block rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                            isItemActive(subItem.href)
                              ? 'border-slate-200 bg-slate-100 text-slate-900'
                              : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700'
                          }`}
                        >
                          {subItem.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <a
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    isItemActive(item.href)
                      ? 'border-slate-200 bg-slate-100 text-slate-900'
                      : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700'
                  }`}
                >
                  <NavIcon icon={item.icon} />
                  <span>{item.label}</span>
                </a>
              )}
            </div>
          ))}
        </nav>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50 p-3">
          <div className="rounded-xl bg-white/80 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={profileIdentity.displayName || 'Profile'} className="h-full w-full object-cover" />
                ) : (
                  profileInitials
                )}
              </span>
              <p className="truncate text-sm font-semibold text-slate-900">
                {profileIdentity?.displayName || 'Admin User'}
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-500">Get access to all features on Escale Pro.</p>
            <button
              type="button"
              className="mt-3 w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Go Pro
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M16 17l5-5-5-5M21 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
          </svg>
          <span>Log out</span>
        </div>
      </aside>

      <nav
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-all duration-300 ease-out lg:hidden ${
          isMobileDockVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="mx-auto w-full max-w-[460px] px-3">
          <div
            className={`grid grid-cols-5 items-end rounded-3xl bg-white/96 px-2 py-1.5 shadow-[0_10px_34px_rgba(2,6,23,0.16)] ring-1 ring-slate-200/60 transition-all duration-300 ${
              isMobileDockVisible ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            <button
              type="button"
              onClick={() => router.push(MOBILE_NAV_ITEMS[0].href)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl py-0.5 text-[10px] font-semibold transition ${
                activeKey === MOBILE_NAV_ITEMS[0].key ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
              <span>{MOBILE_NAV_ITEMS[0].label}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(MOBILE_NAV_ITEMS[1].href)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl py-0.5 text-[10px] font-semibold transition ${
                activeKey === MOBILE_NAV_ITEMS[1].key ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="4" y="4" width="16" height="16" rx="2.5" />
                <path d="M8 9h8M8 13h8M8 17h5" />
              </svg>
              <span>{MOBILE_NAV_ITEMS[1].label}</span>
            </button>
            <div className="flex items-center justify-center pb-1.5">
              <button
                type="button"
                onClick={() => router.push('/backend/admin/products/new')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_8px_20px_rgba(15,23,42,0.35)] transition hover:brightness-110"
                aria-label="Add product"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={() => router.push(MOBILE_NAV_ITEMS[2].href)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl py-0.5 text-[10px] font-semibold transition ${
                activeKey === MOBILE_NAV_ITEMS[2].key ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3 4 7.5l8 4.5 8-4.5L12 3Z" />
                <path d="M4 7.5V16.5L12 21l8-4.5V7.5" />
              </svg>
              <span>{MOBILE_NAV_ITEMS[2].label}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(MOBILE_NAV_ITEMS[3].href)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl py-0.5 text-[10px] font-semibold transition ${
                activeKey === MOBILE_NAV_ITEMS[3].key ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="6" cy="12" r="1.4" />
                <circle cx="12" cy="12" r="1.4" />
                <circle cx="18" cy="12" r="1.4" />
              </svg>
              <span>{MOBILE_NAV_ITEMS[3].label}</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default AdminSidebar;
