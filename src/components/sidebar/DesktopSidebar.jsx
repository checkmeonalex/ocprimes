import React from 'react'
import SidebarNav from './SidebarNav'

const DesktopSidebar = ({
  items,
  selectedItem,
  onSelect,
  isOpen,
  onHoverChange,
  onOpen,
  onClose,
}) => {
  const handleEnter = () => {
    onHoverChange?.(true)
    onOpen?.()
  }

  const handleLeave = () => {
    onHoverChange?.(false)
    onClose?.()
  }

  return (
    <div
      className={`hidden lg:flex fixed inset-y-0 left-0 w-[var(--app-sidebar-width)] bg-white shadow-lg flex-col z-30 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
      }`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className='p-4 border-b border-gray-200'>
        <div className='flex items-center justify-center'>
          <div className='w-8 h-8 rounded-lg bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center'>
            L
          </div>
        </div>
      </div>
      <SidebarNav
        items={items}
        selectedItem={selectedItem}
        onSelect={onSelect}
        iconSizeClass='w-6 h-6'
        itemClassName='p-2 justify-center'
        showLabels={false}
      />
    </div>
  )
}

export default DesktopSidebar
