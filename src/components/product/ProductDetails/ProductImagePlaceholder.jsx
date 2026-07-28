import { BRAND_NAME } from '@/lib/brand'

export default function ProductImagePlaceholder({ className = '', name = '', logoUrl = '' }) {
  const cleanLogoUrl = String(logoUrl || '').trim()
  const label = String(name || BRAND_NAME || 'Alxora').toUpperCase()
  const isLong = label.length > 10

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-[#f6efe6] ${className}`.trim()}
      aria-hidden='true'
    >
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_rgba(246,239,230,0.76)_44%,_rgba(230,218,204,0.98))]' />
      <div className='absolute inset-x-0 top-0 h-24 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.58),transparent)] opacity-70 animate-[pulse_2.4s_ease-in-out_infinite]' />
      <div className='relative flex items-center justify-center text-center'>
        {cleanLogoUrl ? (
          <img
            src={cleanLogoUrl}
            alt=''
            className='w-auto max-w-[70%] object-contain opacity-90'
            style={{ maxHeight: '48px', height: 'auto' }}
          />
        ) : (
          <span
            className={`px-5 font-medium text-[#6f4f35] [font-family:Georgia,serif] [word-spacing:0.2em] ${
              isLong ? 'text-base tracking-[0.08em] sm:text-lg' : 'text-2xl tracking-[0.32em] sm:text-3xl'
            }`}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
