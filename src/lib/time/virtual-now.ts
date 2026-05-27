const toNumber = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

const readOffsetMinutes = () => {
  const publicOffset = toNumber(process.env.NEXT_PUBLIC_APP_TIME_OFFSET_MINUTES)
  if (publicOffset !== 0) return publicOffset
  return toNumber(process.env.APP_TIME_OFFSET_MINUTES)
}

export const getTimeOffsetMs = () => readOffsetMinutes() * 60 * 1000

export const getNowMs = () => Date.now() + getTimeOffsetMs()

export const getNowDate = () => new Date(getNowMs())

export const getNowIso = () => getNowDate().toISOString()
