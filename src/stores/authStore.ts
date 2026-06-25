import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { setForceDemoMode } from '@/lib/dataService'
import type { Profile } from '@/types'
import { getRoleDashboard } from '@/lib/utils'

interface AuthState {
  user: { id: string; email: string } | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  lastActivity: number
  signIn: (email: string, password: string) => Promise<{ error?: string; redirect?: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  refreshProfile: () => Promise<void>
  touchActivity: () => void
  checkSessionTimeout: () => boolean
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const DEMO_SESSION_KEY = 'flockdesk-demo-session'

/** Allow demo123 on localhost dev even when .env.local points at local Supabase */
function isLocalDevEnvironment(): boolean {
  if (!import.meta.env.DEV) return false
  const url = import.meta.env.VITE_SUPABASE_URL || ''
  return !url || url.includes('127.0.0.1') || url.includes('localhost')
}

const demoProfiles: Record<string, { role: import('@/types').UserRole; name: string }> = {
  'sales@jmages.ng': { role: 'sales_manager', name: 'Sales Manager' },
  'accounts@jmages.ng': { role: 'accounts_manager', name: 'Accounts Manager' },
  'md@jmages.ng': { role: 'md', name: 'Managing Director' },
  'admin@jmages.ng': { role: 'admin', name: 'System Admin' },
}

function restoreDemoSession(): { email: string; demo: (typeof demoProfiles)[string] } | null {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY)
    if (!raw) return null
    const { email } = JSON.parse(raw) as { email?: string }
    if (!email) return null
    const demo = demoProfiles[email.toLowerCase()]
    if (!demo) return null
    return { email, demo }
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  lastActivity: Date.now(),

  touchActivity: () => set({ lastActivity: Date.now() }),

  checkSessionTimeout: () => {
    const { lastActivity, user } = get()
    if (!user) return false
    if (Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
      get().signOut()
      return true
    }
    return false
  },

  initialize: async () => {
    try {
      const restored = restoreDemoSession()
      if (restored) {
        setForceDemoMode(true) // hydrates shared sales/accounts tenant data from sessionStorage
        set({
          user: { id: 'demo-user', email: restored.email },
          profile: {
            id: 'demo-user',
            tenant_id: 'a0000000-0000-4000-8000-000000000001',
            full_name: restored.demo.name,
            role: restored.demo.role,
            phone: null,
            is_active: true,
            last_active_at: null,
            created_at: new Date().toISOString(),
          },
          lastActivity: Date.now(),
        })
        return
      }

      const { isSupabaseConfigured } = await import('@/lib/supabase')
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          set({ user: { id: session.user.id, email: session.user.email || '' } })
          await get().refreshProfile()
        }
        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            set({ user: { id: session.user.id, email: session.user.email || '' } })
            await get().refreshProfile()
          } else {
            set({ user: null, profile: null })
          }
          set({ lastActivity: Date.now() })
        })
      }
    } catch (err) {
      console.warn('Auth init failed, using demo mode:', err)
    } finally {
      set({ initialized: true, lastActivity: Date.now() })
    }
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) set({ profile: data as Profile })
  },

  signIn: async (email, password) => {
    set({ loading: true })

    const { isSupabaseConfigured } = await import('@/lib/supabase')
    const demo = demoProfiles[email.toLowerCase()]
    const allowDemoLogin = !isSupabaseConfigured || isLocalDevEnvironment()
    if (allowDemoLogin && demo && password === 'demo123') {
      setForceDemoMode(true)
      sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ email }))
      set({
        user: { id: 'demo-user', email },
        profile: {
          id: 'demo-user',
          tenant_id: 'a0000000-0000-4000-8000-000000000001',
          full_name: demo.name,
          role: demo.role,
          phone: null,
          is_active: true,
          last_active_at: null,
          created_at: new Date().toISOString(),
        },
        loading: false,
        initialized: true,
        lastActivity: Date.now(),
      })
      return { redirect: getRoleDashboard(demo.role) }
    }

    if (!isSupabaseConfigured) {
      set({ loading: false })
      return { error: 'Demo login: use sales@jmages.ng / accounts@jmages.ng / md@jmages.ng / admin@jmages.ng with password demo123' }
    }

    setForceDemoMode(false)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    if (error) return { error: error.message }
    if (data.user) {
      set({ user: { id: data.user.id, email: data.user.email || '' }, lastActivity: Date.now() })
      await get().refreshProfile()
      const profile = get().profile
      return { redirect: profile ? getRoleDashboard(profile.role) : '/sales' }
    }
    return { error: 'Login failed' }
  },

  signOut: async () => {
    setForceDemoMode(false)
    sessionStorage.removeItem(DEMO_SESSION_KEY)
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))