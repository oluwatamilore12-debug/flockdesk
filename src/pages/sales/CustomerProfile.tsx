import { useEffect, useMemo, useState } from 'react'
import { User, Phone, Mail, Building2, CreditCard, ShoppingBag, TrendingUp } from 'lucide-react'
import { format, getWeek, getYear, parseISO } from 'date-fns'
import {
  Modal, Badge, Skeleton, EmptyState, Table, Th, Td,
} from '@/components/ui'
import { AnimatedStatCard } from '@/components/shared/AnimatedStatCard'
import { DateRangeFilter } from '@/components/shared/DateRangeFilter'
import { getAllOrders, getPayments, getBirdTypes } from '@/lib/dataService'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { canViewCustomerPaymentHistory } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import { isDateInRange, resolveDateRange, type DateRangePreset } from '@/lib/dateFilters'
import type { Customer, SalesOrder, CustomerPayment, BirdType } from '@/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface Props {
  customer: Customer | null
  open: boolean
  onClose: () => void
  showPaymentHistory?: boolean
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  partial_payment: 'warning',
  paid: 'success',
  cancelled: 'danger',
}

const CHART_COLORS = ['#001996', '#FF052E', '#10259C', '#000000', '#F0F2FA']

export function CustomerProfile({ customer, open, onClose, showPaymentHistory: showPaymentHistoryProp }: Props) {
  const { profile } = useAuthStore()
  const showPaymentHistory = showPaymentHistoryProp ?? canViewCustomerPaymentHistory(profile?.role)

  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [payments, setPayments] = useState<CustomerPayment[]>([])
  const [birdTypes, setBirdTypes] = useState<BirdType[]>([])
  const [loading, setLoading] = useState(false)
  const [preset, setPreset] = useState<DateRangePreset>('all_time')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    if (!open || !customer) return

    let cancelled = false
    setLoading(true)

    Promise.all([
      getAllOrders(),
      showPaymentHistory ? getPayments() : Promise.resolve([] as CustomerPayment[]),
      getBirdTypes(),
    ])
      .then(([allOrders, allPayments, types]) => {
        if (cancelled) return
        setOrders(allOrders.filter((o) => o.customer_id === customer.id))
        setPayments(allPayments.filter((p) => p.customer_id === customer.id))
        setBirdTypes(types)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, customer, showPaymentHistory])

  const dateRange = useMemo(
    () => resolveDateRange(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  )

  const filteredOrders = useMemo(
    () => orders.filter((o) => isDateInRange(o.order_date, dateRange)),
    [orders, dateRange]
  )

  const filteredPayments = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'confirmed')
        .filter((p) => isDateInRange(p.payment_date, dateRange)),
    [payments, dateRange]
  )

  const birdTypeMap = useMemo(
    () => Object.fromEntries(birdTypes.map((b) => [b.id, b.name])),
    [birdTypes]
  )

  const totalInvoiced = filteredOrders.reduce((s, o) => s + o.total_amount, 0)
  const totalPaid = filteredPayments.reduce((s, p) => s + p.amount, 0)
  const balance = totalInvoiced - totalPaid
  const totalBirds = filteredOrders.reduce(
    (s, o) => s + (o.lines?.reduce((ls, l) => ls + l.quantity, 0) || 0),
    0
  )

  const birdPreference = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredOrders.forEach((o) => {
      o.lines?.forEach((l) => {
        const name = birdTypeMap[l.bird_type_id] || 'Unknown'
        counts[name] = (counts[name] || 0) + l.quantity
      })
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredOrders, birdTypeMap])

  const rateHistory = useMemo(() => {
    const entries: { date: string; birdType: string; grade: string; rate: number; qty: number }[] = []
    filteredOrders.forEach((o) => {
      o.lines?.forEach((l) => {
        entries.push({
          date: o.order_date,
          birdType: birdTypeMap[l.bird_type_id] || 'Unknown',
          grade: l.grade === 'good' ? 'Good' : '2nd Cls',
          rate: l.rate_per_chick,
          qty: l.quantity,
        })
      })
    })
    return entries.sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredOrders, birdTypeMap])

  const purchaseByWeek = useMemo(() => {
    const weeks: Record<string, { label: string; orders: SalesOrder[] }> = {}
    filteredOrders.forEach((o) => {
      const d = parseISO(o.order_date.includes('T') ? o.order_date : o.order_date + 'T12:00:00')
      const key = `${getYear(d)}-W${getWeek(d, { weekStartsOn: 1 })}`
      if (!weeks[key]) {
        weeks[key] = { label: `Week ${getWeek(d, { weekStartsOn: 1 })} (${format(d, 'MMM d')} – …)`, orders: [] }
      }
      weeks[key].orders.push(o)
    })
    return Object.entries(weeks)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, v]) => v)
  }, [filteredOrders])

  const paymentBehaviour = useMemo(() => {
    if (!showPaymentHistory || filteredPayments.length === 0) return null
    const methods: Record<string, number> = {}
    filteredPayments.forEach((p) => {
      const m = p.payment_method.replace('_', ' ')
      methods[m] = (methods[m] || 0) + 1
    })
    const topMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    const onTime = filteredOrders.filter((o) => o.status === 'paid').length
    const onTimePct = filteredOrders.length ? Math.round((onTime / filteredOrders.length) * 100) : 0
    return { topMethod, onTimePct, count: filteredPayments.length }
  }, [showPaymentHistory, filteredPayments, filteredOrders])

  if (!customer) return null

  return (
    <Modal open={open} onClose={onClose} title="Customer Profile" size="xl">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F0F2FA] text-[#10259C]">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#000000]">{customer.name}</h3>
              {customer.business_name && (
                <p className="flex items-center gap-1 text-sm text-[#10259C]">
                  <Building2 className="h-3.5 w-3.5" />
                  {customer.business_name}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-[#10259C]">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <Badge variant="info">{customer.customer_type.replace('_', ' ')}</Badge>
              </div>
            </div>
          </div>
        </div>

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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatedStatCard title="Total Orders" value={loading ? 0 : filteredOrders.length} icon={<ShoppingBag className="h-5 w-5" />} />
          <AnimatedStatCard title="Total Bought" value={loading ? 0 : totalInvoiced} isCurrency icon={<TrendingUp className="h-5 w-5" />} />
          {showPaymentHistory && (
            <>
              <AnimatedStatCard title="Total Paid" value={loading ? 0 : totalPaid} isCurrency icon={<CreditCard className="h-5 w-5" />} />
              <AnimatedStatCard
                title="Outstanding"
                value={loading ? 0 : Math.max(0, balance)}
                isCurrency
                icon={<CreditCard className="h-5 w-5" />}
                subtitle={balance > 0 ? 'Outstanding balance' : 'Fully settled'}
              />
            </>
          )}
          {!showPaymentHistory && (
            <AnimatedStatCard title="Birds Purchased" value={loading ? 0 : totalBirds} icon={<ShoppingBag className="h-5 w-5" />} />
          )}
        </div>

        {customer.credit_limit > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-[#F0F2FA] px-4 py-2 text-sm">
            <CreditCard className="h-4 w-4 text-[#10259C]" />
            <span className="text-[#10259C]">Credit limit:</span>
            <span className="font-medium text-[#000000]">{formatCurrency(customer.credit_limit)}</span>
          </div>
        )}

        {birdPreference.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-[#000000]">Bird Type Preference</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={birdPreference} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                    {birdPreference.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatNumber(Number(v ?? 0))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#000000]">
            <ShoppingBag className="h-4 w-4" />
            Purchase History
          </h4>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : purchaseByWeek.length === 0 ? (
            <EmptyState title="No orders in this period" description="Try a wider date range or check back after the next sale." />
          ) : (
            <div className="space-y-4">
              {purchaseByWeek.map((week) => (
                <div key={week.label} className="rounded-xl border border-[#F0F2FA] bg-[#F0F2FA] p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#10259C]">{week.label}</p>
                  {week.orders.map((order) => {
                    const lineSummary = order.lines
                      ?.map((l) => {
                        const name = birdTypeMap[l.bird_type_id] || '?'
                        const grade = l.grade === 'good' ? 'Good' : '2nd Cls'
                        return `${l.quantity} ${name} (${grade}) @ ${formatCurrency(l.rate_per_chick)}`
                      })
                      .join(' + ')
                    return (
                      <div key={order.id} className="border-b border-[#F0F2FA] py-2 last:border-0">
                        <p className="text-sm font-medium text-[#000000]">
                          {formatDate(order.order_date)}: {lineSummary || '—'} = {formatCurrency(order.total_amount)}
                        </p>
                        {showPaymentHistory && (
                          <p className="text-xs text-[#10259C]">
                            Paid: {formatCurrency(order.amount_paid)}
                            {order.balance > 0 ? ` | Balance: ${formatCurrency(order.balance)}` : ' | ✅ Fully paid'}
                          </p>
                        )}
                        {!showPaymentHistory && (
                          <p className="text-xs text-[#10259C]">
                            Status: {order.status.replace('_', ' ')}
                            {order.amount_paid > 0 && ` · ${formatCurrency(order.amount_paid)} paid`}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {rateHistory.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-[#000000]">Rate History</h4>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Bird Type</Th>
                  <Th>Grade</Th>
                  <Th>Rate/Bird</Th>
                  <Th>Qty</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2FA]">
                {rateHistory.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <Td>{formatDate(r.date)}</Td>
                    <Td>{r.birdType}</Td>
                    <Td>{r.grade}</Td>
                    <Td>{formatCurrency(r.rate)}</Td>
                    <Td>{r.qty}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {showPaymentHistory && (
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#000000]">
              <CreditCard className="h-4 w-4" />
              Payment History
            </h4>
            {paymentBehaviour && (
              <div className="mb-4 grid gap-2 rounded-xl bg-[#F0F2FA] p-3 text-sm sm:grid-cols-3">
                <p className="text-[#10259C]">
                  On-time: <span className="font-semibold text-[#000000]">{paymentBehaviour.onTimePct}%</span>
                </p>
                <p className="text-[#10259C]">
                  Payments: <span className="font-semibold text-[#000000]">{paymentBehaviour.count}</span>
                </p>
                <p className="text-[#10259C]">
                  Method: <span className="font-semibold capitalize text-[#000000]">{paymentBehaviour.topMethod}</span>
                </p>
              </div>
            )}
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : filteredPayments.length === 0 ? (
              <EmptyState title="No payments in this period" description="Confirmed payments will appear here when recorded by Accounts." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Amount</Th>
                    <Th>Method</Th>
                    <Th>Reference</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2FA]">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <Td>{formatDate(payment.payment_date)}</Td>
                      <Td className="font-medium text-[#059669]">{formatCurrency(payment.amount)}</Td>
                      <Td className="capitalize">{payment.payment_method.replace('_', ' ')}</Td>
                      <Td className="text-[#10259C]">{payment.bank_reference || '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        )}

        <div>
          <h4 className="mb-3 text-sm font-semibold text-[#000000]">All Orders</h4>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : filteredOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="This customer has no order history on record." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Order #</Th>
                  <Th>Date</Th>
                  <Th>Amount</Th>
                  <Th>Paid</Th>
                  <Th>Balance</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2FA]">
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <Td className="font-medium">{order.order_number}</Td>
                    <Td>{formatDate(order.order_date)}</Td>
                    <Td>{formatCurrency(order.total_amount)}</Td>
                    <Td>{formatCurrency(order.amount_paid)}</Td>
                    <Td className={cn(order.balance > 0 && 'font-medium text-[#FF052E]')}>
                      {formatCurrency(order.balance)}
                    </Td>
                    <Td>
                      <Badge variant={statusVariant[order.status] || 'default'}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </Modal>
  )
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-NG')
}