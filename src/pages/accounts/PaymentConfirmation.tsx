import { useState } from 'react'
import { CreditCard, Banknote } from 'lucide-react'
import { Button, Input, Select, Card, CardHeader, Badge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { confirmPayment } from '@/lib/dataService'
import type { SalesOrder, PaymentMethod } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  order: SalesOrder
  onConfirmed: (orderId: string, amount: number) => void
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'pos', label: 'POS' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'paystack', label: 'Paystack' },
]

export function PaymentConfirmation({ order, onConfirmed }: Props) {
  const [amount, setAmount] = useState(String(order.balance))
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer')
  const [bankRef, setBankRef] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const parsedAmount = parseFloat(amount) || 0
  const isInstallment = parsedAmount > 0 && parsedAmount < order.balance
  const isValid = parsedAmount > 0 && parsedAmount <= order.balance

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      toast.error('Enter a valid amount up to the outstanding balance')
      return
    }
    if (method === 'bank_transfer' && !bankRef.trim()) {
      toast.error('Bank reference is required for bank transfers')
      return
    }

    setLoading(true)
    try {
      const result = await confirmPayment({
        order_id: order.id,
        customer_id: order.customer_id,
        amount: parsedAmount,
        payment_date: paymentDate,
        payment_method: method,
        bank_reference: bankRef.trim() || null,
        notes: notes.trim() || null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      onConfirmed(order.id, parsedAmount)
      toast.success(isInstallment ? 'Installment payment recorded' : 'Payment confirmed')
      setAmount(String(Math.max(0, order.balance - parsedAmount)))
      setBankRef('')
      setNotes('')
    } catch {
      toast.error('Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Confirm Payment"
        subtitle={`${order.order_number} · ${order.customer?.name || 'Customer'}`}
        action={
          <Badge variant={order.status === 'partial_payment' ? 'warning' : 'info'}>
            {order.status.replace('_', ' ')}
          </Badge>
        }
      />

      <div className="mb-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900/50 sm:grid-cols-3">
        <div>
          <p className="text-slate-500">Order Total</p>
          <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(order.total_amount)}</p>
        </div>
        <div>
          <p className="text-slate-500">Amount Paid</p>
          <p className="font-semibold text-green-600">{formatCurrency(order.amount_paid)}</p>
        </div>
        <div>
          <p className="text-slate-500">Outstanding Balance</p>
          <p className="font-semibold text-red-600">{formatCurrency(order.balance)}</p>
        </div>
      </div>

      {order.balance > 0 && (
        <p className="mb-4 text-xs text-slate-500">
          Installment payments are supported — enter any amount up to {formatCurrency(order.balance)}.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Payment Amount (₦)"
            type="number"
            min={1}
            max={order.balance}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
        </div>

        <Select
          label="Payment Method"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>

        {(method === 'bank_transfer' || method === 'cheque' || method === 'paystack') && (
          <Input
            label={method === 'cheque' ? 'Cheque Number' : 'Bank Reference'}
            value={bankRef}
            onChange={(e) => setBankRef(e.target.value)}
            placeholder={method === 'paystack' ? 'Paystack reference' : 'TRF-XXXXXX'}
            required={method === 'bank_transfer'}
          />
        )}

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Second installment"
        />

        {isInstallment && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <Banknote className="h-4 w-4 shrink-0" />
            <span>
              Installment of {formatCurrency(parsedAmount)} — remaining after payment:{' '}
              {formatCurrency(order.balance - parsedAmount)}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setAmount(String(order.balance))}
            className="sm:w-auto"
          >
            Pay Full Balance
          </Button>
          <Button type="submit" loading={loading} disabled={!isValid || order.balance <= 0} className="sm:w-auto">
            <CreditCard className="h-4 w-4" />
            {isInstallment ? 'Record Installment' : 'Confirm Payment'}
          </Button>
        </div>
      </form>

      <p className="mt-4 text-xs text-slate-400">
        Order date: {formatDate(order.order_date)}
      </p>
    </Card>
  )
}