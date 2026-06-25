import { useEffect, useRef, useState } from 'react'
import { Search, User, ShoppingCart, Truck, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { globalSearch, type GlobalSearchResult } from '@/lib/dataService'


const TYPE_ICONS = {
  customer: User,
  order: ShoppingCart,
  supplier: Truck,
}

const TYPE_LABELS = {
  customer: 'Customer',
  order: 'Order',
  supplier: 'Supplier',
}

export function GlobalSearch() {
  const { profile } = useAuthStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profile || query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(() => {
      globalSearch(query, profile.role)
        .then(setResults)
        .finally(() => setLoading(false))
    }, 280)

    return () => clearTimeout(timer)
  }, [query, profile])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (result: GlobalSearchResult) => {
    window.dispatchEvent(new CustomEvent('flockdesk:search-select', { detail: result }))
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className="relative hidden flex-1 max-w-md sm:block">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#10259C]" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search customers, orders..."
        className="w-full rounded-xl border border-[#F0F2FA] bg-[#F0F2FA] py-2 pl-10 pr-3 text-sm text-[#000000] placeholder:text-[#10259C] focus:border-[#10259C] focus:outline-none focus:ring-2 focus:ring-[#10259C]/20"
        aria-label="Global search"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[#F0F2FA] bg-white shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-[#10259C]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <p className="p-4 text-center text-sm text-[#10259C]">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            <ul>
              {results.map((r) => {
                const Icon = TYPE_ICONS[r.type]
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      type="button"
                      onClick={() => handleSelect(r)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F0F2FA]"
                    >
                      <div className="rounded-lg bg-[#F0F2FA] p-1.5 text-[#10259C]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#000000]">{r.label}</p>
                        {r.sublabel && (
                          <p className="truncate text-xs text-[#10259C]">{r.sublabel}</p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-[#10259C]">{TYPE_LABELS[r.type]}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function useGlobalSearchHandler(handlers: {
  onCustomer?: (id: string) => void
  onOrder?: (id: string) => void
  onSupplier?: (id: string) => void
}) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const handler = (e: Event) => {
      const result = (e as CustomEvent<GlobalSearchResult>).detail
      const h = handlersRef.current
      if (result.type === 'customer') h.onCustomer?.(result.id)
      else if (result.type === 'order') h.onOrder?.(result.id)
      else if (result.type === 'supplier') h.onSupplier?.(result.id)
    }
    window.addEventListener('flockdesk:search-select', handler)
    return () => window.removeEventListener('flockdesk:search-select', handler)
  }, [])
}