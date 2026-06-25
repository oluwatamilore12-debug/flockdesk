import { supabase, isSupabaseConfigured } from './supabase'
import { mapSalesDayFromDb, mapStockFromDb, mapStockToDb } from './salesDayMapper'
import {
  mockBirdTypes, mockCustomers, mockSuppliers, mockStock,
  mockOrders, mockOrderLines, mockDispositions, mockSupplierInvoices,
  mockPayments, mockCompanySettings, mockReconciliation, mockClosedSalesDay,
  DEMO_TENANT_ID,
} from './mockData'
import {
  loadDemoSessionFromStorage,
  saveDemoSessionToStorage,
  type DemoSessionPayload,
} from './demoSession'
import { computeReconciliation, getOnGroundForBirdType, getSessionBirdTotals } from './reconciliation'
import type {
  BirdType, Customer, Supplier, SalesDay, SalesSessionStock,
  SalesOrder, SalesOrderLine, BirdDisposition, SupplierInvoice, CustomerPayment,
  CompanySettings, ReconciliationRow, DebtorRow, SalesByItemRow,
  SalesDaySummary, SupplierAnalyticsRow, ARAgingBucket, UserRole,
} from '@/types'
import { isDateInRange, resolveDateRange, type DateRangePreset } from './dateFilters'
import { hasPermission } from './permissions'

export interface GlobalSearchResult {
  type: 'customer' | 'order' | 'supplier'
  id: string
  label: string
  sublabel?: string
}

let forceDemoMode = false
let mockSessionReconciliation: ReconciliationRow[] = []

function createDefaultDemoSession(): DemoSessionPayload {
  return {
    openSalesDay: null,
    stock: [],
    orders: [],
    dispositions: [],
    customers: [...mockCustomers],
    suppliers: [...mockSuppliers],
    supplierInvoices: [...mockSupplierInvoices],
    payments: [...mockPayments],
  }
}

function ensureDemoSessionSuppliers(session: DemoSessionPayload): DemoSessionPayload {
  if (!session.suppliers?.length) {
    session.suppliers = [...mockSuppliers]
  }
  return session
}

let demoSession: DemoSessionPayload = ensureDemoSessionSuppliers(
  loadDemoSessionFromStorage() || createDefaultDemoSession()
)

function persistDemoSession(): void {
  saveDemoSessionToStorage(demoSession)
}

/** Recompute declared/accounted/balanced from live orders, stock, and dispositions. */
function syncDemoSalesDayTotals(): void {
  if (!demoSession.openSalesDay) return
  const recon = computeReconciliation(
    mockBirdTypes,
    demoSession.stock,
    demoSession.orders.flatMap((o) => o.lines || []),
    demoSession.dispositions
  )
  mockSessionReconciliation = recon
  const totals = getSessionBirdTotals(recon)
  demoSession.openSalesDay.total_birds_declared = totals.declared
  demoSession.openSalesDay.total_birds_accounted = totals.accounted
  demoSession.openSalesDay.is_balanced =
    totals.declared > 0 && totals.onGround === 0 && totals.oversold === 0
}

function hydrateDemoSession(): void {
  const saved = loadDemoSessionFromStorage()
  if (saved) demoSession = ensureDemoSessionSuppliers(saved)
}

function shouldUseMock(): boolean {
  return !isSupabaseConfigured || forceDemoMode
}

export function setForceDemoMode(enabled: boolean): void {
  forceDemoMode = enabled
  if (enabled) {
    hydrateDemoSession()
  }
}

export async function getBirdTypes(): Promise<BirdType[]> {
  if (shouldUseMock()) return mockBirdTypes
  const { data } = await supabase.from('bird_types').select('*').eq('is_active', true).order('sort_order')
  return data || []
}

export async function getCustomers(): Promise<Customer[]> {
  if (shouldUseMock()) return demoSession.customers
  const { data } = await supabase.from('customers').select('*').eq('is_active', true).is('deleted_at', null)
  return data || []
}

export async function getSuppliers(): Promise<Supplier[]> {
  if (shouldUseMock()) return demoSession.suppliers
  const { data } = await supabase.from('suppliers').select('*').eq('is_active', true).is('deleted_at', null)
  return data || []
}

export async function getOpenSalesDay(): Promise<SalesDay | null> {
  if (shouldUseMock()) {
    syncDemoSalesDayTotals()
    return demoSession.openSalesDay
  }
  const { data, error } = await supabase
    .from('sales_days')
    .select('*')
    .eq('status', 'open')
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    console.error('getOpenSalesDay error:', error)
    return null
  }
  return data ? mapSalesDayFromDb(data as Record<string, unknown>) : null
}

export async function getSalesDays(limit = 20): Promise<SalesDay[]> {
  if (shouldUseMock()) {
    syncDemoSalesDayTotals()
    const days = [mockClosedSalesDay]
    if (demoSession.openSalesDay) days.unshift(demoSession.openSalesDay)
    return days
  }
  const { data } = await supabase
    .from('sales_days')
    .select('*')
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .limit(limit)
  return (data || []).map((row) => mapSalesDayFromDb(row as Record<string, unknown>))
}

export async function getStockForSalesDay(salesDayId: string): Promise<SalesSessionStock[]> {
  if (shouldUseMock()) {
    if (demoSession.openSalesDay?.id === salesDayId) return demoSession.stock
    if (salesDayId === mockClosedSalesDay.id) return mockStock
    return []
  }
  const { data } = await supabase
    .from('sales_session_stock')
    .select('*, bird_type:bird_types(*), supplier:suppliers(*)')
    .eq('sales_day_id', salesDayId)
    .is('deleted_at', null)
  return (data || []).map((row) => mapStockFromDb(row as Record<string, unknown>))
}

export async function getOrdersForSalesDay(salesDayId: string): Promise<SalesOrder[]> {
  if (shouldUseMock()) {
    if (demoSession.openSalesDay?.id === salesDayId) return demoSession.orders
    if (salesDayId === mockClosedSalesDay.id) return mockOrders
    return []
  }
  const { data } = await supabase
    .from('sales_orders')
    .select('*, customer:customers(*), lines:sales_order_lines(*, bird_type:bird_types(*))')
    .eq('sales_day_id', salesDayId)
  return data || []
}

export async function getAllOrders(): Promise<SalesOrder[]> {
  if (shouldUseMock()) return [...mockOrders, ...demoSession.orders]
  const { data } = await supabase.from('sales_orders').select('*, customer:customers(*)').order('order_date', { ascending: false })
  return data || []
}

export async function getDispositions(salesDayId: string): Promise<BirdDisposition[]> {
  if (shouldUseMock()) {
    if (demoSession.openSalesDay?.id === salesDayId) return demoSession.dispositions
    if (salesDayId === mockClosedSalesDay.id) return mockDispositions
    return []
  }
  const { data } = await supabase.from('bird_dispositions').select('*, bird_type:bird_types(*)').eq('sales_day_id', salesDayId)
  return data || []
}

export async function getReconciliation(salesDayId: string): Promise<ReconciliationRow[]> {
  if (shouldUseMock()) {
    if (demoSession.openSalesDay?.id === salesDayId) {
      syncDemoSalesDayTotals()
      return mockSessionReconciliation
    }
    if (salesDayId === mockClosedSalesDay.id) return mockReconciliation
    return []
  }
  const birdTypes = await getBirdTypes()
  const stock = await getStockForSalesDay(salesDayId)
  const orders = await getOrdersForSalesDay(salesDayId)
  const lines = orders.flatMap((o) => o.lines || [])
  const dispositions = await getDispositions(salesDayId)
  return computeReconciliation(birdTypes, stock, lines, dispositions)
}

export async function getSupplierInvoices(): Promise<SupplierInvoice[]> {
  if (shouldUseMock()) return demoSession.supplierInvoices
  const { data } = await supabase.from('supplier_invoices').select('*, supplier:suppliers(*), bird_type:bird_types(*)')
  return data || []
}

export async function getPayments(): Promise<CustomerPayment[]> {
  if (shouldUseMock()) return demoSession.payments
  const { data } = await supabase.from('customer_payments').select('*')
  return data || []
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  if (shouldUseMock()) return mockCompanySettings
  const { data } = await supabase.from('company_settings').select('*').maybeSingle()
  if (!data) return null
  return {
    ...mockCompanySettings,
    id: data.id,
    tenant_id: data.tenant_id,
    company_name: data.company_name,
    allow_admin_override: true,
    default_sales_days: [1, 4],
  }
}

export async function getDebtorsLedger(): Promise<DebtorRow[]> {
  const orders = await getAllOrders()
  const payments = await getPayments()
  const customers = await getCustomers()

  return customers.map((c) => {
    const customerOrders = orders.filter((o) => o.customer_id === c.id)
    const total_invoiced = customerOrders.reduce((s, o) => s + o.total_amount, 0)
    const total_paid = payments.filter((p) => p.customer_id === c.id && p.status === 'confirmed').reduce((s, p) => s + p.amount, 0)
    const balance = total_invoiced - total_paid
    const lastPayment = payments.filter((p) => p.customer_id === c.id && p.status === 'confirmed').sort((a, b) => b.payment_date.localeCompare(a.payment_date))[0]
    const oldestUnpaid = customerOrders.filter((o) => o.balance > 0).sort((a, b) => a.order_date.localeCompare(b.order_date))[0]
    const days_outstanding = oldestUnpaid
      ? Math.floor((Date.now() - new Date(oldestUnpaid.order_date).getTime()) / 86400000)
      : 0
    return {
      customer_id: c.id,
      customer_name: c.name,
      total_invoiced,
      total_paid,
      balance,
      days_outstanding,
      last_payment_date: lastPayment?.payment_date || null,
    }
  }).filter((d) => d.total_invoiced > 0)
}

export async function getSalesByItem(): Promise<SalesByItemRow[]> {
  const birdTypes = await getBirdTypes()
  const orders = await getAllOrders()
  const lines = shouldUseMock()
    ? [...mockOrderLines, ...demoSession.orders.flatMap((o) => o.lines || [])]
    : orders.flatMap((o) => o.lines || [])
  const stock = shouldUseMock() ? [...mockStock, ...demoSession.stock] : mockStock
  const totalRevenue = lines.reduce((s, l) => s + l.subtotal, 0)

  return birdTypes.map((bt) => {
    const typeLines = lines.filter((l) => l.bird_type_id === bt.id)
    const quantity = typeLines.reduce((s, l) => s + l.quantity, 0)
    const amount = typeLines.reduce((s, l) => s + l.subtotal, 0)
    const stockEntry = stock.find((s) => s.bird_type_id === bt.id)
    const costPerChick = stockEntry?.supplier_rate_per_chick || bt.own_production_cost
    const cogs = quantity * costPerChick
    const gross_margin = amount - cogs
    return {
      bird_type_name: bt.name,
      quantity,
      amount,
      sales_percent: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
      avg_price: quantity > 0 ? amount / quantity : 0,
      cogs,
      avg_cogs: costPerChick,
      gross_margin,
      gross_margin_percent: amount > 0 ? (gross_margin / amount) * 100 : 0,
    }
  }).filter((r) => r.quantity > 0)
}

export async function openSalesDay(
  date: string,
  adminOverride = false,
  reason?: string,
  context?: { tenantId: string; userId: string }
): Promise<{ data: SalesDay | null; error?: string }> {
  if (shouldUseMock()) {
    if (demoSession.openSalesDay) {
      return { data: null, error: 'A sales day is already open. Close it before opening a new one.' }
    }
    const newDay: SalesDay = {
      id: `sd-${Date.now()}`,
      tenant_id: DEMO_TENANT_ID,
      date,
      status: 'open',
      total_birds_declared: 0,
      total_birds_accounted: 0,
      is_balanced: false,
      admin_override: adminOverride,
      override_reason: reason || null,
      closed_at: null,
      closed_by: null,
      created_at: new Date().toISOString(),
    }
    demoSession.openSalesDay = newDay
    demoSession.stock = []
    demoSession.orders = []
    demoSession.dispositions = []
    mockSessionReconciliation = []
    persistDemoSession()
    return { data: newDay }
  }

  const tenantId = context?.tenantId || DEMO_TENANT_ID
  const userId = context?.userId

  const { data, error } = await supabase
    .from('sales_days')
    .insert({
      tenant_id: tenantId,
      sale_date: date,
      status: 'open',
      admin_override: adminOverride,
      override_reason: reason || null,
      opened_by: userId || null,
      opened_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('openSalesDay error:', error)
    return { data: null, error: error.message }
  }

  return { data: mapSalesDayFromDb(data as Record<string, unknown>) }
}

export async function addStockEntry(
  entry: Partial<SalesSessionStock> & { tenant_id?: string }
): Promise<{ error?: string }> {
  if (shouldUseMock()) {
    const newEntry: SalesSessionStock = {
      id: `st-${Date.now()}`,
      sales_day_id: entry.sales_day_id || '',
      source_type: entry.source_type || 'own_production',
      supplier_id: entry.supplier_id || null,
      bird_type_id: entry.bird_type_id || '',
      quantity_declared: entry.quantity_declared || 0,
      supplier_rate_per_chick: entry.supplier_rate_per_chick ?? null,
      egg_count_hatched: entry.egg_count_hatched ?? null,
      discrepancy_note: entry.discrepancy_note ?? null,
      created_at: new Date().toISOString(),
      created_by: entry.created_by || '',
      bird_type: mockBirdTypes.find((b) => b.id === entry.bird_type_id),
      supplier: demoSession.suppliers.find((s) => s.id === entry.supplier_id),
    }
    demoSession.stock.push(newEntry)
    syncDemoSalesDayTotals()

    if (entry.source_type === 'supplier' && entry.supplier_id && entry.quantity_declared) {
      const rate = entry.supplier_rate_per_chick || 0
      const qty = entry.quantity_declared
      const supplier = demoSession.suppliers.find((s) => s.id === entry.supplier_id)
      const birdType = mockBirdTypes.find((b) => b.id === entry.bird_type_id)
      demoSession.supplierInvoices.push({
        id: `si-${Date.now()}`,
        supplier_id: entry.supplier_id,
        sales_day_id: entry.sales_day_id || '',
        invoice_number: `SUP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`,
        invoice_date: new Date().toISOString().slice(0, 10),
        bird_type_id: entry.bird_type_id || '',
        quantity: qty,
        rate_per_chick: rate,
        total_amount: qty * rate,
        payment_status: 'unpaid',
        amount_paid: 0,
        balance: qty * rate,
        payment_confirmed_by: null,
        payment_confirmed_at: null,
        notes: entry.discrepancy_note ?? null,
        supplier,
        bird_type: birdType,
      })
    }

    persistDemoSession()
    return {}
  }
  const tenantId = entry.tenant_id || DEMO_TENANT_ID
  const payload = mapStockToDb({ ...entry, tenant_id: tenantId })

  const { error: stockError } = await supabase.from('sales_session_stock').insert(payload)
  if (stockError) return { error: stockError.message }

  if (entry.source_type === 'supplier' && entry.supplier_id && entry.quantity_declared) {
    const invoiceNumber = `SUP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`
    const rate = entry.supplier_rate_per_chick ?? 0
    const qty = entry.quantity_declared
    const { error: invoiceError } = await supabase.from('supplier_invoices').insert({
      tenant_id: tenantId,
      supplier_id: entry.supplier_id,
      sales_day_id: entry.sales_day_id,
      invoice_number: invoiceNumber,
      bird_type_id: entry.bird_type_id,
      quantity: qty,
      unit_cost: rate,
      payment_status: 'pending',
      notes: entry.discrepancy_note ?? null,
      created_by: entry.created_by || null,
    })
    if (invoiceError) {
      console.warn('Supplier invoice creation failed:', invoiceError.message)
    }
  }

  return {}
}

export async function createOrder(
  order: Partial<SalesOrder>,
  lines: Partial<SalesOrderLine>[]
): Promise<{ error?: string }> {
  if (shouldUseMock()) {
    if (!demoSession.openSalesDay || order.sales_day_id !== demoSession.openSalesDay.id) {
      return { error: 'No open sales day for this order' }
    }

    const existingLines = demoSession.orders.flatMap((o) => o.lines || [])
    const prospectiveLines = lines.map((l, i) => ({
      id: `pending-${i}`,
      order_id: 'pending',
      bird_type_id: l.bird_type_id || '',
      grade: l.grade || 'good',
      quantity: l.quantity || 0,
      rate_per_chick: l.rate_per_chick || 0,
      subtotal: l.subtotal || 0,
    }))
    const recon = computeReconciliation(
      mockBirdTypes,
      demoSession.stock,
      [...existingLines, ...prospectiveLines],
      demoSession.dispositions
    )

    for (const line of lines) {
      const onGroundBeforeOrder = getOnGroundForBirdType(
        computeReconciliation(mockBirdTypes, demoSession.stock, existingLines, demoSession.dispositions),
        line.bird_type_id || ''
      )
      const sameTypeInOrder = lines
        .filter((l) => l.bird_type_id === line.bird_type_id)
        .reduce((s, l) => s + (l.quantity || 0), 0)
      if (sameTypeInOrder > onGroundBeforeOrder) {
        const birdName = mockBirdTypes.find((bt) => bt.id === line.bird_type_id)?.name || 'bird type'
        return {
          error:
            onGroundBeforeOrder === 0
              ? `No ${birdName} on ground — declare stock before taking orders`
              : `Only ${onGroundBeforeOrder} ${birdName} on ground — cannot sell more than declared stock`,
        }
      }
    }

    const oversoldRow = recon.find((r) => r.oversold > 0)
    if (oversoldRow) {
      return {
        error: `Order exceeds declared stock for ${oversoldRow.bird_type_name} by ${oversoldRow.oversold} birds`,
      }
    }

    const orderId = `o-${Date.now()}`
    const customer = demoSession.customers.find((c) => c.id === order.customer_id)
    const newOrder: SalesOrder = {
      id: orderId,
      tenant_id: DEMO_TENANT_ID,
      sales_day_id: order.sales_day_id || '',
      customer_id: order.customer_id || '',
      order_number: order.order_number || `ORD-${Date.now()}`,
      order_date: order.order_date || new Date().toISOString(),
      status: order.status || 'pending',
      subtotal: order.subtotal || 0,
      total_amount: order.total_amount || 0,
      amount_paid: order.amount_paid || 0,
      balance: order.balance || 0,
      created_by: order.created_by || '',
      notes: order.notes ?? null,
      customer,
      lines: lines.map((l, i) => ({
        id: `ol-${Date.now()}-${i}`,
        order_id: orderId,
        bird_type_id: l.bird_type_id || '',
        grade: l.grade || 'good',
        quantity: l.quantity || 0,
        rate_per_chick: l.rate_per_chick || 0,
        subtotal: l.subtotal || 0,
        bird_type: mockBirdTypes.find((bt) => bt.id === l.bird_type_id),
      })),
    }
    demoSession.orders.push(newOrder)
    syncDemoSalesDayTotals()
    persistDemoSession()
    return {}
  }

  const { data, error } = await supabase.from('sales_orders').insert(order).select().single()
  if (error) return { error: error.message }
  if (data) {
    const { error: linesError } = await supabase
      .from('sales_order_lines')
      .insert(lines.map((l) => ({ ...l, order_id: data.id })))
    if (linesError) return { error: linesError.message }
  }
  return {}
}

export async function addDisposition(entry: Partial<BirdDisposition>): Promise<void> {
  if (shouldUseMock()) {
    demoSession.dispositions.push({
      id: `d-${Date.now()}`,
      sales_day_id: entry.sales_day_id || '',
      bird_type_id: entry.bird_type_id || '',
      disposition_type: entry.disposition_type || 'reject',
      quantity: entry.quantity || 0,
      notes: entry.notes ?? null,
      recorded_by: entry.recorded_by || '',
      recorded_at: new Date().toISOString(),
      bird_type: mockBirdTypes.find((b) => b.id === entry.bird_type_id),
    })
    syncDemoSalesDayTotals()
    persistDemoSession()
    return
  }
  await supabase.from('bird_dispositions').insert(entry)
}

export async function addSupplier(supplier: Partial<Supplier>): Promise<{ data?: Supplier; error?: string }> {
  if (shouldUseMock()) {
    const name = supplier.name?.trim() || ''
    if (demoSession.suppliers.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return { error: 'A supplier with this name already exists' }
    }
    const created: Supplier = {
      id: supplier.id || `s-${Date.now()}`,
      tenant_id: DEMO_TENANT_ID,
      name,
      contact_person: supplier.contact_person?.trim() || null,
      phone: supplier.phone?.trim() || null,
      email: supplier.email?.trim() || null,
      address: supplier.address?.trim() || null,
      is_active: true,
      payment_terms: supplier.payment_terms?.trim() || null,
      notes: supplier.notes?.trim() || null,
      created_at: new Date().toISOString(),
    }
    demoSession.suppliers.push(created)
    persistDemoSession()
    return { data: created }
  }

  const { data, error } = await supabase.from('suppliers').insert(supplier).select().single()
  if (error) return { error: error.message }
  return { data: data as Supplier }
}

export async function addCustomer(customer: Partial<Customer>): Promise<{ data?: Customer; error?: string }> {
  if (shouldUseMock()) {
    const created: Customer = {
      id: customer.id || `c-${Date.now()}`,
      tenant_id: DEMO_TENANT_ID,
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email ?? null,
      business_name: customer.business_name ?? null,
      address: customer.address ?? null,
      customer_type: customer.customer_type || 'retail',
      credit_limit: customer.credit_limit ?? 0,
      is_active: true,
      notes: customer.notes ?? null,
      created_at: customer.created_at || new Date().toISOString(),
    }
    demoSession.customers.push(created)
    persistDemoSession()
    return { data: created }
  }

  const { data, error } = await supabase.from('customers').insert(customer).select().single()
  if (error) return { error: error.message }
  return { data: data as Customer }
}

export async function confirmPayment(
  payment: Partial<CustomerPayment>
): Promise<{ error?: string }> {
  if (shouldUseMock()) {
    const orderId = payment.order_id
    if (!orderId) return { error: 'Order is required' }

    const sessionOrder = demoSession.orders.find((o) => o.id === orderId)
    if (!sessionOrder) {
      return { error: 'Order not found in current session — only today\'s sales orders can be confirmed here' }
    }

    const amount = payment.amount || 0
    if (amount <= 0) return { error: 'Payment amount must be greater than 0' }
    if (amount > sessionOrder.balance) {
      return { error: `Amount exceeds outstanding balance of ₦${sessionOrder.balance.toLocaleString()}` }
    }

    const newPaid = sessionOrder.amount_paid + amount
    const newBalance = sessionOrder.total_amount - newPaid
    sessionOrder.amount_paid = newPaid
    sessionOrder.balance = newBalance
    sessionOrder.status = newBalance <= 0 ? 'paid' : 'partial_payment'

    demoSession.payments.push({
      id: `p-${Date.now()}`,
      order_id: sessionOrder.id,
      customer_id: sessionOrder.customer_id,
      amount,
      payment_date: payment.payment_date || new Date().toISOString().slice(0, 10),
      payment_method: payment.payment_method || 'bank_transfer',
      bank_reference: payment.bank_reference ?? null,
      confirmed_by: payment.confirmed_by || 'demo-accounts',
      confirmed_at: new Date().toISOString(),
      status: 'confirmed',
      notes: payment.notes ?? null,
    })

    persistDemoSession()
    return {}
  }

  const { error } = await supabase
    .from('customer_payments')
    .insert({ ...payment, status: 'confirmed', confirmed_at: new Date().toISOString() })
  return error ? { error: error.message } : {}
}

export async function confirmSupplierPayment(invoiceId: string): Promise<{ error?: string }> {
  if (shouldUseMock()) {
    const invoice = demoSession.supplierInvoices.find((inv) => inv.id === invoiceId)
    if (!invoice) return { error: 'Supplier invoice not found' }

    invoice.payment_status = 'paid'
    invoice.amount_paid = invoice.total_amount
    invoice.balance = 0
    invoice.payment_confirmed_at = new Date().toISOString()
    invoice.payment_confirmed_by = 'demo-accounts'
    persistDemoSession()
    return {}
  }
  const { data: invoice } = await supabase.from('supplier_invoices').select('total_amount').eq('id', invoiceId).single()
  if (!invoice) return { error: 'Supplier invoice not found' }
  await supabase.from('supplier_invoices').update({
    payment_status: 'paid',
    amount_paid: invoice.total_amount,
    balance: 0,
    payment_confirmed_at: new Date().toISOString(),
  }).eq('id', invoiceId)
  return {}
}

export async function closeSalesDay(salesDayId: string): Promise<void> {
  if (shouldUseMock()) {
    if (demoSession.openSalesDay?.id === salesDayId) {
      demoSession.openSalesDay = null
      persistDemoSession()
    }
    return
  }
  await supabase.from('sales_days').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', salesDayId)
}

export async function getDeclaredBirdTypeIds(salesDayId: string): Promise<string[]> {
  const stock = await getStockForSalesDay(salesDayId)
  return [...new Set(stock.map((s) => s.bird_type_id))]
}

export async function getLastCustomerBirdRate(
  customerId: string,
  birdTypeId: string
): Promise<number | null> {
  const orders = await getAllOrders()
  const customerOrders = orders
    .filter((o) => o.customer_id === customerId)
    .sort((a, b) => b.order_date.localeCompare(a.order_date))
  for (const order of customerOrders) {
    const line = order.lines?.find((l) => l.bird_type_id === birdTypeId)
    if (line && line.rate_per_chick > 0) return line.rate_per_chick
  }
  return null
}

export async function getCustomerOutstandingBalance(customerId: string): Promise<number> {
  const orders = await getAllOrders()
  const payments = await getPayments()
  const invoiced = orders.filter((o) => o.customer_id === customerId).reduce((s, o) => s + o.total_amount, 0)
  const paid = payments
    .filter((p) => p.customer_id === customerId && p.status === 'confirmed')
    .reduce((s, p) => s + p.amount, 0)
  return Math.max(0, invoiced - paid)
}

export async function getPaymentsForOrder(orderId: string): Promise<CustomerPayment[]> {
  const payments = await getPayments()
  return payments.filter((p) => p.order_id === orderId && p.status === 'confirmed')
}

export async function getSalesDaySummaries(
  preset: DateRangePreset = 'all_time',
  customStart?: string,
  customEnd?: string
): Promise<SalesDaySummary[]> {
  const range = resolveDateRange(preset, customStart, customEnd)
  const days = await getSalesDays(50)
  const summaries: SalesDaySummary[] = []

  for (const day of days) {
    if (!isDateInRange(day.date, range)) continue
    const stock = await getStockForSalesDay(day.id)
    const orders = await getOrdersForSalesDay(day.id)
    const dispositions = await getDispositions(day.id)
    const recon = await getReconciliation(day.id)

    const declared = stock.reduce((s, st) => s + st.quantity_declared, 0)
    const sold = recon.reduce((s, r) => s + r.good_sold + r.second_class_sold, 0)
    const rejects = recon.reduce((s, r) => s + r.rejects, 0)
    const mortality = recon.reduce((s, r) => s + r.mortality, 0)
    const farm_transfer = recon.reduce((s, r) => s + r.farm_transfer, 0)
    const revenue = orders.reduce((s, o) => s + o.total_amount, 0)
    const collected = orders.reduce((s, o) => s + o.amount_paid, 0)

    summaries.push({
      sales_day_id: day.id,
      date: day.date,
      status: day.status,
      declared,
      sold,
      rejects,
      mortality,
      farm_transfer,
      revenue,
      collected,
      orders,
      stock,
      dispositions,
    })
  }

  return summaries.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getSupplierAnalytics(): Promise<SupplierAnalyticsRow[]> {
  const invoices = await getSupplierInvoices()
  const suppliers = await getSuppliers()
  const birdTypes = await getBirdTypes()

  const bySupplier = new Map<string, SupplierInvoice[]>()
  invoices.forEach((inv) => {
    const list = bySupplier.get(inv.supplier_id) || []
    list.push(inv)
    bySupplier.set(inv.supplier_id, list)
  })

  const rows: SupplierAnalyticsRow[] = suppliers.map((sup) => {
    const invs = bySupplier.get(sup.id) || []
    const total_birds = invs.reduce((s, i) => s + i.quantity, 0)
    const total_spend = invs.reduce((s, i) => s + i.total_amount, 0)
    const total_paid = invs.reduce((s, i) => s + i.amount_paid, 0)
    const outstanding = invs.reduce((s, i) => s + i.balance, 0)
    const birdTypeNames = [
      ...new Set(
        invs.map((i) => birdTypes.find((bt) => bt.id === i.bird_type_id)?.name || 'Unknown')
      ),
    ]
    const avg_rate =
      total_birds > 0 ? invs.reduce((s, i) => s + i.rate_per_chick * i.quantity, 0) / total_birds : 0
    const paidSessions = invs.filter((i) => i.payment_status === 'paid').length
    const reliability_score = invs.length > 0 ? Math.round((paidSessions / invs.length) * 100) : 100

    return {
      supplier_id: sup.id,
      supplier_name: sup.name,
      bird_types: birdTypeNames,
      sessions: invs.length,
      total_birds,
      total_spend,
      total_paid,
      outstanding,
      avg_rate,
      reliability_score,
      is_top_supplier: false,
    }
  })

  const sorted = rows.filter((r) => r.sessions > 0).sort((a, b) => b.total_birds - a.total_birds)
  sorted.slice(0, 3).forEach((r) => {
    r.is_top_supplier = true
  })
  return sorted.length > 0 ? sorted : rows
}

export async function getARAgingBuckets(): Promise<ARAgingBucket[]> {
  const debtors = await getDebtorsLedger()
  const withBalance = debtors.filter((d) => d.balance > 0)
  const total = withBalance.reduce((s, d) => s + d.balance, 0) || 1

  const buckets = {
    current: 0,
    overdue: 0,
    at_risk: 0,
    bad_debt: 0,
  }

  withBalance.forEach((d) => {
    const days = d.days_outstanding
    if (days <= 7) buckets.current += d.balance
    else if (days <= 14) buckets.overdue += d.balance
    else if (days <= 30) buckets.at_risk += d.balance
    else buckets.bad_debt += d.balance
  })

  return [
    { label: 'Current (0–7 days)', key: 'current', amount: buckets.current, percent: (buckets.current / total) * 100, color: '#10259C' },
    { label: 'Overdue (8–14 days)', key: 'overdue', amount: buckets.overdue, percent: (buckets.overdue / total) * 100, color: '#F0F2FA' },
    { label: 'At-Risk (15–30 days)', key: 'at_risk', amount: buckets.at_risk, percent: (buckets.at_risk / total) * 100, color: '#001996' },
    { label: 'Bad Debt Risk (30+ days)', key: 'bad_debt', amount: buckets.bad_debt, percent: (buckets.bad_debt / total) * 100, color: '#FF052E' },
  ]
}

export async function globalSearch(query: string, role: UserRole): Promise<GlobalSearchResult[]> {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const results: GlobalSearchResult[] = []

  const customers = await getCustomers()
  customers
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.business_name || '').toLowerCase().includes(q)
    )
    .slice(0, 5)
    .forEach((c) => {
      results.push({ type: 'customer', id: c.id, label: c.name, sublabel: c.phone })
    })

  const orders = await getAllOrders()
  orders
    .filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        (o.customer?.name || '').toLowerCase().includes(q)
    )
    .slice(0, 5)
    .forEach((o) => {
      results.push({
        type: 'order',
        id: o.id,
        label: o.order_number,
        sublabel: o.customer?.name,
      })
    })

  if (hasPermission(role, 'accounts.supplier_activity')) {
    const suppliers = await getSuppliers()
    suppliers
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.contact_person || '').toLowerCase().includes(q) ||
          (s.phone || '').includes(q)
      )
      .slice(0, 5)
      .forEach((s) => {
        results.push({
          type: 'supplier',
          id: s.id,
          label: s.name,
          sublabel: s.contact_person || s.phone || undefined,
        })
      })
  }

  return results.slice(0, 12)
}

export function isDemoMode(): boolean {
  return shouldUseMock()
}