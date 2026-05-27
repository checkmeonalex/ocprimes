// src/components/StarRating.jsx
import { StarIcon as SolidStar } from '@heroicons/react/24/solid'
import { StarIcon as OutlineStar } from '@heroicons/react/24/outline'

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className="flex items-center">
      {/* Full Stars */}
      {[...Array(fullStars)].map((_, i) => (
        <SolidStar key={`full-${i}`} className="w-4 h-4 text-yellow-500" />
      ))}

      {/* Half Star */}
      {hasHalfStar && (
        <div className="relative w-4 h-4">
          <OutlineStar className="w-4 h-4 text-yellow-500" />
          <div
            className="absolute top-0 left-0 overflow-hidden"
            style={{ width: '50%' }}
          >
            <SolidStar className="w-4 h-4 text-yellow-500" />
          </div>
        </div>
      )}

      {/* Empty Stars */}
      {[...Array(emptyStars)].map((_, i) => (
        <OutlineStar key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      ))}
    </div>
  )
}

export default StarRating
