import { useCallback, useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Users } from 'lucide-react'
import { Card, CardHeader, Table, Th, Td, Skeleton, EmptyState, Badge } from '@/components/ui'
import { getDebtorsLedger } from '@/lib/dataService'
import { useFlockDeskDataReload } from '@/hooks/useFlockDeskDataReload'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { DebtorRow } from '@/types'

type SortKey = keyof Pick<DebtorRow, 'customer_name' | 'total_invoiced' | 'total_paid' | 'balance' | 'days_outstanding' | 'last_payment_date'>
type SortDir = 'asc' | 'desc'

function getOutstandingColor(days: number, balance: number): 'green' | 'amber' | 'red' | 'neutral' {
  if (balance <= 0) return 'neutral'
  if (days <= 7) return 'green'
  if (days <= 30) return 'amber'
  return 'red'
}

const rowColors = {
  green: 'bg-green-50 dark:bg-green-900/10',
  amber: 'bg-amber-50 dark:bg-amber-900/10',
  red: 'bg-red-50 dark:bg-red-900/10',
  neutral: '',
}

const badgeVariants = {
  green: 'success' as const,
  amber: 'warning' as const,
  red: 'danger' as const,
  neutral: 'default' as const,
}

export function DebtorsLedger() {
  const [debtors, setDebtors] = useState<DebtorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('balance')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const loadDebtors = useCallback(() => {
    setLoading(true)
    getDebtorsLedger()
      .then(setDebtors)
      .finally(() => setLoading(false))
  }, [])

  useFlockDeskDataReload(loadDebtors, [loadDebtors])

  const sorted = useMemo(() => {
    return [...debtors].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(bVal as string)
        : (aVal as number) - (bVal as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [debtors, sortKey, sortDir])

  const totals = useMemo(() => ({
    invoiced: debtors.reduce((s, d) => s + d.total_invoiced, 0),
    paid: debtors.reduce((s, d) => s + d.total_paid, 0),
    balance: debtors.reduce((s, d) => s + d.balance, 0),
  }), [debtors])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 inline h-3 w-3" />
      : <ArrowDown className="ml-1 inline h-3 w-3" />
  }

  const SortableTh = ({ col, children, className }: { col: SortKey; children: React.ReactNode; className?: string }) => (
    <Th className={className}>
      <button type="button" onClick={() => toggleSort(col)} className="inline-flex items-center hover:text-slate-700">
        {children}
        <SortIcon col={col} />
      </button>
    </Th>
  )

  if (loading) {
    return (
      <Card>
        <CardHeader title="Debtors Ledger" subtitle="Loading customer balances..." />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  if (debtors.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No debtors"
          description="No customer invoices have been recorded yet."
        />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Debtors Ledger"
        subtitle={`${debtors.length} customers · Total outstanding: ${formatCurrency(totals.balance)}`}
        action={
          <div className="hidden gap-2 sm:flex">
            <Badge variant="success">≤7 days</Badge>
            <Badge variant="warning">8–30 days</Badge>
            <Badge variant="danger">&gt;30 days</Badge>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500">Total Invoiced</p>
          <p className="text-lg font-bold">{formatCurrency(totals.invoiced)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500">Total Collected</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totals.paid)}</p>
        </div>
        <div className="col-span-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50 sm:col-span-1">
          <p className="text-xs text-slate-500">Outstanding</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totals.balance)}</p>
        </div>
      </div>

      <Table>
        <thead>
          <tr>
            <SortableTh col="customer_name">Customer</SortableTh>
            <SortableTh col="total_invoiced" className="text-right">Invoiced</SortableTh>
            <SortableTh col="total_paid" className="text-right">Paid</SortableTh>
            <SortableTh col="balance" className="text-right">Balance</SortableTh>
            <SortableTh col="days_outstanding" className="text-right">Days Out.</SortableTh>
            <SortableTh col="last_payment_date">Last Payment</SortableTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {sorted.map((row) => {
            const color = getOutstandingColor(row.days_outstanding, row.balance)
            return (
              <tr key={row.customer_id} className={cn(rowColors[color])}>
                <Td className="font-medium">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    {row.customer_name}
                  </div>
                </Td>
                <Td className="text-right">{formatCurrency(row.total_invoiced)}</Td>
                <Td className="text-right text-green-600">{formatCurrency(row.total_paid)}</Td>
                <Td className="text-right font-semibold">{formatCurrency(row.balance)}</Td>
                <Td className="text-right">
                  {row.balance > 0 ? (
                    <Badge variant={badgeVariants[color]}>
                      {formatNumber(row.days_outstanding)} days
                    </Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </Td>
                <Td>{row.last_payment_date ? formatDate(row.last_payment_date) : '—'}</Td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-semibold dark:bg-slate-900">
            <Td>Totals</Td>
            <Td className="text-right">{formatCurrency(totals.invoiced)}</Td>
            <Td className="text-right">{formatCurrency(totals.paid)}</Td>
            <Td className="text-right">{formatCurrency(totals.balance)}</Td>
            <td colSpan={2} className="px-4 py-3" />
          </tr>
        </tfoot>
      </Table>
    </Card>
  )
}