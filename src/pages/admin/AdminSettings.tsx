import { useEffect, useState } from 'react'
import { Bird, Building2, MessageSquare, Users, Bell } from 'lucide-react'
import { Card, CardHeader, Button, Input, Select, Table, Th, Td, Badge, Skeleton, EmptyState } from '@/components/ui'
import { PageWrapper } from '@/components/shared/PageWrapper'
import { DepartmentBanner } from '@/components/shared/DepartmentBanner'
import { getBirdTypes, getCompanySettings, isDemoMode } from '@/lib/dataService'
import type { BirdType, CompanySettings } from '@/types'
import toast from 'react-hot-toast'

type Tab = 'company' | 'birds' | 'users' | 'whatsapp' | 'thresholds'

export function AdminSettings() {
  const [tab, setTab] = useState<Tab>('company')
  const [birdTypes, setBirdTypes] = useState<BirdType[]>([])
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [newBirdName, setNewBirdName] = useState('')

  useEffect(() => {
    Promise.all([getBirdTypes(), getCompanySettings()]).then(([birds, company]) => {
      setBirdTypes(birds)
      setSettings(company)
      setLoading(false)
    })
  }, [])

  const tabs = [
    { id: 'company' as Tab, label: 'Company', icon: Building2 },
    { id: 'birds' as Tab, label: 'Bird Types', icon: Bird },
    { id: 'users' as Tab, label: 'Users', icon: Users },
    { id: 'whatsapp' as Tab, label: 'WhatsApp', icon: MessageSquare },
    { id: 'thresholds' as Tab, label: 'Alerts', icon: Bell },
  ]

  const handleAddBirdType = () => {
    if (!newBirdName.trim()) return
    if (isDemoMode()) {
      toast.success(`Bird type "${newBirdName}" added (demo mode)`)
      setNewBirdName('')
      return
    }
    toast.success('Bird type added')
    setNewBirdName('')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <PageWrapper className="space-y-6">
      <DepartmentBanner subtitle="System configuration and administration" />

      {isDemoMode() && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          Demo mode — connect Supabase to persist settings changes.
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'company' && settings && (
        <Card>
          <CardHeader title="Company Profile" subtitle="Shown on reports and invoices" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Company Name" defaultValue={settings.company_name} />
            <Input label="Phone" defaultValue={settings.phone || ''} />
            <Input label="Email" defaultValue={settings.email || ''} />
            <Input label="Address" defaultValue={settings.address || ''} />
            <Input label="Bank Name" defaultValue={settings.bank_name || ''} />
            <Input label="Account Number" defaultValue={settings.bank_account_number || ''} />
            <Input label="Account Name" defaultValue={settings.bank_account_name || ''} />
            <Input label="Order Number Prefix" defaultValue={settings.order_number_prefix} />
          </div>
          <div className="mt-4">
            <Button onClick={() => toast.success('Settings saved')}>Save Changes</Button>
          </div>
        </Card>
      )}

      {tab === 'birds' && (
        <Card>
          <CardHeader title="Bird Types" subtitle="Manage inventory SKUs — add without code changes" />
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="New bird type name"
              value={newBirdName}
              onChange={(e) => setNewBirdName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddBirdType}>Add Bird Type</Button>
          </div>
          <Table>
            <thead><tr><Th>Name</Th><Th>Code</Th><Th>Own Production Cost</Th><Th>Status</Th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {birdTypes.map((bt) => (
                <tr key={bt.id}>
                  <Td className="font-medium">{bt.name}</Td>
                  <Td>{bt.code}</Td>
                  <Td>₦{bt.own_production_cost}</Td>
                  <Td><Badge variant={bt.is_active ? 'success' : 'default'}>{bt.is_active ? 'Active' : 'Inactive'}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'users' && (
        <Card>
          <CardHeader title="User Management" subtitle="Create and assign roles" action={<Button size="sm">Invite User</Button>} />
          <EmptyState
            title="User management via Supabase Auth"
            description="Create users in Supabase Dashboard, then assign roles in the profiles table. RLS enforces permissions per role."
          />
        </Card>
      )}

      {tab === 'whatsapp' && (
        <Card>
          <CardHeader title="WhatsApp Configuration" subtitle="Business Cloud API settings" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="API Token" type="password" placeholder="From Meta Developer Console" />
            <Input label="Phone Number ID" placeholder="WhatsApp Business phone number ID" />
            <Input label="Sales Day Closed Template ID" placeholder="Pre-approved template ID" />
            <Input label="Payment Confirmed Template ID" placeholder="Pre-approved template ID" />
            <Input label="Weekly Report Template ID" placeholder="Pre-approved template ID" />
            <Input label="Large Order Alert Template ID" placeholder="Pre-approved template ID" />
          </div>
          <div className="mt-4">
            <Button onClick={() => toast.success('WhatsApp settings saved')}>Save</Button>
          </div>
        </Card>
      )}

      {tab === 'thresholds' && (
        <Card>
          <CardHeader title="Notification Thresholds" subtitle="Alert triggers" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Large Order Threshold (₦)" type="number" defaultValue="500000" />
            <Input label="Overdue Payment Days" type="number" defaultValue="7" />
            <Input label="Mortality Alert %" type="number" defaultValue="5" />
            <Input label="Unbalanced Session Alert (hours)" type="number" defaultValue="2" />
            <Select label="Default Sales Days">
              <option value="1,4">Monday & Thursday</option>
              <option value="1,3,5">Mon, Wed, Fri</option>
            </Select>
            <Select label="Admin Override">
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </Select>
          </div>
          <div className="mt-4">
            <Button onClick={() => toast.success('Thresholds saved')}>Save</Button>
          </div>
        </Card>
      )}
    </PageWrapper>
  )
}