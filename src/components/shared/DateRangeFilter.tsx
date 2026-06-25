import { DATE_RANGE_LABELS, type DateRangePreset } from '@/lib/dateFilters'
import { cn } from '@/lib/utils'

const PRESETS: DateRangePreset[] = [
  'today',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'this_year',
  'all_time',
]

interface Props {
  value: DateRangePreset
  onChange: (preset: DateRangePreset) => void
  customStart?: string
  customEnd?: string
  onCustomChange?: (start: string, end: string) => void
  showCustom?: boolean
  className?: string
}

export function DateRangeFilter({
  value,
  onChange,
  customStart = '',
  customEnd = '',
  onCustomChange,
  showCustom = true,
  className,
}: Props) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onChange(preset)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            value === preset
              ? 'bg-[#10259C] text-white shadow-sm'
              : 'bg-white text-[#001996] ring-1 ring-[#F0F2FA] hover:bg-[#F0F2FA]'
          )}
        >
          {DATE_RANGE_LABELS[preset]}
        </button>
      ))}
      {showCustom && (
        <>
          <button
            type="button"
            onClick={() => onChange('custom')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              value === 'custom'
                ? 'bg-[#10259C] text-white shadow-sm'
                : 'bg-white text-[#001996] ring-1 ring-[#F0F2FA] hover:bg-[#F0F2FA]'
            )}
          >
            Custom
          </button>
          {value === 'custom' && onCustomChange && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => onCustomChange(e.target.value, customEnd)}
                className="rounded-lg border border-[#F0F2FA] px-2 py-1 text-xs text-[#000000]"
              />
              <span className="text-xs text-[#10259C]">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => onCustomChange(customStart, e.target.value)}
                className="rounded-lg border border-[#F0F2FA] px-2 py-1 text-xs text-[#000000]"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}