import React from 'react'

interface GradientTextProps {
  children: React.ReactNode
  colors?: string[]
  animationSpeed?: number
  className?: string
}

const GradientText: React.FC<GradientTextProps> = ({ children, colors = ['#10B981', '#06B6D4', '#3B82F6', '#10B981'], animationSpeed = 6, className = '' }) => {
  const gradient = colors.join(', ')
  return (
    <span className={className} style={{
      background: `linear-gradient(90deg, ${gradient})`,
      backgroundSize: '300% 100%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: `gradientShift ${animationSpeed}s ease infinite`,
      display: 'inline-block',
    }}>
      <style>{`@keyframes gradientShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }`}</style>
      {children}
    </span>
  )
}

export default GradientText
