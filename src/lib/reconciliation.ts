import type { ReconciliationRow, SalesSessionStock, SalesOrderLine, BirdDisposition } from '@/types'

export function getAccountedForRow(
  row: Pick<ReconciliationRow, 'good_sold' | 'second_class_sold' | 'rejects' | 'mortality' | 'farm_transfer'>
): number {
  return row.good_sold + row.second_class_sold + row.rejects + row.mortality + row.farm_transfer
}

export function getSessionBirdTotals(rows: ReconciliationRow[]) {
  const declared = rows.reduce((s, r) => s + r.declared, 0)
  const accounted = rows.reduce((s, r) => s + getAccountedForRow(r), 0)
  const onGround = rows.reduce((s, r) => s + r.balance, 0)
  const oversold = rows.reduce((s, r) => s + r.oversold, 0)
  return { declared, accounted, onGround, oversold }
}

export function getOnGroundForBirdType(rows: ReconciliationRow[], birdTypeId: string): number {
  const row = rows.find((r) => r.bird_type_id === birdTypeId)
  return row ? row.balance : 0
}

export function computeReconciliation(
  birdTypes: { id: string; name: string }[],
  stock: SalesSessionStock[],
  orderLines: SalesOrderLine[],
  dispositions: BirdDisposition[]
): ReconciliationRow[] {
  return birdTypes.map((bt) => {
    const declared = stock
      .filter((s) => s.bird_type_id === bt.id)
      .reduce((sum, s) => sum + s.quantity_declared, 0)

    const good_sold = orderLines
      .filter((l) => l.bird_type_id === bt.id && l.grade === 'good')
      .reduce((sum, l) => sum + l.quantity, 0)

    const second_class_sold = orderLines
      .filter((l) => l.bird_type_id === bt.id && l.grade === 'second_class')
      .reduce((sum, l) => sum + l.quantity, 0)

    const rejects = dispositions
      .filter((d) => d.bird_type_id === bt.id && d.disposition_type === 'reject')
      .reduce((sum, d) => sum + d.quantity, 0)

    const mortality = dispositions
      .filter((d) => d.bird_type_id === bt.id && d.disposition_type === 'mortality')
      .reduce((sum, d) => sum + d.quantity, 0)

    const farm_transfer = dispositions
      .filter((d) => d.bird_type_id === bt.id && d.disposition_type === 'farm_transfer')
      .reduce((sum, d) => sum + d.quantity, 0)

    const accounted = good_sold + second_class_sold + rejects + mortality + farm_transfer
    const rawBalance = declared - accounted
    const balance = Math.max(0, rawBalance)
    const oversold = Math.max(0, -rawBalance)

    return {
      bird_type_id: bt.id,
      bird_type_name: bt.name,
      declared,
      good_sold,
      second_class_sold,
      rejects,
      mortality,
      farm_transfer,
      balance,
      oversold,
      is_balanced: declared > 0 && rawBalance === 0,
    }
  }).filter((r) => r.declared > 0 || r.good_sold > 0 || r.second_class_sold > 0)
}

export function isFullyBalanced(rows: ReconciliationRow[]): boolean {
  return rows.length > 0 && rows.every((r) => r.is_balanced)
}