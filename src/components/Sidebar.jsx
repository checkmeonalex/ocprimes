'use client'
import { useState } from 'react'
import { useSidebar } from '../context/SidebarContext'

export default function Sidebar() {
  const { isOpen, toggleSidebar } = useSidebar()
  const [selectedItem, setSelectedItem] = useState('Popular Products')

  const handleItemClick = (item) => {
    setSelectedItem(item)
  }

  return (
    <>
      {/* Sidebar - positioned as part of body layout on desktop */}
      <div
        className={`fixed inset-y-0 bg-white shadow-lg flex flex-col transition-all duration-300
        ${
          isOpen
            ? 'left-0 w-48 z-50 lg:relative lg:z-auto'
            : 'hidden lg:flex lg:w-16'
        }`}
      >
        <div
          className={`${isOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100'} ${
            !isOpen ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Header */}
          <div className='p-4 border-b border-gray-200'>
            {/* Compact logo for desktop when collapsed */}
            <div
              className={`w-12 h-12 rounded-lg bg-blue-100 text-blue-600 font-bold text-2xl flex items-center justify-center
              ${!isOpen ? 'hidden lg:flex' : 'lg:hidden'}`}
            >
              L
            </div>
          </div>

          {/* Navigation */}
          <div className='flex-1 p-4 space-y-2'>
            {/* Navigation Items */}
            {[
              { name: 'Popular Products', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
              {
                name: 'Explore New',
                icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
              },
              {
                name: 'Clothing and Shoes',
                icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
              },
              {
                name: 'Gifts and Living',
                icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
              },
              {
                name: 'Inspiration',
                icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
              },
            ].map((item) => (
              <div
                key={item.name}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 
                  ${
                    selectedItem === item.name
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                  }
                  ${!isOpen ? 'lg:justify-center lg:p-4' : 'justify-start'}
                `}
                onClick={() => handleItemClick(item.name)}
              >
                <svg
                  className={`${
                    isOpen ? 'h-6 w-6 mb-0.5' : 'h-5 w-5 mb-0.5'
                  } flex-shrink-0`}
                  fill='none'
                  stroke='currentColor'
                  strokeWidth={1.8}
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d={item.icon}
                  />
                </svg>

                <span
                  className={`ml-3 text-sm font-medium ${
                    !isOpen ? 'lg:hidden' : ''
                  }`}
                >
                  {item.name}
                </span>
              </div>
            ))}

            {/* Quick actions section - hidden when collapsed on desktop */}
            <div className={`pt-4 ${!isOpen ? 'lg:hidden' : ''}`}>
              <p className='text-xs text-gray-500 font-medium mb-3 px-3'>
                Quick actions
              </p>
              <div className='flex items-center space-x-3 p-3 text-gray-700 hover:bg-gray-100 hover:shadow-sm rounded-lg cursor-pointer transition-all duration-200'>
                <svg
                  className='h-4 w-4 lg:h-5 lg:w-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                  />
                </svg>
                <span className='text-sm'>Request for product</span>
              </div>
              <div className='flex items-center space-x-3 p-3 text-gray-700 hover:bg-gray-100 hover:shadow-sm rounded-lg cursor-pointer transition-all duration-200'>
                <svg
                  className='h-4 w-4 lg:h-5 lg:w-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                  />
                </svg>
                <span className='text-sm'>Add member</span>
              </div>
            </div>

            {/* Last orders section - hidden when collapsed on desktop */}
            <div className={`pt-4 ${!isOpen ? 'lg:hidden' : ''}`}>
              <p className='text-xs text-gray-500 font-medium mb-3 px-3'>
                Last orders: <span className='font-bold text-gray-900'>37</span>
              </p>
              {[
                { name: 'DXC Nike', color: 'bg-gray-300' },
                { name: 'Outerwear', color: 'bg-orange-400 text-white' },
              ].map((order) => (
                <div
                  key={order.name}
                  className='flex items-center space-x-3 p-3 text-gray-700 hover:bg-gray-100 hover:shadow-sm rounded-lg cursor-pointer transition-all duration-200'
                >
                  <div
                    className={`w-8 h-8 ${order.color} rounded-full flex items-center justify-center`}
                  >
                    <svg
                      className='h-4 w-4'
                      fill='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' />
                    </svg>
                  </div>
                  <div className='flex-1'>
                    <span className='text-sm font-medium'>{order.name}</span>
                    <span className='text-xs text-gray-500 block'>
                      ...view order
                    </span>
                  </div>
                </div>
              ))}
              <div className='px-3 py-2'>
                <span className='text-xs text-blue-600 cursor-pointer hover:underline hover:text-blue-800 transition-colors duration-200'>
                  See all
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden'
          onClick={toggleSidebar}
        />
      )}
    </>
  )
}
