import { useEffect, useState } from 'react'
import { Printer, User } from 'lucide-react'
import { Drawer } from './Drawer'
import { Badge, Button, Table, Th, Td } from '@/components/ui'
import {
  getPaymentsForOrder,
  getCustomerOutstandingBalance,
  getBirdTypes,
} from '@/lib/dataService'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { formatOrderStatusLabel, orderStatusEmoji } from '@/lib/orderFormat'
import { canViewCustomerPaymentHistory } from '@/lib/permissions'
import { useAuthStore } from '@/stores/authStore'
import type { SalesOrder, CustomerPayment, BirdType } from '@/types'

interface Props {
  order: SalesOrder | null
  open: boolean
  onClose: () => void
  salesDayDate?: string
  onCustomerClick?: () => void
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  paid: 'success',
  partial_payment: 'warning',
  pending: 'danger',
  confirmed: 'info',
  cancelled: 'default',
}

export function OrderDetailDrawer({ order, open, onClose, salesDayDate, onCustomerClick }: Props) {
  const { profile } = useAuthStore()
  const [payments, setPayments] = useState<CustomerPayment[]>([])
  const [customerBalance, setCustomerBalance] = useState(0)
  const [birdTypes, setBirdTypes] = useState<BirdType[]>([])
  const showPaymentHistory = canViewCustomerPaymentHistory(profile?.role)

  useEffect(() => {
    if (!open || !order) return
    getBirdTypes().then(setBirdTypes)
    if (showPaymentHistory) {
      getPaymentsForOrder(order.id).then(setPayments)
    } else {
      setPayments([])
    }
    getCustomerOutstandingBalance(order.customer_id).then(setCustomerBalance)
  }, [open, order, showPaymentHistory])

  if (!order) return null

  const lines = order.lines || []

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Order ${order.order_number}`}
      subtitle={`${order.customer?.name || 'Customer'} · ${formatDate(order.order_date)}`}
      width="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 rounded-xl bg-[#F0F2FA] p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[#10259C]">Customer</p>
            <button
              type="button"
              onClick={onCustomerClick}
              className="font-semibold text-[#10259C] hover:underline"
            >
              {order.customer?.name || '—'}
            </button>
          </div>
          <div>
            <p className="text-[#10259C]">Sales Day</p>
            <p className="font-medium text-[#000000]">{salesDayDate ? formatDate(salesDayDate) : '—'}</p>
          </div>
          <div>
            <p className="text-[#10259C]">Status</p>
            <Badge variant={statusVariant[order.status] || 'default'}>
              {orderStatusEmoji(order.status)} {formatOrderStatusLabel(order.status)}
            </Badge>
          </div>
          <div>
            <p className="text-[#10259C]">Customer total outstanding</p>
            <p className={customerBalance > 0 ? 'font-bold text-[#FF052E]' : 'font-bold text-[#10259C]'}>
              {formatCurrency(customerBalance)}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#000000]">Order Lines</h3>
          <Table>
            <thead>
              <tr>
                <Th>Bird Type</Th>
                <Th>Grade</Th>
                <Th>Qty</Th>
                <Th>Rate/Bird</Th>
                <Th>Subtotal</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2FA]">
              {lines.map((line) => {
                const bt = line.bird_type || birdTypes.find((b) => b.id === line.bird_type_id)
                return (
                  <tr key={line.id}>
                    <Td className="font-medium">{bt?.name || '—'}</Td>
                    <Td className="capitalize">{line.grade === 'second_class' ? '2nd Cls' : 'Good'}</Td>
                    <Td className="font-mono">{formatNumber(line.quantity)}</Td>
                    <Td className="font-mono">{formatCurrency(line.rate_per_chick)}</Td>
                    <Td className="font-mono font-semibold">{formatCurrency(line.subtotal)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>

        <div className="rounded-xl border border-[#F0F2FA] bg-white p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-[#10259C]">Order Total</span>
            <span className="font-bold text-[#000000]">{formatCurrency(order.total_amount)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#10259C]">Amount Paid</span>
            <span className="font-semibold text-[#10259C]">{formatCurrency(order.amount_paid)}</span>
          </div>
          <div className="flex justify-between border-t border-[#F0F2FA] py-2">
            <span className="font-semibold text-[#000000]">Balance Due</span>
            <span className={order.balance > 0 ? 'text-lg font-bold text-[#FF052E]' : 'text-lg font-bold text-[#10259C]'}>
              {formatCurrency(order.balance)}
            </span>
          </div>
        </div>

        {showPaymentHistory && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#000000]">Payment History</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-[#10259C]">No confirmed payments yet — awaiting Accounts confirmation.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Amount</Th>
                    <Th>Method</Th>
                    <Th>Reference</Th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <Td>{formatDate(p.payment_date)}</Td>
                      <Td className="font-mono">{formatCurrency(p.amount)}</Td>
                      <Td className="capitalize">{p.payment_method.replace('_', ' ')}</Td>
                      <Td className="font-mono text-xs">{p.bank_reference || '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        )}

        {!showPaymentHistory && order.balance > 0 && (
          <p className="flex items-center gap-2 rounded-lg bg-[#F0F2FA] px-3 py-2 text-sm text-[#001996]">
            <User className="h-4 w-4 shrink-0" />
            Payment confirmation is handled by Accounts. Balance outstanding: {formatCurrency(order.balance)}
          </p>
        )}

        {order.notes && (
          <div>
            <p className="text-xs font-semibold text-[#10259C]">Notes</p>
            <p className="text-sm text-[#000000]">{order.notes}</p>
          </div>
        )}
      </div>
    </Drawer>
  )
}