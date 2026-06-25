import { CheckCircle, XCircle } from 'lucide-react'
import { Card, CardHeader, Table, Th, Td } from '@/components/ui'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { useDepartment } from '@/context/DepartmentContext'
import { formatNumber } from '@/lib/utils'
import type { ReconciliationRow } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  rows: ReconciliationRow[]
  compact?: boolean
}

export function ReconciliationWidget({ rows, compact }: Props) {
  const theme = useDepartment()
  const allBalanced = rows.length > 0 && rows.every((r) => r.is_balanced)
  const hasOversold = rows.some((r) => r.oversold > 0)

  return (
    <Card className={cn(allBalanced ? 'border-[#10259C]' : 'border-[#10259C]', compact && 'p-4')}>
      <CardHeader
        title="Bird Reconciliation"
        subtitle={
          hasOversold
            ? 'Sales exceed declared stock — review orders immediately'
            : allBalanced
              ? 'All bird types balanced ✅'
              : 'Birds still on ground — keep selling or record dispositions'
        }
        action={allBalanced ? <CheckCircle className="h-6 w-6 text-[#10259C]" /> : <XCircle className="h-6 w-6 text-[#FF052E]" />}
      />

      <div className="mb-6 space-y-3">
        {rows.map((row) => {
          const reconciled = row.good_sold + row.second_class_sold + row.rejects + row.mortality + row.farm_transfer
          if (row.declared <= 0) return null
          return (
            <ProgressBar
              key={row.bird_type_id}
              label={row.bird_type_name}
              sublabel={`${formatNumber(row.balance)} on ground · ${reconciled} / ${row.declared} accounted`}
              value={reconciled}
              max={row.declared}
              variant={row.is_balanced ? 'balanced' : 'default'}
              gradient={row.is_balanced ? theme.progressBalanced : theme.progressGradient}
            />
          )
        })}
      </div>

      <Table>
        <thead>
          <tr>
            <Th bgColor={theme.tableHeaderBg}>Bird Type</Th>
            <Th bgColor={theme.tableHeaderBg}>Declared</Th>
            <Th bgColor={theme.tableHeaderBg}>Good</Th>
            <Th bgColor={theme.tableHeaderBg}>2nd</Th>
            <Th bgColor={theme.tableHeaderBg}>Reject</Th>
            <Th bgColor={theme.tableHeaderBg}>Mortality</Th>
            <Th bgColor={theme.tableHeaderBg}>Transfer</Th>
            <Th bgColor={theme.tableHeaderBg}>Balance</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.bird_type_id}
              style={{ background: i % 2 === 1 ? theme.tableRowAlt : '#FFFFFF' }}
              className="border-t border-[#F0F2FA]"
            >
              <Td className="font-semibold">{row.bird_type_name}</Td>
              <Td className="font-mono">{formatNumber(row.declared)}</Td>
              <Td className="font-mono">{formatNumber(row.good_sold)}</Td>
              <Td className="font-mono">{formatNumber(row.second_class_sold)}</Td>
              <Td className="font-mono">{formatNumber(row.rejects)}</Td>
              <Td className="font-mono">{formatNumber(row.mortality)}</Td>
              <Td className="font-mono">{formatNumber(row.farm_transfer)}</Td>
              <Td>
                <span
                  className={cn(
                    'font-mono font-bold',
                    row.oversold > 0 ? 'text-[#FF052E]' : row.is_balanced ? 'text-[#10259C]' : 'text-[#D97706]'
                  )}
                >
                  {row.oversold > 0
                    ? `⚠️ oversold ${formatNumber(row.oversold)}`
                    : row.balance === 0
                      ? '✅ 0 on ground'
                      : `${formatNumber(row.balance)} on ground`}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}