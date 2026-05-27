import React from 'react'

const SidebarSkeleton = () => {
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

export default SidebarSkeleton
