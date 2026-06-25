import { motion } from 'framer-motion'
import { useDepartment } from '@/context/DepartmentContext'
import { ProgressBar } from './ProgressBar'
import type { ReactNode } from 'react'

interface DepartmentBannerProps {
  subtitle?: string
  stats?: ReactNode
  progressLabel?: string
  progressValue?: number
  progressMax?: number
  progressSublabel?: string
  progressComplete?: boolean
}

export function DepartmentBanner({
  subtitle,
  stats,
  progressLabel,
  progressValue,
  progressMax,
  progressSublabel,
  progressComplete = false,
}: DepartmentBannerProps) {
  const theme = useDepartment()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl p-4 text-white shadow-lg sm:p-6"
      style={{ background: theme.bannerGradient }}
    >
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-base font-bold leading-tight text-white sm:text-xl lg:text-2xl" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            <span className="block sm:inline">JMAGES DBESTLINE</span>
            <span className="hidden sm:inline"> — </span>
            <span className="block text-[#F0F2FA] sm:inline sm:text-white">{theme.name.toUpperCase()}</span>
          </h1>
          <p className="text-sm text-[#F0F2FA]">{subtitle || theme.tagline}</p>
        </div>
        {stats && <div className="flex flex-wrap gap-4">{stats}</div>}
      </div>
      {progressValue !== undefined && progressMax !== undefined && progressMax > 0 && (
        <div className="relative z-10 mt-4 rounded-xl border border-white/25 bg-black/40 p-4 shadow-inner backdrop-blur-sm">
          <ProgressBar
            value={progressValue}
            max={progressMax}
            label={progressLabel}
            sublabel={progressSublabel}
            variant={progressComplete ? 'balanced' : 'default'}
            gradient={progressComplete ? theme.progressBalanced : theme.progressGradient}
            tone="onDark"
          />
        </div>
      )}
    </motion.div>
  )
}