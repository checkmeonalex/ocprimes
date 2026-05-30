'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandLogoMark } from '@/components/common/BrandLogo';
import useAdminProfileIdentity from '@/components/admin/useAdminProfileIdentity';
import { getProfileIdentityImageUrl, getProfileIdentityInitials } from '@/lib/user/profile-identity-cache';

const NAV_GROUPS = [
  {
    id: 'top',
    items: [
      { label: 'Home', href: '/admin/dashboard', icon: 'dashboard' },
      { label: 'Orders', href: '/admin/orders', icon: 'orders' },
      { label: 'Products', href: '/admin/products', icon: 'products' },
    ],
  },
  {
    id: 'store',
    label: 'Online Store',
    items: [
      { label: 'Store Front', href: '/admin/store-front', icon: 'storefront' },
      { label: 'Templates', href: '/admin/templates', icon: 'templates' },
      {
        label: 'Pages',
        href: '/admin/pages',
        icon: 'pages',
        adminOnly: true,
        subItems: [{ label: 'Home', href: '/admin/pages/home' }],
      },
      { label: 'Library', href: '/admin/library', icon: 'library' },
      { label: 'Size Guides', href: '/admin/size-guides', icon: 'guides' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    items: [
      { label: 'Customers', href: '/admin/customers', icon: 'customers', adminOnly: true },
      { label: 'Reviews', href: '/admin/reviews', icon: 'reviews' },
      { label: 'Messages', href: '/admin/messages', icon: 'messages' },
      { label: 'Notifications', href: '/admin/notifications', icon: 'notifications' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    items: [
      { label: 'Categories', href: '/admin/categories', icon: 'categories', adminOnly: true },
      { label: 'Brands', href: '/admin/brands', icon: 'brands', adminOnly: true },
      { label: 'Attributes', href: '/admin/attributes', icon: 'attributes' },
      { label: 'Tags', href: '/admin/tags', icon: 'tags' },
    ],
  },
  {
    id: 'config',
    label: 'Configuration',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: 'settings' },
      { label: 'Logistics', href: '/admin/logistics', icon: 'logistics', adminOnly: true },
      { label: 'Extra', href: '/admin/extra', icon: 'extra', adminOnly: true },
      { label: 'Shortcut', href: '/admin/shortcut', icon: 'shortcut' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    adminOnly: true,
    items: [
      { label: 'Manage Sellers', href: '/backend/admin/admin/brands', icon: 'adminBrands' },
    ],
  },
];

const MOBILE_NAV_ITEMS = [
  { key: 'home', label: 'Home', href: '/admin/dashboard' },
  { key: 'orders', label: 'Orders', href: '/admin/orders' },
  { key: 'products', label: 'Products', href: '/admin/products' },
  { key: 'more', label: 'More', href: '/admin/settings' },
];

const NavIcon = ({ icon }) => {
  const cls = 'h-[18px] w-[18px] shrink-0';
  switch (icon) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 5.5h7v6H4zM13 5.5h7V10h-7zM4 13h7v5.5H4zM13 12h7v6.5h-7z" />
        </svg>
      );
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4.5" width="16" height="15" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case 'messages':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5.5 6.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H12l-4.5 3v-3H5.5A1.5 1.5 0 0 1 4 15V8a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path d="M8 10.5h8M8 13.5h5" strokeLinecap="round" />
        </svg>
      );
    case 'products':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3 4 7.5l8 4.5 8-4.5L12 3Z" />
          <path d="M4 7.5V16.5L12 21l8-4.5V7.5" />
        </svg>
      );
    case 'reviews':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m12 3.5 2.5 5.1 5.6.8-4 3.9.9 5.5L12 16.3 7 18.8l1-5.5-4-3.9 5.6-.8L12 3.5Z" />
        </svg>
      );
    case 'notifications':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M15 19.25a3 3 0 0 1-6 0" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.581 18.25c-.49-.104-.922-.388-1.213-.795-.29-.407-.418-.908-.357-1.405l1-8.11C5.266 6.273 6.115 4.754 7.401 3.662 8.687 2.571 10.324 1.981 12.011 2v0c1.687-.019 3.324.571 4.61 1.662 1.286 1.092 2.135 2.611 2.39 4.278l1 8.11c.061.495-.065.995-.354 1.402-.29.407-.72.692-1.207.798C14.219 19.245 9.814 19.245 5.58 18.25v0Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'storefront':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3.5 10.5h17M5 10.5V19h14v-8.5M4.5 6h15l1 4.5h-17Z" />
          <path d="M9.5 14h5V19h-5Z" />
        </svg>
      );
    case 'templates':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
          <path d="M3 9h18M9 9v12" />
        </svg>
      );
    case 'attributes':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 6h13M7 12h13M7 18h13M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
      );
    case 'pages':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 4.5h9l3 3V19.5H6z" />
          <path d="M15 4.5V8h3" />
        </svg>
      );
    case 'categories':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4.5 6.5h6v5h-6zM13.5 6.5h6v5h-6zM4.5 13.5h6v5h-6zM13.5 13.5h6v5h-6z" />
        </svg>
      );
    case 'brands':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 12.5 12 4l8 8.5-8 7.5-8-7.5Z" />
          <path d="M12 4v16" />
        </svg>
      );
    case 'tags':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M11 4H5v6l8.5 8.5a2.1 2.1 0 0 0 3 0l2-2a2.1 2.1 0 0 0 0-3Z" />
          <circle cx="8" cy="8" r="1.2" />
        </svg>
      );
    case 'customers':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case 'library':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 5h12v14H6zM9 5v14M13 5v14" />
        </svg>
      );
    case 'guides':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 5.5h6v13H5zM13 5.5h6v13h-6z" />
        </svg>
      );
    case 'logistics':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3.5 6.5h10v9h-10z" />
          <path d="M13.5 9h3.8l3.2 3.3v3.2h-7" />
          <path d="M6.8 17.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0Z" />
          <path d="M18.8 17.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0Z" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path fillRule="evenodd" clipRule="evenodd" d="M11.7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          <path fillRule="evenodd" clipRule="evenodd" d="M16.884 16.063v-1.342c0-.332.129-.651.358-.886l.925-.949a1.5 1.5 0 0 0 0-2.772l-.925-.949a1.25 1.25 0 0 1-.358-.886V7.936a1.25 1.25 0 0 0-1.222-1.253H14.353c-.324 0-.635-.132-.864-.367l-.925-.949a1.5 1.5 0 0 0-2.728 0l-.925.949a1.25 1.25 0 0 1-.864.367H7.738a1.25 1.25 0 0 0-1.222 1.253v1.343c0 .332-.129.65-.358.885l-.925.949a1.5 1.5 0 0 0 0 2.772l.925.949c.23.235.358.553.358.885v1.342a1.25 1.25 0 0 0 1.222 1.253H9.047c.324 0 .635.132.864.367l.925.949a1.5 1.5 0 0 0 2.728 0l.925-.949c.23-.235.54-.367.864-.367h1.309a1.25 1.25 0 0 0 1.222-1.253Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'extra':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 6h5v5H6zM13 6h5v5h-5zM6 13h5v5H6zM13 13h5v5h-5z" />
        </svg>
      );
    case 'shortcut':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 7a3 3 0 1 1 0 6H6a3 3 0 0 0 0 6h3" />
          <path d="M16 17a3 3 0 1 1 0-6h2a3 3 0 0 0 0-6h-3" />
          <path d="M9 12h6" />
        </svg>
      );
    case 'adminUsers':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M3.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M1.5 18a4 4 0 0 1 4-4h2M11 20a5 5 0 0 1 9.5 0" />
        </svg>
      );
    case 'adminBrands':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8">
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
        if (!response.ok) { setRole('unknown'); return; }
        if (payload?.is_admin) { setRole('admin'); return; }
        if (payload?.is_vendor) { setRole('vendor'); return; }
        setRole(payload?.role === 'admin' || payload?.role === 'vendor' ? payload.role : 'unknown');
      } catch {
        if (isMounted) setRole('unknown');
      }
    };

    void loadRole();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const syncDockVisibility = () => {
      if (typeof window === 'undefined') return;
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const viewportHeight = window.innerHeight || 0;
      const documentHeight = document.documentElement?.scrollHeight || 0;
      const atTop = scrollTop <= 8;
      const atBottom = scrollTop + viewportHeight >= documentHeight - 8;
      if (atTop) { setIsMobileDockVisible(true); return; }
      if (atBottom) { setIsMobileDockVisible(false); }
    };

    syncDockVisibility();
    window.addEventListener('scroll', syncDockVisibility, { passive: true });
    window.addEventListener('resize', syncDockVisibility);
    return () => {
      window.removeEventListener('scroll', syncDockVisibility);
      window.removeEventListener('resize', syncDockVisibility);
    };
  }, []);

  const visibleGroups = useMemo(() => {
    if (role === 'admin') return NAV_GROUPS;
    return NAV_GROUPS
      .filter((g) => !g.adminOnly)
      .map((g) => ({ ...g, items: g.items.filter((item) => !item.adminOnly) }))
      .filter((g) => g.items.length > 0);
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
      prev.includes(href) ? prev.filter((i) => i !== href) : [...prev, href],
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] flex-col border-r border-slate-200 bg-white px-3 py-4 dark:border-zinc-700/40 dark:bg-[#242426] lg:flex">
        {/* Store identity */}
        <Link
          href="/"
          className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-white/10">
            <BrandLogoMark className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Alxora</p>
            <p className="text-[10px] font-medium text-slate-400 dark:text-white/35">Admin panel</p>
          </div>
        </Link>

        {/* Nav groups */}
        <nav className="admin-sidebar-scrollbar flex flex-1 flex-col overflow-y-auto pr-0.5">
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.id} className={groupIndex > 0 ? 'mt-4' : ''}>
              {group.label && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-white/30">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <div key={item.href}>
                    {item.subItems ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.href)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                            isItemActive(item.href) || expandedItems.includes(item.href)
                              ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-white'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white/90'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <NavIcon icon={item.icon} />
                            <span>{item.label}</span>
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            className={`h-3.5 w-3.5 shrink-0 transition-transform ${expandedItems.includes(item.href) ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        {expandedItems.includes(item.href) && (
                          <div className="ml-[38px] mt-0.5 flex flex-col gap-0.5 border-l border-slate-200 pl-3 dark:border-white/10">
                            {item.subItems.map((subItem) => (
                              <a
                                key={subItem.href}
                                href={subItem.href}
                                className={`block rounded-md px-2 py-1.5 text-xs font-medium transition ${
                                  isItemActive(subItem.href)
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-white/65 dark:hover:text-white'
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
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                          isItemActive(item.href)
                            ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-white'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white/90'
                        }`}
                      >
                        <NavIcon icon={item.icon} />
                        <span>{item.label}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: profile + logout */}
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-white/15 dark:text-white">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={profileIdentity?.displayName || 'Profile'} className="h-full w-full object-cover" />
              ) : (
                profileInitials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700 dark:text-white/80">{profileIdentity?.displayName || 'Admin'}</p>
              <p className="text-[10px] capitalize text-slate-400 dark:text-white/35">{role === 'unknown' ? 'user' : role}</p>
            </div>
            <button
              type="button"
              aria-label="Log out"
              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/70"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M16 17l5-5-5-5M21 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom dock */}
      <nav
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-all duration-300 ease-out lg:hidden ${
          isMobileDockVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="mx-auto w-full max-w-[460px] px-3">
          <div
            className={`grid grid-cols-5 items-end rounded-3xl px-2 py-1.5 transition-all duration-300 ${
              isMobileDockVisible ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            style={{
              background: 'rgba(20, 20, 22, 0.78)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}
          >
            <button
              type="button"
              onClick={() => router.push(MOBILE_NAV_ITEMS[0].href)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold ${
                activeKey === MOBILE_NAV_ITEMS[0].key ? 'text-white' : 'text-gray-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
              <span>{MOBILE_NAV_ITEMS[0].label}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(MOBILE_NAV_ITEMS[1].href)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold ${
                activeKey === MOBILE_NAV_ITEMS[1].key ? 'text-white' : 'text-gray-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2.5" />
                <path d="M8 9h8M8 13h8M8 17h5" />
              </svg>
              <span>{MOBILE_NAV_ITEMS[1].label}</span>
            </button>
            <div className="flex items-center justify-center pb-1.5">
              <button
                type="button"
                onClick={() => router.push('/backend/admin/products/new')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 shadow-[0_8px_20px_rgba(255,255,255,0.2)] transition hover:brightness-90"
                aria-label="Add product"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={() => router.push(MOBILE_NAV_ITEMS[2].href)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold ${
                activeKey === MOBILE_NAV_ITEMS[2].key ? 'text-white' : 'text-gray-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3 4 7.5l8 4.5 8-4.5L12 3Z" />
                <path d="M4 7.5V16.5L12 21l8-4.5V7.5" />
              </svg>
              <span>{MOBILE_NAV_ITEMS[2].label}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(MOBILE_NAV_ITEMS[3].href)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold ${
                activeKey === MOBILE_NAV_ITEMS[3].key ? 'text-white' : 'text-gray-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
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
