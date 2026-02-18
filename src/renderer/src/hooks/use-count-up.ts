import { useState, useEffect } from 'react'

export function useCountUp(target: number, duration = 600) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) {
      setCount(0)
      return
    }
    let start = 0
    const step = Math.max(1, Math.ceil(target / (duration / 16)))
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}
