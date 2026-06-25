import { useEffect, useState } from 'react'
import { AlertTriangle, Skull, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Input, Select, Card, CardHeader } from '@/components/ui'
import { getBirdTypes, getDispositions, getReconciliation, addDisposition } from '@/lib/dataService'
import type { ReconciliationRow } from '@/types'
import { formatNumber } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import type { BirdType, BirdDisposition, DispositionType } from '@/types'

interface DispositionDraft {
  bird_type_id: string
  reject: number
  mortality: number
  farm_transfer: number
  notes: string
}

interface Props {
  salesDayId: string
  onClose: () => void
  onSaved: () => void
}

const dispositionMeta: Record<DispositionType, { label: string; icon: typeof AlertTriangle; color: string }> = {
  reject: { label: 'Rejects', icon: AlertTriangle, color: 'text-amber-600' },
  mortality: { label: 'Mortality', icon: Skull, color: 'text-red-600' },
  farm_transfer: { label: 'Farm Transfer', icon: Truck, color: 'text-blue-600' },
}

function emptyDraft(birdTypeId = ''): DispositionDraft {
  return { bird_type_id: birdTypeId, reject: 0, mortality: 0, farm_transfer: 0, notes: '' }
}

export function DispositionEntry({ salesDayId, onClose, onSaved }: Props) {
  const { profile, user } = useAuthStore()
  const [birdTypes, setBirdTypes] = useState<BirdType[]>([])
  const [existing, setExisting] = useState<BirdDisposition[]>([])
  const [reconciliation, setReconciliation] = useState<ReconciliationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<DispositionDraft[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([getBirdTypes(), getDispositions(salesDayId), getReconciliation(salesDayId)])
      .then(([types, dispositions, recon]) => {
        if (cancelled) return
        setBirdTypes(types)
        setExisting(dispositions)
        setReconciliation(recon)

        const birdTypeIds = new Set(dispositions.map((d) => d.bird_type_id))
        const initialDrafts = types
          .filter((bt) => birdTypeIds.has(bt.id) || types.length <= 6)
          .map((bt) => emptyDraft(bt.id))

        setDrafts(initialDrafts.length > 0 ? initialDrafts : [emptyDraft()])
      })
      .catch(() => toast.error('Failed to load disposition data'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [salesDayId])

  const getExistingTotal = (birdTypeId: string, type: DispositionType): number =>
    existing
      .filter((d) => d.bird_type_id === birdTypeId && d.disposition_type === type)
      .reduce((s, d) => s + d.quantity, 0)

  const updateDraft = (index: number, patch: Partial<DispositionDraft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  const handleSave = async () => {
    const entries: (Partial<BirdDisposition> & { tenant_id?: string })[] = []
    let hasError = false

    const onGroundByType = new Map<string, number>()

    drafts.forEach((draft) => {
      if (!draft.bird_type_id) return

      const row = reconciliation.find((r) => r.bird_type_id === draft.bird_type_id)
      const onGround = row?.balance ?? 0
      const newQty = draft.reject + draft.mortality + draft.farm_transfer
      const alreadyPlanned = onGroundByType.get(draft.bird_type_id) || 0

      if (newQty < 0) {
        toast.error('Quantities cannot be negative')
        hasError = true
        return
      }

      if (newQty > 0 && alreadyPlanned + newQty > onGround) {
        const birdName = birdTypes.find((bt) => bt.id === draft.bird_type_id)?.name || 'bird type'
        toast.error(
          onGround === 0
            ? `No ${birdName} on ground to record dispositions for`
            : `Only ${onGround} ${birdName} on ground — cannot record more than available stock`
        )
        hasError = true
        return
      }

      if (newQty > 0) {
        onGroundByType.set(draft.bird_type_id, alreadyPlanned + newQty)
      }

      const types: { type: DispositionType; qty: number }[] = [
        { type: 'reject', qty: draft.reject },
        { type: 'mortality', qty: draft.mortality },
        { type: 'farm_transfer', qty: draft.farm_transfer },
      ]

      types.forEach(({ type, qty }) => {
        if (qty > 0) {
          entries.push({
            tenant_id: profile?.tenant_id,
            sales_day_id: salesDayId,
            bird_type_id: draft.bird_type_id,
            disposition_type: type,
            quantity: qty,
            notes: draft.notes.trim() || null,
            recorded_by: user?.id || profile?.id || '',
          })
        }
      })
    })

    if (hasError) return

    if (entries.length === 0) {
      toast.error('Enter at least one disposition quantity')
      return
    }

    setSaving(true)
    try {
      await Promise.all(entries.map((e) => addDisposition(e)))
      toast.success(`${entries.length} disposition(s) recorded`)
      onSaved()
      onClose()
    } catch {
      toast.error('Failed to save dispositions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Record Dispositions"
        subtitle="Log rejects, mortality, and farm transfers per bird type"
        action={
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {(Object.entries(dispositionMeta) as [DispositionType, typeof dispositionMeta.reject][]).map(
          ([type, meta]) => {
            const Icon = meta.icon
            return (
              <div
                key={type}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"
              >
                <Icon className={`h-5 w-5 ${meta.color}`} />
                <div>
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-slate-500">
                    {formatNumber(
                      existing
                        .filter((d) => d.disposition_type === type)
                        .reduce((s, d) => s + d.quantity, 0)
                    )}{' '}
                    recorded today
                  </p>
                </div>
              </div>
            )
          }
        )}
      </div>

      <div className="space-y-4">
        {drafts.map((draft, index) => {
          const birdType = birdTypes.find((bt) => bt.id === draft.bird_type_id)
          return (
            <div
              key={index}
              className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
            >
              <Select
                label="Bird Type"
                value={draft.bird_type_id}
                onChange={(e) => updateDraft(index, { bird_type_id: e.target.value })}
              >
                <option value="">Select bird type</option>
                {birdTypes.map((bt) => (
                  <option key={bt.id} value={bt.id}>
                    {bt.name}
                  </option>
                ))}
              </Select>

              {draft.bird_type_id && birdType && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <Input
                      label="Rejects"
                      type="number"
                      min={0}
                      value={draft.reject || ''}
                      onChange={(e) => updateDraft(index, { reject: Number(e.target.value) })}
                    />
                    {getExistingTotal(draft.bird_type_id, 'reject') > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        Already: {formatNumber(getExistingTotal(draft.bird_type_id, 'reject'))}
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      label="Mortality"
                      type="number"
                      min={0}
                      value={draft.mortality || ''}
                      onChange={(e) => updateDraft(index, { mortality: Number(e.target.value) })}
                    />
                    {getExistingTotal(draft.bird_type_id, 'mortality') > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        Already: {formatNumber(getExistingTotal(draft.bird_type_id, 'mortality'))}
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      label="Farm Transfer"
                      type="number"
                      min={0}
                      value={draft.farm_transfer || ''}
                      onChange={(e) => updateDraft(index, { farm_transfer: Number(e.target.value) })}
                    />
                    {getExistingTotal(draft.bird_type_id, 'farm_transfer') > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        Already: {formatNumber(getExistingTotal(draft.bird_type_id, 'farm_transfer'))}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <Input
                  label="Notes (optional)"
                  value={draft.notes}
                  onChange={(e) => updateDraft(index, { notes: e.target.value })}
                  placeholder="e.g. Leg deformities, heat stress..."
                />
              </div>
            </div>
          )
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
        >
          Add Another Bird Type
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-700">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Save Dispositions
        </Button>
      </div>
    </Card>
  )
}