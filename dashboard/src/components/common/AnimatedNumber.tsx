import React, { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  style?: React.CSSProperties
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 600,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  style,
}) => {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number>()
  const startRef = useRef<number>()

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return
    prevRef.current = to

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        startRef.current = undefined
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  return (
    <span className={className} style={style}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  )
}
