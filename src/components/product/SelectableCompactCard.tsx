'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import CompactProductCard from '@/components/product/CompactProductCard'

type SelectableCompactCardProps = {
  product: {
    id: string | number
    slug: string
    name: string
    image?: string
    price: number
    originalPrice?: number | null
    vendor?: string
    vendorFont?: string
    stock?: number | null
  }
  variant?: 'fixed' | 'fluid'
  isSelected: boolean
  selectMode: boolean
  onToggle: () => void
  onDelete: () => void
  onSaveWish: () => void
  onAddToCart: () => void
}

const SelectableCompactCard = ({
  product,
  variant = 'fixed',
  isSelected,
  selectMode,
  onToggle,
  onDelete,
  onSaveWish,
  onAddToCart,
}: SelectableCompactCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const sizeClass =
    variant === 'fluid'
      ? 'w-full h-full'
      : 'min-w-[200px] max-w-[200px] flex-shrink-0'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (menuRef.current.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!selectMode) {
    return (
      <div ref={menuRef} className={`relative ${sizeClass}`}>
        <CompactProductCard product={product} variant={variant} />
        <button
          type='button'
          aria-label='More options'
          onClick={(event) => {
            event.preventDefault()
            setMenuOpen((prev) => !prev)
          }}
          className='absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm backdrop-blur hover:bg-white'
        >
          <MoreHorizontal className='h-4 w-4' />
        </button>
        {menuOpen ? (
          <div className='absolute inset-x-2 top-10 z-20 max-w-full rounded-xl border border-gray-200 bg-white p-2 shadow-lg'>
            <button
              type='button'
              onClick={(event) => {
                event.preventDefault()
                setMenuOpen(false)
                onDelete()
              }}
              className='w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50'
            >
              Delete
            </button>
            <button
              type='button'
              onClick={(event) => {
                event.preventDefault()
                setMenuOpen(false)
                onSaveWish()
              }}
              className='mt-1 w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50'
            >
              Save
            </button>
            <button
              type='button'
              onClick={(event) => {
                event.preventDefault()
                setMenuOpen(false)
                onAddToCart()
              }}
              className='mt-1 w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50'
            >
              Add to cart
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div ref={menuRef} className={`relative ${sizeClass}`}>
      <div className='pointer-events-none'>
        <CompactProductCard product={product} variant={variant} />
      </div>
      <button
        type='button'
        aria-label={isSelected ? 'Deselect item' : 'Select item'}
        onClick={onToggle}
        className={`absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold shadow-sm ${
          isSelected
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-600 border-gray-200'
        }`}
      >
        {isSelected ? '✓' : ''}
      </button>
    </div>
  )
}

export default SelectableCompactCard
