import { useEffect, memo } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { useSafeReducedMotion } from '../lib/useSafeReducedMotion'

/**
 * AnimatedNumber — renders a spring-animated count-up integer with tabular-nums.
 * Uses Framer Motion's useSpring for buttery spring physics instead of RAF.
 */
export default memo(function AnimatedNumber({ value, className = '' }) {
  const reduce = useSafeReducedMotion()
  
  if (reduce) {
    return (
      <span className={['tabular-nums inline-block', className].join(' ')}>
        {Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : '—'}
      </span>
    )
  }

  const spring = useSpring(value ?? 0, { stiffness: 80, damping: 20 })
  const display = useTransform(spring, (v) =>
    Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—'
  )

  useEffect(() => {
    spring.set(value ?? 0)
  }, [value, spring])

  return (
    <motion.span className={['tabular-nums inline-block', className].join(' ')}>
      {display}
    </motion.span>
  )
})
