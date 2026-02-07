'use client';
import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/backend/admin/dashboard' },
  { label: 'Orders', href: '/backend/admin/orders' },
  { label: 'Products', href: '/backend/admin/products' },
  { label: 'Attributes', href: '/backend/admin/attributes' },
  {
    label: 'Pages',
    href: '/backend/admin/pages',
    subItems: [
      { label: 'Home', href: '/backend/admin/pages/home' }
    ]
  },
  { label: 'Categories', href: '/backend/admin/categories' },
  { label: 'Brands', href: '/backend/admin/brands' },
  { label: 'Tags', href: '/backend/admin/tags' },
  { label: 'Customers', href: '/backend/admin/customers' },
  { label: 'Library', href: '/backend/admin/library' },
  { label: 'Size Guides', href: '/backend/admin/size-guides' },
  { label: 'Settings', href: '/backend/admin/settings' },
  { label: 'Admin Users', href: '/backend/admin/admin/users' },
  { label: 'Admin Brands', href: '/backend/admin/admin/brands' },
];

const AdminSidebar = () => {
  const [expandedItems, setExpandedItems] = useState([]);

  const toggleExpand = (href) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-100 bg-white px-4 py-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-3 py-2 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-xs font-bold">
          OC
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
          OCP Admin
        </span>
      </div>
      <nav className="mt-6 flex flex-1 flex-col gap-2">
        {NAV_ITEMS.map((item) => (
          <div key={item.href}>
            {item.subItems ? (
              <div>
                <button
                  onClick={() => toggleExpand(item.href)}
                  className="flex w-full items-center justify-between rounded-2xl border border-transparent px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-slate-200 hover:text-slate-700"
                >
                  <span>{item.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-400">
                      {item.label.slice(0, 2)}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3 w-3 transition-transform ${expandedItems.includes(item.href) ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                {expandedItems.includes(item.href) && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-2">
                    {item.subItems.map((subItem) => (
                      <a
                        key={subItem.href}
                        href={subItem.href}
                        className="block rounded-2xl border border-transparent px-3 py-1.5 text-[10px] font-semibold text-slate-500 transition hover:border-slate-200 hover:text-slate-700"
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
                className="flex items-center justify-between rounded-2xl border border-transparent px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-slate-200 hover:text-slate-700"
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-400">
                  {item.label.slice(0, 2)}
                </span>
              </a>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
