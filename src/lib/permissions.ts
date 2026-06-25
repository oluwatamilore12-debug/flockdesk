import type { UserRole } from '@/types'

export type Permission =
  | 'sales.orders.create'
  | 'sales.orders.view'
  | 'sales.stock.declare'
  | 'sales.dispositions'
  | 'sales.day.open_close'
  | 'sales.payment_status_read'
  | 'accounts.payments.manage'
  | 'accounts.debtors'
  | 'accounts.supplier_invoices'
  | 'accounts.supplier_payables'
  | 'accounts.reports'
  | 'accounts.sales_overview'
  | 'accounts.customer_payments_history'
  | 'accounts.supplier_activity'
  | 'customer.history'
  | 'executive.dashboard'
  | 'admin.settings'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  sales_staff: [
    'sales.orders.create',
    'sales.orders.view',
    'sales.stock.declare',
    'sales.dispositions',
    'sales.payment_status_read',
    'customer.history',
  ],
  sales_manager: [
    'sales.orders.create',
    'sales.orders.view',
    'sales.stock.declare',
    'sales.dispositions',
    'sales.day.open_close',
    'sales.payment_status_read',
    'customer.history',
  ],
  accounts_staff: [
    'sales.orders.view',
    'sales.payment_status_read',
    'accounts.payments.manage',
    'accounts.debtors',
    'accounts.supplier_invoices',
    'accounts.supplier_payables',
    'accounts.reports',
    'accounts.sales_overview',
    'accounts.customer_payments_history',
    'accounts.supplier_activity',
    'customer.history',
  ],
  accounts_manager: [
    'sales.orders.view',
    'sales.payment_status_read',
    'accounts.payments.manage',
    'accounts.debtors',
    'accounts.supplier_invoices',
    'accounts.supplier_payables',
    'accounts.reports',
    'accounts.sales_overview',
    'accounts.customer_payments_history',
    'accounts.supplier_activity',
    'customer.history',
  ],
  md: [
    'sales.orders.view',
    'sales.payment_status_read',
    'accounts.debtors',
    'accounts.reports',
    'accounts.sales_overview',
    'accounts.customer_payments_history',
    'accounts.supplier_activity',
    'customer.history',
    'executive.dashboard',
  ],
  admin: [
    'sales.orders.create',
    'sales.orders.view',
    'sales.stock.declare',
    'sales.dispositions',
    'sales.day.open_close',
    'sales.payment_status_read',
    'accounts.payments.manage',
    'accounts.debtors',
    'accounts.supplier_invoices',
    'accounts.supplier_payables',
    'accounts.reports',
    'accounts.sales_overview',
    'accounts.customer_payments_history',
    'accounts.supplier_activity',
    'customer.history',
    'executive.dashboard',
    'admin.settings',
  ],
}

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function canAccessAccountsFinancials(role: UserRole | undefined): boolean {
  return hasPermission(role, 'accounts.payments.manage')
}

export function canViewCustomerPaymentHistory(role: UserRole | undefined): boolean {
  return hasPermission(role, 'accounts.customer_payments_history')
}

export function canManageSalesDay(role: UserRole | undefined): boolean {
  return hasPermission(role, 'sales.day.open_close')
}