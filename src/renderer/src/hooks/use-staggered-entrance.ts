import { useState, useEffect } from 'react'

export function useStaggeredEntrance(itemCount: number, baseDelay = 40) {
  const [visibleCount, setVisibleCount] = useState(0)
  useEffect(() => {
    setVisibleCount(0)
    let i = 0
    const timer = setInterval(() => {
      i++
      setVisibleCount(i)
      if (i >= itemCount) clearInterval(timer)
    }, baseDelay)
    return () => clearTimeout(timer)
  }, [itemCount, baseDelay])
  return visibleCount
}
