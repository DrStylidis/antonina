import { useState, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ViewTransitionProps {
  children: ReactNode
  viewKey: string
}

export function ViewTransition({ children, viewKey }: ViewTransitionProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const timer = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(timer)
  }, [viewKey])

  return (
    <div
      className={cn(
        'transition-all duration-200 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      )}
    >
      {children}
    </div>
  )
}
