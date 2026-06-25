import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isMonday, isThursday } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-NG').format(n)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy')
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy, HH:mm')
}

export function isValidSalesDay(date: Date): boolean {
  return isMonday(date) || isThursday(date)
}

export function validateNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '')
  return /^(?:\+234|0)[789]\d{9}$/.test(cleaned)
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '')
  if (cleaned.startsWith('+234')) return cleaned
  if (cleaned.startsWith('0')) return '+234' + cleaned.slice(1)
  return cleaned
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function getTenantSlug(): string {
  const host = window.location.hostname
  const parts = host.split('.')
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'localhost') {
    return parts[0]
  }
  const pathMatch = window.location.pathname.match(/^\/app\/([^/]+)/)
  return pathMatch?.[1] || 'jmages'
}

export function getRoleDashboard(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'sales_manager':
    case 'sales_staff':
      return '/sales'
    case 'accounts_manager':
    case 'accounts_staff':
      return '/accounts'
    case 'md':
      return '/executive'
    default:
      return '/login'
  }
}