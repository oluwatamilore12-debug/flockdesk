import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  sublabel?: string
  variant?: 'default' | 'balanced' | 'payment' | 'supplier' | 'target'
  showPercent?: boolean
  className?: string
  gradient?: string
  /** Use on dark/coloured banners for readable labels and track */
  tone?: 'default' | 'onDark'
}

const variantGradients: Record<string, string> = {
  default: 'linear-gradient(90deg, #001996, #FF052E)',
  balanced: 'linear-gradient(90deg, #001996, #10259C)',
  payment: 'linear-gradient(90deg, #001996, #FF052E)',
  supplier: 'linear-gradient(90deg, #10259C, #001996)',
  target: 'linear-gradient(90deg, #F0F2FA, #001996, #FF052E)',
}

export function ProgressBar({
  value,
  max = 100,
  label,
  sublabel,
  variant = 'default',
  showPercent = true,
  className,
  gradient,
  tone = 'default',
}: ProgressBarProps) {
  const reduceMotion = useReducedMotion()
  const percentage = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0
  const isBalanced = variant === 'balanced'
  const onDark = tone === 'onDark'
  const fillGradient =
    gradient ||
    (onDark
      ? isBalanced
        ? 'linear-gradient(90deg, #FFFFFF, #F0F2FA)'
        : 'linear-gradient(90deg, #001996, #FF052E)'
      : variantGradients[variant])

  return (
    <div className={cn('space-y-2', className)}>
      {(label || sublabel) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {label && (
            <span className={cn('font-semibold', onDark ? 'text-white' : 'font-medium text-[#000000]')}>
              {label}
            </span>
          )}
          {sublabel && (
            <span
              className={cn(
                'font-mono text-sm',
                onDark ? 'text-[#F0F2FA]' : isBalanced ? 'text-[#001996]' : 'text-[#10259C]'
              )}
            >
              {sublabel}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'h-3 flex-1 overflow-hidden rounded-full shadow-inner',
            onDark ? 'bg-white/25 ring-1 ring-white/30' : 'bg-[#F0F2FA]'
          )}
        >
          <motion.div
            className="h-full rounded-full shadow-sm"
            style={{ background: fillGradient }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: 'easeOut', delay: reduceMotion ? 0 : 0.2 }}
          />
        </div>
        {showPercent && (
          <span
            className={cn(
              'min-w-[3.5rem] text-right font-mono text-sm font-semibold',
              onDark ? 'text-white' : 'text-[#001996]'
            )}
          >
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}