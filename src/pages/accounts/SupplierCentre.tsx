import { useCallback, useState } from 'react'
import { Star, TrendingUp } from 'lucide-react'
import {
  Card, CardHeader, Table, Th, Td, Skeleton, EmptyState, Badge, Modal,
} from '@/components/ui'
import { AnimatedStatCard } from '@/components/shared/AnimatedStatCard'
import { DateRangeFilter } from '@/components/shared/DateRangeFilter'
import { getSupplierAnalytics, getSupplierInvoices, getSuppliers } from '@/lib/dataService'
import { useFlockDeskDataReload } from '@/hooks/useFlockDeskDataReload'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import type { DateRangePreset } from '@/lib/dateFilters'
import type { SupplierAnalyticsRow, SupplierInvoice, Supplier } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

export function SupplierCentre() {
  const [rows, setRows] = useState<SupplierAnalyticsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<DateRangePreset>('this_year')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getSupplierAnalytics(), getSupplierInvoices(), getSuppliers()])
      .then(([analytics, invs, sups]) => {
        setRows(analytics)
        setInvoices(invs)
        setSuppliers(sups)
      })
      .finally(() => setLoading(false))
  }, [])

  useFlockDeskDataReload(load, [load])

  const totalSpend = rows.reduce((s, r) => s + r.total_spend, 0)
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0)
  const avgBroiler =
    rows.find((r) => r.bird_types.some((b) => b.toLowerCase().includes('broil')))?.avg_rate || 0

  const selected = rows.find((r) => r.supplier_id === selectedId)
  const supplierInvoices = invoices.filter((i) => i.supplier_id === selectedId)
  const supplier = suppliers.find((s) => s.id === selectedId)

  const volumeChart = supplierInvoices.map((inv) => ({
    date: formatDate(inv.invoice_date),
    birds: inv.quantity,
    spend: inv.total_amount,
  }))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatedStatCard title="Active Suppliers" value={rows.length} icon={<Star className="h-5 w-5" />} />
        <AnimatedStatCard title="Total Spend" value={totalSpend} isCurrency icon={<TrendingUp className="h-5 w-5" />} />
        <AnimatedStatCard title="Outstanding Payables" value={totalOutstanding} isCurrency />
        <AnimatedStatCard title="Avg Broiler Rate" value={avgBroiler} isCurrency subtitle="per chick" />
      </div>

      <Card>
        <CardHeader title="Top Suppliers" subtitle="Ranked by volume — click a row for full profile" />
        <DateRangeFilter value={preset} onChange={setPreset} showCustom={false} />
      </Card>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState title="No supplier activity" description="Supplier invoices are created when Sales declares supplier stock." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th bgColor="#001996">Supplier</Th>
              <Th bgColor="#001996">Bird Types</Th>
              <Th bgColor="#001996">Sessions</Th>
              <Th bgColor="#001996">Total Birds</Th>
              <Th bgColor="#001996">Spend</Th>
              <Th bgColor="#001996">Paid</Th>
              <Th bgColor="#001996">Owing</Th>
              <Th bgColor="#001996">Reliability</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.supplier_id}
                className="cursor-pointer hover:bg-[#F0F2FA]"
                onClick={() => setSelectedId(row.supplier_id)}
              >
                <Td className="font-semibold">
                  {row.is_top_supplier && <span className="mr-1 text-[#10259C]">★</span>}
                  {row.supplier_name}
                </Td>
                <Td className="text-sm">{row.bird_types.join(', ')}</Td>
                <Td>{row.sessions}</Td>
                <Td className="font-mono">{formatNumber(row.total_birds)}</Td>
                <Td className="font-mono">{formatCurrency(row.total_spend)}</Td>
                <Td className="font-mono text-[#10259C]">{formatCurrency(row.total_paid)}</Td>
                <Td className="font-mono text-[#FF052E]">{formatCurrency(row.outstanding)}</Td>
                <Td>
                  <Badge variant={row.reliability_score >= 90 ? 'success' : row.reliability_score >= 75 ? 'warning' : 'danger'}>
                    {row.reliability_score}%
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.supplier_name || 'Supplier Profile'}
        size="xl"
      >
        {selected && supplier && (
          <div className="space-y-4">
            <p className="text-sm text-[#10259C]">
              {supplier.contact_person} · {supplier.phone} · {supplier.payment_terms}
            </p>
            <div className="grid gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-lg bg-[#F0F2FA] p-3"><p className="text-[#10259C]">Sessions</p><p className="font-bold">{selected.sessions}</p></div>
              <div className="rounded-lg bg-[#F0F2FA] p-3"><p className="text-[#10259C]">Total Birds</p><p className="font-bold">{formatNumber(selected.total_birds)}</p></div>
              <div className="rounded-lg bg-[#F0F2FA] p-3"><p className="text-[#10259C]">Paid</p><p className="font-bold text-[#10259C]">{formatCurrency(selected.total_paid)}</p></div>
              <div className="rounded-lg bg-[#F0F2FA] p-3"><p className="text-[#10259C]">Outstanding</p><p className="font-bold text-[#FF052E]">{formatCurrency(selected.outstanding)}</p></div>
            </div>

            {volumeChart.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="birds" fill="#001996" name="Birds" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Bird Type</Th>
                  <Th>Qty</Th>
                  <Th>Rate</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {supplierInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <Td>{formatDate(inv.invoice_date)}</Td>
                    <Td>{inv.bird_type?.name}</Td>
                    <Td>{formatNumber(inv.quantity)}</Td>
                    <Td>{formatCurrency(inv.rate_per_chick)}</Td>
                    <Td>{formatCurrency(inv.total_amount)}</Td>
                    <Td><Badge variant={inv.payment_status === 'paid' ? 'success' : 'warning'}>{inv.payment_status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal>
    </div>
  )
}