import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar, Package, ShoppingCart, AlertTriangle, Plus, Bird,
  ClipboardList, History, RefreshCw, Truck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  Button, Card, CardHeader, Badge, Skeleton, EmptyState,
  Input, Select, Modal, Table, Th, Td,
} from '@/components/ui'
import { ReconciliationWidget } from '@/components/shared/ReconciliationWidget'
import { PageWrapper, staggerContainer } from '@/components/shared/PageWrapper'
import { DepartmentBanner } from '@/components/shared/DepartmentBanner'
import { AnimatedStatCard } from '@/components/shared/AnimatedStatCard'
import { useDepartment } from '@/context/DepartmentContext'
import {
  getOpenSalesDay, getOrdersForSalesDay, getStockForSalesDay,
  getDispositions, getReconciliation, getBirdTypes, getSuppliers,
  getCompanySettings, openSalesDay, addStockEntry, addSupplier, isDemoMode,
  getCustomers, getAllOrders,
} from '@/lib/dataService'
import { validateSalesDayDate, validateStockEntry, validateSupplier } from '@/lib/validation'
import { getSessionBirdTotals } from '@/lib/reconciliation'
import { formatCurrency, formatDate, formatNumber, cn, normalizePhone } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getNextSalesDayDate, isValidSalesDayDateString } from '@/lib/salesDayMapper'
import { useAuthStore } from '@/stores/authStore'
import { OrderEntry } from './OrderEntry'
import { DispositionEntry } from './DispositionEntry'
import { SalesHistory } from './SalesHistory'
import { CustomerProfile } from './CustomerProfile'
import { OrderDetailDrawer } from '@/components/shared/OrderDetailDrawer'
import { useGlobalSearchHandler } from '@/components/shared/GlobalSearch'
import { formatOrderBirdsSummary, formatOrderStatusLabel, orderStatusEmoji } from '@/lib/orderFormat'
import type {
  SalesDay, SalesOrder, SalesSessionStock, BirdDisposition,
  ReconciliationRow, BirdType, Supplier, SourceType, Customer,
} from '@/types'

type Tab = 'overview' | 'orders' | 'dispositions' | 'history'
type View = 'dashboard' | 'order-entry' | 'disposition-entry'

const tabs: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: 'overview', label: 'Overview', icon: ClipboardList },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'dispositions', label: 'Dispositions', icon: AlertTriangle },
  { id: 'history', label: 'History', icon: History },
]

const orderStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  partial_payment: 'warning',
  paid: 'success',
  cancelled: 'danger',
}

export function SalesDashboard() {
  const { profile } = useAuthStore()
  const theme = useDepartment()
  const isAdmin = profile?.role === 'admin'

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [view, setView] = useState<View>('dashboard')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [salesDay, setSalesDay] = useState<SalesDay | null>(null)
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [stock, setStock] = useState<SalesSessionStock[]>([])
  const [dispositions, setDispositions] = useState<BirdDisposition[]>([])
  const [reconciliation, setReconciliation] = useState<ReconciliationRow[]>([])
  const [birdTypes, setBirdTypes] = useState<BirdType[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [showOpenDay, setShowOpenDay] = useState(false)
  const [openDayDate, setOpenDayDate] = useState(getNextSalesDayDate())
  const [adminOverride, setAdminOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [openingDay, setOpeningDay] = useState(false)

  const [showStockForm, setShowStockForm] = useState(false)
  const [savingStock, setSavingStock] = useState(false)
  const [stockForm, setStockForm] = useState({
    bird_type_id: '',
    source_type: 'own_production' as SourceType,
    supplier_id: '',
    quantity_declared: 0,
    supplier_rate_per_chick: 0,
    egg_count_hatched: 0,
    discrepancy_note: '',
  })
  const [stockErrors, setStockErrors] = useState<Record<string, string>>({})

  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [orderSearch, setOrderSearch] = useState('')

  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    phone: '',
    payment_terms: '',
    address: '',
  })
  const [supplierErrors, setSupplierErrors] = useState<Record<string, string>>({})
  const [savingSupplier, setSavingSupplier] = useState(false)

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const [day, types, supps] = await Promise.all([
        getOpenSalesDay(),
        getBirdTypes(),
        getSuppliers(),
      ])
      setSalesDay(day)
      setBirdTypes(types)
      setSuppliers(supps)

      if (day) {
        const [dayOrders, dayStock, dayDispositions, recon] = await Promise.all([
          getOrdersForSalesDay(day.id),
          getStockForSalesDay(day.id),
          getDispositions(day.id),
          getReconciliation(day.id),
        ])
        setOrders(dayOrders)
        setStock(dayStock)
        setDispositions(dayDispositions)
        setReconciliation(recon)
      } else {
        setOrders([])
        setStock([])
        setDispositions([])
        setReconciliation([])
      }
    } catch {
      toast.error('Failed to load sales dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useGlobalSearchHandler({
    onCustomer: (id) => {
      getCustomers().then((custs) => {
        const c = custs.find((x) => x.id === id)
        if (c) setProfileCustomer(c)
      })
    },
    onOrder: (id) => {
      getAllOrders().then((all) => {
        const order = all.find((o) => o.id === id)
        if (order) {
          setActiveTab('orders')
          setSelectedOrder(order)
        }
      })
    },
  })

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + o.total_amount, 0)
    const totalCollected = orders.reduce((s, o) => s + o.amount_paid, 0)
    const pendingOrders = orders.filter((o) => o.status === 'pending').length
    const birdsSold = orders.reduce(
      (s, o) => s + (o.lines?.reduce((ls, l) => ls + l.quantity, 0) || 0),
      0
    )
    const birdsDeclared = stock.reduce((s, st) => s + st.quantity_declared, 0)
    return { totalRevenue, totalCollected, pendingOrders, birdsSold, birdsDeclared }
  }, [orders, stock])

  const canOpenSalesDay = useMemo(() => {
    return isValidSalesDayDateString(openDayDate) || adminOverride
  }, [openDayDate, adminOverride])

  const birdTotals = useMemo(() => getSessionBirdTotals(reconciliation), [reconciliation])
  const stockFullyAccounted =
    birdTotals.declared > 0 && birdTotals.onGround === 0 && birdTotals.oversold === 0

  const handleOpenSalesDay = async () => {
    const date = new Date(openDayDate + 'T12:00:00')
    const validationErrors = validateSalesDayDate(date, adminOverride)
    if (validationErrors.length > 0) {
      validationErrors.forEach((e) => toast.error(e.message))
      return
    }
    if (adminOverride && !overrideReason.trim()) {
      toast.error('Please provide a reason for the schedule override')
      return
    }

    setOpeningDay(true)
    try {
      const settings = await getCompanySettings()
      if (!adminOverride && !isValidSalesDayDateString(openDayDate)) {
        toast.error('Sales days are only allowed on Monday or Thursday. Pick a valid date or enable override.')
        return
      }
      if (adminOverride && !settings?.allow_admin_override && !isDemoMode()) {
        toast.error('Schedule override is disabled in company settings')
        return
      }

      const result = await openSalesDay(
        openDayDate,
        adminOverride,
        overrideReason.trim() || undefined,
        profile ? { tenantId: profile.tenant_id, userId: profile.id } : undefined
      )

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.data) {
        setSalesDay(result.data)
        toast.success(`Sales day opened for ${formatDate(openDayDate)}`)
        setShowOpenDay(false)
        setAdminOverride(false)
        setOverrideReason('')
        await loadData(true)
      } else {
        toast.error('Failed to open sales day — no data returned')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open sales day')
    } finally {
      setOpeningDay(false)
    }
  }

  const handleSaveStock = async () => {
    if (!salesDay) return

    const errors = validateStockEntry({
      quantity_declared: stockForm.quantity_declared,
      source_type: stockForm.source_type,
      supplier_rate_per_chick:
        stockForm.source_type === 'supplier' ? stockForm.supplier_rate_per_chick : null,
    })
    if (!stockForm.bird_type_id) {
      errors.push({ field: 'bird_type_id', message: 'Bird type is required' })
    }
    if (stockForm.source_type === 'supplier' && !stockForm.supplier_id) {
      errors.push({ field: 'supplier_id', message: 'Supplier is required' })
    }

    if (errors.length > 0) {
      const map: Record<string, string> = {}
      errors.forEach((e) => {
        map[e.field] = e.message
      })
      setStockErrors(map)
      errors.forEach((e) => toast.error(e.message))
      return
    }

    setSavingStock(true)
    try {
      const stockResult = await addStockEntry({
        sales_day_id: salesDay.id,
        bird_type_id: stockForm.bird_type_id,
        source_type: stockForm.source_type,
        supplier_id: stockForm.source_type === 'supplier' ? stockForm.supplier_id : null,
        quantity_declared: stockForm.quantity_declared,
        supplier_rate_per_chick:
          stockForm.source_type === 'supplier' ? stockForm.supplier_rate_per_chick : null,
        egg_count_hatched:
          stockForm.source_type === 'own_production' && stockForm.egg_count_hatched > 0
            ? stockForm.egg_count_hatched
            : null,
        discrepancy_note: stockForm.discrepancy_note.trim() || null,
        created_by: profile?.id || '',
      })

      if (stockResult.error) {
        toast.error(stockResult.error)
        return
      }

      toast.success('Stock entry added')
      setShowStockForm(false)
      setStockForm({
        bird_type_id: '',
        source_type: 'own_production',
        supplier_id: '',
        quantity_declared: 0,
        supplier_rate_per_chick: 0,
        egg_count_hatched: 0,
        discrepancy_note: '',
      })
      setStockErrors({})
      await loadData(true)
    } catch {
      toast.error('Failed to save stock entry')
    } finally {
      setSavingStock(false)
    }
  }

  const handleDataSaved = () => loadData(true)

  const handleQuickAddSupplier = async (selectAfterAdd = false) => {
    const errors = validateSupplier(newSupplier)
    if (errors.length > 0) {
      const map: Record<string, string> = {}
      errors.forEach((e) => {
        map[e.field] = e.message
      })
      setSupplierErrors(map)
      errors.forEach((e) => toast.error(e.message))
      return
    }

    setSavingSupplier(true)
    try {
      const phone = newSupplier.phone.trim() ? normalizePhone(newSupplier.phone) : null
      const payload = {
        tenant_id: profile?.tenant_id || '',
        name: newSupplier.name.trim(),
        contact_person: newSupplier.contact_person.trim() || null,
        phone,
        address: newSupplier.address.trim() || null,
        payment_terms: newSupplier.payment_terms.trim() || null,
      }

      if (isDemoMode()) {
        const result = await addSupplier(payload)
        if (result.error || !result.data) {
          toast.error(result.error || 'Failed to add supplier')
          return
        }
        setSuppliers((prev) => [...prev, result.data!])
        if (selectAfterAdd) {
          setStockForm((p) => ({ ...p, source_type: 'supplier', supplier_id: result.data!.id }))
        }
        setShowAddSupplier(false)
        setNewSupplier({ name: '', contact_person: '', phone: '', payment_terms: '', address: '' })
        setSupplierErrors({})
        toast.success('Supplier added — available when declaring supplier stock')
        return
      }

      if (!profile?.tenant_id) {
        toast.error('Unable to add supplier — profile not loaded')
        return
      }

      const { data, error } = await supabase
        .from('suppliers')
        .insert(payload)
        .select()
        .single()

      if (error) {
        toast.error(error.message)
        return
      }

      const created = data as Supplier
      setSuppliers((prev) => [...prev, created])
      if (selectAfterAdd) {
        setStockForm((p) => ({ ...p, source_type: 'supplier', supplier_id: created.id }))
      }
      setShowAddSupplier(false)
      setNewSupplier({ name: '', contact_person: '', phone: '', payment_terms: '', address: '' })
      setSupplierErrors({})
      toast.success('Supplier added')
    } finally {
      setSavingSupplier(false)
    }
  }

  if (view === 'order-entry' && salesDay) {
    return (
      <OrderEntry
        salesDayId={salesDay.id}
        onClose={() => setView('dashboard')}
        onSaved={handleDataSaved}
      />
    )
  }

  if (view === 'disposition-entry' && salesDay) {
    return (
      <DispositionEntry
        salesDayId={salesDay.id}
        onClose={() => setView('dashboard')}
        onSaved={handleDataSaved}
      />
    )
  }

  return (
    <PageWrapper className="space-y-6">
      <DepartmentBanner
        subtitle={salesDay ? `${formatDate(salesDay.date)} · DOC Day` : 'No active session'}
        progressLabel={salesDay && birdTotals.declared > 0 ? 'Stock Accounted' : undefined}
        progressValue={birdTotals.declared > 0 ? birdTotals.accounted : undefined}
        progressMax={birdTotals.declared > 0 ? birdTotals.declared : undefined}
        progressSublabel={
          salesDay && birdTotals.declared > 0
            ? `${formatNumber(birdTotals.onGround)} on ground · ${formatNumber(birdTotals.accounted)} / ${formatNumber(birdTotals.declared)} accounted`
            : salesDay
              ? 'Declare opening stock to track birds on ground'
              : undefined
        }
        progressComplete={stockFullyAccounted}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => loadData(true)} loading={refreshing}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
        {!salesDay && (
          <Button
            size="sm"
            deptColor={theme.primary}
            onClick={() => {
              setOpenDayDate(getNextSalesDayDate())
              setShowOpenDay(true)
            }}
          >
            <Calendar className="h-4 w-4" /> Open Sales Day
          </Button>
        )}
      </div>

      {isDemoMode() && (
        <div className="rounded-xl border border-[#F0F2FA] bg-[#F0F2FA] px-4 py-3 text-sm text-[#001996]">
          Demo mode — using sample data. Connect Supabase for live operations.
        </div>
      )}

      {salesDay && birdTotals.oversold > 0 && (
        <div className="rounded-xl border border-[#FF052E] bg-[#F0F2FA] px-4 py-3 text-sm text-[#FF052E]">
          Orders exceed declared stock by {formatNumber(birdTotals.oversold)} birds — review and correct orders immediately.
        </div>
      )}

      {salesDay && birdTotals.declared > 0 && birdTotals.onGround > 0 && (
        <div className="rounded-xl border border-[#10259C] bg-[#F0F2FA] px-4 py-3 text-sm text-[#001996]">
          {formatNumber(birdTotals.onGround)} birds still on ground — continue selling or record dispositions before closing the day.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {salesDay && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <Bird className="h-5 w-5 text-primary-600" />
              <div className="flex-1">
                <span className="font-medium">Sales Day Open</span>
                <span className="mx-2 text-slate-300">·</span>
                <span className="text-sm text-slate-500">{formatDate(salesDay.date)}</span>
              </div>
              <Badge variant={salesDay.status === 'open' ? 'info' : 'warning'}>
                {salesDay.status}
              </Badge>
              {stockFullyAccounted ? (
                <Badge variant="success">Balanced</Badge>
              ) : birdTotals.oversold > 0 ? (
                <Badge variant="danger">Oversold</Badge>
              ) : (
                <Badge variant="warning">{formatNumber(birdTotals.onGround)} on ground</Badge>
              )}
              {salesDay.admin_override && <Badge variant="warning">Override</Badge>}
            </div>
          )}

          <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#F0F2FA] bg-white p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                    activeTab === tab.id ? 'text-white shadow-md' : 'text-[#001996] hover:bg-[#F0F2FA]'
                  )}
                  style={activeTab === tab.id ? { background: theme.primary } : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {!salesDay ? (
                <Card>
                  <EmptyState
                    title="No open sales day"
                    description="Open a sales day to begin recording stock, orders, and dispositions. Sales days are typically Monday and Thursday."
                    action={
                      <Button
                        onClick={() => {
                          setOpenDayDate(getNextSalesDayDate())
                          setShowOpenDay(true)
                        }}
                      >
                        <Calendar className="h-4 w-4" />
                        Open Sales Day
                      </Button>
                    }
                  />
                </Card>
              ) : (
                <>
                  <motion.div variants={staggerContainer} initial="hidden" animate="show" className="stats-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <AnimatedStatCard
                      title="Revenue"
                      value={stats.totalRevenue}
                      isCurrency
                      subtitle={`${formatCurrency(stats.totalCollected)} collected`}
                      icon={<ShoppingCart className="h-5 w-5" />}
                    />
                    <AnimatedStatCard
                      title="Orders"
                      value={orders.length}
                      subtitle={`${stats.pendingOrders} pending`}
                      icon={<ClipboardList className="h-5 w-5" />}
                    />
                    <AnimatedStatCard
                      title="Birds Sold"
                      value={stats.birdsSold}
                      icon={<Bird className="h-5 w-5" />}
                    />
                    <AnimatedStatCard
                      title="Birds Declared"
                      value={stats.birdsDeclared}
                      subtitle={`${formatNumber(birdTotals.accounted)} / ${formatNumber(birdTotals.declared)} accounted`}
                      icon={<Package className="h-5 w-5" />}
                    />
                  </motion.div>

                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    <Card>
                      <CardHeader
                        title="Quick Actions"
                        subtitle="Common sales day tasks"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button
                          className="justify-start"
                          onClick={() => setView('order-entry')}
                        >
                          <Plus className="h-4 w-4" />
                          New Order
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => setView('disposition-entry')}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Record Dispositions
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => setShowStockForm(true)}
                        >
                          <Package className="h-4 w-4" />
                          Declare Stock
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => setActiveTab('history')}
                        >
                          <History className="h-4 w-4" />
                          View History
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start"
                          onClick={() => setShowAddSupplier(true)}
                        >
                          <Truck className="h-4 w-4" />
                          Add Supplier
                        </Button>
                      </div>
                    </Card>

                    <Card>
                      <CardHeader
                        title="Suppliers"
                        subtitle={`${suppliers.length} registered — for supplier stock deliveries`}
                        action={
                          <Button size="sm" variant="outline" onClick={() => setShowAddSupplier(true)}>
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        }
                      />
                      {suppliers.length === 0 ? (
                        <EmptyState
                          title="No suppliers yet"
                          description="Add suppliers before declaring stock received from external hatcheries."
                          action={
                            <Button size="sm" onClick={() => setShowAddSupplier(true)}>
                              <Truck className="h-4 w-4" />
                              Add Supplier
                            </Button>
                          }
                        />
                      ) : (
                        <div className="max-h-48 space-y-2 overflow-y-auto">
                          {suppliers.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between rounded-lg border border-[#F0F2FA] px-3 py-2 text-sm"
                            >
                              <div>
                                <p className="font-medium text-[#000000]">{s.name}</p>
                                <p className="text-xs text-[#10259C]">
                                  {[s.contact_person, s.phone].filter(Boolean).join(' · ') || 'No contact details'}
                                </p>
                              </div>
                              {s.payment_terms && (
                                <Badge variant="info">{s.payment_terms}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    <Card>
                      <CardHeader
                        title="Stock Declaration"
                        subtitle={`${stock.length} entries today`}
                        action={
                          <Button size="sm" variant="outline" onClick={() => setShowStockForm(true)}>
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        }
                      />
                      {stock.length === 0 ? (
                        <EmptyState
                          title="No stock declared"
                          description="Declare opening stock before taking orders."
                          action={
                            <Button size="sm" onClick={() => setShowStockForm(true)}>
                              Declare Stock
                            </Button>
                          }
                        />
                      ) : (
                        <Table>
                          <thead>
                            <tr>
                              <Th>Bird Type</Th>
                              <Th>Source</Th>
                              <Th>Qty</Th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {stock.map((s) => (
                              <tr key={s.id}>
                                <Td className="font-medium">{s.bird_type?.name || '—'}</Td>
                                <Td className="capitalize">{s.source_type.replace('_', ' ')}</Td>
                                <Td>{formatNumber(s.quantity_declared)}</Td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </Card>
                  </div>

                  {reconciliation.length > 0 && (
                    <ReconciliationWidget rows={reconciliation} />
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              {!salesDay ? (
                <Card>
                  <EmptyState title="No active session" description="Open a sales day to manage orders." />
                </Card>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[#F0F2FA] to-[#F0F2FA] px-4 py-3 text-sm">
                    <span className="font-semibold text-[#000000]">
                      Today — {formatDate(salesDay.date)}
                    </span>
                    <span className="text-[#001996]">
                      Declared: {formatNumber(stats.birdsDeclared)} · Sold: {formatNumber(stats.birdsSold)} · Revenue: {formatCurrency(stats.totalRevenue)} · Collected: {formatCurrency(stats.totalCollected)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      className="flex-1 rounded-lg border border-[#F0F2FA] px-3 py-2 text-sm text-[#000000] min-w-[200px]"
                      placeholder="Search orders or customers..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                    <Button onClick={() => setView('order-entry')}>
                      <Plus className="h-4 w-4" /> New Order
                    </Button>
                  </div>

                  {orders.length === 0 ? (
                    <Card>
                      <EmptyState
                        title="No orders yet"
                        description="Create the first order for today's sales session."
                        action={
                          <Button onClick={() => setView('order-entry')}>
                            <Plus className="h-4 w-4" /> Create Order
                          </Button>
                        }
                      />
                    </Card>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Order #</Th>
                          <Th>Customer</Th>
                          <Th>Birds</Th>
                          <Th>Total</Th>
                          <Th>Paid</Th>
                          <Th>Balance</Th>
                          <Th>Status</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {orders
                          .filter((o) => {
                            const q = orderSearch.toLowerCase()
                            if (!q) return true
                            return (
                              o.order_number.toLowerCase().includes(q) ||
                              o.customer?.name.toLowerCase().includes(q)
                            )
                          })
                          .map((order) => (
                            <tr
                              key={order.id}
                              className="cursor-pointer hover:bg-[#F0F2FA]"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Td className="font-mono font-semibold">{order.order_number}</Td>
                              <Td>
                                {order.customer ? (
                                  <button
                                    type="button"
                                    className="text-[#10259C] hover:underline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setProfileCustomer(order.customer!)
                                    }}
                                  >
                                    {order.customer.name}
                                  </button>
                                ) : (
                                  '—'
                                )}
                              </Td>
                              <Td className="font-mono text-xs">{formatOrderBirdsSummary(order.lines, birdTypes)}</Td>
                              <Td>{formatCurrency(order.total_amount)}</Td>
                              <Td className="text-[#10259C]">{formatCurrency(order.amount_paid)}</Td>
                              <Td className={order.balance > 0 ? 'font-medium text-red-600' : ''}>
                                {formatCurrency(order.balance)}
                              </Td>
                              <Td>
                                <Badge variant={orderStatusVariant[order.status] || 'default'}>
                                  {orderStatusEmoji(order.status)} {formatOrderStatusLabel(order.status)}
                                </Badge>
                              </Td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                  )}
                  <p className="text-xs text-[#10259C]">B=Broiler · N=Noiler · P=Pullet · C=Cockerel · Click a row for full breakdown</p>
                </>
              )}
            </div>
          )}

          {activeTab === 'dispositions' && (
            <div className="space-y-4">
              {!salesDay ? (
                <Card>
                  <EmptyState
                    title="No active session"
                    description="Open a sales day to record dispositions."
                  />
                </Card>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button onClick={() => setView('disposition-entry')}>
                      <Plus className="h-4 w-4" />
                      Record Dispositions
                    </Button>
                  </div>
                  {dispositions.length === 0 ? (
                    <Card>
                      <EmptyState
                        title="No dispositions recorded"
                        description="Log rejects, mortality, and farm transfers to balance your bird count."
                        action={
                          <Button onClick={() => setView('disposition-entry')}>
                            <AlertTriangle className="h-4 w-4" />
                            Record Dispositions
                          </Button>
                        }
                      />
                    </Card>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Bird Type</Th>
                          <Th>Type</Th>
                          <Th>Quantity</Th>
                          <Th>Notes</Th>
                          <Th>Time</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {dispositions.map((d) => (
                          <tr key={d.id}>
                            <Td className="font-medium">{d.bird_type?.name || '—'}</Td>
                            <Td>
                              <Badge
                                variant={
                                  d.disposition_type === 'mortality'
                                    ? 'danger'
                                    : d.disposition_type === 'reject'
                                      ? 'warning'
                                      : 'info'
                                }
                              >
                                {d.disposition_type.replace('_', ' ')}
                              </Badge>
                            </Td>
                            <Td>{formatNumber(d.quantity)}</Td>
                            <Td className="text-slate-500">{d.notes || '—'}</Td>
                            <Td className="text-slate-500">{formatDate(d.recorded_at)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <Card>
              <CardHeader
                title="Sales History"
                subtitle="Review and export past sales days"
              />
              <SalesHistory />
            </Card>
          )}
        </>
      )}

      <Modal
        open={showOpenDay}
        onClose={() => setShowOpenDay(false)}
        title="Open Sales Day"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Sales days are scheduled for <strong>Monday</strong> and <strong>Thursday</strong>.
            {isAdmin && ' As admin, you can override this restriction.'}
          </p>

          <Input
            label="Sales Date"
            type="date"
            value={openDayDate}
            onChange={(e) => setOpenDayDate(e.target.value)}
          />

          {!canOpenSalesDay && (
            <div className="rounded-xl bg-[#F0F2FA] p-3 text-sm text-[#001996]">
              Selected date is not a Monday or Thursday. Pick the next Mon/Thu above, or enable schedule override.
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-[#000000]">
            <input
              type="checkbox"
              checked={adminOverride}
              onChange={(e) => setAdminOverride(e.target.checked)}
              className="rounded border-[#F0F2FA]"
            />
            Override schedule (open on non Mon/Thu)
          </label>
          {adminOverride && (
            <Input
              label="Override Reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Reason for opening on this date..."
              required
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowOpenDay(false)}>
              Cancel
            </Button>
            <Button onClick={handleOpenSalesDay} loading={openingDay}>
              Open Sales Day
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showStockForm}
        onClose={() => setShowStockForm(false)}
        title="Declare Stock"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Bird Type"
            value={stockForm.bird_type_id}
            onChange={(e) => setStockForm((p) => ({ ...p, bird_type_id: e.target.value }))}
            error={stockErrors.bird_type_id}
          >
            <option value="">Select bird type</option>
            {birdTypes.map((bt) => (
              <option key={bt.id} value={bt.id}>
                {bt.name}
              </option>
            ))}
          </Select>

          <Select
            label="Source"
            value={stockForm.source_type}
            onChange={(e) =>
              setStockForm((p) => ({
                ...p,
                source_type: e.target.value as SourceType,
                supplier_id: '',
              }))
            }
          >
            <option value="own_production">Own Production</option>
            <option value="supplier">Supplier</option>
          </Select>

          {stockForm.source_type === 'supplier' && (
            <>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#000000]">Supplier</label>
                <div className="flex gap-2">
                  <select
                    value={stockForm.supplier_id}
                    onChange={(e) => setStockForm((p) => ({ ...p, supplier_id: e.target.value }))}
                    className={cn(
                      'flex-1 rounded-xl border-[1.5px] border-[#F0F2FA] bg-white px-3 py-2.5 text-sm text-[#000000]',
                      stockErrors.supplier_id && 'border-[#FF052E]'
                    )}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setShowAddSupplier(true)}
                  >
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                </div>
                {stockErrors.supplier_id && (
                  <p className="text-xs text-[#FF052E]">{stockErrors.supplier_id}</p>
                )}
                {suppliers.length === 0 && (
                  <p className="text-xs text-[#D97706]">
                    No suppliers yet — click New to register one before declaring supplier stock.
                  </p>
                )}
              </div>
              <Input
                label="Supplier Rate (₦/chick)"
                type="number"
                min={0}
                value={stockForm.supplier_rate_per_chick || ''}
                onChange={(e) =>
                  setStockForm((p) => ({
                    ...p,
                    supplier_rate_per_chick: Number(e.target.value),
                  }))
                }
                error={stockErrors.supplier_rate_per_chick}
              />
            </>
          )}

          <Input
            label="Quantity Declared"
            type="number"
            min={0}
            value={stockForm.quantity_declared || ''}
            onChange={(e) =>
              setStockForm((p) => ({ ...p, quantity_declared: Number(e.target.value) }))
            }
            error={stockErrors.quantity_declared}
          />

          {stockForm.source_type === 'own_production' && (
            <Input
              label="Eggs Hatched (optional)"
              type="number"
              min={0}
              value={stockForm.egg_count_hatched || ''}
              onChange={(e) =>
                setStockForm((p) => ({ ...p, egg_count_hatched: Number(e.target.value) }))
              }
            />
          )}

          <Input
            label="Discrepancy Note (optional)"
            value={stockForm.discrepancy_note}
            onChange={(e) => setStockForm((p) => ({ ...p, discrepancy_note: e.target.value }))}
            placeholder="e.g. 50 eggs did not hatch"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowStockForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStock} loading={savingStock}>
              Save Stock Entry
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showAddSupplier} onClose={() => setShowAddSupplier(false)} title="Add Supplier" size="md">
        <div className="space-y-4">
          <Input
            label="Supplier Name"
            value={newSupplier.name}
            onChange={(e) => setNewSupplier((p) => ({ ...p, name: e.target.value }))}
            error={supplierErrors.name}
            placeholder="e.g. Sunrise Hatchery"
            required
          />
          <Input
            label="Contact Person"
            value={newSupplier.contact_person}
            onChange={(e) => setNewSupplier((p) => ({ ...p, contact_person: e.target.value }))}
            placeholder="e.g. Mr. Bello"
          />
          <Input
            label="Phone"
            value={newSupplier.phone}
            onChange={(e) => setNewSupplier((p) => ({ ...p, phone: e.target.value }))}
            error={supplierErrors.phone}
            placeholder="08012345678"
          />
          <Input
            label="Payment Terms"
            value={newSupplier.payment_terms}
            onChange={(e) => setNewSupplier((p) => ({ ...p, payment_terms: e.target.value }))}
            placeholder="e.g. Net 7 days, Cash on delivery"
          />
          <Input
            label="Address (optional)"
            value={newSupplier.address}
            onChange={(e) => setNewSupplier((p) => ({ ...p, address: e.target.value }))}
            placeholder="City or full address"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddSupplier(false)}>
              Cancel
            </Button>
            <Button
              loading={savingSupplier}
              onClick={() => handleQuickAddSupplier(showStockForm)}
            >
              Add Supplier
            </Button>
          </div>
        </div>
      </Modal>

      <CustomerProfile
        customer={profileCustomer}
        open={!!profileCustomer}
        onClose={() => setProfileCustomer(null)}
      />

      <OrderDetailDrawer
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        salesDayDate={salesDay?.date}
        onCustomerClick={() => {
          if (selectedOrder?.customer) {
            setProfileCustomer(selectedOrder.customer)
            setSelectedOrder(null)
          }
        }}
      />
    </PageWrapper>
  )
}