'use client'

const SectionHeading = ({ title, className = '' }) => {
  if (!title) return null

  return (
    <div className={`mb-4 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
        {title}
      </h2>
    </div>
  )
}

export default SectionHeading
