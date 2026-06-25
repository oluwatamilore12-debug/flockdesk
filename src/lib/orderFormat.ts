import type { SalesOrder, SalesOrderLine, BirdType } from '@/types'
import { formatCurrency } from './utils'

const CODE_ABBREV: Record<string, string> = {
  BRL: 'B',
  NOL: 'N',
  PLT: 'P',
  CCK: 'C',
  ITK: 'T',
  LTK: 'LT',
}

export function getBirdAbbrev(birdType?: BirdType, birdTypeId?: string, birdTypes?: BirdType[]): string {
  if (birdType?.code) return CODE_ABBREV[birdType.code] || birdType.code.slice(0, 1)
  if (birdTypeId && birdTypes) {
    const bt = birdTypes.find((b) => b.id === birdTypeId)
    if (bt) return CODE_ABBREV[bt.code] || bt.name.slice(0, 1)
  }
  return '?'
}

/** e.g. "200B, 100N" */
export function formatOrderBirdsSummary(
  lines: SalesOrderLine[] | undefined,
  birdTypes?: BirdType[]
): string {
  if (!lines?.length) return '—'
  const grouped = new Map<string, number>()
  lines.forEach((line) => {
    const abbrev = getBirdAbbrev(line.bird_type, line.bird_type_id, birdTypes)
    grouped.set(abbrev, (grouped.get(abbrev) || 0) + line.quantity)
  })
  return Array.from(grouped.entries())
    .map(([abbrev, qty]) => `${qty}${abbrev}`)
    .join(', ')
}

export function formatOrderLineDescription(line: SalesOrderLine, birdTypes?: BirdType[]): string {
  const name = line.bird_type?.name || birdTypes?.find((b) => b.id === line.bird_type_id)?.name || 'Bird'
  const grade = line.grade === 'second_class' ? '2nd Cls' : 'Good'
  return `${line.quantity} ${name} (${grade}) @ ${formatCurrency(line.rate_per_chick)}`
}

export function formatOrderStatusLabel(status: SalesOrder['status']): string {
  switch (status) {
    case 'paid':
      return 'Paid'
    case 'partial_payment':
      return 'Partial'
    case 'pending':
      return 'Unpaid'
    case 'confirmed':
      return 'Confirmed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

export function orderStatusEmoji(status: SalesOrder['status']): string {
  switch (status) {
    case 'paid':
      return '🟢'
    case 'partial_payment':
      return '🟡'
    case 'pending':
      return '🔴'
    default:
      return '⚪'
  }
}