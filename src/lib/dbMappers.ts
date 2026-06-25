import type {
  BirdType,
  BirdGrade,
  BirdDisposition,
  Customer,
  CustomerPayment,
  CustomerType,
  DispositionType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  SalesOrder,
  SalesOrderLine,
  Supplier,
  SupplierInvoice,
  SupplierPaymentStatus,
} from '@/types'

const PAYMENT_TERMS_MARKER = 'Payment terms:'
const BUSINESS_NAME_MARKER = 'Business:'

// ---------------------------------------------------------------------------
// Notes helpers (store app-only fields in DB notes column)
// ---------------------------------------------------------------------------

export function buildSupplierNotes(
  payment_terms?: string | null,
  notes?: string | null
): string | null {
  const parts: string[] = []
  if (payment_terms?.trim()) parts.push(`${PAYMENT_TERMS_MARKER} ${payment_terms.trim()}`)
  if (notes?.trim()) parts.push(notes.trim())
  return parts.length ? parts.join(' | ') : null
}

export function parseSupplierNotes(notes: string | null | undefined): {
  payment_terms: string | null
  notes: string | null
} {
  if (!notes?.trim()) return { payment_terms: null, notes: null }
  const termsMatch = notes.match(/Payment terms:\s*([^|]+)/i)
  const payment_terms = termsMatch ? termsMatch[1].trim() : null
  const remaining =
    notes.replace(/Payment terms:\s*[^|]+\s*(\|\s*)?/i, '').trim() || null
  return { payment_terms, notes: remaining }
}

export function buildCustomerNotes(
  business_name?: string | null,
  notes?: string | null
): string | null {
  const parts: string[] = []
  if (business_name?.trim()) parts.push(`${BUSINESS_NAME_MARKER} ${business_name.trim()}`)
  if (notes?.trim()) parts.push(notes.trim())
  return parts.length ? parts.join(' | ') : null
}

export function parseCustomerNotes(notes: string | null | undefined): {
  business_name: string | null
  notes: string | null
} {
  if (!notes?.trim()) return { business_name: null, notes: null }
  const bizMatch = notes.match(/Business:\s*([^|]+)/i)
  const business_name = bizMatch ? bizMatch[1].trim() : null
  const remaining =
    notes.replace(/Business:\s*[^|]+\s*(\|\s*)?/i, '').trim() || null
  return { business_name, notes: remaining }
}

// ---------------------------------------------------------------------------
// Enum mappings
// ---------------------------------------------------------------------------

export function mapCustomerTypeToDb(type: CustomerType): string {
  const map: Record<CustomerType, string> = {
    regular: 'retail',
    retail: 'retail',
    wholesale: 'wholesale',
    agent: 'farm',
  }
  return map[type] || 'retail'
}

export function mapCustomerTypeFromDb(type: string): CustomerType {
  const map: Record<string, CustomerType> = {
    retail: 'retail',
    wholesale: 'wholesale',
    distributor: 'wholesale',
    farm: 'agent',
  }
  return map[type] || 'retail'
}

export function mapGradeToDb(grade: BirdGrade): string {
  return grade === 'second_class' ? 'economy' : 'standard'
}

export function mapGradeFromDb(grade: string): BirdGrade {
  return grade === 'economy' ? 'second_class' : 'good'
}

export function mapDispositionTypeToDb(type: DispositionType): string {
  const map: Record<DispositionType, string> = {
    reject: 'spoilage',
    mortality: 'mortality',
    farm_transfer: 'transfer',
  }
  return map[type] || 'other'
}

export function mapDispositionTypeFromDb(type: string): DispositionType {
  const map: Record<string, DispositionType> = {
    spoilage: 'reject',
    mortality: 'mortality',
    transfer: 'farm_transfer',
    gift: 'reject',
    compensation: 'reject',
    other: 'reject',
  }
  return map[type] || 'reject'
}

export function mapOrderStatusToDb(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending: 'pending',
    confirmed: 'confirmed',
    partial_payment: 'confirmed',
    paid: 'completed',
    cancelled: 'cancelled',
  }
  return map[status] || 'pending'
}

export function mapOrderStatusFromDb(
  orderStatus: string,
  paymentStatus: string
): OrderStatus {
  if (paymentStatus === 'paid' || paymentStatus === 'confirmed') return 'paid'
  if (paymentStatus === 'partial') return 'partial_payment'
  const map: Record<string, OrderStatus> = {
    draft: 'pending',
    pending: 'pending',
    confirmed: 'confirmed',
    completed: 'paid',
    cancelled: 'cancelled',
  }
  return map[orderStatus] || 'pending'
}

export function mapPaymentStatusToDb(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    pending_confirmation: 'pending',
    confirmed: 'confirmed',
    reversed: 'rejected',
  }
  return map[status] || 'pending'
}

export function mapPaymentStatusFromDb(status: string): PaymentStatus {
  const map: Record<string, PaymentStatus> = {
    pending: 'pending_confirmation',
    partial: 'pending_confirmation',
    paid: 'confirmed',
    confirmed: 'confirmed',
    rejected: 'reversed',
    refunded: 'reversed',
  }
  return map[status] || 'pending_confirmation'
}

export function mapPaymentMethodToDb(method: PaymentMethod): string {
  if (method === 'paystack') return 'bank_transfer'
  return method
}

export function mapPaymentMethodFromDb(method: string): PaymentMethod {
  if (method === 'mobile_money') return 'bank_transfer'
  return method as PaymentMethod
}

export function mapSupplierPaymentStatusFromDb(status: string): SupplierPaymentStatus {
  if (status === 'partial') return 'partial'
  if (status === 'paid' || status === 'confirmed') return 'paid'
  return 'unpaid'
}

// ---------------------------------------------------------------------------
// Entity mappers
// ---------------------------------------------------------------------------

export function mapBirdTypeFromDb(row: Record<string, unknown>): BirdType {
  const name = String(row.name || '')
  const code = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4)
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    name,
    code: (row.code as string) || code,
    own_production_cost: Number(row.own_production_cost ?? 0),
    is_active: Boolean(row.is_active ?? true),
    sort_order: Number(row.sort_order ?? 0),
    deleted_at: (row.deleted_at as string) || null,
  }
}

export function mapSupplierFromDb(row: Record<string, unknown>): Supplier {
  const parsed = parseSupplierNotes((row.notes as string) || null)
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    name: row.name as string,
    contact_person: (row.contact_person as string) || null,
    phone: (row.phone as string) || null,
    email: (row.email as string) || null,
    address: (row.address as string) || null,
    is_active: Boolean(row.is_active ?? true),
    payment_terms: parsed.payment_terms,
    notes: parsed.notes,
    created_at: (row.created_at as string) || new Date().toISOString(),
  }
}

export function mapSupplierToDb(
  supplier: Partial<Supplier> & { tenant_id: string }
): Record<string, unknown> {
  return {
    tenant_id: supplier.tenant_id,
    name: supplier.name?.trim(),
    contact_person: supplier.contact_person?.trim() || null,
    phone: supplier.phone?.trim() || null,
    email: supplier.email?.trim() || null,
    address: supplier.address?.trim() || null,
    notes: buildSupplierNotes(supplier.payment_terms, supplier.notes),
    is_active: supplier.is_active ?? true,
  }
}

export function mapCustomerFromDb(row: Record<string, unknown>): Customer {
  const parsed = parseCustomerNotes((row.notes as string) || null)
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    name: row.name as string,
    phone: (row.phone as string) || '',
    email: (row.email as string) || null,
    business_name: parsed.business_name,
    address: (row.address as string) || null,
    customer_type: mapCustomerTypeFromDb(String(row.customer_type || 'retail')),
    credit_limit: Number(row.credit_limit ?? 0),
    is_active: Boolean(row.is_active ?? true),
    notes: parsed.notes,
    created_at: (row.created_at as string) || new Date().toISOString(),
  }
}

export function mapCustomerToDb(
  customer: Partial<Customer> & { tenant_id: string }
): Record<string, unknown> {
  return {
    tenant_id: customer.tenant_id,
    name: customer.name?.trim(),
    phone: customer.phone?.trim() || null,
    email: customer.email?.trim() || null,
    address: customer.address?.trim() || null,
    customer_type: mapCustomerTypeToDb(customer.customer_type || 'retail'),
    credit_limit: customer.credit_limit ?? 0,
    notes: buildCustomerNotes(customer.business_name, customer.notes),
    is_active: customer.is_active ?? true,
  }
}

export function mapOrderLineFromDb(
  row: Record<string, unknown>,
  orderId: string
): SalesOrderLine {
  const quantity = Number(row.quantity ?? 0)
  const rate = Number(row.unit_price ?? row.rate_per_chick ?? 0)
  const birdTypeRow = row.bird_type as Record<string, unknown> | undefined
  const birdType = birdTypeRow ? mapBirdTypeFromDb(birdTypeRow) : undefined
  return {
    id: row.id as string,
    order_id: orderId,
    bird_type_id: row.bird_type_id as string,
    grade: mapGradeFromDb(String(row.grade || 'standard')),
    quantity,
    rate_per_chick: rate,
    subtotal: Number(row.line_total ?? row.subtotal ?? quantity * rate),
    bird_type: birdType,
  }
}

export function mapOrderLineToDb(
  line: Partial<SalesOrderLine>,
  salesOrderId: string,
  tenantId: string
): Record<string, unknown> {
  const quantity = line.quantity || 0
  const unitPrice = line.rate_per_chick ?? 0
  return {
    tenant_id: tenantId,
    sales_order_id: salesOrderId,
    bird_type_id: line.bird_type_id,
    grade: mapGradeToDb(line.grade || 'good'),
    quantity,
    unit_price: unitPrice,
  }
}

export function mapOrderFromDb(
  row: Record<string, unknown>,
  payments: CustomerPayment[] = []
): SalesOrder {
  const orderId = row.id as string
  const totalAmount = Number(row.total_amount ?? 0)
  const paymentStatus = String(row.payment_status || 'pending')
  const orderStatus = String(row.status || 'pending')

  const orderPayments = payments.filter(
    (p) => p.order_id === orderId && p.status === 'confirmed'
  )
  const amountPaid = orderPayments.reduce((s, p) => s + p.amount, 0)
  const balance = Math.max(0, totalAmount - amountPaid)

  let status = mapOrderStatusFromDb(orderStatus, paymentStatus)
  if (amountPaid > 0 && balance > 0) status = 'partial_payment'
  if (balance <= 0 && totalAmount > 0 && amountPaid > 0) status = 'paid'
  if (amountPaid === 0 && orderStatus === 'pending') status = 'pending'

  const rawLines = (row.lines as Record<string, unknown>[]) || []
  const customerRow = row.customer as Record<string, unknown> | undefined

  return {
    id: orderId,
    tenant_id: row.tenant_id as string,
    sales_day_id: row.sales_day_id as string,
    customer_id: row.customer_id as string,
    order_number: row.order_number as string,
    order_date: String(row.order_date || '').slice(0, 10),
    status,
    subtotal: Number(row.subtotal ?? totalAmount),
    total_amount: totalAmount,
    amount_paid: amountPaid,
    balance,
    created_by: (row.created_by as string) || '',
    notes: (row.notes as string) || null,
    customer: customerRow ? mapCustomerFromDb(customerRow) : undefined,
    lines: rawLines.map((l) => mapOrderLineFromDb(l, orderId)),
  }
}

export function mapOrderToDb(
  order: Partial<SalesOrder> & { tenant_id: string }
): Record<string, unknown> {
  const orderDate = order.order_date
    ? String(order.order_date).slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  const status = order.status || 'pending'
  const totalAmount = order.total_amount ?? order.subtotal ?? 0

  let paymentStatus = 'pending'
  if (status === 'paid') paymentStatus = 'paid'
  else if (status === 'partial_payment') paymentStatus = 'partial'

  return {
    tenant_id: order.tenant_id,
    sales_day_id: order.sales_day_id,
    customer_id: order.customer_id,
    order_number: order.order_number,
    order_date: orderDate,
    status: mapOrderStatusToDb(status),
    payment_status: paymentStatus,
    subtotal: order.subtotal ?? totalAmount,
    discount_amount: 0,
    total_amount: totalAmount,
    notes: order.notes ?? null,
    created_by: order.created_by || null,
  }
}

export function mapDispositionFromDb(row: Record<string, unknown>): BirdDisposition {
  const birdTypeRow = row.bird_type as Record<string, unknown> | undefined
  const birdType = birdTypeRow ? mapBirdTypeFromDb(birdTypeRow) : undefined
  return {
    id: row.id as string,
    sales_day_id: row.sales_day_id as string,
    bird_type_id: row.bird_type_id as string,
    disposition_type: mapDispositionTypeFromDb(String(row.disposition_type || 'other')),
    quantity: Number(row.quantity ?? 0),
    notes: (row.notes as string) || null,
    recorded_by: (row.recorded_by as string) || '',
    recorded_at: (row.created_at as string) || new Date().toISOString(),
    bird_type: birdType,
  }
}

export function mapDispositionToDb(
  entry: Partial<BirdDisposition> & { tenant_id: string }
): Record<string, unknown> {
  return {
    tenant_id: entry.tenant_id,
    sales_day_id: entry.sales_day_id,
    bird_type_id: entry.bird_type_id,
    disposition_type: mapDispositionTypeToDb(entry.disposition_type || 'reject'),
    grade: 'standard',
    quantity: entry.quantity || 0,
    notes: entry.notes ?? null,
    recorded_by: entry.recorded_by || null,
  }
}

export function mapPaymentFromDb(row: Record<string, unknown>): CustomerPayment {
  return {
    id: row.id as string,
    order_id: (row.sales_order_id as string) || (row.order_id as string) || '',
    customer_id: row.customer_id as string,
    amount: Number(row.amount ?? 0),
    payment_date: String(row.created_at || row.payment_date || '').slice(0, 10),
    payment_method: mapPaymentMethodFromDb(String(row.payment_method || 'cash')),
    bank_reference: (row.reference_number as string) || (row.bank_reference as string) || null,
    confirmed_by: (row.confirmed_by as string) || null,
    confirmed_at: (row.confirmed_at as string) || null,
    status: mapPaymentStatusFromDb(String(row.payment_status || row.status || 'pending')),
    notes: (row.notes as string) || null,
  }
}

export function mapPaymentToDb(
  payment: Partial<CustomerPayment> & { tenant_id: string; sales_day_id?: string }
): Record<string, unknown> {
  return {
    tenant_id: payment.tenant_id,
    customer_id: payment.customer_id,
    sales_order_id: payment.order_id,
    sales_day_id: payment.sales_day_id ?? null,
    amount: payment.amount,
    payment_method: mapPaymentMethodToDb(payment.payment_method || 'cash'),
    payment_status: mapPaymentStatusToDb(payment.status || 'confirmed'),
    reference_number: payment.bank_reference ?? null,
    notes: payment.notes ?? null,
    confirmed_by: payment.confirmed_by ?? null,
    confirmed_at: payment.confirmed_at ?? new Date().toISOString(),
  }
}

export function mapSupplierInvoiceFromDb(row: Record<string, unknown>): SupplierInvoice {
  const quantity = Number(row.quantity ?? 0)
  const rate = Number(row.unit_cost ?? row.rate_per_chick ?? 0)
  const totalAmount = Number(row.total_amount ?? quantity * rate)
  const paymentStatus = mapSupplierPaymentStatusFromDb(String(row.payment_status || 'pending'))
  const amountPaid = paymentStatus === 'paid' ? totalAmount : paymentStatus === 'partial' ? 0 : 0
  const balance = totalAmount - amountPaid
  const supplierRow = row.supplier as Record<string, unknown> | undefined
  const birdTypeRow = row.bird_type as Record<string, unknown> | undefined
  const supplier = supplierRow ? mapSupplierFromDb(supplierRow) : undefined
  const birdType = birdTypeRow ? mapBirdTypeFromDb(birdTypeRow) : undefined

  return {
    id: row.id as string,
    supplier_id: row.supplier_id as string,
    sales_day_id: (row.sales_day_id as string) || '',
    invoice_number: row.invoice_number as string,
    invoice_date: String(row.invoice_date || '').slice(0, 10),
    bird_type_id: (row.bird_type_id as string) || '',
    quantity,
    rate_per_chick: rate,
    total_amount: totalAmount,
    payment_status: paymentStatus,
    amount_paid: amountPaid,
    balance,
    payment_confirmed_by: null,
    payment_confirmed_at: paymentStatus === 'paid' ? (row.updated_at as string) || null : null,
    notes: (row.notes as string) || null,
    supplier,
    bird_type: birdType,
  }
}

export function mapSupplierInvoiceToDb(
  invoice: Partial<SupplierInvoice> & { tenant_id: string }
): Record<string, unknown> {
  const qty = invoice.quantity || 0
  const rate = invoice.rate_per_chick ?? 0
  const subtotal = qty * rate
  return {
    tenant_id: invoice.tenant_id,
    supplier_id: invoice.supplier_id,
    sales_day_id: invoice.sales_day_id,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date || new Date().toISOString().slice(0, 10),
    bird_type_id: invoice.bird_type_id,
    quantity: qty,
    unit_cost: rate,
    subtotal,
    tax_amount: 0,
    total_amount: invoice.total_amount ?? subtotal,
    payment_status: invoice.payment_status === 'paid' ? 'paid' : 'pending',
    notes: invoice.notes ?? null,
  }
}