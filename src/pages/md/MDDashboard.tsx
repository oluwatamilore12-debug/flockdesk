import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  TrendingUp, ShoppingBag, Bird, Users, Truck, Wallet,
  AlertTriangle, XCircle, Skull,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  Card, CardHeader, Skeleton, EmptyState, Badge, Table, Th, Td,
} from '@/components/ui'
import { PageWrapper, staggerContainer } from '@/components/shared/PageWrapper'
import { DepartmentBanner } from '@/components/shared/DepartmentBanner'
import { AnimatedStatCard } from '@/components/shared/AnimatedStatCard'
import { ProgressBar } from '@/components/shared/ProgressBar'

import {
  getAllOrders, getDebtorsLedger, getSupplierInvoices, getSalesByItem,
  getSalesDays, getOpenSalesDay, getDispositions, getReconciliation,
} from '@/lib/dataService'
import { useFlockDeskDataReload } from '@/hooks/useFlockDeskDataReload'
import { formatCurrency, formatNumber, formatDate, cn } from '@/lib/utils'
import type { SalesOrder, DebtorRow, SupplierInvoice, SalesByItemRow, SalesDay } from '@/types'

const CHART_COLORS = ['#001996', '#FF052E', '#10259C', '#000000', '#F0F2FA', '#1A3BB0']
const chartTooltipStyle = { background: '#000000', color: '#FFFFFF', border: '1px solid #001996', borderRadius: 8 }

interface Alert {
  id: string
  type: 'danger' | 'warning' | 'info'
  title: string
  message: string
}

const DAILY_TARGET = 500000

export function MDDashboard() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [debtors, setDebtors] = useState<DebtorRow[]>([])
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [salesByItem, setSalesByItem] = useState<SalesByItemRow[]>([])
  const [salesDays, setSalesDays] = useState<SalesDay[]>([])
  const [dispositionData, setDispositionData] = useState<{ name: string; reject: number; mortality: number; farm_transfer: number }[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [orderData, debtorData, invoiceData, itemData, daysData, openDay] = await Promise.all([
        getAllOrders(),
        getDebtorsLedger(),
        getSupplierInvoices(),
        getSalesByItem(),
        getSalesDays(30),
        getOpenSalesDay(),
      ])
      setOrders(orderData)
      setDebtors(debtorData)
      setInvoices(invoiceData)
      setSalesByItem(itemData)
      setSalesDays(daysData)

      if (openDay) {
        const [dispositions, reconciliation] = await Promise.all([
          getDispositions(openDay.id),
          getReconciliation(openDay.id),
        ])
        const chartData = reconciliation.map((row) => ({
          name: row.bird_type_name,
          reject: row.rejects,
          mortality: row.mortality,
          farm_transfer: row.farm_transfer,
        }))
        if (chartData.length === 0 && dispositions.length > 0) {
          const grouped = dispositions.reduce<Record<string, { reject: number; mortality: number; farm_transfer: number }>>((acc, d) => {
            const name = d.bird_type?.name || 'Unknown'
            if (!acc[name]) acc[name] = { reject: 0, mortality: 0, farm_transfer: 0 }
            if (d.disposition_type === 'reject') acc[name].reject += d.quantity
            else if (d.disposition_type === 'mortality') acc[name].mortality += d.quantity
            else acc[name].farm_transfer += d.quantity
            return acc
          }, {})
          setDispositionData(Object.entries(grouped).map(([name, v]) => ({ name, ...v })))
        } else {
          setDispositionData(chartData)
        }
      } else {
        setDispositionData([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useFlockDeskDataReload(() => load(true), [load])

  const metrics = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + o.total_amount, 0)
    const birdsSold = salesByItem.reduce((s, r) => s + r.quantity, 0)
    const totalDebtors = debtors.reduce((s, d) => s + d.balance, 0)
    const supplierPayables = invoices
      .filter((i) => i.payment_status !== 'paid')
      .reduce((s, i) => s + i.balance, 0)
    const totalCogs = salesByItem.reduce((s, r) => s + r.cogs, 0)
    const netRevenue = revenue - totalCogs
    return { revenue, orderCount: orders.length, birdsSold, totalDebtors, supplierPayables, netRevenue }
  }, [orders, debtors, invoices, salesByItem])

  const revenueTrend = useMemo(() => {
    const byDate: Record<string, number> = {}
    orders.forEach((o) => {
      const date = o.order_date.slice(0, 10)
      byDate[date] = (byDate[date] || 0) + o.total_amount
    })
    salesDays.forEach((d) => {
      if (!byDate[d.date]) byDate[d.date] = 0
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({
        date: formatDate(date),
        revenue,
        shortDate: date.slice(5),
      }))
  }, [orders, salesDays])

  const salesMix = useMemo(() =>
    salesByItem.map((r) => ({
      name: r.bird_type_name,
      value: r.amount,
      percent: r.sales_percent,
    })),
    [salesByItem]
  )

  const customerRankings = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; orders: number; birds: number }> = {}
    orders.forEach((o) => {
      const name = o.customer?.name || 'Unknown'
      if (!map[o.customer_id]) map[o.customer_id] = { name, revenue: 0, orders: 0, birds: 0 }
      map[o.customer_id].revenue += o.total_amount
      map[o.customer_id].orders += 1
      map[o.customer_id].birds += (o.lines || []).reduce((s, l) => s + l.quantity, 0)
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [orders])

  const supplierSpend = useMemo(() => {
    const map: Record<string, { name: string; total: number; unpaid: number; invoices: number }> = {}
    invoices.forEach((inv) => {
      const name = inv.supplier?.name || 'Unknown'
      if (!map[inv.supplier_id]) map[inv.supplier_id] = { name, total: 0, unpaid: 0, invoices: 0 }
      map[inv.supplier_id].total += inv.total_amount
      map[inv.supplier_id].unpaid += inv.balance
      map[inv.supplier_id].invoices += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [invoices])

  const alerts = useMemo((): Alert[] => {
    const items: Alert[] = []

    salesDays
      .filter((d) => d.status !== 'closed' && d.total_birds_declared > 0)
      .forEach((d) => {
        const unaccounted = Math.max(0, d.total_birds_declared - d.total_birds_accounted)
        if (unaccounted > 0) {
          items.push({
            id: `unbalanced-${d.id}`,
            type: 'danger',
            title: 'Unbalanced Session',
            message: `Sales day ${formatDate(d.date)} has ${formatNumber(unaccounted)} unaccounted birds.`,
          })
        }
      })

    debtors
      .filter((d) => d.balance > 0 && d.days_outstanding > 30)
      .forEach((d) => {
        items.push({
          id: `overdue-${d.customer_id}`,
          type: 'warning',
          title: 'Overdue Payment',
          message: `${d.customer_name} owes ${formatCurrency(d.balance)} (${d.days_outstanding} days outstanding).`,
        })
      })

    dispositionData.forEach((d) => {
      const total = d.reject + d.mortality + d.farm_transfer
      if (d.mortality >= 10) {
        items.push({
          id: `mortality-${d.name}`,
          type: 'warning',
          title: 'High Mortality',
          message: `${d.name}: ${formatNumber(d.mortality)} mortality recorded (${formatNumber(total)} total dispositions).`,
        })
      }
    })

    if (metrics.supplierPayables > 100000) {
      items.push({
        id: 'supplier-payables',
        type: 'info',
        title: 'Supplier Payables',
        message: `Total outstanding supplier payables: ${formatCurrency(metrics.supplierPayables)}.`,
      })
    }

    return items
  }, [salesDays, debtors, dispositionData, metrics.supplierPayables])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  const todayRevenue = orders
    .filter((o) => o.order_date.startsWith(new Date().toISOString().slice(0, 10)))
    .reduce((s, o) => s + o.total_amount, 0)

  return (
    <PageWrapper className="space-y-6">
      <DepartmentBanner
        subtitle={`Revenue MTD: ${formatCurrency(metrics.revenue)} · Birds: ${formatNumber(metrics.birdsSold)}`}
        progressLabel="Today's Revenue Target"
        progressValue={todayRevenue}
        progressMax={DAILY_TARGET}
        progressSublabel={`Target: ${formatCurrency(DAILY_TARGET)}`}
      />

      <Card className="border-[#10259C] bg-[#000D4D] p-4">
        <ProgressBar
          label="Daily Sales Target"
          value={todayRevenue}
          max={DAILY_TARGET}
          variant="target"
          sublabel={`${formatCurrency(todayRevenue)} of ${formatCurrency(DAILY_TARGET)}`}
        />
      </Card>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="stats-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <AnimatedStatCard title="Revenue" value={metrics.revenue} isCurrency icon={<TrendingUp className="h-5 w-5" />} />
        <AnimatedStatCard title="Orders" value={metrics.orderCount} icon={<ShoppingBag className="h-5 w-5" />} />
        <AnimatedStatCard title="Birds Sold" value={metrics.birdsSold} icon={<Bird className="h-5 w-5" />} />
        <AnimatedStatCard title="Debtors" value={metrics.totalDebtors} isCurrency subtitle={`${debtors.filter((d) => d.balance > 0).length} with balance`} icon={<Users className="h-5 w-5" />} />
        <AnimatedStatCard title="Supplier Payables" value={metrics.supplierPayables} isCurrency icon={<Truck className="h-5 w-5" />} />
        <AnimatedStatCard title="Net Revenue" value={metrics.netRevenue} isCurrency subtitle="After COGS" trend={{ value: `${((metrics.netRevenue / (metrics.revenue || 1)) * 100).toFixed(0)}% margin`, positive: metrics.netRevenue > 0 }} icon={<Wallet className="h-5 w-5" />} />
      </motion.div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader title="Alerts" subtitle={`${alerts.length} items require attention`} />
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg p-3 text-sm',
                  alert.type === 'danger' && 'bg-red-50 dark:bg-red-900/20',
                  alert.type === 'warning' && 'bg-amber-50 dark:bg-amber-900/20',
                  alert.type === 'info' && 'bg-blue-50 dark:bg-blue-900/20',
                )}
              >
                {alert.type === 'danger' ? (
                  <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                ) : alert.type === 'warning' ? (
                  <Skull className="h-5 w-5 shrink-0 text-amber-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-blue-500" />
                )}
                <div>
                  <p className="font-semibold text-[#000000]">{alert.title}</p>
                  <p className="text-[#001996]">{alert.message}</p>
                </div>
                <div className="ml-auto shrink-0">
                  <Badge variant={alert.type === 'danger' ? 'danger' : alert.type === 'warning' ? 'warning' : 'info'}>
                    {alert.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue Trend" subtitle="Sales revenue by session date" />
          {revenueTrend.length === 0 ? (
            <EmptyState title="No revenue data" description="Revenue trend will appear as orders are recorded." />
          ) : (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Sales Mix" subtitle="Revenue distribution by bird type" />
          {salesMix.length === 0 ? (
            <EmptyState title="No sales mix data" description="Sales mix chart will populate with order data." />
          ) : (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesMix}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="75%"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {salesMix.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={chartTooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Customer Rankings" subtitle="Top customers by revenue" />
          {customerRankings.length === 0 ? (
            <EmptyState title="No customers" description="Customer rankings will appear with sales orders." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Customer</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right">Birds</Th>
                  <Th className="text-right">Revenue</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {customerRankings.map((c, i) => (
                  <tr key={c.name}>
                    <Td>
                      <span className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                        i === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      )}>
                        {i + 1}
                      </span>
                    </Td>
                    <Td className="font-medium">{c.name}</Td>
                    <Td className="text-right">{c.orders}</Td>
                    <Td className="text-right">{formatNumber(c.birds)}</Td>
                    <Td className="text-right font-semibold">{formatCurrency(c.revenue)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Supplier Spend Analysis" subtitle="Spend and outstanding by supplier" />
          {supplierSpend.length === 0 ? (
            <EmptyState title="No supplier data" description="Supplier spend will appear with invoices." />
          ) : (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierSpend} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Bar dataKey="total" name="Total Spend" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="unpaid" name="Outstanding" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Bird Disposition Chart */}
      <Card>
        <CardHeader title="Bird Disposition" subtitle="Rejects, mortality &amp; farm transfers by bird type" />
        {dispositionData.length === 0 ? (
          <EmptyState title="No disposition data" description="Disposition data will appear for open sales sessions." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dispositionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="reject" name="Rejects" stackId="a" fill="#f59e0b" />
                <Bar dataKey="mortality" name="Mortality" stackId="a" fill="#ef4444" />
                <Bar dataKey="farm_transfer" name="Farm Transfer" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </PageWrapper>
  )
}