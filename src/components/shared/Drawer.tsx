import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  width?: 'md' | 'lg' | 'xl'
  footer?: ReactNode
}

const widths = { md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-2xl' }

export function Drawer({ open, onClose, title, subtitle, children, width = 'lg', footer }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={cn('relative flex h-full max-h-[100dvh] w-full max-w-full flex-col bg-white shadow-2xl sm:max-w-none', widths[width])}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between border-b border-[#F0F2FA] px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#000000]">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-[#10259C]">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-[#10259C] hover:bg-[#F0F2FA] hover:text-[#000000]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">{children}</div>
            {footer && <div className="border-t border-[#F0F2FA] px-6 py-4">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}