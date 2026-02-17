export default function StoreFrontLogoSection({
  isLoading,
  brand,
  brandName,
  logoUrl,
  logoFailed,
  onLogoError,
  initials,
  isLogoUploading,
  fileInputRef,
  onLogoChange,
  onOpenLogoPicker,
  onRemoveLogo,
}) {
  return (
    <section className="border-t border-slate-200 pt-6">
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="h-3 w-24 animate-pulse rounded-md bg-slate-200/80" />
            <div className="mt-4 flex items-center justify-center">
              <div className="h-28 w-28 animate-pulse rounded-2xl bg-slate-200/80" />
            </div>
            <div className="mx-auto mt-3 h-4 w-24 animate-pulse rounded-md bg-slate-200/80" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="h-9 w-28 animate-pulse rounded-full bg-slate-200/80" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-slate-200/70" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-2">
                <div className="h-3 w-40 animate-pulse rounded-md bg-slate-200/80" />
                <div className="h-3 w-32 animate-pulse rounded-md bg-slate-200/70" />
                <div className="h-3 w-36 animate-pulse rounded-md bg-slate-200/70" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Logo preview</p>
            <div className="mt-4 flex items-center justify-center">
              <div className="relative h-28 w-28">
                {logoUrl && !logoFailed ? (
                  <img
                    src={logoUrl}
                    alt={`${brandName} logo`}
                    className="h-28 w-28 rounded-2xl border border-slate-200 object-cover"
                    onError={onLogoError}
                  />
                ) : (
                  <span className="inline-flex h-28 w-28 items-center justify-center rounded-2xl border border-slate-200 bg-slate-200 text-2xl font-semibold text-slate-700">
                    {initials}
                  </span>
                )}
                {isLogoUploading ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/35">
                    <span
                      className="h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-label="Uploading logo"
                    />
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-3 truncate text-center text-sm font-semibold text-slate-700">{brandName}</p>
          </div>

          <div>
            {!brand ? (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                No brand is linked to this account yet. Ask an admin to create/assign your brand first.
              </p>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onLogoChange}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenLogoPicker}
                disabled={isLogoUploading || !brand}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLogoUploading ? 'Uploading...' : 'Upload Logo'}
              </button>
              <button
                type="button"
                onClick={onRemoveLogo}
                disabled={isLogoUploading || !brand}
                className="rounded-full border border-transparent px-4 py-2 text-xs font-semibold text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove Logo
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p>Recommended: 512x512 px</p>
              <p className="mt-1">Minimum: 192x192 px</p>
              <p className="mt-1">Max file size: 5MB</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
