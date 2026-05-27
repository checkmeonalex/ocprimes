'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const FILTER_BUTTONS = ['ALL', 'MEN', 'WOMEN']

export default function BrowseCategoriesClient({
  title = '',
  tabs = {
    ALL: [],
    MEN: [],
    WOMEN: [],
  },
}) {
  const [activeFilter, setActiveFilter] = useState('ALL')

  const hasAnyCards = useMemo(
    () => FILTER_BUTTONS.some((filterKey) => Array.isArray(tabs?.[filterKey]) && tabs[filterKey].length > 0),
    [tabs],
  )

  const currentCategories = useMemo(
    () => (Array.isArray(tabs?.[activeFilter]) ? tabs[activeFilter] : []),
    [activeFilter, tabs],
  )

  if (!hasAnyCards) return null

  return (
    <div className='w-full px-3 pb-4 pt-0 sm:px-6 lg:px-8'>
      <div className='mb-4 flex flex-wrap items-center gap-3'>
        <h2 className='min-w-[9rem] flex-1 break-normal text-xl font-semibold leading-tight text-gray-900 [word-break:normal] sm:min-w-0 sm:flex-none sm:text-2xl'>
          {title}
        </h2>

        <div className='flex flex-none flex-wrap items-center justify-start gap-2 sm:ml-auto sm:justify-end'>
          {FILTER_BUTTONS.map((button) => {
            const hasItems = Array.isArray(tabs?.[button]) && tabs[button].length > 0
            return (
              <button
                key={button}
                type='button'
                onClick={() => {
                  if (hasItems) setActiveFilter(button)
                }}
                disabled={!hasItems}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  activeFilter === button
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${hasItems ? '' : 'cursor-not-allowed opacity-45 hover:bg-gray-100'}`}
              >
                {button}
              </button>
            )
          })}
        </div>
      </div>

      <div className='grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6'>
        {currentCategories.map((category) => (
          <Link
            key={category.id}
            href={category.link || '/products'}
            className='group flex cursor-pointer flex-col items-center text-center'
          >
            <div className='relative aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-sm'>
              <img
                src={category.image}
                alt={category.alt || category.name}
                className='h-full w-full object-cover'
              />
            </div>
            <span className='mt-3 text-sm font-medium text-gray-900'>
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
