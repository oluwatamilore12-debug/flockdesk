import { useCallback, useState } from 'react'
import { Truck, CheckCircle } from 'lucide-react'
import {
  Card, CardHeader, Table, Th, Td, Skeleton, EmptyState,
  Badge, Button, Modal,
} from '@/components/ui'
import { getSupplierInvoices, confirmSupplierPayment } from '@/lib/dataService'
import { useFlockDeskDataReload } from '@/hooks/useFlockDeskDataReload'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import type { SupplierInvoice } from '@/types'
import toast from 'react-hot-toast'

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'danger',
}

export function SupplierPayables() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  const loadInvoices = useCallback(() => {
    setLoading(true)
    getSupplierInvoices()
      .then(setInvoices)
      .finally(() => setLoading(false))
  }, [])

  useFlockDeskDataReload(loadInvoices, [loadInvoices])

  const filtered = invoices.filter((inv) => {
    if (filter === 'unpaid') return inv.payment_status !== 'paid'
    if (filter === 'paid') return inv.payment_status === 'paid'
    return true
  })

  const totalPayable = invoices
    .filter((i) => i.payment_status !== 'paid')
    .reduce((s, i) => s + i.balance, 0)

  const handleMarkPaid = async () => {
    if (!confirmId) return
    setMarking(true)
    try {
      const result = await confirmSupplierPayment(confirmId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === confirmId
            ? {
                ...inv,
                payment_status: 'paid' as const,
                amount_paid: inv.total_amount,
                balance: 0,
                payment_confirmed_at: new Date().toISOString(),
              }
            : inv
        )
      )
      toast.success('Supplier invoice marked as paid')
      setConfirmId(null)
    } catch {
      toast.error('Failed to update invoice')
    } finally {
      setMarking(false)
    }
  }

  const selectedInvoice = invoices.find((i) => i.id === confirmId)

  if (loading) {
    return (
      <Card>
        <CardHeader title="Supplier Payables" subtitle="Loading invoices..." />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No supplier invoices"
          description="Supplier invoices will appear here when stock is received from suppliers."
        />
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Supplier Payables"
          subtitle={`${filtered.length} invoices · Outstanding: ${formatCurrency(totalPayable)}`}
          action={
            <div className="flex gap-1 rounded-lg border p-1 text-xs">
              {(['all', 'unpaid', 'paid'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-2 py-1 capitalize transition-colors ${
                    filter === f
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        />

        <Table>
          <thead>
            <tr>
              <Th>Invoice #</Th>
              <Th>Supplier</Th>
              <Th>Bird Type</Th>
              <Th className="text-right">Qty</Th>
              <Th className="text-right">Rate</Th>
              <Th className="text-right">Total</Th>
              <Th>Status</Th>
              <Th>Date</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {filtered.map((inv) => (
              <tr key={inv.id}>
                <Td className="font-medium">{inv.invoice_number}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-400" />
                    {inv.supplier?.name || '—'}
                  </div>
                </Td>
                <Td>{inv.bird_type?.name || '—'}</Td>
                <Td className="text-right">{formatNumber(inv.quantity)}</Td>
                <Td className="text-right">{formatCurrency(inv.rate_per_chick)}</Td>
                <Td className="text-right font-semibold">{formatCurrency(inv.total_amount)}</Td>
                <Td>
                  <Badge variant={statusVariant[inv.payment_status]}>
                    {inv.payment_status}
                  </Badge>
                </Td>
                <Td>{formatDate(inv.invoice_date)}</Td>
                <Td>
                  {inv.payment_status !== 'paid' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmId(inv.id)}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Mark Paid
                    </Button>
                  ) : (
                    <span className="text-xs text-green-600">Paid</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No invoices match this filter.</p>
        )}
      </Card>

      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Confirm Supplier Payment"
        size="sm"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Mark invoice <strong>{selectedInvoice.invoice_number}</strong> from{' '}
              <strong>{selectedInvoice.supplier?.name}</strong> as fully paid?
            </p>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
              <p className="text-sm text-slate-500">Amount</p>
              <p className="text-xl font-bold">{formatCurrency(selectedInvoice.total_amount)}</p>
              <p className="mt-1 text-xs text-slate-400">
                {formatNumber(selectedInvoice.quantity)} {selectedInvoice.bird_type?.name} @{' '}
                {formatCurrency(selectedInvoice.rate_per_chick)}/chick
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Button>
              <Button loading={marking} onClick={handleMarkPaid}>
                <CheckCircle className="h-4 w-4" />
                Confirm Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}