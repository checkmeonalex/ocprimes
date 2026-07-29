'use client';

import { useEffect, useState } from 'react';
import { SOCIAL_PLATFORMS } from '@/components/vendor/VendorSocialIcons';

const FIELDS_BY_PLATFORM = {
  whatsapp: [{ key: 'social_whatsapp', label: 'Phone number', placeholder: '2348012345678', type: 'tel' }],
  instagram: [
    { key: 'social_instagram_url', label: 'Profile URL', placeholder: 'https://instagram.com/yourstore', type: 'url' },
    { key: 'social_instagram_handle', label: 'Handle (shown to shoppers)', placeholder: '@yourstore', type: 'text' },
  ],
  facebook: [
    { key: 'social_facebook_url', label: 'Page URL', placeholder: 'https://facebook.com/yourstore', type: 'url' },
    { key: 'social_facebook_handle', label: 'Handle (shown to shoppers)', placeholder: '@yourstore', type: 'text' },
  ],
  x: [
    { key: 'social_x_url', label: 'Profile URL', placeholder: 'https://x.com/yourstore', type: 'url' },
    { key: 'social_x_handle', label: 'Handle (shown to shoppers)', placeholder: '@yourstore', type: 'text' },
  ],
  twitch: [
    { key: 'social_twitch_url', label: 'Link URL', placeholder: 'https://example.com/your-other-store', type: 'url' },
    { key: 'social_twitch_handle', label: 'Label (shown to shoppers)', placeholder: 'My other store', type: 'text' },
  ],
  tiktok: [
    { key: 'social_tiktok_url', label: 'Profile URL', placeholder: 'https://tiktok.com/@yourstore', type: 'url' },
    { key: 'social_tiktok_handle', label: 'Handle (shown to shoppers)', placeholder: '@yourstore', type: 'text' },
  ],
  pinterest: [
    { key: 'social_pinterest_url', label: 'Profile URL', placeholder: 'https://pinterest.com/yourstore', type: 'url' },
    { key: 'social_pinterest_handle', label: 'Handle (shown to shoppers)', placeholder: '@yourstore', type: 'text' },
  ],
};

function PlatformRow({ platform, brand, isSaving, onSave }) {
  const { Icon, color, label, key: platformKey } = platform;
  const fields = FIELDS_BY_PLATFORM[platformKey];
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, String(brand?.[f.key] || '')])),
  );

  useEffect(() => {
    setDrafts(Object.fromEntries(fields.map((f) => [f.key, String(brand?.[f.key] || '')])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  const isConnected = fields.some((f) => String(brand?.[f.key] || '').trim());

  const handleSave = async () => {
    const patch = {};
    fields.forEach((f) => {
      patch[f.key] = drafts[f.key]?.trim() || null;
    });
    await onSave(patch);
    setOpen(false);
  };

  const handleRemove = async () => {
    const patch = {};
    fields.forEach((f) => { patch[f.key] = null; });
    setDrafts(Object.fromEntries(fields.map((f) => [f.key, ''])));
    await onSave(patch);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800">{label}</span>
          <span className="block truncate text-xs text-slate-400">
            {isConnected ? 'Connected' : 'Not connected'}
          </span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">{f.label}</span>
              <input
                type={f.type}
                value={drafts[f.key] ?? ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                disabled={isSaving}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:opacity-50"
              />
            </label>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            {isConnected && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isSaving}
                className="text-xs font-semibold text-rose-400 transition hover:text-rose-600 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoreFrontSocialLinksSection({ isLoading, brand, isSaving, onSave }) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-3 w-64 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Connect</h3>
      <p className="mt-1 text-sm text-slate-500">
        Add your social links so shoppers can find and follow you elsewhere. Only platforms you connect appear on your storefront.
      </p>

      <div className="mt-5 space-y-2">
        {SOCIAL_PLATFORMS.map((platform) => (
          <PlatformRow
            key={platform.key}
            platform={platform}
            brand={brand}
            isSaving={isSaving}
            onSave={onSave}
          />
        ))}
      </div>
    </section>
  );
}
