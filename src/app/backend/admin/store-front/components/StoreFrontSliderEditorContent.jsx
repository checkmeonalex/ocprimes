import BannerSlider from '@/components/layout/BannerSlider';

export default function StoreFrontSliderEditorContent({
  inputPrefix,
  brand,
  brandName,
  sliderPreview,
  visibleSliderSlots,
  activeSliderImages,
  uploadingSlot,
  onSliderUpload,
  onRemoveSliderImage,
  hasAnySliderImage,
  savingSliderLinks,
  onSaveSliderLinks,
  bannerSliderLinks,
  setBannerSliderLinks,
}) {
  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="aspect-[21/9]">
          {sliderPreview.length ? (
            <BannerSlider
              images={sliderPreview.map((slide) => slide.desktopUrl)}
              mobileImages={sliderPreview.map((slide) => slide.mobileUrl)}
              links={sliderPreview.map((slide) => slide.link)}
              title={`${brandName} slider`}
              className="h-full"
              heightClass="h-full"
              enforceAspect={false}
              autoMs={6500}
            />
          ) : (
            <label
              htmlFor={brand ? `${inputPrefix}-slider-0` : undefined}
              className={`flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400 transition ${
                brand ? 'cursor-pointer hover:bg-slate-100/60' : 'cursor-not-allowed opacity-70'
              }`}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-3xl leading-none text-slate-500">
                +
              </span>
              <span className="text-sm font-medium text-slate-500">Add first slide</span>
            </label>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: visibleSliderSlots }, (_, index) => {
          const url = activeSliderImages[index] || '';
          const uploadTag = `slider-${index}`;
          const removeTag = `slider-remove-${index}`;
          const isSlotUploading = uploadingSlot === uploadTag;
          const isSlotRemoving = uploadingSlot === removeTag;
          const slotInputId = `${inputPrefix}-slider-${index}`;

          return (
            <div key={`${inputPrefix}-slide-${index}`} className="rounded-xl border border-slate-200 bg-white p-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {index + 1}
              </p>
              <label
                htmlFor={slotInputId}
                className={`mt-1.5 flex aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-lg border transition ${
                  url
                    ? 'border-slate-200 bg-slate-100'
                    : 'border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {url ? (
                  <img
                    src={url}
                    alt={`${brandName} slider ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-slate-400">
                    <span className="text-2xl leading-none text-slate-500">+</span>
                    <span className="text-[11px] font-medium">Add</span>
                  </div>
                )}
              </label>
              <input
                id={slotInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => onSliderUpload(event, index)}
                disabled={!brand || isSlotUploading || isSlotRemoving}
              />
              <div className="mt-2 flex items-center gap-1.5">
                <label
                  htmlFor={slotInputId}
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {isSlotUploading ? 'Uploading...' : url ? 'Replace' : 'Upload'}
                </label>
                {url ? (
                  <button
                    type="button"
                    onClick={() => onRemoveSliderImage(index)}
                    disabled={!brand || isSlotUploading || isSlotRemoving}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={isSlotRemoving ? 'Removing slide' : 'Remove slide'}
                    title={isSlotRemoving ? 'Removing slide' : 'Remove slide'}
                  >
                    {isSlotRemoving ? (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 3a9 9 0 1 1-9 9" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 7h16" />
                        <path d="M9 7V5h6v2" />
                        <path d="M7 7l1 12h8l1-12" />
                      </svg>
                    )}
                  </button>
                ) : null}
              </div>
              <label className="mt-2 block text-[11px] text-slate-600">
                Link URL
                <input
                  value={bannerSliderLinks[index] || ''}
                  onChange={(event) => {
                    const next = [...bannerSliderLinks];
                    next[index] = event.target.value;
                    setBannerSliderLinks(next);
                  }}
                  placeholder="/products/sale"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 outline-none focus:border-slate-400"
                />
              </label>
            </div>
          );
        })}
      </div>

      {hasAnySliderImage ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onSaveSliderLinks}
              disabled={!brand || savingSliderLinks}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSliderLinks ? 'Saving...' : 'Save links'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
