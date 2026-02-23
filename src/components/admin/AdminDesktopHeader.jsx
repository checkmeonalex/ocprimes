'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useAdminProfileIdentity from '@/components/admin/useAdminProfileIdentity';
import { getProfileIdentityImageUrl, getProfileIdentityInitials } from '@/lib/user/profile-identity-cache';

const HEADER_META = [
  { match: '/backend/admin/dashboard', title: 'Dashboard', subtitle: 'Detailed information about your store' },
  { match: '/backend/admin/products', title: 'Products', subtitle: 'Manage products, stock, and visibility' },
  { match: '/backend/admin/notifications', title: 'Notifications', subtitle: 'Track account, catalog, and workflow alerts' },
  { match: '/backend/admin/store-front', title: 'Store front', subtitle: 'Manage storefront structure and publishing' },
  { match: '/backend/admin/orders', title: 'Orders', subtitle: 'Track sales and fulfillment status' },
  { match: '/backend/admin/messages', title: 'Messages', subtitle: 'Reply to buyers and manage conversations' },
  { match: '/backend/admin/reviews', title: 'Reviews', subtitle: 'Moderate and manage product reviews' },
  { match: '/backend/admin/customers', title: 'Customers', subtitle: 'Review customer activity and profiles' },
  { match: '/backend/admin/categories', title: 'Categories', subtitle: 'Organize product collections' },
  { match: '/backend/admin/brands', title: 'Brands', subtitle: 'Manage brand records and assignments' },
  { match: '/backend/admin/tags', title: 'Tags', subtitle: 'Manage product labels and discovery tags' },
  { match: '/backend/admin/attributes', title: 'Attributes', subtitle: 'Configure product attributes and terms' },
  { match: '/backend/admin/library', title: 'Library', subtitle: 'Manage your uploaded media assets' },
  { match: '/backend/admin/size-guides', title: 'Size Guides', subtitle: 'Maintain sizing information and charts' },
  { match: '/backend/admin/pages', title: 'Pages', subtitle: 'Edit storefront pages and sections' },
  { match: '/backend/admin/settings', title: 'Settings', subtitle: 'Configure store and admin preferences' },
  { match: '/backend/admin/admin/users', title: 'Admin Users', subtitle: 'Manage administrator access' },
  { match: '/backend/admin/admin/brands', title: 'Admin Brands', subtitle: 'Manage internal brand directory' },
];

function resolveHeaderMeta(pathname) {
  if (!pathname) return { title: 'Dashboard', subtitle: 'Detailed information about your store' };
  const direct = HEADER_META.find((item) => pathname === item.match);
  if (direct) return direct;
  const prefixed = HEADER_META.find((item) => pathname.startsWith(`${item.match}/`));
  if (prefixed) return prefixed;
  if (pathname.startsWith('/backend/admin')) {
    return { title: 'Dashboard', subtitle: 'Detailed information about your store' };
  }
  return { title: 'Admin', subtitle: 'Manage your workspace' };
}

export default function AdminDesktopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const meta = useMemo(() => resolveHeaderMeta(pathname), [pathname]);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileIdentity = useAdminProfileIdentity()
  const profileInitials = getProfileIdentityInitials(profileIdentity?.displayName)
  const profileImageUrl = getProfileIdentityImageUrl(profileIdentity)

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
    <header className="sticky top-0 z-20 -mx-4 mb-4 hidden border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/75 sm:-mx-6 sm:px-6 lg:-mx-10 lg:flex lg:px-10">
      <div className="flex w-full items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold leading-tight text-slate-900">{meta.title}</h1>
          <p className="text-xs text-slate-500">{meta.subtitle}</p>
        </div>

        <div className="flex min-w-[280px] flex-1 items-center justify-end gap-3">
          <div className="flex h-10 w-full max-w-[360px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="6" />
              <path d="m15.5 15.5 4 4" />
            </svg>
            <input
              type="search"
              placeholder="Search"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v.01M12 12v.01M12 19v.01" />
            </svg>
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3v1.5M12 19.5V21M4.9 4.9l1.1 1.1M18 18l1.1 1.1M3 12h1.5M19.5 12H21M4.9 19.1 6 18M18 6l1.1-1.1" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => router.push('/backend/admin/notifications')}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
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
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
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
