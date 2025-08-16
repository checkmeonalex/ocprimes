'use client'
import { useState, useEffect } from 'react'
import { useSidebar } from '../context/SidebarContext'

export default function Sidebar() {
  const { isOpen, toggleSidebar, isHydrated } = useSidebar()
  const [isMobile, setIsMobile] = useState(false)
  const [selectedItem, setSelectedItem] = useState('Popular Products')

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initial loading state
  if (!isHydrated) {
    return (
      <div className='hidden lg:flex fixed inset-y-0 left-0 w-16 bg-white shadow-lg flex-col z-30'>
        <div className='p-4 border-b border-gray-200'>
          <div className='w-8 h-8 rounded-lg bg-gray-200 animate-pulse'></div>
        </div>
        <div className='flex-1 p-4 space-y-2'>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className='w-full h-10 bg-gray-200 rounded-lg animate-pulse'
            ></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 bg-white shadow-lg flex flex-col transition-transform duration-300 ease-in-out
          ${isMobile ? 'w-64 z-50' : 'w-16 z-30'}
          ${
            isMobile
              ? isOpen
                ? 'translate-x-0'
                : '-translate-x-full'
              : 'translate-x-0'
          }`}
      >
        {/* Header */}
        <div className='p-4 border-b border-gray-200'>
          <div className='flex items-center justify-center'>
            <div className='w-8 h-8 rounded-lg bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center'>
              L
            </div>
            {isMobile && isOpen && (
              <span className='ml-2 text-lg font-semibold text-gray-800'>
                Logo
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className='flex-1 p-4 space-y-2'>
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
              className={`flex items-center rounded-lg cursor-pointer transition-all
                ${
                  selectedItem === item.name
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }
                ${isMobile ? 'p-3' : 'p-2 justify-center'}`}
              onClick={() => setSelectedItem(item.name)}
            >
              <svg
                className='w-5 h-5'
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
              {isMobile && isOpen && (
                <span className='ml-3 text-sm'>{item.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 z-40'
          onClick={toggleSidebar}
        />
      )}
    </>
  )
}
