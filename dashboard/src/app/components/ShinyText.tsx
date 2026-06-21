import React from 'react'

interface ShinyTextProps {
  text: string
  speed?: number
  color?: string
  shineColor?: string
  className?: string
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, speed = 3, color = '#b5b5b5', shineColor = '#ffffff', className = '' }) => {
  return (
    <span className={className} style={{
      color,
      backgroundImage: `linear-gradient(120deg, transparent 40%, ${shineColor} 50%, transparent 60%)`,
      backgroundSize: '200% 100%',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      animation: `shinyText ${speed}s linear infinite`,
      display: 'inline-block',
    }}>
      <style>{`@keyframes shinyText { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      {text}
    </span>
  )
}

export default ShinyText
