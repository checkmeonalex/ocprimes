'use client'

import Image from 'next/image'
import { getBimojiCharacter } from './characters.mjs'

// Renders the user's selected Bimoji character avatar, or null when the user
// has not picked one yet (callers fall back to avatar_url / initials).
export default function BimojiAvatar({ characterId, size = 32, className = '' }) {
  const character = getBimojiCharacter(characterId)
  if (!character) return null
  return (
    <Image
      src={character.avatar}
      alt={`${character.name} avatar`}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={className || 'h-full w-full object-cover'}
      placeholder='blur'
    />
  )
}
