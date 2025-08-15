'use client'
import React from 'react'
import './MasonryGrid.css' // Import the CSS file

const MasonryGrid = ({ children, gap = '24px' }) => {
  return (
    <div className="masonry" style={{ columnGap: gap }}>
      {React.Children.map(children, (child, index) => (
        <div className="masonry-item" key={index}>
          {child}
        </div>
      ))}
    </div>
  )
}

export default MasonryGrid
