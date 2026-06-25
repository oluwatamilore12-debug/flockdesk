import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Search, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Button, Input, Select, Card, CardHeader, Modal, EmptyState,
} from '@/components/ui'
import {
  getBirdTypes, getCustomers, getReconciliation, createOrder,
  getCompanySettings, isDemoMode, addCustomer, getDeclaredBirdTypeIds,
  getLastCustomerBirdRate, getOpenSalesDay,
} from '@/lib/dataService'
import { validateOrderLine, validateCustomer } from '@/lib/validation'
import { cn, formatCurrency, formatDate, formatNumber, normalizePhone } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { CustomerProfile } from './CustomerProfile'
import type { BirdType, Customer, BirdGrade, ReconciliationRow } from '@/types'

interface OrderLineDraft {
  id: string
  bird_type_id: string
  grade: BirdGrade
  quantity: number
  rate_per_chick: number
}

interface Props {
  salesDayId: string
  onClose: () => void
  onSaved: () => void
}

function newLine(): OrderLineDraft {
  return {
    id: crypto.randomUUID(),
    bird_type_id: '',
    grade: 'good',
    quantity: 0,
    rate_per_chick: 0,
  }
}

export function OrderEntry({ salesDayId, onClose, onSaved }: Props) {
  const { profile, user } = useAuthStore()
  const [birdTypes, setBirdTypes] = useState<BirdType[]>([])
  const [declaredBirdTypeIds, setDeclaredBirdTypeIds] = useState<string[]>([])
  const [salesDayDate, setSalesDayDate] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [reconciliation, setReconciliation] = useState<ReconciliationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [lines, setLines] = useState<OrderLineDraft[]>([newLine()])
  const [notes, setNotes] = useState('')
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({})

  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    business_name: '',
    customer_type: 'retail' as Customer['customer_type'],
  })
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      getBirdTypes(),
      getCustomers(),
      getReconciliation(salesDayId),
      getDeclaredBirdTypeIds(salesDayId),
      getOpenSalesDay(),
    ])
      .then(([types, custs, recon, declaredIds, day]) => {
        if (cancelled) return
        setBirdTypes(types.filter((t) => declaredIds.includes(t.id)))
        setDeclaredBirdTypeIds(declaredIds)
        setCustomers(custs)
        setReconciliation(recon)
        setSalesDayDate(day?.date || '')
      })
      .catch(() => toast.error('Failed to load order data'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [salesDayId])

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customers.slice(0, 8)
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.business_name?.toLowerCase().includes(q)
    )
  }, [customers, customerSearch])

  const getAvailableForLine = (lineId: string, birdTypeId: string): number => {
    if (!birdTypeId) return 0
    const row = reconciliation.find((r) => r.bird_type_id === birdTypeId)
    const onGround = row ? row.balance : 0
    const usedInDraft = lines
      .filter((l) => l.id !== lineId && l.bird_type_id === birdTypeId)
      .reduce((s, l) => s + (l.quantity || 0), 0)
    return Math.max(0, onGround - usedInDraft)
  }

  const notifyIfOverSold = (lineId: string, birdTypeId: string, quantity: number) => {
    if (!birdTypeId || quantity <= 0) return
    const available = getAvailableForLine(lineId, birdTypeId)
    if (quantity > available) {
      const birdName = birdTypes.find((bt) => bt.id === birdTypeId)?.name || 'this bird type'
      toast.error(
        available === 0
          ? `No ${birdName} on ground — declare stock before taking orders`
          : `Only ${available} ${birdName} on ground — cannot sell more than declared stock`
      )
    }
  }

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.rate_per_chick, 0),
    [lines]
  )

  const canSave = useMemo(() => {
    if (!selectedCustomer || declaredBirdTypeIds.length === 0) return false
    return lines.some(
      (l) =>
        l.bird_type_id &&
        l.quantity > 0 &&
        l.rate_per_chick > 0 &&
        l.quantity <= getAvailableForLine(l.id, l.bird_type_id)
    )
  }, [selectedCustomer, lines, declaredBirdTypeIds, reconciliation])

  const prefillRate = async (lineId: string, customerId: string, birdTypeId: string) => {
    if (!customerId || !birdTypeId) return
    const lastRate = await getLastCustomerBirdRate(customerId, birdTypeId)
    if (lastRate) {
      setLines((prev) =>
        prev.map((l) => (l.id === lineId && !l.rate_per_chick ? { ...l, rate_per_chick: lastRate } : l))
      )
    }
  }

  const updateLine = (id: string, patch: Partial<OrderLineDraft>) => {
    setLines((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
      const updated = next.find((l) => l.id === id)
      if (updated && (patch.quantity !== undefined || patch.bird_type_id !== undefined)) {
        notifyIfOverSold(updated.id, updated.bird_type_id, updated.quantity)
      }
      if (updated?.bird_type_id && selectedCustomer && patch.bird_type_id) {
        prefillRate(id, selectedCustomer.id, updated.bird_type_id)
      }
      return next
    })
    setLineErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev))
  }

  const handleQuickAddCustomer = async () => {
    const errors = validateCustomer(newCustomer)
    if (errors.length > 0) {
      const map: Record<string, string> = {}
      errors.forEach((e) => {
        map[e.field] = e.message
      })
      setCustomerErrors(map)
      errors.forEach((e) => toast.error(e.message))
      return
    }

    const phone = normalizePhone(newCustomer.phone)

    if (!profile?.tenant_id && !isDemoMode()) {
      toast.error('Unable to create customer — profile not loaded')
      return
    }

    const result = await addCustomer({
      tenant_id: profile?.tenant_id || '',
      name: newCustomer.name.trim(),
      phone,
      business_name: newCustomer.business_name.trim() || null,
      customer_type: newCustomer.customer_type,
    })
    if (result.error || !result.data) {
      toast.error(result.error || 'Failed to add customer')
      return
    }

    setCustomers((prev) => [...prev, result.data!])
    setSelectedCustomer(result.data)
    setShowAddCustomer(false)
    setNewCustomer({ name: '', phone: '', business_name: '', customer_type: 'retail' })
    toast.success(
      isDemoMode()
        ? 'Customer added — visible in Accounts debtors ledger'
        : 'Customer added'
    )
  }

  const validateAllLines = (): boolean => {
    const errors: Record<string, string> = {}
    let valid = true

    lines.forEach((line) => {
      if (!line.bird_type_id) {
        errors[line.id] = 'Select a bird type'
        valid = false
        return
      }
      const available = getAvailableForLine(line.id, line.bird_type_id)
      const lineValidation = validateOrderLine({
        quantity: line.quantity,
        rate_per_chick: line.rate_per_chick,
        available,
      })
      if (lineValidation.length > 0) {
        errors[line.id] = lineValidation[0].message
        valid = false
      }
    })

    setLineErrors(errors)
    return valid
  }

  const handleSave = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer')
      return
    }
    if (!validateAllLines()) {
      toast.error('Order exceeds birds on ground — reduce quantities before saving')
      return
    }

    setSaving(true)
    try {
      const settings = await getCompanySettings()
      const prefix = settings?.order_number_prefix || 'ORD'
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '')
      const orderNumber = `${prefix}-${dateStr}-${String(Math.floor(Math.random() * 900) + 100)}`

      const orderLines = lines.map((l) => ({
        bird_type_id: l.bird_type_id,
        grade: l.grade,
        quantity: l.quantity,
        rate_per_chick: l.rate_per_chick,
        subtotal: l.quantity * l.rate_per_chick,
      }))

      const result = await createOrder(
        {
          tenant_id: profile?.tenant_id,
          sales_day_id: salesDayId,
          customer_id: selectedCustomer.id,
          order_number: orderNumber,
          order_date: new Date().toISOString(),
          status: 'pending',
          subtotal,
          total_amount: subtotal,
          amount_paid: 0,
          balance: subtotal,
          created_by: user?.id || profile?.id || '',
          notes: notes.trim() || null,
        },
        orderLines
      )

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Order saved as pending')
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to save order')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-12 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-32 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="New Order"
          subtitle={salesDayDate ? `Sales Day: ${formatDate(salesDayDate)}` : 'Create a sales order for the current session'}
          action={
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          }
        />

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Customer
            </label>
            {selectedCustomer ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-800 dark:bg-primary-900/20">
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">{selectedCustomer.name}</p>
                  <p className="text-sm text-slate-500">{selectedCustomer.phone}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowProfile(true)}>
                  View Profile
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800"
                    placeholder="Search by name, phone, or business..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
                {filteredCustomers.length === 0 ? (
                  <EmptyState
                    title="No customers found"
                    description="Try a different search or add a new customer."
                    action={
                      <Button size="sm" onClick={() => setShowAddCustomer(true)}>
                        <UserPlus className="h-4 w-4" />
                        Quick Add Customer
                      </Button>
                    }
                  />
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setCustomerSearch('')
                        }}
                        className="flex w-full items-center justify-between border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.phone}</p>
                        </div>
                        <span className="text-xs capitalize text-slate-400">{c.customer_type}</span>
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowAddCustomer(true)}>
                  <UserPlus className="h-4 w-4" />
                  Quick Add Customer
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Order Lines</h4>
              <Button variant="outline" size="sm" onClick={() => setLines((prev) => [...prev, newLine()])}>
                <Plus className="h-4 w-4" />
                Add Line
              </Button>
            </div>

            {lines.map((line, idx) => (
              <div
                key={line.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Line {idx + 1}</span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Select
                    label="Bird Type"
                    value={line.bird_type_id}
                    onChange={(e) => updateLine(line.id, { bird_type_id: e.target.value })}
                    error={lineErrors[line.id] && !line.bird_type_id ? lineErrors[line.id] : undefined}
                  >
                    <option value="">Select type</option>
                    {birdTypes.map((bt) => (
                      <option key={bt.id} value={bt.id}>
                        {bt.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Grade"
                    value={line.grade}
                    onChange={(e) => updateLine(line.id, { grade: e.target.value as BirdGrade })}
                  >
                    <option value="good">Good</option>
                    <option value="second_class">2nd Class</option>
                  </Select>
                  <Input
                    label="Quantity"
                    type="number"
                    min={0}
                    value={line.quantity || ''}
                    onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                    error={lineErrors[line.id]?.includes('Quantity') ? lineErrors[line.id] : undefined}
                  />
                  <Input
                    label="Rate (₦/chick)"
                    type="number"
                    min={0}
                    value={line.rate_per_chick || ''}
                    onChange={(e) => updateLine(line.id, { rate_per_chick: Number(e.target.value) })}
                    error={lineErrors[line.id]?.includes('Rate') ? lineErrors[line.id] : undefined}
                  />
                  <div className="flex flex-col justify-end">
                    <p className="mb-1 text-xs text-slate-500">Subtotal</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(line.quantity * line.rate_per_chick)}
                    </p>
                    {line.bird_type_id && (
                      <p
                        className={cn(
                          'text-xs',
                          line.quantity > getAvailableForLine(line.id, line.bird_type_id)
                            ? 'font-medium text-red-600'
                            : 'text-slate-400'
                        )}
                      >
                        {formatNumber(getAvailableForLine(line.id, line.bird_type_id))} on ground
                      </p>
                    )}
                  </div>
                </div>
                {lineErrors[line.id] && line.bird_type_id && (
                  <p className="mt-2 text-xs text-red-600">{lineErrors[line.id]}</p>
                )}
              </div>
            ))}
          </div>

          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions..."
          />

          <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
            <div>
              <p className="text-sm text-slate-500">Order Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(subtotal)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving} disabled={!canSave}>
                Save Order →
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Modal open={showAddCustomer} onClose={() => setShowAddCustomer(false)} title="Quick Add Customer" size="md">
        <div className="space-y-4">
          <Input
            label="Name"
            value={newCustomer.name}
            onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
            error={customerErrors.name}
            required
          />
          <Input
            label="Phone"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
            error={customerErrors.phone}
            placeholder="08012345678"
            required
          />
          <Input
            label="Business Name (optional)"
            value={newCustomer.business_name}
            onChange={(e) => setNewCustomer((p) => ({ ...p, business_name: e.target.value }))}
          />
          <Select
            label="Customer Type"
            value={newCustomer.customer_type}
            onChange={(e) =>
              setNewCustomer((p) => ({ ...p, customer_type: e.target.value as Customer['customer_type'] }))
            }
          >
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
            <option value="regular">Regular</option>
            <option value="agent">Agent</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickAddCustomer}>Add Customer</Button>
          </div>
        </div>
      </Modal>

      <CustomerProfile
        customer={selectedCustomer}
        open={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </div>
  )
}