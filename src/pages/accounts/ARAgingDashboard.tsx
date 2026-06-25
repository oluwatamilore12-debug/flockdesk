import { useCallback, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Card, CardHeader, Table, Th, Td, Skeleton, Button, Badge } from '@/components/ui'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { getARAgingBuckets, getDebtorsLedger } from '@/lib/dataService'
import { useFlockDeskDataReload } from '@/hooks/useFlockDeskDataReload'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ARAgingBucket, DebtorRow } from '@/types'
import toast from 'react-hot-toast'

export function ARAgingDashboard() {
  const [buckets, setBuckets] = useState<ARAgingBucket[]>([])
  const [debtors, setDebtors] = useState<DebtorRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getARAgingBuckets(), getDebtorsLedger()])
      .then(([b, d]) => {
        setBuckets(b)
        setDebtors(d.filter((row) => row.balance > 0).sort((a, b) => b.balance - a.balance))
      })
      .finally(() => setLoading(false))
  }, [])

  useFlockDeskDataReload(load, [load])

  const totalAR = buckets.reduce((s, b) => s + b.amount, 0)

  const sendReminder = (name: string) => {
    toast.success(`WhatsApp reminder queued for ${name} (demo — configure API in Admin)`)
  }

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Accounts Receivable Aging"
          subtitle={`Total outstanding: ${formatCurrency(totalAR)}`}
        />
        <div className="space-y-4">
          {buckets.map((bucket) => (
            <ProgressBar
              key={bucket.key}
              label={bucket.label}
              sublabel={`${formatCurrency(bucket.amount)} — ${bucket.percent.toFixed(0)}% of AR`}
              value={bucket.amount}
              max={totalAR || 1}
              gradient={`linear-gradient(90deg, ${bucket.color}, ${bucket.color}99)`}
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Top Debtors" subtitle="Highest outstanding balances" />
        <Table>
          <thead>
            <tr>
              <Th bgColor="#001996">Customer</Th>
              <Th bgColor="#001996">Balance</Th>
              <Th bgColor="#001996">Days Out</Th>
              <Th bgColor="#001996">Last Payment</Th>
              <Th bgColor="#001996">Action</Th>
            </tr>
          </thead>
          <tbody>
            {debtors.slice(0, 10).map((row) => (
              <tr key={row.customer_id}>
                <Td className="font-semibold">{row.customer_name}</Td>
                <Td className="font-mono font-bold text-[#FF052E]">{formatCurrency(row.balance)}</Td>
                <Td>
                  <Badge variant={row.days_outstanding > 30 ? 'danger' : row.days_outstanding > 14 ? 'warning' : 'default'}>
                    {row.days_outstanding} days
                  </Badge>
                </Td>
                <Td>{row.last_payment_date ? formatDate(row.last_payment_date) : '—'}</Td>
                <Td>
                  <Button size="sm" variant="outline" onClick={() => sendReminder(row.customer_name)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}