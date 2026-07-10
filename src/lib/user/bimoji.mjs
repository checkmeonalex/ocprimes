// Character ids shared between the mobile Bimoji UI and the API route that
// persists the selection. Keep in sync with src/components/mobile/Bimojis/characters.mjs
export const BIMOJI_CHARACTER_IDS = [
  'male-1',
  'male-2',
  'male-3',
  'female-1',
  'female-2',
  'female-3',
]

export const isValidBimojiCharacterId = (value) =>
  BIMOJI_CHARACTER_IDS.includes(String(value || ''))
