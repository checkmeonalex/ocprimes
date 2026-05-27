export default function StoreFrontSliderMobileModal({ isOpen, onClose, renderContent }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-white lg:hidden">
      <div className="flex h-full flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Slider editor</p>
            <p className="text-xs text-slate-500">16:9 recommended</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{renderContent()}</div>
      </div>
    </div>
  );
}
