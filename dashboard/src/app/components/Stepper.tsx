import React, { useState, Children } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface StepperProps {
  initialStep?: number
  onStepChange?: (step: number) => void
  onFinalStepCompleted?: () => void
  backButtonText?: string
  nextButtonText?: string
  children: React.ReactNode
}

export const Step: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>

const Stepper: React.FC<StepperProps> = ({
  initialStep = 1,
  onStepChange,
  onFinalStepCompleted,
  backButtonText = 'Previous',
  nextButtonText = 'Next',
  children,
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const steps = Children.toArray(children)
  const totalSteps = steps.length
  const isLast = currentStep === totalSteps

  const goNext = () => {
    if (isLast) {
      onFinalStepCompleted?.()
      return
    }
    const next = currentStep + 1
    setCurrentStep(next)
    onStepChange?.(next)
  }

  const goPrev = () => {
    if (currentStep <= 1) return
    const prev = currentStep - 1
    setCurrentStep(prev)
    onStepChange?.(prev)
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
        {steps.map((_, i) => {
          const stepNum = i + 1
          const isActive = stepNum === currentStep
          const isCompleted = stepNum < currentStep
          return (
            <React.Fragment key={i}>
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  background: isCompleted ? '#10B981' : isActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                  border: isActive ? '2px solid #10B981' : isCompleted ? '2px solid #10B981' : '1px solid var(--border-light)',
                  color: isCompleted ? '#030014' : isActive ? '#10B981' : 'var(--text-muted)',
                  transition: 'all 0.3s',
                }}
              >
                {isCompleted ? <Check size={14} /> : stepNum}
              </motion.div>
              {i < totalSteps - 1 && (
                <div style={{ flex: 1, height: 2, margin: '0 6px', background: isCompleted ? '#10B981' : 'var(--border-light)', borderRadius: 99, transition: 'background 0.3s' }} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Step content */}
      <div style={{ minHeight: 40, position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {steps[currentStep - 1]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button
          onClick={goPrev}
          disabled={currentStep <= 1}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--border-light)', background: 'transparent', color: currentStep <= 1 ? 'var(--text-muted)' : 'var(--text-sub)',
            fontSize: 12, fontWeight: 600, cursor: currentStep <= 1 ? 'not-allowed' : 'pointer', opacity: currentStep <= 1 ? 0.5 : 1, transition: 'all 0.2s',
          }}
        >
          <ChevronLeft size={14} /> {backButtonText}
        </button>
        <button
          onClick={goNext}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
            border: 'none', background: isLast ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(16,185,129,0.12)',
            color: isLast ? '#030014' : '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: isLast ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
          }}
        >
          {isLast ? 'Complete' : nextButtonText} {!isLast && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  )
}

export default Stepper
