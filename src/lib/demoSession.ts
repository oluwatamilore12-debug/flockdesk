import type {
  SalesDay,
  SalesSessionStock,
  SalesOrder,
  BirdDisposition,
  Customer,
  Supplier,
  SupplierInvoice,
  CustomerPayment,
} from '@/types'

export const DEMO_SESSION_STORAGE_KEY = 'flockdesk-demo-session-v1'
export const DATA_CHANGED_EVENT = 'flockdesk:data-changed'

export interface DemoSessionPayload {
  openSalesDay: SalesDay | null
  stock: SalesSessionStock[]
  orders: SalesOrder[]
  dispositions: BirdDisposition[]
  customers: Customer[]
  suppliers: Supplier[]
  supplierInvoices: SupplierInvoice[]
  payments: CustomerPayment[]
}

export function notifyDataChanged(): void {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT))
}

export function subscribeDataChanged(handler: () => void): () => void {
  window.addEventListener(DATA_CHANGED_EVENT, handler)
  return () => window.removeEventListener(DATA_CHANGED_EVENT, handler)
}

export function loadDemoSessionFromStorage(): DemoSessionPayload | null {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DemoSessionPayload
  } catch {
    return null
  }
}

export function saveDemoSessionToStorage(payload: DemoSessionPayload): void {
  try {
    sessionStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore quota errors in demo mode
  }
  notifyDataChanged()
}