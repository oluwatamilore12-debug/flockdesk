import { cn } from '@/lib/utils'

interface BrandLogoProps {
  className?: string
  size?: number
}

/** Jmages Dbestline chevron — dark blue left, neon red right */
export function BrandLogo({ className, size = 32 }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 40"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <path d="M4 4 L22 36 L22 4 Z" fill="#001996" />
      <path d="M44 4 L26 36 L26 4 Z" fill="#FF052E" />
    </svg>
  )
}