import { BRAND_NAME } from '@/lib/brand'

export default function ProductImagePlaceholder({ className = '' }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-[#f6efe6] ${className}`.trim()}
      aria-hidden='true'
    >
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_rgba(246,239,230,0.76)_44%,_rgba(230,218,204,0.98))]' />
      <div className='absolute inset-x-0 top-0 h-24 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.58),transparent)] opacity-70 animate-[pulse_2.4s_ease-in-out_infinite]' />
      <div className='relative flex flex-col items-center gap-3 text-center text-[#6a4a2d]'>
        <span className='text-[10px] font-semibold uppercase tracking-[0.45em] text-[#9a7b5f]'>
          Loading
        </span>
        <span className='px-6 text-2xl font-medium tracking-[0.32em] text-[#6f4f35] [font-family:Georgia,serif] sm:text-3xl'>
          {String(BRAND_NAME || 'Alxora').toUpperCase()}
        </span>
      </div>
    </div>
  )
}
