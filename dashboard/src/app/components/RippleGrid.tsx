import React, { useState, useMemo, useCallback } from 'react'

interface RippleGridProps {
  rows?: number
  cols?: number
  cellSize?: number
}

const RippleGrid: React.FC<RippleGridProps> = ({ rows = 12, cols = 26, cellSize = 56 }) => {
  const [ripple, setRipple] = useState<{ row: number; col: number; key: number } | null>(null)
  const cells = useMemo(() => Array.from({ length: rows * cols }, (_, i) => i), [rows, cols])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setRipple({
      row: Math.floor((e.clientY - rect.top) / cellSize),
      col: Math.floor((e.clientX - rect.left) / cellSize),
      key: Date.now(),
    })
  }, [cellSize])

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'auto',
      maskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, black 20%, transparent 100%)',
      WebkitMaskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, black 20%, transparent 100%)',
    }}>
      <style>{`
        @keyframes cellPulse {
          0% { background: rgba(16,185,129,0.18); transform: scale(0.9); }
          100% { background: transparent; transform: scale(1); }
        }
      `}</style>
      <div
        onClick={handleClick}
        style={{
          display: 'grid', cursor: 'crosshair',
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          width: cols * cellSize, marginInline: 'auto',
        }}
      >
        {cells.map((idx) => {
          const r = Math.floor(idx / cols)
          const c = idx % cols
          const dist = ripple ? Math.hypot(ripple.row - r, ripple.col - c) : -1
          const shouldAnimate = ripple && dist >= 0
          return (
            <div
              key={shouldAnimate ? `${ripple.key}-${idx}` : idx}
              style={{
                width: cellSize, height: cellSize,
                border: '1px solid rgba(16,185,129,0.05)',
                transition: 'background 80ms',
                animation: shouldAnimate ? `cellPulse ${120 + dist * 40}ms ${dist * 25}ms ease-out forwards` : 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default RippleGrid
