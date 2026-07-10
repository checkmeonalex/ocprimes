// OCPrimes Bimoji character registry. Static imports let next/image serve
// resized, optimized variants instead of the raw 2048px sources.
import avatarMale1 from './MALE/avater1_male.jpeg'
import avatarMale2 from './MALE/avater2_male.jpeg'
import avatarMale3 from './MALE/avater3_male.jpeg'
import sceneMale1 from './MALE/Profile1_male.jpeg'
import sceneMale2 from './MALE/Profile2_male.jpeg'
import sceneMale3 from './MALE/Profile3_male.jpeg'
import avatarFemale1 from './FEMALE/avater1_female.jpeg'
import avatarFemale2 from './FEMALE/avater2_female.jpeg'
import avatarFemale3 from './FEMALE/avater3_female.jpeg'
import sceneFemale1 from './FEMALE/Profile1_female.jpeg'
import sceneFemale2 from './FEMALE/Profile2_female.jpeg'
import sceneFemale3 from './FEMALE/Profile3_female.jpeg'

export const BIMOJI_CHARACTERS = [
  { id: 'male-1', gender: 'male', name: 'Leo', avatar: avatarMale1, scene: sceneMale1 },
  { id: 'male-2', gender: 'male', name: 'Axel', avatar: avatarMale2, scene: sceneMale2 },
  { id: 'male-3', gender: 'male', name: 'Jaxon', avatar: avatarMale3, scene: sceneMale3 },
  { id: 'female-1', gender: 'female', name: 'Amara', avatar: avatarFemale1, scene: sceneFemale1 },
  { id: 'female-2', gender: 'female', name: 'Chloe', avatar: avatarFemale2, scene: sceneFemale2 },
  { id: 'female-3', gender: 'female', name: 'Bianca', avatar: avatarFemale3, scene: sceneFemale3 },
]

export const getBimojiCharacter = (id) =>
  BIMOJI_CHARACTERS.find((character) => character.id === String(id || '')) || null
