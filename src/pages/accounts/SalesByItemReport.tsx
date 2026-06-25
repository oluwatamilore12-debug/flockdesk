import { useCallback, useState } from 'react'
import { Download, FileText, Printer } from 'lucide-react'
import { Card, CardHeader, Table, Th, Td, Skeleton, EmptyState, Button } from '@/components/ui'
import { getSalesByItem, getCompanySettings } from '@/lib/dataService'
import { useFlockDeskDataReload } from '@/hooks/useFlockDeskDataReload'
import { formatCurrency, formatNumber, exportToCSV } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { SalesByItemRow } from '@/types'
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottom: '1 solid #e2e8f0', paddingVertical: 6 },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #e2e8f0', paddingVertical: 4 },
  tableRowAlt: { flexDirection: 'row', borderBottom: '1 solid #e2e8f0', paddingVertical: 4, backgroundColor: '#f8fafc' },
  tableFooter: { flexDirection: 'row', backgroundColor: '#e2e8f0', paddingVertical: 6, fontWeight: 'bold' },
  col: { flex: 1, paddingHorizontal: 4 },
  colWide: { flex: 1.5, paddingHorizontal: 4 },
  colNum: { flex: 1, paddingHorizontal: 4, textAlign: 'right' },
})

function SalesReportPDF({ rows, companyName, totals }: {
  rows: SalesByItemRow[]
  companyName: string
  totals: ReturnType<typeof computeTotals>
}) {
  const headers = ['Bird Type', 'Qty', 'Revenue', '% Sales', 'Avg Price', 'COGS', 'Avg COGS', 'Gross Margin', 'GM %']
  const colWidths = ['colWide', 'colNum', 'colNum', 'colNum', 'colNum', 'colNum', 'colNum', 'colNum', 'colNum'] as const

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>{companyName} — Sales by Item (P&amp;L)</Text>
        <Text style={pdfStyles.subtitle}>Generated {new Date().toLocaleDateString('en-NG')}</Text>

        <View style={pdfStyles.tableHeader}>
          {headers.map((h, i) => (
            <Text key={h} style={pdfStyles[colWidths[i]]}>{h}</Text>
          ))}
        </View>

        {rows.map((row, idx) => (
          <View key={row.bird_type_name} style={idx % 2 === 0 ? pdfStyles.tableRow : pdfStyles.tableRowAlt}>
            <Text style={pdfStyles.colWide}>{row.bird_type_name}</Text>
            <Text style={pdfStyles.colNum}>{row.quantity}</Text>
            <Text style={pdfStyles.colNum}>{row.amount.toLocaleString()}</Text>
            <Text style={pdfStyles.colNum}>{row.sales_percent.toFixed(1)}%</Text>
            <Text style={pdfStyles.colNum}>{row.avg_price.toLocaleString()}</Text>
            <Text style={pdfStyles.colNum}>{row.cogs.toLocaleString()}</Text>
            <Text style={pdfStyles.colNum}>{row.avg_cogs.toLocaleString()}</Text>
            <Text style={pdfStyles.colNum}>{row.gross_margin.toLocaleString()}</Text>
            <Text style={pdfStyles.colNum}>{row.gross_margin_percent.toFixed(1)}%</Text>
          </View>
        ))}

        <View style={pdfStyles.tableFooter}>
          <Text style={pdfStyles.colWide}>TOTAL</Text>
          <Text style={pdfStyles.colNum}>{totals.quantity}</Text>
          <Text style={pdfStyles.colNum}>{totals.amount.toLocaleString()}</Text>
          <Text style={pdfStyles.colNum}>100%</Text>
          <Text style={pdfStyles.colNum}>—</Text>
          <Text style={pdfStyles.colNum}>{totals.cogs.toLocaleString()}</Text>
          <Text style={pdfStyles.colNum}>—</Text>
          <Text style={pdfStyles.colNum}>{totals.gross_margin.toLocaleString()}</Text>
          <Text style={pdfStyles.colNum}>{totals.gross_margin_percent.toFixed(1)}%</Text>
        </View>
      </Page>
    </Document>
  )
}

function computeTotals(rows: SalesByItemRow[]) {
  const amount = rows.reduce((s, r) => s + r.amount, 0)
  const cogs = rows.reduce((s, r) => s + r.cogs, 0)
  const gross_margin = amount - cogs
  return {
    quantity: rows.reduce((s, r) => s + r.quantity, 0),
    amount,
    cogs,
    gross_margin,
    gross_margin_percent: amount > 0 ? (gross_margin / amount) * 100 : 0,
  }
}

export function SalesByItemReport() {
  const [rows, setRows] = useState<SalesByItemRow[]>([])
  const [companyName, setCompanyName] = useState('FlockDesk')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadReport = useCallback(() => {
    setLoading(true)
    Promise.all([getSalesByItem(), getCompanySettings()])
      .then(([data, settings]) => {
        setRows(data)
        if (settings?.company_name) setCompanyName(settings.company_name)
      })
      .finally(() => setLoading(false))
  }, [])

  useFlockDeskDataReload(loadReport, [loadReport])

  const totals = computeTotals(rows)

  const handleCSV = () => {
    exportToCSV(
      `sales-by-item-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Bird Type', 'Quantity', 'Revenue', '% of Sales', 'Avg Price',
        'COGS', 'Avg COGS', 'Gross Margin', 'Gross Margin %',
      ],
      [
        ...rows.map((r) => [
          r.bird_type_name, r.quantity, r.amount, r.sales_percent.toFixed(1),
          r.avg_price, r.cogs, r.avg_cogs, r.gross_margin, r.gross_margin_percent.toFixed(1),
        ]),
        [
          'TOTAL', totals.quantity, totals.amount, '100',
          '', totals.cogs, '', totals.gross_margin, totals.gross_margin_percent.toFixed(1),
        ],
      ]
    )
  }

  const handlePDF = async () => {
    setExporting(true)
    try {
      const blob = await pdf(
        <SalesReportPDF rows={rows} companyName={companyName} totals={totals} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sales-by-item-${new Date().toISOString().slice(0, 10)}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title="Sales by Item (P&L)" subtitle="Loading report..." />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No sales data"
          description="Sales by item report will populate once orders are recorded."
        />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Sales by Item (P&L)"
        subtitle={`${rows.length} bird types · Gross margin: ${formatCurrency(totals.gross_margin)} (${totals.gross_margin_percent.toFixed(1)}%)`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleCSV}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={handlePDF} loading={exporting}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Table>
        <thead>
          <tr>
            <Th>Bird Type</Th>
            <Th className="text-right">Qty Sold</Th>
            <Th className="text-right">Revenue</Th>
            <Th className="text-right">% of Sales</Th>
            <Th className="text-right">Avg Price</Th>
            <Th className="text-right">COGS</Th>
            <Th className="text-right">Avg COGS</Th>
            <Th className="text-right">Gross Margin</Th>
            <Th className="text-right">GM %</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {rows.map((row) => (
            <tr key={row.bird_type_name}>
              <Td className="font-medium">{row.bird_type_name}</Td>
              <Td className="text-right">{formatNumber(row.quantity)}</Td>
              <Td className="text-right">{formatCurrency(row.amount)}</Td>
              <Td className="text-right">{row.sales_percent.toFixed(1)}%</Td>
              <Td className="text-right">{formatCurrency(row.avg_price)}</Td>
              <Td className="text-right">{formatCurrency(row.cogs)}</Td>
              <Td className="text-right">{formatCurrency(row.avg_cogs)}</Td>
              <Td className={cn('text-right font-semibold', row.gross_margin >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatCurrency(row.gross_margin)}
              </Td>
              <Td className="text-right">{row.gross_margin_percent.toFixed(1)}%</Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-semibold dark:bg-slate-900">
            <Td>TOTAL</Td>
            <Td className="text-right">{formatNumber(totals.quantity)}</Td>
            <Td className="text-right">{formatCurrency(totals.amount)}</Td>
            <Td className="text-right">100%</Td>
            <Td className="text-right">—</Td>
            <Td className="text-right">{formatCurrency(totals.cogs)}</Td>
            <Td className="text-right">—</Td>
            <Td className="text-right text-green-600">{formatCurrency(totals.gross_margin)}</Td>
            <Td className="text-right">{totals.gross_margin_percent.toFixed(1)}%</Td>
          </tr>
        </tfoot>
      </Table>
    </Card>
  )
}