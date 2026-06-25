export type UserRole =
  | 'admin'
  | 'sales_manager'
  | 'sales_staff'
  | 'accounts_manager'
  | 'accounts_staff'
  | 'md'

export type SalesDayStatus = 'open' | 'reconciling' | 'closed'
export type OrderStatus = 'pending' | 'confirmed' | 'partial_payment' | 'paid' | 'cancelled'
export type PaymentStatus = 'pending_confirmation' | 'confirmed' | 'reversed'
export type DispositionType = 'reject' | 'mortality' | 'farm_transfer'
export type CustomerType = 'regular' | 'wholesale' | 'retail' | 'agent'
export type PaymentMethod = 'bank_transfer' | 'cash' | 'pos' | 'cheque' | 'paystack'
export type SourceType = 'own_production' | 'supplier'
export type BirdGrade = 'good' | 'second_class'
export type SupplierPaymentStatus = 'unpaid' | 'partial' | 'paid'

export interface Tenant {
  id: string
  name: string
  slug: string
  subdomain: string | null
  plan: 'free' | 'growth' | 'enterprise'
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  tenant_id: string
  full_name: string
  role: UserRole
  phone: string | null
  is_active: boolean
  last_active_at: string | null
  created_at: string
}

export interface BirdType {
  id: string
  tenant_id: string
  name: string
  code: string
  own_production_cost: number
  is_active: boolean
  sort_order: number
  deleted_at: string | null
}

export interface SalesDay {
  id: string
  tenant_id: string
  date: string
  status: SalesDayStatus
  total_birds_declared: number
  total_birds_accounted: number
  is_balanced: boolean
  admin_override: boolean
  override_reason: string | null
  closed_at: string | null
  closed_by: string | null
  created_at: string
}

export interface SalesSessionStock {
  id: string
  sales_day_id: string
  source_type: SourceType
  supplier_id: string | null
  bird_type_id: string
  quantity_declared: number
  supplier_rate_per_chick: number | null
  egg_count_hatched: number | null
  discrepancy_note: string | null
  created_at: string
  created_by: string
  bird_type?: BirdType
  supplier?: Supplier
}

export interface Customer {
  id: string
  tenant_id: string
  name: string
  phone: string
  email: string | null
  business_name: string | null
  address: string | null
  customer_type: CustomerType
  credit_limit: number
  is_active: boolean
  notes: string | null
  created_at: string
}

export interface SalesOrder {
  id: string
  tenant_id: string
  sales_day_id: string
  customer_id: string
  order_number: string
  order_date: string
  status: OrderStatus
  subtotal: number
  total_amount: number
  amount_paid: number
  balance: number
  created_by: string
  notes: string | null
  customer?: Customer
  lines?: SalesOrderLine[]
}

export interface SalesOrderLine {
  id: string
  order_id: string
  bird_type_id: string
  grade: BirdGrade
  quantity: number
  rate_per_chick: number
  subtotal: number
  bird_type?: BirdType
}

export interface BirdDisposition {
  id: string
  sales_day_id: string
  bird_type_id: string
  disposition_type: DispositionType
  quantity: number
  notes: string | null
  recorded_by: string
  recorded_at: string
  bird_type?: BirdType
}

export interface Supplier {
  id: string
  tenant_id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
  payment_terms: string | null
  notes: string | null
  created_at: string
}

export interface SupplierInvoice {
  id: string
  supplier_id: string
  sales_day_id: string
  invoice_number: string
  invoice_date: string
  bird_type_id: string
  quantity: number
  rate_per_chick: number
  total_amount: number
  payment_status: SupplierPaymentStatus
  amount_paid: number
  balance: number
  payment_confirmed_by: string | null
  payment_confirmed_at: string | null
  notes: string | null
  supplier?: Supplier
  bird_type?: BirdType
}

export interface CustomerPayment {
  id: string
  order_id: string
  customer_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  bank_reference: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  status: PaymentStatus
  notes: string | null
}

export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface CompanySettings {
  id: string
  tenant_id: string
  company_name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  order_number_prefix: string
  default_sales_days: number[]
  allow_admin_override: boolean
}

export interface ReconciliationRow {
  bird_type_id: string
  bird_type_name: string
  declared: number
  good_sold: number
  second_class_sold: number
  rejects: number
  mortality: number
  farm_transfer: number
  balance: number
  oversold: number
  is_balanced: boolean
}

export interface DebtorRow {
  customer_id: string
  customer_name: string
  total_invoiced: number
  total_paid: number
  balance: number
  days_outstanding: number
  last_payment_date: string | null
}

export interface SalesDaySummary {
  sales_day_id: string
  date: string
  status: SalesDayStatus
  declared: number
  sold: number
  rejects: number
  mortality: number
  farm_transfer: number
  revenue: number
  collected: number
  orders: SalesOrder[]
  stock: SalesSessionStock[]
  dispositions: BirdDisposition[]
}

export interface SupplierAnalyticsRow {
  supplier_id: string
  supplier_name: string
  bird_types: string[]
  sessions: number
  total_birds: number
  total_spend: number
  total_paid: number
  outstanding: number
  avg_rate: number
  reliability_score: number
  is_top_supplier: boolean
}

export interface ARAgingBucket {
  label: string
  key: 'current' | 'overdue' | 'at_risk' | 'bad_debt'
  amount: number
  percent: number
  color: string
}

export interface SalesByItemRow {
  bird_type_name: string
  quantity: number
  amount: number
  sales_percent: number
  avg_price: number
  cogs: number
  avg_cogs: number
  gross_margin: number
  gross_margin_percent: number
}