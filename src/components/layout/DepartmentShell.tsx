import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { motion } from 'framer-motion'
import { LogOut, Bell, Menu, X } from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { GlobalSearch } from '@/components/shared/GlobalSearch'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { DepartmentProvider } from '@/context/DepartmentContext'
import { type Department, departmentThemes } from '@/lib/departmentTheme'
import { cn } from '@/lib/utils'

interface NavItem {
  path: string
  label: string
}

interface DepartmentShellProps {
  department: Department
  navItems: NavItem[]
  children: ReactNode
}

function ShellInner({ department, navItems, children }: DepartmentShellProps) {
  const theme = departmentThemes[department]
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut, touchActivity, checkSessionTimeout } = useAuthStore()
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    const handler = () => touchActivity()
    window.addEventListener('click', handler)
    const interval = setInterval(() => {
      if (checkSessionTimeout()) navigate('/login?timeout=1')
    }, 60000)
    return () => {
      window.removeEventListener('click', handler)
      clearInterval(interval)
    }
  }, [touchActivity, checkSessionTimeout, navigate])

  useEffect(() => {
    if (profile?.id) fetchNotifications(profile.id)
  }, [profile?.id, fetchNotifications])

  return (
    <div className="flex min-h-screen bg-[#F0F2FA] pb-16 md:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={cn(
          'desktop-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col text-white transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: theme.sidebarGradient }}
      >
        <button className="absolute right-3 top-3 rounded-lg p-1 text-white lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2"><BrandLogo size={28} /></div>
            <div>
              <h1 className="font-display text-base font-bold text-white">JMAGES DBESTLINE</h1>
              <p className="text-xs text-[#F0F2FA]">{theme.name}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4" aria-label={`${theme.name} navigation`}>
          {navItems.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', active ? '' : 'text-white hover:bg-white/10')}
                style={active ? { color: theme.activeNavText } : undefined}
              >
                {active && (
                  <motion.div
                    layoutId={`nav-${department}`}
                    className="absolute inset-0 rounded-xl"
                    style={{ background: theme.activeNavBg }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 font-semibold">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/10 px-3 py-2">
            <p className="text-sm font-semibold text-white">{profile?.full_name}</p>
            <p className="text-xs capitalize text-[#F0F2FA]">{profile?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button
            onClick={() => signOut().then(() => navigate('/login'))}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#F0F2FA] hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="no-print flex h-14 items-center gap-3 border-b border-[#F0F2FA] bg-white px-4 lg:px-6">
          <button className="rounded-lg p-2 text-[#000000] hover:bg-[#F0F2FA] lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
          <p className="font-display shrink-0 text-sm font-semibold text-[#000000] lg:hidden">{theme.name}</p>
          <GlobalSearch />
          <div className="relative ml-auto">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative rounded-xl p-2 hover:bg-[#F0F2FA]" aria-label="Notifications">
              <Bell className="h-5 w-5 text-[#000000]" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF052E] text-xs font-bold text-white">{unreadCount}</span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border bg-white shadow-xl">
                <div className="flex items-center justify-between border-b p-3">
                  <span className="font-semibold text-[#000000]">Notifications</span>
                  <button onClick={() => profile && markAllAsRead(profile.id)} className="text-xs" style={{ color: theme.primary }}>Mark all read</button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-sm text-[#001996]">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <button key={n.id} onClick={() => markAsRead(n.id)} className={cn('w-full border-b p-3 text-left hover:bg-[#F0F2FA]', !n.is_read && 'bg-[#F0FDF4]')}>
                        <p className="text-sm font-medium text-[#000000]">{n.title}</p>
                        <p className="text-xs text-[#001996]">{n.message}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>

      <nav className="bottom-tab-bar fixed bottom-0 left-0 right-0 z-40 border-t bg-white" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.path)
          return (
            <Link key={item.path} to={item.path} className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium" style={{ color: active ? theme.primary : '#001996' }}>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function DepartmentShell(props: DepartmentShellProps) {
  return (
    <DepartmentProvider department={props.department}>
      <ShellInner {...props} />
    </DepartmentProvider>
  )
}