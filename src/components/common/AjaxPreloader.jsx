'use client'

import Image from 'next/image'
import minilogo from '@/app/storage/minilogo.png'

export default function AjaxPreloader({
  label = 'Loading content...',
  fullscreen = true,
}) {
  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[2px]'
          : 'absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-[2px]'
      }
      role='status'
      aria-live='polite'
      aria-label={label}
    >
      <div className='flex w-[180px] max-w-[88vw] flex-col items-center gap-5'>
        <div className='ajax-preloader-logo relative w-[92px] max-w-full'>
          <Image
            src={minilogo}
            alt='OCPRIMES'
            priority
            className='h-auto w-full object-contain'
          />
        </div>
        <div className='h-[2px] w-full overflow-hidden rounded-full bg-[rgba(255,215,160,0.18)]'>
          <div className='ajax-preloader-fill h-full rounded-full' />
        </div>
      </div>

      <style jsx>{`
        .ajax-preloader-logo {
          opacity: 0;
          transform: translateY(8px) scale(0.96);
          animation: ajax-logo-in 0.8s ease forwards;
        }

        .ajax-preloader-fill {
          width: 0;
          background: linear-gradient(
            90deg,
            rgba(212, 175, 55, 0.75),
            rgba(255, 224, 163, 1)
          );
          animation: ajax-load-line 1.4s ease forwards 0.2s;
        }

        @keyframes ajax-logo-in {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes ajax-load-line {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
