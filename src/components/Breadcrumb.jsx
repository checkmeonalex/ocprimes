'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const Breadcrumb = ({
  items = [],
  backHref = null,
  onBack = null,
  rightAction = null,
}) => {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    if (backHref) {
      return
    }
    router.back()
  }

  return (
    <div className='flex items-center justify-between w-full text-sm text-gray-600'>
      <div className='flex items-center gap-4 min-w-0'>
        {backHref ? (
          <Link
            href={backHref}
            className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition'
          >
            <span className='text-base leading-none'>←</span>
            <span>Back</span>
          </Link>
        ) : (
          <button
            type='button'
            onClick={handleBack}
            className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition'
          >
            <span className='text-base leading-none'>←</span>
            <span>Back</span>
          </button>
        )}

        <div className='flex items-center gap-2 text-gray-500 min-w-0'>
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <div
                key={`${item.label}-${index}`}
                className='flex items-center gap-2 min-w-0'
              >
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className='hover:text-gray-700 transition truncate'
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className='truncate text-gray-700'>{item.label}</span>
                )}
                {!isLast && <span className='text-gray-300'>/</span>}
              </div>
            )
          })}
        </div>
      </div>

      {rightAction && (
        <div className='flex items-center'>
          {rightAction.href ? (
            <Link
              href={rightAction.href}
              className='inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition'
            >
              {rightAction.icon}
              <span>{rightAction.label}</span>
            </Link>
          ) : (
            <button
              type='button'
              onClick={rightAction.onClick}
              className='inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition'
            >
              {rightAction.icon}
              <span>{rightAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Breadcrumb
