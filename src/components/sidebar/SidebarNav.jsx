import React from 'react'

const SidebarNav = ({
  items,
  selectedItem,
  onSelect,
  iconSizeClass,
  itemClassName,
  showLabels,
}) => {
  return (
    <div className='flex-1 p-4 space-y-2'>
      {items.map((item) => (
        <button
          key={item.name}
          type='button'
          className={`w-full flex items-center rounded-lg cursor-pointer transition-all ${
            selectedItem === item.name
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          } ${itemClassName}`}
          onClick={() => onSelect(item.name)}
        >
          <svg
            className={iconSizeClass}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.8}
              d={item.icon}
            />
          </svg>
          {showLabels && <span className='ml-3 text-sm'>{item.name}</span>}
        </button>
      ))}
    </div>
  )
}

export default SidebarNav
