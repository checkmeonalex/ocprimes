import { useState, useEffect } from 'react'

const useWindowWidth = () => {
  const [width, setWidth] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setWidth(window.innerWidth)

    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return mounted ? width : 1024
}

export default useWindowWidth
