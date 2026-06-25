import { useEffect, useRef, useState } from 'react'
import { Search, X, Loader2, User, ShoppingCart, Truck } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { globalSearch, type GlobalSearchResult } from '@/lib/dataService'

const TYPE_ICONS = { customer: User, order: ShoppingCart, supplier: Truck }
const TYPE_LABELS = { customer: 'Customer', order: 'Order', supplier: 'Supplier' }

export function MobileSearch() {
  const { profile } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!profile || query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      globalSearch(query, profile.role).then(setResults).finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(timer)
  }, [query, profile])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleSelect = (result: GlobalSearchResult) => {
    window.dispatchEvent(new CustomEvent('flockdesk:search-select', { detail: result }))
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-[#000000] hover:bg-[#F0F2FA] sm:hidden"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white sm:hidden">
          <div className="flex items-center gap-2 border-b border-[#F0F2FA] px-3 py-3 pt-safe">
            <Search className="h-5 w-5 shrink-0 text-[#10259C]" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers, orders..."
              className="min-w-0 flex-1 bg-transparent text-base text-[#000000] placeholder:text-[#10259C] focus:outline-none"
              aria-label="Search"
            />
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-[#10259C]" aria-label="Close search">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
            {query.trim().length < 2 ? (
              <p className="p-4 text-center text-sm text-[#10259C]">Type at least 2 characters to search</p>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-[#10259C]">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
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
                        className="flex w-full min-h-[52px] items-center gap-3 border-b border-[#F0F2FA] px-4 py-3 text-left active:bg-[#F0F2FA]"
                      >
                        <div className="rounded-lg bg-[#F0F2FA] p-2 text-[#10259C]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#000000]">{r.label}</p>
                          {r.sublabel && <p className="truncate text-xs text-[#10259C]">{r.sublabel}</p>}
                        </div>
                        <span className="text-xs font-medium text-[#10259C]">{TYPE_LABELS[r.type]}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}