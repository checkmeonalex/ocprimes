'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { useAlerts } from '@/context/AlertContext';

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative h-6 w-10 shrink-0 rounded-full transition disabled:opacity-50 ${
        checked ? 'bg-slate-900' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-4.5' : 'left-0.5'
        }`}
        style={{ left: checked ? '18px' : '2px' }}
      />
    </button>
  );
}

export default function PermissionsPage() {
  const { pushAlert } = useAlerts();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/page-visibility', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load permissions.');
      setItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err) {
      setError(err?.message || 'Unable to load permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleToggle = async (item, nextValue) => {
    setSavingKey(item.key);
    setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, is_public: nextValue } : i)));
    try {
      const response = await fetch('/api/admin/page-visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: item.key, is_public: nextValue }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to update permission.');
      pushAlert({
        type: 'success',
        title: 'Permissions',
        message: `${item.label} is now ${nextValue ? 'visible to vendors' : 'admin-only'}.`,
      });
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, is_public: !nextValue } : i)));
      pushAlert({ type: 'error', title: 'Permissions', message: err?.message || 'Unable to update permission.' });
    } finally {
      setSavingKey('');
    }
  };

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-3xl">
        <div className="py-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Permissions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose which admin-only pages vendors can also see. Anything off here stays hidden and blocked for vendors.
          </p>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4">
          {loading ? (
            <ul className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <li key={index} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-32 animate-pulse rounded-md bg-slate-200/85" />
                    <div className="mt-1.5 h-3 w-56 animate-pulse rounded-md bg-slate-200/70" />
                  </div>
                  <div className="h-6 w-10 animate-pulse rounded-full bg-slate-200/80" />
                </li>
              ))}
            </ul>
          ) : items.length ? (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                  </div>
                  <span className={`text-[11px] font-semibold ${item.is_public ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {item.is_public ? 'Public' : 'Admin only'}
                  </span>
                  <Toggle
                    checked={item.is_public}
                    disabled={savingKey === item.key}
                    onChange={(next) => handleToggle(item, next)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-sm text-slate-500">Nothing to configure.</p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
