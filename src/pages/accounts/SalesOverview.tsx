import { useCallback, useState } from 'react'
import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { Card, CardHeader, Skeleton, EmptyState, Badge, Table, Th, Td } from '@/components/ui'
import { DateRangeFilter } from '@/components/shared/DateRangeFilter'
import { OrderDetailDrawer } from '@/components/shared/OrderDetailDrawer'
import { getSalesDaySummaries } from '@/lib/dataService'
import { useFlockDeskDataReload } from '@/hooks/useFlockDeskDataReload'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { formatOrderBirdsSummary } from '@/lib/orderFormat'
import type { DateRangePreset } from '@/lib/dateFilters'
import type { SalesDaySummary, SalesOrder } from '@/types'

export function SalesOverview() {
  const [summaries, setSummaries] = useState<SalesDaySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<DateRangePreset>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getSalesDaySummaries(preset, customStart, customEnd)
      .then(setSummaries)
      .finally(() => setLoading(false))
  }, [preset, customStart, customEnd])

  useFlockDeskDataReload(load, [load])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Sales Overview"
          subtitle="Read-only view of all Sales team activity — stock, orders, and dispositions"
        />
        <DateRangeFilter
          value={preset}
          onChange={setPreset}
          customStart={customStart}
          customEnd={customEnd}
          onCustomChange={(s, e) => {
            setCustomStart(s)
            setCustomEnd(e)
          }}
        />
      </Card>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : summaries.length === 0 ? (
        <EmptyState title="No sales days in this period" description="Try a wider date range or check Sales has opened a session." />
      ) : (
        <div className="space-y-3">
          {summaries.map((day) => {
            const isOpen = expanded === day.sales_day_id
            return (
              <Card key={day.sales_day_id} className="overflow-hidden p-0">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#F0F2FA]"
                  onClick={() => setExpanded(isOpen ? null : day.sales_day_id)}
                >
                  {isOpen ? <ChevronDown className="h-5 w-5 text-[#001996]" /> : <ChevronRight className="h-5 w-5 text-[#001996]" />}
                  <div className="flex flex-1 flex-wrap items-center gap-4">
                    <span className="font-semibold text-[#000000]">{formatDate(day.date)}</span>
                    <span className="text-sm text-[#10259C]">Declared: {formatNumber(day.declared)}</span>
                    <span className="text-sm text-[#10259C]">Sold: {formatNumber(day.sold)}</span>
                    <span className="text-sm text-[#10259C]">Revenue: {formatCurrency(day.revenue)}</span>
                    <Badge variant={day.status === 'closed' ? 'success' : 'info'}>{day.status}</Badge>
                  </div>
                  <Eye className="h-4 w-4 text-[#10259C]" />
                </button>

                {isOpen && (
                  <div className="border-t border-[#F0F2FA] bg-[#FAFAFA] px-4 py-4">
                    <div className="mb-4 grid gap-2 text-sm sm:grid-cols-4">
                      <p><span className="text-[#10259C]">Rejects:</span> {formatNumber(day.rejects)}</p>
                      <p><span className="text-[#10259C]">Mortality:</span> {formatNumber(day.mortality)}</p>
                      <p><span className="text-[#10259C]">Farm transfer:</span> {formatNumber(day.farm_transfer)}</p>
                      <p><span className="text-[#10259C]">Collected:</span> {formatCurrency(day.collected)}</p>
                    </div>
                    {day.orders.length === 0 ? (
                      <p className="text-sm text-[#10259C]">No orders recorded for this day.</p>
                    ) : (
                      <Table>
                        <thead>
                          <tr>
                            <Th bgColor="#001996">Order #</Th>
                            <Th bgColor="#001996">Customer</Th>
                            <Th bgColor="#001996">Birds</Th>
                            <Th bgColor="#001996">Total</Th>
                            <Th bgColor="#001996">Paid</Th>
                            <Th bgColor="#001996">Status</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.orders.map((order) => (
                            <tr
                              key={order.id}
                              className="cursor-pointer hover:bg-[#F0F2FA]"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Td className="font-mono font-semibold">{order.order_number}</Td>
                              <Td>{order.customer?.name}</Td>
                              <Td className="font-mono text-xs">{formatOrderBirdsSummary(order.lines)}</Td>
                              <Td>{formatCurrency(order.total_amount)}</Td>
                              <Td>{formatCurrency(order.amount_paid)}</Td>
                              <Td><Badge variant={order.status === 'paid' ? 'success' : order.status === 'pending' ? 'danger' : 'warning'}>{order.status.replace('_', ' ')}</Badge></Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <OrderDetailDrawer
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        salesDayDate={summaries.find((s) => s.orders.some((o) => o.id === selectedOrder?.id))?.date}
      />
    </div>
  )
}