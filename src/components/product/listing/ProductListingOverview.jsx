import { buildSparkPoints } from './productListingHelpers';

const ProductListingOverview = ({
  cards,
  overviewExpanded,
  onExpand,
}) => (
  <>
    <div className="mt-6 grid grid-cols-1 gap-4 min-[266px]:grid-cols-2 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`${card.containerClass} ${
            card.hiddenOnMobile
              ? `transition-opacity duration-300 ${
                  overviewExpanded ? 'block' : 'hidden'
                } min-[266px]:block ${
                  overviewExpanded ? 'opacity-100' : 'opacity-0'
                }`
              : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                {card.label}
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900 sm:mt-3 sm:text-2xl">
                {card.value}
              </p>
            </div>
            <svg
              viewBox="0 0 120 36"
              className={`h-8 w-20 ${card.sparkClass} sm:h-10 sm:w-24`}
            >
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buildSparkPoints(card.series)}
              />
            </svg>
          </div>
          {card.delta ? (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400 sm:mt-3 sm:gap-2 sm:text-[11px]">
              <span className={`font-semibold ${card.delta.tone}`}>
                {card.delta.label}
              </span>
              <span>{card.delta.suffix}</span>
            </div>
          ) : (
            <div className="mt-2 text-[10px] text-slate-400 sm:mt-3 sm:text-[11px]">
              {card.footnote}
            </div>
          )}
        </div>
      ))}
    </div>
    {!overviewExpanded && (
      <div className="mt-3 flex justify-center min-[266px]:hidden">
        <button
          type="button"
          onClick={onExpand}
          className="rounded-full border border-slate-200 bg-white px-4 py-1 text-[11px] font-semibold text-slate-500 shadow-sm"
        >
          View all
        </button>
      </div>
    )}
  </>
);

export default ProductListingOverview;
