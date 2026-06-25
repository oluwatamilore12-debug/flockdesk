import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  isWithinInterval,
  parseISO,
} from 'date-fns'

export type DateRangePreset =
  | 'today'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'all_time'
  | 'custom'

export interface DateRange {
  preset: DateRangePreset
  start: Date | null
  end: Date | null
}

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  today: 'Today',
  this_week: 'This Week',
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_year: 'This Year',
  all_time: 'All Time',
  custom: 'Custom',
}

export function resolveDateRange(preset: DateRangePreset, customStart?: string, customEnd?: string): DateRange {
  const now = new Date()
  switch (preset) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const end = new Date(start)
      end.setHours(23, 59, 59, 999)
      return { preset, start, end }
    }
    case 'this_week':
      return { preset, start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'last_week': {
      const lw = subWeeks(now, 1)
      return { preset, start: startOfWeek(lw, { weekStartsOn: 1 }), end: endOfWeek(lw, { weekStartsOn: 1 }) }
    }
    case 'this_month':
      return { preset, start: startOfMonth(now), end: endOfMonth(now) }
    case 'last_month': {
      const lm = subMonths(now, 1)
      return { preset, start: startOfMonth(lm), end: endOfMonth(lm) }
    }
    case 'this_year':
      return { preset, start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59) }
    case 'custom':
      return {
        preset,
        start: customStart ? parseISO(customStart) : null,
        end: customEnd ? parseISO(customEnd + 'T23:59:59') : null,
      }
    case 'all_time':
    default:
      return { preset: 'all_time', start: null, end: null }
  }
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  if (range.preset === 'all_time' || !range.start || !range.end) return true
  const d = parseISO(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00')
  return isWithinInterval(d, { start: range.start, end: range.end })
}