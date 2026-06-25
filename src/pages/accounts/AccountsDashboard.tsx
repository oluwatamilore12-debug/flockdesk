import { useCallback, useEffect, useState } from 'react'
import {
  ClipboardList, Users, Truck, BarChart3, Search, RefreshCw,
  Eye, CreditCard, Building2, UserCircle, PieChart,
} from 'lucide-react'
import { Card, Badge, Skeleton, EmptyState, Button } from '@/components/ui'
import { PageWrapper } from '@/components/shared/PageWrapper'
import { DepartmentBanner } from '@/components/shared/DepartmentBanner'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { AnimatedStatCard } from '@/components/shared/AnimatedStatCard'
import { OrderDetailDrawer } from '@/components/shared/OrderDetailDrawer'
import { useGlobalSearchHandler } from '@/components/shared/GlobalSearch'
import { CustomerProfile } from '@/pages/sales/CustomerProfile'
import { useDepartment } from '@/context/DepartmentContext'
import { getAllOrders, getSupplierInvoices, getDebtorsLedger, getCustomers } from '@/lib/dataService'
import { useFlockDeskDataReload } from '@/hooks/useFlockDeskDataReload'
import { formatCurrency } from '@/lib/utils'
import { formatOrderBirdsSummary } from '@/lib/orderFormat'
import { cn } from '@/lib/utils'
import type { Customer, SalesOrder } from '@/types'
import { PaymentConfirmation } from './PaymentConfirmation'
import { DebtorsLedger } from './DebtorsLedger'
import { SupplierPayables } from './SupplierPayables'
import { SalesByItemReport } from './SalesByItemReport'
import { SalesOverview } from './SalesOverview'
import { PaymentsHistory } from './PaymentsHistory'
import { CustomersTab } from './CustomersTab'
import { SupplierCentre } from './SupplierCentre'
import { ARAgingDashboard } from './ARAgingDashboard'

type Tab =
  | 'overview'
  | 'sales'
  | 'payments'
  | 'customers'
  | 'debtors'
  | 'aging'
  | 'suppliers'
  | 'payables'
  | 'reports'

const tabs: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'overview', label: 'Payment Queue', icon: ClipboardList },
  { id: 'sales', label: 'Sales Overview', icon: Eye },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'customers', label: 'Customers', icon: UserCircle },
  { id: 'debtors', label: 'Debtors', icon: Users },
  { id: 'aging', label: 'AR Aging', icon: PieChart },
  { id: 'suppliers', label: 'Supplier Centre', icon: Building2 },
  { id: 'payables', label: 'Payables', icon: Truck },
  { id: 'reports', label: 'P&L Reports', icon: BarChart3 },
]

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  paid: 'success',
  partial_payment: 'warning',
  pending: 'danger',
  confirmed: 'info',
  cancelled: 'default',
}

export function AccountsDashboard() {
  const theme = useDepartment()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [drawerOrder, setDrawerOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [weekRevenue, setWeekRevenue] = useState(0)
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [totalReceivables, setTotalReceivables] = useState(0)
  const [supplierOwing, setSupplierOwing] = useState(0)
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null)

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [data, debtors, invoices] = await Promise.all([
        getAllOrders(),
        getDebtorsLedger(),
        getSupplierInvoices(),
      ])
      setOrders(data)
      setTotalReceivables(debtors.reduce((s, d) => s + d.balance, 0))
      setSupplierOwing(invoices.filter((i) => i.payment_status !== 'paid').reduce((s, i) => s + i.balance, 0))

      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - 7)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      setWeekRevenue(
        data
          .filter((o) => new Date(o.order_date) >= weekStart)
          .reduce((s, o) => s + o.total_amount, 0)
      )
      setMonthRevenue(
        data
          .filter((o) => new Date(o.order_date) >= monthStart)
          .reduce((s, o) => s + o.total_amount, 0)
      )

      const queue = data.filter((o) => o.balance > 0)
      setSelectedOrderId((current) => {
        if (current && queue.some((o) => o.id === current)) return current
        return queue[0]?.id || null
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFlockDeskDataReload(() => loadOrders(true), [loadOrders])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useGlobalSearchHandler({
    onCustomer: (id) => {
      getCustomers().then((custs) => {
        const c = custs.find((x) => x.id === id)
        if (c) {
          setActiveTab('customers')
          setProfileCustomer(c)
        }
      })
    },
    onOrder: (id) => {
      const order = orders.find((o) => o.id === id)
      if (order) {
        setActiveTab('overview')
        setDrawerOrder(order)
      } else {
        getAllOrders().then((all) => {
          const found = all.find((o) => o.id === id)
          if (found) {
            setActiveTab('overview')
            setDrawerOrder(found)
          }
        })
      }
    },
    onSupplier: () => setActiveTab('suppliers'),
  })

  const queue = orders.filter((o) => o.balance > 0)
  const filteredQueue = queue.filter((o) => {
    const q = search.toLowerCase()
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.customer?.name.toLowerCase().includes(q) ||
      o.customer?.business_name?.toLowerCase().includes(q)
    )
  })

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null

  const handlePaymentConfirmed = (orderId: string, amount: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        const newPaid = o.amount_paid + amount
        const newBalance = o.total_amount - newPaid
        return {
          ...o,
          amount_paid: newPaid,
          balance: newBalance,
          status: newBalance <= 0 ? 'paid' as const : 'partial_payment' as const,
        }
      })
    )
    loadOrders(true)
  }

  const totalDebt = queue.reduce((s, o) => s + o.balance, 0)

  return (
    <PageWrapper className="space-y-6">
      <DepartmentBanner subtitle={`The Vault · ${queue.length} pending · Synced with Sales`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatedStatCard title="This Week Revenue" value={weekRevenue} isCurrency subtitle="All sales orders" />
        <AnimatedStatCard title="This Month Revenue" value={monthRevenue} isCurrency />
        <AnimatedStatCard title="Outstanding Receivables" value={totalReceivables} isCurrency subtitle={`${queue.length} open orders`} />
        <AnimatedStatCard title="Supplier Payables" value={supplierOwing} isCurrency />
      </div>

      <div className="action-bar flex justify-end">
        <Button variant="outline" size="sm" onClick={() => loadOrders(true)} loading={refreshing}>
          <RefreshCw className="h-4 w-4" /> Refresh from Sales
        </Button>
      </div>

      <div className="tab-scroll flex gap-1 overflow-x-auto rounded-xl border border-[#F0F2FA] bg-white p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const count = tab.id === 'overview' ? queue.length : undefined
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:text-sm',
                activeTab === tab.id ? 'text-white shadow-md' : 'text-[#001996] hover:bg-[#F0F2FA]'
              )}
              style={activeTab === tab.id ? { background: theme.primary } : undefined}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Card className="p-4">
              <p className="mb-3 text-sm font-semibold text-[#000000]">
                Pending: {formatCurrency(totalDebt)}
              </p>
              <div className="mb-4 flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#000000]"
                />
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredQueue.length === 0 ? (
                <EmptyState title="Queue empty" description="All orders paid or no sales orders yet." />
              ) : (
                <div className="max-h-[32rem] space-y-2 overflow-y-auto">
                  {filteredQueue.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      onDoubleClick={() => setDrawerOrder(order)}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-colors',
                        selectedOrderId === order.id
                          ? 'border-[#001996] bg-[#F0F2FA]'
                          : 'border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-mono font-semibold text-[#000000]">{order.order_number}</p>
                          <p className="text-sm text-[#001996]">{order.customer?.name}</p>
                          <p className="mt-1 font-mono text-xs text-[#10259C]">{formatOrderBirdsSummary(order.lines)}</p>
                        </div>
                        <Badge variant={statusVariant[order.status] || 'default'}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <ProgressBar
                          value={order.amount_paid}
                          max={order.total_amount}
                          variant="payment"
                          showPercent={false}
                          sublabel={`${formatCurrency(order.amount_paid)} of ${formatCurrency(order.total_amount)}`}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-sm">
                        <span className="text-[#001996]">Balance</span>
                        <span className="font-mono font-bold text-[#FF052E]">{formatCurrency(order.balance)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-3">
            {selectedOrder ? (
              <PaymentConfirmation
                key={selectedOrder.id}
                order={selectedOrder}
                onConfirmed={handlePaymentConfirmed}
              />
            ) : (
              <Card>
                <EmptyState title="Select an order" description="Choose an order from the queue to confirm payment." />
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sales' && <SalesOverview />}
      {activeTab === 'payments' && <PaymentsHistory />}
      {activeTab === 'customers' && <CustomersTab />}
      {activeTab === 'debtors' && <DebtorsLedger />}
      {activeTab === 'aging' && <ARAgingDashboard />}
      {activeTab === 'suppliers' && <SupplierCentre />}
      {activeTab === 'payables' && <SupplierPayables />}
      {activeTab === 'reports' && <SalesByItemReport />}

      <OrderDetailDrawer order={drawerOrder} open={!!drawerOrder} onClose={() => setDrawerOrder(null)} />

      <CustomerProfile
        customer={profileCustomer}
        open={!!profileCustomer}
        onClose={() => setProfileCustomer(null)}
        showPaymentHistory
      />
    </PageWrapper>
  )
}