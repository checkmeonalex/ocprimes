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
    </>
  )
}

export default MobileSidebar
