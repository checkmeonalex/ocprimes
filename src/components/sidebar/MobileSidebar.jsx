import React from 'react'
import SidebarNav from './SidebarNav'

const MobileSidebar = ({ isOpen, onClose, items, selectedItem, onSelect }) => {
  return (
    <>
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white shadow-lg flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className='p-4 border-b border-gray-200'>
          <div className='flex items-center'>
            <div className='w-8 h-8 rounded-lg bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center'>
              L
            </div>
            <span className='ml-2 text-lg font-semibold text-gray-800'>
              Logo
            </span>
          </div>
        </div>
        <SidebarNav
          items={items}
          selectedItem={selectedItem}
          onSelect={onSelect}
          iconSizeClass='w-5 h-5'
          itemClassName='p-3'
          showLabels
        />
      </div>
      {isOpen && (
        <div
          className='lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40'
          onClick={onClose}
        />
      )}
      {isOpen && (
        <button
          type='button'
          onClick={onClose}
          className='lg:hidden fixed top-3 left-[calc(16rem+14px)] z-[80] inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/45 bg-black/45 text-white shadow-lg backdrop-blur-md'
          aria-label='Close menu'
        >
          <svg
            className='h-6 w-6'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'
          >
            <path d='M6 6l12 12M18 6l-12 12' />
          </svg>
        </button>
      )}
    </>
  )
}

export default MobileSidebar
