'use client'

const SectionHeading = ({ title, className = '' }) => {
  if (!title) return null

  return (
    <div className={`mb-6 ${className}`}>
      <h2 className="text-2xl font-medium text-gray-900 md:text-3xl">
        {title}
      </h2>
    </div>
  )
}

export default SectionHeading
