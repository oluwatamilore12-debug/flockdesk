import type { SalesDay, SalesDayStatus } from '@/types'

/** Format a Date as YYYY-MM-DD in local timezone (avoids UTC off-by-one bugs). */
export function formatLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function mapSalesDayFromDb(row: Record<string, unknown>): SalesDay {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    date: String(row.sale_date || row.date || '').slice(0, 10),
    status: (row.status as SalesDayStatus) || 'open',
    total_birds_declared: Number(row.total_birds_declared ?? row.total_birds_sold ?? 0),
    total_birds_accounted: Number(row.total_birds_accounted ?? row.total_birds_sold ?? 0),
    is_balanced: Boolean(row.is_balanced),
    admin_override: Boolean(row.admin_override),
    override_reason: (row.override_reason as string) || null,
    closed_at: (row.closed_at as string) || null,
    closed_by: (row.closed_by as string) || null,
    created_at: (row.created_at as string) || new Date().toISOString(),
  }
}

export function getNextSalesDayDate(from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  for (let i = 0; i < 8; i++) {
    const day = d.getDay()
    if (day === 1 || day === 4) return formatLocalDateString(d)
    d.setDate(d.getDate() + 1)
  }
  return formatLocalDateString(from)
}

export function isValidSalesDayDateString(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  return day === 1 || day === 4
}