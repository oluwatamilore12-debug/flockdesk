import type {
  BirdType, Customer, Supplier, SalesDay, SalesSessionStock,
  SalesOrder, SalesOrderLine, BirdDisposition, SupplierInvoice,
  CustomerPayment, CompanySettings, ReconciliationRow,
} from '@/types'

export const DEMO_TENANT_ID = 'a0000000-0000-4000-8000-000000000001'

export const mockBirdTypes: BirdType[] = [
  { id: 'bt-1', tenant_id: DEMO_TENANT_ID, name: 'Broilers', code: 'BRL', own_production_cost: 280, is_active: true, sort_order: 1, deleted_at: null },
  { id: 'bt-2', tenant_id: DEMO_TENANT_ID, name: 'Imported Turkey', code: 'ITK', own_production_cost: 450, is_active: true, sort_order: 2, deleted_at: null },
  { id: 'bt-3', tenant_id: DEMO_TENANT_ID, name: 'Pullet', code: 'PLT', own_production_cost: 320, is_active: true, sort_order: 3, deleted_at: null },
  { id: 'bt-4', tenant_id: DEMO_TENANT_ID, name: 'Local Turkey', code: 'LTK', own_production_cost: 380, is_active: true, sort_order: 4, deleted_at: null },
  { id: 'bt-5', tenant_id: DEMO_TENANT_ID, name: 'Noilers', code: 'NOL', own_production_cost: 300, is_active: true, sort_order: 5, deleted_at: null },
  { id: 'bt-6', tenant_id: DEMO_TENANT_ID, name: 'Cockerels', code: 'CCK', own_production_cost: 250, is_active: true, sort_order: 6, deleted_at: null },
]

export const mockCustomers: Customer[] = [
  { id: 'c-1', tenant_id: DEMO_TENANT_ID, name: 'Adebayo Farms', phone: '+2348012345678', email: 'ade@farms.ng', business_name: 'Adebayo Farms Ltd', address: 'Lagos', customer_type: 'wholesale', credit_limit: 500000, is_active: true, notes: null, created_at: '2025-01-15' },
  { id: 'c-2', tenant_id: DEMO_TENANT_ID, name: 'Chioma Poultry', phone: '+2348098765432', email: null, business_name: 'Chioma Poultry', address: 'Ibadan', customer_type: 'retail', credit_limit: 200000, is_active: true, notes: null, created_at: '2025-02-20' },
  { id: 'c-3', tenant_id: DEMO_TENANT_ID, name: 'Emeka Agro', phone: '+2347011122233', email: 'emeka@agro.com', business_name: 'Emeka Agro Ventures', address: 'Enugu', customer_type: 'agent', credit_limit: 1000000, is_active: true, notes: null, created_at: '2025-03-10' },
]

export const mockSuppliers: Supplier[] = [
  { id: 's-1', tenant_id: DEMO_TENANT_ID, name: 'ABC Farms', contact_person: 'Mr. Bello', phone: '+2348033344455', email: 'abc@farms.ng', address: 'Kano', is_active: true, payment_terms: 'Net 7 days', notes: null, created_at: '2025-01-01' },
  { id: 's-2', tenant_id: DEMO_TENANT_ID, name: 'Sunrise Hatchery', contact_person: 'Mrs. Okon', phone: '+2348055566677', email: null, address: 'Abuja', is_active: true, payment_terms: 'Cash on delivery', notes: null, created_at: '2025-01-01' },
]

export const mockSalesDay: SalesDay = {
  id: 'sd-1',
  tenant_id: DEMO_TENANT_ID,
  date: '2026-06-23',
  status: 'open',
  total_birds_declared: 1500,
  total_birds_accounted: 1200,
  is_balanced: false,
  admin_override: false,
  override_reason: null,
  closed_at: null,
  closed_by: null,
  created_at: '2026-06-23T06:00:00Z',
}

export const mockStock: SalesSessionStock[] = [
  { id: 'st-1', sales_day_id: 'sd-1', source_type: 'own_production', supplier_id: null, bird_type_id: 'bt-1', quantity_declared: 1000, supplier_rate_per_chick: null, egg_count_hatched: 1050, discrepancy_note: null, created_at: '2026-06-23T06:30:00Z', created_by: 'u-1', bird_type: mockBirdTypes[0] },
  { id: 'st-2', sales_day_id: 'sd-1', source_type: 'supplier', supplier_id: 's-1', bird_type_id: 'bt-5', quantity_declared: 500, supplier_rate_per_chick: 350, egg_count_hatched: null, discrepancy_note: null, created_at: '2026-06-23T07:00:00Z', created_by: 'u-1', bird_type: mockBirdTypes[4], supplier: mockSuppliers[0] },
]

export const mockOrderLines: SalesOrderLine[] = [
  { id: 'ol-1', order_id: 'o-1', bird_type_id: 'bt-1', grade: 'good', quantity: 200, rate_per_chick: 650, subtotal: 130000, bird_type: mockBirdTypes[0] },
  { id: 'ol-2', order_id: 'o-2', bird_type_id: 'bt-1', grade: 'good', quantity: 100, rate_per_chick: 620, subtotal: 62000, bird_type: mockBirdTypes[0] },
  { id: 'ol-3', order_id: 'o-2', bird_type_id: 'bt-1', grade: 'second_class', quantity: 50, rate_per_chick: 450, subtotal: 22500, bird_type: mockBirdTypes[0] },
  { id: 'ol-4', order_id: 'o-3', bird_type_id: 'bt-5', grade: 'good', quantity: 150, rate_per_chick: 700, subtotal: 105000, bird_type: mockBirdTypes[4] },
]

export const mockOrders: SalesOrder[] = [
  { id: 'o-1', tenant_id: DEMO_TENANT_ID, sales_day_id: 'sd-1', customer_id: 'c-1', order_number: 'JMG-260623-001', order_date: '2026-06-23T08:00:00Z', status: 'paid', subtotal: 130000, total_amount: 130000, amount_paid: 130000, balance: 0, created_by: 'u-1', notes: null, customer: mockCustomers[0], lines: [mockOrderLines[0]] },
  { id: 'o-2', tenant_id: DEMO_TENANT_ID, sales_day_id: 'sd-1', customer_id: 'c-2', order_number: 'JMG-260623-002', order_date: '2026-06-23T09:00:00Z', status: 'partial_payment', subtotal: 84500, total_amount: 84500, amount_paid: 50000, balance: 34500, created_by: 'u-1', notes: null, customer: mockCustomers[1], lines: [mockOrderLines[1], mockOrderLines[2]] },
  { id: 'o-3', tenant_id: DEMO_TENANT_ID, sales_day_id: 'sd-1', customer_id: 'c-3', order_number: 'JMG-260623-003', order_date: '2026-06-23T10:00:00Z', status: 'pending', subtotal: 105000, total_amount: 105000, amount_paid: 0, balance: 105000, created_by: 'u-1', notes: null, customer: mockCustomers[2], lines: [mockOrderLines[3]] },
]

export const mockDispositions: BirdDisposition[] = [
  { id: 'd-1', sales_day_id: 'sd-1', bird_type_id: 'bt-1', disposition_type: 'reject', quantity: 30, notes: 'Leg deformities', recorded_by: 'u-1', recorded_at: '2026-06-23T14:00:00Z', bird_type: mockBirdTypes[0] },
  { id: 'd-2', sales_day_id: 'sd-1', bird_type_id: 'bt-1', disposition_type: 'mortality', quantity: 10, notes: null, recorded_by: 'u-1', recorded_at: '2026-06-23T14:00:00Z', bird_type: mockBirdTypes[0] },
  { id: 'd-3', sales_day_id: 'sd-1', bird_type_id: 'bt-1', disposition_type: 'farm_transfer', quantity: 20, notes: 'Unsold broilers to farm', recorded_by: 'u-1', recorded_at: '2026-06-23T14:00:00Z', bird_type: mockBirdTypes[0] },
]

export const mockSupplierInvoices: SupplierInvoice[] = [
  { id: 'si-1', supplier_id: 's-1', sales_day_id: 'sd-1', invoice_number: 'ABC-2026-0623', invoice_date: '2026-06-23', bird_type_id: 'bt-5', quantity: 500, rate_per_chick: 350, total_amount: 175000, payment_status: 'unpaid', amount_paid: 0, balance: 175000, payment_confirmed_by: null, payment_confirmed_at: null, notes: null, supplier: mockSuppliers[0], bird_type: mockBirdTypes[4] },
]

export const mockPayments: CustomerPayment[] = [
  { id: 'p-1', order_id: 'o-1', customer_id: 'c-1', amount: 130000, payment_date: '2026-06-23', payment_method: 'bank_transfer', bank_reference: 'TRF-001234', confirmed_by: 'u-2', confirmed_at: '2026-06-23T11:00:00Z', status: 'confirmed', notes: null },
  { id: 'p-2', order_id: 'o-2', customer_id: 'c-2', amount: 50000, payment_date: '2026-06-23', payment_method: 'cash', bank_reference: null, confirmed_by: 'u-2', confirmed_at: '2026-06-23T12:00:00Z', status: 'confirmed', notes: 'Partial payment' },
]

export const mockCompanySettings: CompanySettings = {
  id: 'cs-1',
  tenant_id: DEMO_TENANT_ID,
  company_name: 'Jmages Dbestline',
  logo_url: null,
  address: 'Lagos, Nigeria',
  phone: '+2348000000000',
  email: 'info@jmagesdbestline.ng',
  bank_name: 'GTBank',
  bank_account_number: '0123456789',
  bank_account_name: 'Jmages Dbestline Ltd',
  order_number_prefix: 'JMG',
  default_sales_days: [1, 4],
  allow_admin_override: true,
}

export const mockReconciliation: ReconciliationRow[] = [
  { bird_type_id: 'bt-1', bird_type_name: 'Broilers', declared: 1000, good_sold: 300, second_class_sold: 50, rejects: 30, mortality: 10, farm_transfer: 20, balance: 590, oversold: 0, is_balanced: false },
  { bird_type_id: 'bt-5', bird_type_name: 'Noilers', declared: 500, good_sold: 150, second_class_sold: 0, rejects: 0, mortality: 0, farm_transfer: 0, balance: 350, oversold: 0, is_balanced: false },
]

export const mockClosedSalesDay: SalesDay = {
  id: 'sd-0',
  tenant_id: DEMO_TENANT_ID,
  date: '2026-06-19',
  status: 'closed',
  total_birds_declared: 1200,
  total_birds_accounted: 1200,
  is_balanced: true,
  admin_override: false,
  override_reason: null,
  closed_at: '2026-06-19T18:00:00Z',
  closed_by: 'u-1',
  created_at: '2026-06-19T06:00:00Z',
}