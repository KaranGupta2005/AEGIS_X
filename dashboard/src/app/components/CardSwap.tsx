import React, { Children, cloneElement, forwardRef, isValidElement, useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import './CardSwap.css'

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} className={`card ${props.className ?? ''}`.trim()} />
)
Card.displayName = 'Card'

interface CardSwapProps {
  width?: number
  height?: number
  cardDistance?: number
  verticalDistance?: number
  delay?: number
  pauseOnHover?: boolean
  skewAmount?: number
  children: React.ReactNode
}

const CardSwap: React.FC<CardSwapProps> = ({
  width = 460, height = 340, cardDistance = 55,
  verticalDistance = 65, delay = 4500, pauseOnHover = true,
  skewAmount = 5, children,
}) => {
  const childArr = useMemo(() => Children.toArray(children), [children])
  const refs = useMemo(() => childArr.map(() => React.createRef<HTMLDivElement>()), [childArr.length])
  const order = useRef(Array.from({ length: childArr.length }, (_, i) => i))
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const intervalRef = useRef<number | undefined>(undefined)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const total = refs.length
    const slot = (i: number) => ({ x: i * cardDistance, y: -i * verticalDistance, z: -i * cardDistance * 1.5, zIndex: total - i })

    refs.forEach((r, i) => {
      if (r.current) {
        const s = slot(i)
        gsap.set(r.current, { x: s.x, y: s.y, z: s.z, xPercent: -50, yPercent: -50, skewY: skewAmount, transformOrigin: 'center center', zIndex: s.zIndex, force3D: true })
      }
    })

    const swap = () => {
      if (order.current.length < 2) return
      const [front, ...rest] = order.current
      const el = refs[front].current
      if (!el) return
      const tl = gsap.timeline()
      tlRef.current = tl

      tl.to(el, { y: '+=500', duration: 2, ease: 'elastic.out(0.6,0.9)' })
      tl.addLabel('promote', '-=1.8')

      rest.forEach((idx, i) => {
        const e = refs[idx].current
        if (!e) return
        const s = slot(i)
        tl.set(e, { zIndex: s.zIndex }, 'promote')
        tl.to(e, { x: s.x, y: s.y, z: s.z, duration: 2, ease: 'elastic.out(0.6,0.9)' }, `promote+=${i * 0.15}`)
      })

      const back = slot(total - 1)
      tl.addLabel('return', `promote+=${2 * 0.05}`)
      tl.call(() => { gsap.set(el, { zIndex: back.zIndex }) }, undefined, 'return')
      tl.to(el, { x: back.x, y: back.y, z: back.z, duration: 2, ease: 'elastic.out(0.6,0.9)' }, 'return')
      tl.call(() => { order.current = [...rest, front] })
    }

    swap()
    intervalRef.current = window.setInterval(swap, delay)

    if (pauseOnHover && container.current) {
      const node = container.current
      const pause = () => { tlRef.current?.pause(); clearInterval(intervalRef.current) }
      const resume = () => { tlRef.current?.play(); intervalRef.current = window.setInterval(swap, delay) }
      node.addEventListener('mouseenter', pause)
      node.addEventListener('mouseleave', resume)
      return () => { node.removeEventListener('mouseenter', pause); node.removeEventListener('mouseleave', resume); clearInterval(intervalRef.current) }
    }
    return () => clearInterval(intervalRef.current)
  }, [])

  return (
    <div ref={container} className="card-swap-container" style={{ width, height }}>
      {childArr.map((child, i) =>
        isValidElement(child)
          ? cloneElement(child as React.ReactElement<any>, { key: i, ref: refs[i], style: { width, height, ...((child as any).props.style ?? {}) } })
          : child
      )}
    </div>
  )
}

export default CardSwap
