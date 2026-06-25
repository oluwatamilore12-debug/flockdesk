import { isValidSalesDay, validateNigerianPhone } from './utils'

export interface ValidationError {
  field: string
  message: string
}

export function validateOrderLine(data: {
  quantity: number
  rate_per_chick: number
  available?: number
}): ValidationError[] {
  const errors: ValidationError[] = []
  if (data.quantity <= 0) errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' })
  if (data.rate_per_chick <= 0) errors.push({ field: 'rate_per_chick', message: 'Rate must be greater than 0' })
  if (data.available !== undefined && data.quantity > data.available) {
    errors.push({
      field: 'quantity',
      message:
        data.available === 0
          ? 'No birds on ground for this type — declare stock or record dispositions first'
          : `Only ${data.available} bird${data.available === 1 ? '' : 's'} on ground — cannot sell more than declared stock`,
    })
  }
  return errors
}

export function validateCustomer(data: {
  name: string
  phone: string
}): ValidationError[] {
  const errors: ValidationError[] = []
  if (!data.name.trim()) errors.push({ field: 'name', message: 'Name is required' })
  if (!validateNigerianPhone(data.phone)) {
    errors.push({ field: 'phone', message: 'Enter a valid Nigerian phone number (08xx, 07xx, 09xx, +234xx)' })
  }
  return errors
}

export function validateSalesDayDate(date: Date, adminOverride = false): ValidationError[] {
  if (adminOverride) return []
  if (!isValidSalesDay(date)) {
    return [{ field: 'date', message: 'Sales days are only allowed on Monday or Thursday' }]
  }
  return []
}

export function validateSupplier(data: {
  name: string
  phone?: string
}): ValidationError[] {
  const errors: ValidationError[] = []
  if (!data.name.trim()) errors.push({ field: 'name', message: 'Supplier name is required' })
  if (data.phone?.trim() && !validateNigerianPhone(data.phone)) {
    errors.push({ field: 'phone', message: 'Enter a valid Nigerian phone number (08xx, 07xx, 09xx, +234xx)' })
  }
  return errors
}

export function validateStockEntry(data: {
  quantity_declared: number
  source_type: string
  supplier_rate_per_chick?: number | null
}): ValidationError[] {
  const errors: ValidationError[] = []
  if (data.quantity_declared <= 0) {
    errors.push({ field: 'quantity_declared', message: 'Quantity must be greater than 0' })
  }
  if (data.source_type === 'supplier' && (!data.supplier_rate_per_chick || data.supplier_rate_per_chick <= 0)) {
    errors.push({ field: 'supplier_rate_per_chick', message: 'Supplier rate is required for supplier stock' })
  }
  return errors
}

export function validatePayment(data: {
  amount: number
  payment_date: string
  payment_method: string
}): ValidationError[] {
  const errors: ValidationError[] = []
  if (data.amount <= 0) errors.push({ field: 'amount', message: 'Amount must be greater than 0' })
  if (!data.payment_date) errors.push({ field: 'payment_date', message: 'Payment date is required' })
  if (!data.payment_method) errors.push({ field: 'payment_method', message: 'Payment method is required' })
  return errors
}