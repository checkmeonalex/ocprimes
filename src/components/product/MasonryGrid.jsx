'use client'
import React from 'react'
import './MasonryGrid.css' // Import the CSS file

const MasonryGrid = ({
  children,
  gap = '16px',
  mobileGap = '12px',
  itemGap = '12px',
  mobileItemGap = '10px',
  className = '',
}) => {
  return (
    <div
      className={`masonry ${className}`}
      style={{
        '--masonry-gap': gap,
        '--masonry-gap-mobile': mobileGap,
        '--masonry-item-gap': itemGap,
        '--masonry-item-gap-mobile': mobileItemGap,
      }}
    >
      {React.Children.map(children, (child, index) => (
        <div className="masonry-item" key={index}>
          {child}
        </div>
      ))}
    </div>
  )
}

export default MasonryGrid
