const WINDOW_MS = 5 * 60 * 1000

export const currentRotationSlot = () => Math.floor(Date.now() / WINDOW_MS)

const mulberry32 = (seed: number) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const seededShuffle = <T,>(items: T[], seed: number): T[] => {
  const rand = mulberry32(seed)
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const seededPick = <T,>(items: T[], seed: number): T | null => {
  if (!items.length) return null
  const rand = mulberry32(seed)
  const index = Math.floor(rand() * items.length)
  return items[index]
}
