'use client'

const LogoGrid = ({
  title,
  titleBgColor,
  titleTextColor,
  items = [],
  className = '',
}) => {
  const logos = Array.isArray(items) ? items.filter((item) => item?.image_url) : []
  if (!logos.length) return null

  return (
    <section className={`mb-10 ${className}`}>
      {title ? (
        <div
          className="mb-4 rounded-lg px-4 py-2 text-center"
          style={{ backgroundColor: titleBgColor || '#fed7aa' }}
        >
          <h3
            className="text-base font-semibold"
            style={{ color: titleTextColor || '#111827' }}
          >
            {title}
          </h3>
        </div>
      ) : null}
      <div className="bg-white px-0.5 py-0.5">
        <div className="flex flex-wrap justify-center gap-1">
          {logos.map((logo) => (
            <div key={logo.id} className="w-24 sm:w-28 md:w-32 lg:w-36">
              <img
                src={logo.image_url}
                alt={logo.image_alt || 'Brand logo'}
                className="block h-20 w-full object-contain sm:h-24 md:h-28 lg:h-28"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default LogoGrid
