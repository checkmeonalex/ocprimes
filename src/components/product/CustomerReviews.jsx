const StarRow = ({ rating }) => {
  return (
    <div className='flex items-center gap-1'>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'text-amber-400' : 'text-gray-200'
          }`}
          fill='currentColor'
          viewBox='0 0 24 24'
        >
          <path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' />
        </svg>
      ))}
    </div>
  )
}

const CustomerReviews = ({ data }) => {
  const total = data.breakdown.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-semibold text-gray-900'>
          Customer Reviews
        </h3>
        <div className='text-[10px] text-gray-500 flex items-center gap-2'>
          <span className='inline-flex w-2 h-2 rounded-full bg-blue-500'></span>
          Verified by {data.summary.verifiedBy}
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-[140px_1fr]'>
        <div className='space-y-2'>
          <div className='text-3xl font-semibold text-gray-900'>
            {data.summary.rating}
          </div>
          <StarRow rating={Math.round(data.summary.rating)} />
          <div className='text-xs text-gray-500'>
            ({data.summary.totalReviews} reviews)
          </div>
        </div>

        <div className='space-y-2'>
          {data.breakdown.map((row) => {
            const percent = total ? Math.round((row.count / total) * 100) : 0
            return (
              <div key={row.stars} className='flex items-center gap-2 text-xs'>
                <span className='w-4 text-gray-600'>{row.stars}</span>
                <div className='flex-1 h-2 rounded-full bg-gray-100 overflow-hidden'>
                  <div
                    className='h-full bg-amber-400'
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
                <span className='w-10 text-right text-gray-500'>
                  {row.count}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className='flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs'>
        <div className='flex items-center gap-2 text-gray-700'>
          <span className='font-semibold text-gray-900'>
            {data.summary.wouldRecommendPercent}%
          </span>
          Would recommend ({data.summary.wouldRecommendCount} recommendations)
        </div>
        <button className='text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-500 transition'>
          Write a Review
        </button>
      </div>

      <div className='flex items-center gap-2'>
        <div className='flex-1 bg-gray-50 rounded-full px-3 py-2 text-xs text-gray-500 flex items-center gap-2'>
          <svg
            className='h-4 w-4 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
          Search reviews
        </div>
        <button className='w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-500'>
          <svg
            className='h-4 w-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 9h8m-8 6h8M5 12l-2 2m0-4l2 2'
            />
          </svg>
        </button>
      </div>

      <div className='space-y-4'>
        {data.reviews.map((review) => (
          <div key={review.id} className='border border-gray-100 rounded-xl p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-semibold text-gray-900'>
                  {review.name}
                </div>
                <div className='text-[11px] text-gray-500 flex items-center gap-2'>
                  {review.location}
                  {review.isVerifiedBuyer && (
                    <span className='inline-flex items-center gap-1 text-green-600'>
                      <span className='w-1.5 h-1.5 rounded-full bg-green-600'></span>
                      Verified Buyer
                    </span>
                  )}
                </div>
              </div>
              <StarRow rating={review.rating} />
            </div>

            <div className='mt-3 text-sm font-semibold text-gray-900'>
              {review.title}
            </div>
            <div className='mt-1 text-xs text-gray-600'>{review.body}</div>

            <div className='mt-3 flex items-center gap-3 text-[11px] text-gray-500'>
              <span>Share</span>
              <span>Helpful {review.helpful}</span>
              <span>Unhelpful {review.unhelpful}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CustomerReviews
