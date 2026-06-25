import { cn } from '@/lib/utils'
import { palette } from '@/lib/palette'
import { motion, AnimatePresence } from 'framer-motion'
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  loadingText,
  children,
  disabled,
  deptColor,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
  deptColor?: string
}) {
  const variants = {
    primary: deptColor
      ? `text-white hover:opacity-90`
      : 'bg-[#001996] text-white hover:bg-[#000000]',
    secondary: 'bg-[#000000] text-white hover:bg-[#001996]',
    danger: 'bg-[#FF052E] text-white hover:bg-[#991B1B]',
    success: 'bg-gradient-to-r from-[#10259C] to-[#001996] text-white hover:opacity-90',
    ghost: 'bg-transparent text-[#000000] hover:bg-[#F0F2FA]',
    outline: 'border-2 border-[#F0F2FA] bg-white text-[#000000] hover:bg-[#F0F2FA]',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        'active:scale-[0.97]',
        variants[variant],
        sizes[size],
        className
      )}
      style={variant === 'primary' && deptColor ? { background: deptColor } : undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {loading && loadingText ? loadingText : children}
    </button>
  )
}

export function Input({
  className,
  label,
  error,
  focusColor = palette.medium,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; focusColor?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[#000000]">{label}</label>}
      <input
        className={cn(
          'w-full rounded-xl border-[1.5px] border-[#F0F2FA] bg-white px-3 py-2.5 text-sm text-[#000000]',
          'placeholder:text-[#10259C] transition-colors focus:outline-none focus:ring-2',
          error && 'border-[#FF052E] focus:ring-[#FF052E]',
          className
        )}
        style={{ '--tw-ring-color': focusColor } as React.CSSProperties}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
      {error && <p id={`${props.id}-error`} className="text-xs text-[#FF052E]" role="alert">{error}</p>}
    </div>
  )
}

export function Select({
  className,
  label,
  error,
  children,
  focusColor = palette.medium,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; focusColor?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[#000000]">{label}</label>}
      <select
        className={cn(
          'w-full rounded-xl border-[1.5px] border-[#F0F2FA] bg-white px-3 py-2.5 text-sm text-[#000000]',
          'focus:outline-none focus:ring-2',
          error && 'border-[#FF052E]',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[#FF052E]">{error}</p>}
    </div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('light-card rounded-2xl border border-[#F0F2FA] bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h3 className="font-display text-xl font-semibold text-[#000000]">{title}</h3>
        {subtitle && <p className="text-sm text-[#001996]">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const variants = {
    default: 'bg-[#001996] text-white',
    success: 'bg-[#10259C] text-white',
    warning: 'bg-[#B45309] text-white',
    danger: 'bg-[#FF052E] text-white',
    info: 'bg-[#10259C] text-white',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant])}>
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer h-4 w-full', className)} aria-hidden />
}

export function EmptyState({
  title,
  description,
  action,
  image,
}: {
  title: string
  description: string
  action?: ReactNode
  image?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      {image ? (
        <img src={image} alt="" className="mb-4 h-32 w-32 object-contain animate-float" />
      ) : (
        <div className="mb-4 rounded-full bg-[#F0F2FA] p-6 text-4xl">🐣</div>
      )}
      <h3 className="font-display text-lg font-semibold text-[#000000]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-[#001996]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  )
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
}: {
  title: string
  value: string
  subtitle?: string
  trend?: { value: string; positive: boolean }
  icon?: ReactNode
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#001996]">{title}</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#000000]">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-[#10259C]">{subtitle}</p>}
          {trend && (
            <p className={cn('mt-1 text-xs font-semibold', trend.positive ? 'text-[#001996]' : 'text-[#FF052E]')}>
              {trend.value}
            </p>
          )}
        </div>
        {icon}
      </div>
    </Card>
  )
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-[#F0F2FA]', className)}>
      <table className="dept-table min-w-full" style={{ '--row-alt': '#F0F2FA' } as React.CSSProperties}>
        {children}
      </table>
    </div>
  )
}

export function Th({ children, className, bgColor }: { children: ReactNode; className?: string; bgColor?: string }) {
  return (
    <th
      className={cn('px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white', className)}
      style={{ background: bgColor || '#001996' }}
    >
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-sm text-[#000000]', className)}>{children}</td>
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={cn(
              'relative flex w-full max-h-[min(92dvh,100dvh)] flex-col rounded-t-2xl bg-white shadow-2xl sm:my-auto sm:max-h-[min(90vh,100dvh-2rem)] sm:rounded-2xl',
              sizes[size]
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#F0F2FA] px-6 py-4">
              <h2 id="modal-title" className="font-display text-lg font-semibold text-[#000000]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-2xl leading-none text-[#10259C] hover:bg-[#F0F2FA] hover:text-[#000000]"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}