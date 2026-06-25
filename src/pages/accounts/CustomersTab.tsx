import { useCallback, useState } from 'react'
import { Search, User } from 'lucide-react'
import { Card, CardHeader, Skeleton, EmptyState } from '@/components/ui'
import { getCustomers } from '@/lib/dataService'
import { useFlockDeskDataReload } from '@/hooks/useFlockDeskDataReload'
import { CustomerProfile } from '@/pages/sales/CustomerProfile'
import type { Customer } from '@/types'

export function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false))
  }, [])

  useFlockDeskDataReload(load, [load])

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.business_name || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Customers" subtitle="Full purchase and payment history — click any customer" />
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#10259C]" />
          <input
            className="w-full rounded-lg border border-[#F0F2FA] py-2 pl-10 pr-3 text-sm text-[#000000]"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No customers found" description="Try a different search term or add customers from Sales." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c)}
              className="flex items-start gap-3 rounded-xl border border-[#F0F2FA] bg-white p-4 text-left transition-all hover:border-[#001996] hover:shadow-md"
            >
              <div className="rounded-full bg-[#F0F2FA] p-2 text-[#001996]">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-[#000000]">{c.name}</p>
                <p className="text-sm text-[#10259C]">{c.phone}</p>
                {c.business_name && <p className="text-xs text-[#10259C]">{c.business_name}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <CustomerProfile customer={selected} open={!!selected} onClose={() => setSelected(null)} showPaymentHistory />
    </div>
  )
}