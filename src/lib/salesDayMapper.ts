import type { SalesDay, SalesDayStatus, SalesSessionStock } from '@/types'

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

function parseStockNotes(notes: string | null | undefined): {
  egg_count_hatched: number | null
  discrepancy_note: string | null
} {
  if (!notes?.trim()) return { egg_count_hatched: null, discrepancy_note: null }
  const eggMatch = notes.match(/Eggs hatched:\s*(\d+)/i)
  const egg_count_hatched = eggMatch ? Number(eggMatch[1]) : null
  const discrepancy_note = notes
    .replace(/Eggs hatched:\s*\d+\s*(\|\s*)?/i, '')
    .trim() || null
  return { egg_count_hatched, discrepancy_note }
}

export function buildStockNotes(entry: {
  egg_count_hatched?: number | null
  discrepancy_note?: string | null
}): string | null {
  const parts: string[] = []
  if (entry.egg_count_hatched && entry.egg_count_hatched > 0) {
    parts.push(`Eggs hatched: ${entry.egg_count_hatched}`)
  }
  if (entry.discrepancy_note?.trim()) parts.push(entry.discrepancy_note.trim())
  return parts.length ? parts.join(' | ') : null
}

/** Map DB sales_session_stock row → app SalesSessionStock */
export function mapStockFromDb(row: Record<string, unknown>): SalesSessionStock {
  const notes = (row.notes as string) || null
  const parsed = parseStockNotes(notes)
  const birdType = row.bird_type as SalesSessionStock['bird_type']
  const supplier = row.supplier as SalesSessionStock['supplier']

  return {
    id: row.id as string,
    sales_day_id: row.sales_day_id as string,
    source_type: (row.source_type as SalesSessionStock['source_type']) || 'own_production',
    supplier_id: (row.supplier_id as string) || null,
    bird_type_id: row.bird_type_id as string,
    quantity_declared: Number(row.opening_quantity ?? row.quantity_declared ?? 0),
    supplier_rate_per_chick:
      row.source_type === 'supplier' ? Number(row.unit_cost ?? 0) || null : null,
    egg_count_hatched: parsed.egg_count_hatched,
    discrepancy_note: parsed.discrepancy_note,
    created_at: (row.created_at as string) || new Date().toISOString(),
    created_by: '',
    bird_type: birdType,
    supplier,
  }
}

/** Map app stock entry → DB insert payload (only valid columns) */
export function mapStockToDb(
  entry: Partial<SalesSessionStock> & { tenant_id: string }
): Record<string, unknown> {
  return {
    tenant_id: entry.tenant_id,
    sales_day_id: entry.sales_day_id,
    bird_type_id: entry.bird_type_id,
    source_type: entry.source_type || 'own_production',
    supplier_id: entry.source_type === 'supplier' ? entry.supplier_id : null,
    grade: 'standard',
    opening_quantity: entry.quantity_declared || 0,
    unit_cost: entry.source_type === 'supplier' ? entry.supplier_rate_per_chick ?? 0 : 0,
    unit_price: 0,
    notes: buildStockNotes(entry),
  }
}