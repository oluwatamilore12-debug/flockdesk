import { motion } from 'framer-motion'
import CountUpImport from 'react-countup'
import type { CountUpProps } from 'react-countup'
import { cn, formatNumber } from '@/lib/utils'
import { useDepartment } from '@/context/DepartmentContext'
import { staggerItem } from './PageWrapper'
import type { ComponentType, ReactNode } from 'react'

/** react-countup is CJS-only; Vite may expose the module object instead of the component. */
function resolveCountUp(): ComponentType<CountUpProps> | null {
  if (typeof CountUpImport === 'function') {
    return CountUpImport as ComponentType<CountUpProps>
  }
  const mod = CountUpImport as { default?: ComponentType<CountUpProps> }
  return typeof mod.default === 'function' ? mod.default : null
}

const CountUp = resolveCountUp()

function StatValue({
  value,
  isCurrency,
  prefix,
  suffix,
  decimals,
}: {
  value: number
  isCurrency?: boolean
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const safeValue = Math.max(0, value)

  if (CountUp) {
    return isCurrency ? (
      <>
        ₦<CountUp end={safeValue} duration={1.8} separator="," decimals={decimals} />
      </>
    ) : (
      <CountUp
        end={safeValue}
        duration={1.8}
        separator=","
        prefix={prefix}
        suffix={suffix}
        decimals={decimals}
      />
    )
  }

  const formatted =
    decimals && decimals > 0
      ? safeValue.toLocaleString('en-NG', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : formatNumber(safeValue)
  return (
    <>
      {isCurrency ? '₦' : prefix}
      {formatted}
      {suffix}
    </>
  )
}

interface AnimatedStatCardProps {
  title: string
  value?: number
  displayValue?: string
  prefix?: string
  suffix?: string
  subtitle?: string
  trend?: { value: string; positive: boolean }
  icon?: ReactNode
  isCurrency?: boolean
  decimals?: number
}

export function AnimatedStatCard({
  title,
  value,
  displayValue,
  prefix,
  suffix,
  subtitle,
  trend,
  icon,
  isCurrency,
  decimals = 0,
}: AnimatedStatCardProps) {
  const theme = useDepartment()
  const isDark = theme.id === 'md'

  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        'stat-card light-card rounded-xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg',
        theme.statCardClass
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn('font-medium', theme.statLabelClass)}>{title}</p>
          <p className={theme.statNumberClass}>
            {displayValue ? (
              displayValue
            ) : value !== undefined && Number.isFinite(value) ? (
              <StatValue
                value={value}
                isCurrency={isCurrency}
                prefix={prefix}
                suffix={suffix}
                decimals={decimals}
              />
            ) : (
              '—'
            )}
          </p>
          {subtitle && <p className={cn('text-xs', isDark ? 'text-[#10259C]' : 'text-[#10259C]')}>{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs font-semibold', trend.positive ? 'text-[#10259C]' : 'text-[#FF052E]')}>
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="rounded-xl p-2.5"
            style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}
          >
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  )
}