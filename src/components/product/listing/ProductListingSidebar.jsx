import { formatPrice } from './productListingHelpers';

const ProductListingSidebar = ({
  promoView,
  onPromoChange,
  promotedProducts,
  recentSoldProducts,
  reviews,
}) => (
  <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Recently Sold Products
          </p>
          <p className="text-[11px] text-slate-400">
            {promoView === 'ads'
              ? 'Ad placement until you switch to sales.'
              : 'Latest sold items from your store.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => onPromoChange('ads')}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                promoView === 'ads'
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-400'
              }`}
            >
              Ads
            </button>
            <button
              type="button"
              onClick={() => onPromoChange('sold')}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                promoView === 'sold'
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-400'
              }`}
            >
              Sold
            </button>
          </div>
          <button type="button" className="text-xs font-semibold text-slate-400">
            {promoView === 'ads' ? 'Hide ads' : 'All Recent Sales'}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {promoView === 'ads' && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 text-[11px] text-slate-400">
            Ad placement placeholder. Switch to Sold when you want real sales
            data.
          </div>
        )}
        {promoView === 'ads' &&
          promotedProducts.map((product) => (
            <div key={product.id} className="flex items-center gap-3">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-10 w-10 rounded-2xl object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="h-10 w-10 rounded-2xl bg-slate-200" />
              )}
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700">
                  {product.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  {product.category}
                </p>
              </div>
              <p className="text-xs font-semibold text-slate-700">
                {formatPrice(product.price, product.currencySymbol)}
              </p>
            </div>
          ))}

        {promoView === 'sold' &&
          recentSoldProducts.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-10 w-10 rounded-2xl object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="h-10 w-10 rounded-2xl bg-slate-200" />
              )}
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700">
                  {item.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  {item.category ? item.category : `Qty ${item.quantity}`}
                </p>
              </div>
              <p className="text-xs font-semibold text-slate-700">
                {formatPrice(item.total, item.currencySymbol)}
              </p>
            </div>
          ))}

        {promoView === 'ads' && !promotedProducts.length && (
          <p className="text-xs text-slate-400">No promoted products yet.</p>
        )}
        {promoView === 'sold' && !recentSoldProducts.length && (
          <p className="text-xs text-slate-400">No recent sales yet.</p>
        )}
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">
          Ratings and Reviews
        </p>
        <button type="button" className="text-xs font-semibold text-slate-400">
          All Reviews
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="flex items-start gap-3">
            {review.authorAvatarUrl ? (
              <img
                src={review.authorAvatarUrl}
                alt={review.authorName}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="h-9 w-9 rounded-full bg-slate-200" />
            )}
            <div>
              <p className="text-xs font-semibold text-slate-700">
                {review.authorName}
              </p>
              <p className="text-[11px] text-slate-400">{review.excerpt}</p>
              <p className="text-[11px] text-slate-300">
                {review.postTitle}
              </p>
            </div>
          </div>
        ))}
        {!reviews.length && (
          <p className="text-xs text-slate-400">No reviews yet.</p>
        )}
      </div>
    </section>
  </div>
);

export default ProductListingSidebar;
