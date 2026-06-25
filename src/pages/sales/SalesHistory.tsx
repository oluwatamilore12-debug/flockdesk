import { useEffect, useMemo, useState } from 'react'
import {
  Document, Page, Text, View, StyleSheet, pdf,
} from '@react-pdf/renderer'
import { FileDown, ChevronRight, ChevronDown, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Card, Badge, Skeleton, EmptyState, Button,
  Table, Th, Td, StatCard,
} from '@/components/ui'
import {
  getSalesDays, getOrdersForSalesDay, getStockForSalesDay,
  getDispositions, getReconciliation, getCompanySettings,
} from '@/lib/dataService'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { ReconciliationWidget } from '@/components/shared/ReconciliationWidget'
import { DateRangeFilter } from '@/components/shared/DateRangeFilter'
import { isDateInRange, resolveDateRange, type DateRangePreset } from '@/lib/dateFilters'
import type { SalesDay, SalesOrder, SalesSessionStock, BirdDisposition, ReconciliationRow } from '@/types'

interface DayDetail {
  orders: SalesOrder[]
  stock: SalesSessionStock[]
  dispositions: BirdDisposition[]
  reconciliation: ReconciliationRow[]
}

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, borderBottom: '1 solid #ddd', paddingBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#666' },
  value: { fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: 6, borderBottom: '1 solid #eee' },
  col: { flex: 1 },
})

function SalesDayPDF({
  salesDay,
  detail,
  companyName,
}: {
  salesDay: SalesDay
  detail: DayDetail
  companyName: string
}) {
  const totalRevenue = detail.orders.reduce((s, o) => s + o.total_amount, 0)
  const totalBirds = detail.orders.reduce(
    (s, o) => s + (o.lines?.reduce((ls, l) => ls + l.quantity, 0) || 0),
    0
  )

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>{companyName}</Text>
        <Text style={pdfStyles.subtitle}>Sales Day Report — {formatDate(salesDay.date)}</Text>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Summary</Text>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Status</Text>
            <Text style={pdfStyles.value}>{salesDay.status}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Birds Declared</Text>
            <Text style={pdfStyles.value}>{formatNumber(salesDay.total_birds_declared)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Birds Accounted</Text>
            <Text style={pdfStyles.value}>{formatNumber(salesDay.total_birds_accounted)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Total Revenue</Text>
            <Text style={pdfStyles.value}>{formatCurrency(totalRevenue)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Birds Sold</Text>
            <Text style={pdfStyles.value}>{formatNumber(totalBirds)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Balanced</Text>
            <Text style={pdfStyles.value}>{salesDay.is_balanced ? 'Yes' : 'No'}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Orders ({detail.orders.length})</Text>
          <View style={pdfStyles.tableHeader}>
            <Text style={[pdfStyles.col, { flex: 2 }]}>Order #</Text>
            <Text style={pdfStyles.col}>Customer</Text>
            <Text style={pdfStyles.col}>Amount</Text>
            <Text style={pdfStyles.col}>Status</Text>
          </View>
          {detail.orders.map((o) => (
            <View key={o.id} style={pdfStyles.tableRow}>
              <Text style={[pdfStyles.col, { flex: 2 }]}>{o.order_number}</Text>
              <Text style={pdfStyles.col}>{o.customer?.name || '—'}</Text>
              <Text style={pdfStyles.col}>{formatCurrency(o.total_amount)}</Text>
              <Text style={pdfStyles.col}>{o.status}</Text>
            </View>
          ))}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Reconciliation</Text>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.col}>Type</Text>
            <Text style={pdfStyles.col}>Declared</Text>
            <Text style={pdfStyles.col}>Sold</Text>
            <Text style={pdfStyles.col}>Balance</Text>
          </View>
          {detail.reconciliation.map((r) => (
            <View key={r.bird_type_id} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.col}>{r.bird_type_name}</Text>
              <Text style={pdfStyles.col}>{formatNumber(r.declared)}</Text>
              <Text style={pdfStyles.col}>{formatNumber(r.good_sold + r.second_class_sold)}</Text>
              <Text style={pdfStyles.col}>{formatNumber(r.balance)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  open: 'info',
  reconciling: 'warning',
  closed: 'success',
}

export function SalesHistory() {
  const [salesDays, setSalesDays] = useState<SalesDay[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, DayDetail>>({})
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [preset, setPreset] = useState<DateRangePreset>('this_year')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [jumpDate, setJumpDate] = useState('')

  const dateRange = useMemo(
    () => resolveDateRange(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  )

  const filteredDays = useMemo(() => {
    let days = salesDays.filter((d) => isDateInRange(d.date, dateRange))
    if (jumpDate) {
      days = days.filter((d) => d.date === jumpDate)
    }
    return days
  }, [salesDays, dateRange, jumpDate])

  useEffect(() => {
    let cancelled = false
    getSalesDays(100)
      .then((days) => {
        if (!cancelled) {
          setSalesDays(days.filter((d) => d.status === 'closed'))
        }
      })
      .catch(() => toast.error('Failed to load sales history'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadDetail = async (salesDayId: string) => {
    if (details[salesDayId]) return
    setLoadingDetail(salesDayId)
    try {
      const [orders, stock, dispositions, reconciliation] = await Promise.all([
        getOrdersForSalesDay(salesDayId),
        getStockForSalesDay(salesDayId),
        getDispositions(salesDayId),
        getReconciliation(salesDayId),
      ])
      setDetails((prev) => ({
        ...prev,
        [salesDayId]: { orders, stock, dispositions, reconciliation },
      }))
    } catch {
      toast.error('Failed to load day details')
    } finally {
      setLoadingDetail(null)
    }
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      loadDetail(id)
    }
  }

  const handleExportPDF = async (day: SalesDay) => {
    setExportingId(day.id)
    try {
      let detail = details[day.id]
      if (!detail) {
        const [orders, stock, dispositions, reconciliation] = await Promise.all([
          getOrdersForSalesDay(day.id),
          getStockForSalesDay(day.id),
          getDispositions(day.id),
          getReconciliation(day.id),
        ])
        detail = { orders, stock, dispositions, reconciliation }
        setDetails((prev) => ({ ...prev, [day.id]: detail! }))
      }

      const settings = await getCompanySettings()
      const blob = await pdf(
        <SalesDayPDF
          salesDay={day}
          detail={detail}
          companyName={settings?.company_name || 'FlockDesk'}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sales-day-${day.date}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('PDF exported')
    } catch {
      toast.error('Failed to export PDF')
    } finally {
      setExportingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (salesDays.length === 0) {
    return (
      <EmptyState
        title="No closed sales days"
        description="Completed sales days will appear here for review and export."
        action={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            Sales days close after reconciliation
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[#F0F2FA] bg-white p-4">
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
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-[#10259C]" />
          <label className="text-xs font-medium text-[#10259C]">Jump to Sales Day:</label>
          <input
            type="date"
            value={jumpDate}
            onChange={(e) => setJumpDate(e.target.value)}
            className="rounded-lg border border-[#F0F2FA] px-2 py-1 text-xs text-[#000000]"
          />
          {jumpDate && (
            <button
              type="button"
              onClick={() => setJumpDate('')}
              className="text-xs font-medium text-[#10259C] hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filteredDays.length === 0 ? (
        <EmptyState
          title="No sales days in this period"
          description="Adjust the date range or pick a different Monday/Thursday."
        />
      ) : (
      <div className="space-y-3">
      {filteredDays.map((day) => {
        const isExpanded = expandedId === day.id
        const detail = details[day.id]
        const totalRevenue = detail?.orders.reduce((s, o) => s + o.total_amount, 0)

        return (
          <Card key={day.id} className="overflow-hidden p-0">
            <div className="flex w-full items-center gap-4 p-4">
              <button
                type="button"
                onClick={() => toggleExpand(day.id)}
                className="flex min-w-0 flex-1 items-center gap-4 text-left hover:opacity-80"
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatDate(day.date)}
                    </span>
                    <Badge variant={statusVariant[day.status] || 'default'}>{day.status}</Badge>
                    {day.is_balanced && <Badge variant="success">Balanced</Badge>}
                    {day.admin_override && <Badge variant="warning">Admin Override</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatNumber(day.total_birds_declared)} birds declared
                    {day.closed_at && ` · Closed ${formatDate(day.closed_at)}`}
                  </p>
                </div>
              </button>
              <Button
                variant="outline"
                size="sm"
                loading={exportingId === day.id}
                onClick={() => handleExportPDF(day)}
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-200 p-4 dark:border-slate-700">
                {loadingDetail === day.id ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : detail ? (
                  <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <StatCard
                        title="Orders"
                        value={String(detail.orders.length)}
                      />
                      <StatCard
                        title="Revenue"
                        value={formatCurrency(totalRevenue || 0)}
                      />
                      <StatCard
                        title="Birds Declared"
                        value={formatNumber(day.total_birds_declared)}
                      />
                      <StatCard
                        title="Birds Accounted"
                        value={formatNumber(day.total_birds_accounted)}
                      />
                    </div>

                    {detail.orders.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold">Orders</h4>
                        <Table>
                          <thead>
                            <tr>
                              <Th>Order #</Th>
                              <Th>Customer</Th>
                              <Th>Amount</Th>
                              <Th>Status</Th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {detail.orders.map((o) => (
                              <tr key={o.id}>
                                <Td className="font-medium">{o.order_number}</Td>
                                <Td>{o.customer?.name || '—'}</Td>
                                <Td>{formatCurrency(o.total_amount)}</Td>
                                <Td>
                                  <Badge variant="default">{o.status.replace('_', ' ')}</Badge>
                                </Td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}

                    {detail.stock.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold">Stock Declared</h4>
                        <Table>
                          <thead>
                            <tr>
                              <Th>Bird Type</Th>
                              <Th>Source</Th>
                              <Th>Quantity</Th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {detail.stock.map((s) => (
                              <tr key={s.id}>
                                <Td>{s.bird_type?.name || '—'}</Td>
                                <Td className="capitalize">{s.source_type.replace('_', ' ')}</Td>
                                <Td>{formatNumber(s.quantity_declared)}</Td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}

                    {detail.reconciliation.length > 0 && (
                      <ReconciliationWidget rows={detail.reconciliation} compact />
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        )
      })}
    </div>
      )}
    </div>
  )
}