'use client'

import { BrandLogoFull } from '@/components/common/BrandLogo'

const SkeletonBlock = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/80 ${className}`.trim()} />
)

export default function ProductPagePreloader({ className = '' }) {
  return (
    <div className={`min-h-screen bg-white ${className}`.trim()}>
      {/* Header skeleton — shows the real site logo (not a placeholder) so
          nothing appears to "disappear" once the real vendor/site header
          mounts with resolved data. */}
      <div className='sticky top-0 z-10 border-b border-gray-200 bg-white'>
        <div className='mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
          <SkeletonBlock className='h-6 w-6 rounded sm:hidden' />
          <BrandLogoFull tone='dark' className='h-auto w-[120px] sm:w-[150px]' />
          <div className='flex items-center gap-3'>
            <SkeletonBlock className='h-6 w-6 rounded-full' />
            <SkeletonBlock className='hidden h-6 w-6 rounded-full sm:block' />
            <SkeletonBlock className='h-6 w-6 rounded-full' />
          </div>
        </div>
      </div>

      {/* Body skeleton — mirrors the gallery / product-info split */}
      <div className='mx-auto grid max-w-7xl gap-6 px-4 py-4 sm:px-6 md:grid-cols-[55%_45%] md:gap-10 lg:px-8 xl:grid-cols-[60%_40%]'>
        {/* Gallery */}
        <div className='space-y-3'>
          <SkeletonBlock className='aspect-[4/5] w-full' />
          <div className='flex gap-2'>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className='h-16 w-16 shrink-0' />
            ))}
          </div>
        </div>

        {/* Product info */}
        <div className='space-y-4 py-2'>
          <SkeletonBlock className='h-3 w-24' />
          <SkeletonBlock className='h-6 w-4/5' />
          <SkeletonBlock className='h-6 w-2/5' />
          <div className='flex items-center gap-3 pt-1'>
            <SkeletonBlock className='h-6 w-20' />
            <SkeletonBlock className='h-5 w-16' />
          </div>
          <SkeletonBlock className='h-4 w-32' />

          <div className='space-y-2 pt-4'>
            <SkeletonBlock className='h-3 w-16' />
            <div className='flex gap-2'>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className='h-9 w-14' />
              ))}
            </div>
          </div>

          <SkeletonBlock className='mt-6 h-11 w-full' />
          <SkeletonBlock className='h-11 w-full' />

          <div className='space-y-2 pt-6'>
            <SkeletonBlock className='h-3 w-full' />
            <SkeletonBlock className='h-3 w-full' />
            <SkeletonBlock className='h-3 w-2/3' />
          </div>
        </div>
      </div>
    </div>
  )
}
