'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

const FILTER_BUTTONS = ['ALL', 'MEN', 'WOMEN']

const mapBrowseCardsToTabs = (items = []) => {
  const normalized = Array.isArray(items)
    ? items
        .filter((item) => item?.image_url && item?.name)
        .map((item) => ({
          id: item.id || `${item.segment}-${item.image_url}`,
          name: item.name,
          image: item.image_url,
          alt: item.image_alt || item.name,
          link: item.link || '',
          segment: String(item.segment || '').toLowerCase(),
        }))
    : []

  const all = normalized.filter((item) => item.segment === 'all')
  const men = normalized.filter((item) => item.segment === 'men')
  const women = normalized.filter((item) => item.segment === 'women')
  const resolvedAll = all.length ? all : [...men, ...women]

  return {
    ALL: resolvedAll,
    MEN: men,
    WOMEN: women,
  }
}

const BrowseCategories = () => {
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [sectionTitle, setSectionTitle] = useState('')
  const [tabs, setTabs] = useState({
    ALL: [],
    MEN: [],
    WOMEN: [],
  })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await fetch('/api/categories/home/browse-cards', { cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (!response.ok || !Array.isArray(payload?.items)) return

        const mapped = mapBrowseCardsToTabs(payload.items)
        if (!mounted) return
        setSectionTitle(typeof payload?.title === 'string' ? payload.title.trim() : '')
        setTabs({
          ALL: mapped.ALL,
          MEN: mapped.MEN,
          WOMEN: mapped.WOMEN,
        })
      } catch (_error) {
        // Keep empty state; admin/API data only.
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const currentCategories = useMemo(
    () => tabs[activeFilter] || [],
    [tabs, activeFilter],
  )

  return (
    <div className='w-full px-3 sm:px-6 lg:px-8 pt-0 pb-6'>
      {/* Header Section */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4'>
        <h2 className='text-2xl md:text-3xl font-medium text-gray-900'>
          {sectionTitle}
        </h2>
        
        {/* Filter Buttons */}
        <div className='flex gap-2'>
          {FILTER_BUTTONS.map((button) => (
            <button
              key={button}
              onClick={() => setActiveFilter(button)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                activeFilter === button
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {button}
            </button>
          ))}
        </div>
      </div>

      {/* Categories Grid */}
      {currentCategories.length ? (
        <div className='grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6'>
          {currentCategories.map((category) => (
            <Link
              key={category.id}
              href={category.link || '/products'}
              className='group cursor-pointer flex flex-col items-center text-center'
            >
              <div className='relative w-full aspect-square overflow-hidden rounded-2xl bg-white shadow-sm'>
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.alt || category.name}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center text-xs text-gray-400'>
                    No image
                  </div>
                )}
              </div>
              <span className='mt-3 text-sm font-medium text-gray-900'>
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500'>
          No browse cards yet. Add cards from the admin dashboard.
        </div>
      )}
    </div>
  )
}

export default BrowseCategories
