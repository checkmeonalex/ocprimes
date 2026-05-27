'use client'

export default function ProductPagePreloader({ className = '' }) {
  return (
    <div className={`flex min-h-[calc(100vh-6rem)] items-center justify-center bg-white lg:min-h-[calc(100vh-6.625rem)] ${className}`.trim()}>
      <div className='product-route-loader' aria-label='Loading product' role='status' />
      <style>{`
        .product-route-loader {
          position: relative;
          box-sizing: border-box;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid rgba(0, 0, 0, 0.56);
          filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.62));
          transform-origin: 50% 50%;
          transform: perspective(200px) rotateX(66deg);
          animation: product-loader-wiggle 1.2s infinite;
        }

        .product-route-loader::before,
        .product-route-loader::after {
          content: "";
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          box-sizing: border-box;
          border: 4px solid transparent;
          animation:
            product-loader-spin 1.2s cubic-bezier(0.6, 0.2, 0, 0.8) infinite,
            product-loader-fade 1.2s linear infinite;
        }

        .product-route-loader::before {
          border-top-color: #fff;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.95));
        }

        .product-route-loader::after {
          border-top-color: rgb(0 0 0);
          filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.95));
          animation-delay: 0.4s;
        }

        @keyframes product-loader-spin {
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes product-loader-fade {
          25%,
          75% {
            opacity: 0.28;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes product-loader-wiggle {
          0%,
          100% {
            transform: perspective(200px) rotateX(66deg) rotateZ(0deg);
          }
          50% {
            transform: perspective(200px) rotateX(66deg) rotateZ(7deg);
          }
        }
      `}</style>
    </div>
  )
}
