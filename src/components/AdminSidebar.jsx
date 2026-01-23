'use client';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/backend/admin/dashboard' },
  { label: 'Orders', href: '/backend/admin/orders' },
  { label: 'Products', href: '/backend/admin/products' },
  { label: 'Attributes', href: '/backend/admin/attributes' },
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

const AdminSidebar = () => (
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
        <a
          key={item.href}
          href={item.href}
          className="flex items-center justify-between rounded-2xl border border-transparent px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-slate-200 hover:text-slate-700"
        >
          <span>{item.label}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] text-slate-400">
            {item.label.slice(0, 2)}
          </span>
        </a>
      ))}
    </nav>
  </aside>
);

export default AdminSidebar;
