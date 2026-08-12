'use client'
import React, { useLayoutEffect, useMemo, useState } from 'react'
import './MasonryGrid.css' // Import the CSS file

export const getColumnCount = (width) => {
  if (width <= 640) return 2
  if (width <= 768) return 2
  if (width <= 1024) return 3
  return 4
}

// Assigns each child to a column by index (round-robin), so distribution is
// even and predictable across real cards and loading-skeleton placeholders
// alike — unlike height-based balancing, which starts every column at height
// 0 before any card has been measured and can clump unmeasured items (e.g.
// skeletons) into whichever columns happen to read shortest at that instant.
// Previously placed items never move when new items are appended (e.g.
// during infinite scroll), since each item's column is purely index % count.
const MasonryGrid = ({
  children,
  gap = '16px',
  mobileGap = '12px',
  itemGap = '12px',
  mobileItemGap = '10px',
  className = '',
}) => {
  const [columnCount, setColumnCount] = useState(() =>
    typeof window === 'undefined' ? 4 : getColumnCount(window.innerWidth),
  )

  const items = useMemo(() => React.Children.toArray(children), [children])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined
    const updateColumnCount = () => setColumnCount(getColumnCount(window.innerWidth))
    updateColumnCount()
    window.addEventListener('resize', updateColumnCount)
    return () => window.removeEventListener('resize', updateColumnCount)
  }, [])

  const columns = useMemo(() => {
    const cols = Array.from({ length: columnCount }, () => [])
    items.forEach((child, index) => {
      cols[index % columnCount].push(child)
    })
    return cols
  }, [items, columnCount])

  return (
    <div
      className={`masonry-columns ${className}`.trim()}
      style={{
        '--masonry-gap': gap,
        '--masonry-gap-mobile': mobileGap,
        '--masonry-item-gap': itemGap,
        '--masonry-item-gap-mobile': mobileItemGap,
      }}
    >
      {columns.map((column, columnIndex) => (
        <div className='masonry-column' key={columnIndex}>
          {column.map((child) => (
            <div className='masonry-item' key={child.key}>
              {child}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default MasonryGrid
