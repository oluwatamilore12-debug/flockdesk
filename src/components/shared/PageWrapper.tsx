import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageWrapper({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion()
  const base = cn('w-full min-w-0 space-y-4 sm:space-y-6', className)
  if (reduceMotion) return <div className={base}>{children}</div>
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={base}
    >
      {children}
    </motion.div>
  )
}

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}