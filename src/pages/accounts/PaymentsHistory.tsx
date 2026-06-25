import { useCallback, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card, CardHeader, Table, Th, Td, Skeleton, EmptyState, Select, Input } from '@/components/ui'
import { DateRangeFilter } from '@/components/shared/DateRangeFilter'
import { OrderDetailDrawer } from '@/components/shared/OrderDetailDrawer'
import { getPayments, getAllOrders, getCustomers } from '@/lib/dataService'
import { useFlockDeskDataReload } from '@/hooks/useFlockDeskDataReload'
import { formatCurrency, formatDate } from '@/lib/utils'
import { isDateInRange, resolveDateRange, type DateRangePreset } from '@/lib/dateFilters'
import type { CustomerPayment, SalesOrder, Customer } from '@/types'

export function PaymentsHistory() {
  const [payments, setPayments] = useState<CustomerPayment[]>([])
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<DateRangePreset>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [refSearch, setRefSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getPayments(), getAllOrders(), getCustomers()])
      .then(([p, o, c]) => {
        setPayments(p.filter((pay) => pay.status === 'confirmed'))
        setOrders(o)
        setCustomers(c)
      })
      .finally(() => setLoading(false))
  }, [])

  useFlockDeskDataReload(load, [load])

  const range = resolveDateRange(preset, customStart, customEnd)

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (!isDateInRange(p.payment_date, range)) return false
      if (customerFilter && p.customer_id !== customerFilter) return false
      if (methodFilter && p.payment_method !== methodFilter) return false
      if (refSearch && !(p.bank_reference || '').toLowerCase().includes(refSearch.toLowerCase())) return false
      return true
    })
  }, [payments, range, customerFilter, methodFilter, refSearch])

  const periodTotal = filtered.reduce((s, p) => s + p.amount, 0)

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || '—'
  const orderNumber = (id: string) => orders.find((o) => o.id === id)?.order_number || '—'

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Payments History" subtitle={`Period total: ${formatCurrency(periodTotal)}`} />
        <div className="space-y-3">
          <DateRangeFilter
            value={preset}
            onChange={setPreset}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={(s, e) => {
              setCustomStart(s)
              setCustomEnd(e)
            }}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Customer" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
              <option value="">All customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select label="Method" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="">All methods</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="pos">POS</option>
              <option value="cheque">Cheque</option>
              <option value="paystack">Paystack</option>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-9 h-4 w-4 text-[#10259C]" />
              <Input
                label="Bank reference"
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                placeholder="Search TRF-..."
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No payments found" description="Adjust filters or confirm payments from the queue." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th bgColor="#001996">Date</Th>
              <Th bgColor="#001996">Customer</Th>
              <Th bgColor="#001996">Order #</Th>
              <Th bgColor="#001996">Amount</Th>
              <Th bgColor="#001996">Method</Th>
              <Th bgColor="#001996">Reference</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer hover:bg-[#F0F2FA]"
                onClick={() => setSelectedOrder(orders.find((o) => o.id === p.order_id) || null)}
              >
                <Td>{formatDate(p.payment_date)}</Td>
                <Td className="font-medium">{customerName(p.customer_id)}</Td>
                <Td className="font-mono">{orderNumber(p.order_id)}</Td>
                <Td className="font-mono font-semibold">{formatCurrency(p.amount)}</Td>
                <Td className="capitalize">{p.payment_method.replace('_', ' ')}</Td>
                <Td className="font-mono text-xs">{p.bank_reference || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <OrderDetailDrawer order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  )
}