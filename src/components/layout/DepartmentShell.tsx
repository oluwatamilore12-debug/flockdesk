import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { motion } from 'framer-motion'
import { LogOut, Bell, Menu, X, Smartphone } from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { GlobalSearch } from '@/components/shared/GlobalSearch'
import { MobileSearch } from '@/components/shared/MobileSearch'
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

  useEffect(() => {
    if (!sidebarOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [sidebarOpen])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const handleSignOut = () => {
    setSidebarOpen(false)
    signOut().then(() => navigate('/login'))
  }

  return (
    <div className="flex min-h-[100dvh] bg-[#F0F2FA]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'app-sidebar fixed inset-y-0 left-0 z-[60] flex w-[min(280px,88vw)] flex-col text-white shadow-2xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: theme.sidebarGradient }}
        aria-hidden={!sidebarOpen ? undefined : undefined}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] lg:px-5 lg:py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2"><BrandLogo size={28} /></div>
            <div className="min-w-0">
              <h1 className="font-display text-sm font-bold text-white sm:text-base">JMAGES DBESTLINE</h1>
              <p className="truncate text-xs text-[#F0F2FA]">{theme.name}</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label={`${theme.name} navigation`}>
          {navItems.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn('relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', active ? '' : 'text-white hover:bg-white/10')}
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

        <div className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            to="/app"
            onClick={() => setSidebarOpen(false)}
            className="mb-3 flex min-h-[44px] items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm text-[#F0F2FA] hover:bg-white/15"
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            Install App
          </Link>
          <div className="mb-3 rounded-xl bg-white/10 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-white">{profile?.full_name}</p>
            <p className="truncate text-xs capitalize text-[#F0F2FA]">{profile?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[#D6DBEF] bg-white px-3 pt-[env(safe-area-inset-top,0px)] sm:gap-3 sm:px-4 lg:px-6">
          <button
            type="button"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-2 text-[#001996] hover:bg-[#F0F2FA] lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
            <span className="text-xs font-bold">Menu</span>
          </button>
          <p className="font-display min-w-0 flex-1 truncate text-sm font-semibold text-[#000000] lg:hidden">{theme.name}</p>
          <GlobalSearch />
          <MobileSearch />
          <div className="relative ml-auto shrink-0">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-[#F0F2FA]"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-[#000000]" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF052E] text-xs font-bold text-white">{unreadCount}</span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border bg-white shadow-xl">
                <div className="flex items-center justify-between border-b p-3">
                  <span className="font-semibold text-[#000000]">Notifications</span>
                  <button type="button" onClick={() => profile && markAllAsRead(profile.id)} className="text-xs" style={{ color: theme.primary }}>Mark all read</button>
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-sm text-[#001996]">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <button key={n.id} type="button" onClick={() => markAsRead(n.id)} className={cn('w-full border-b p-3 text-left hover:bg-[#F0F2FA]', !n.is_read && 'bg-[#F0F2FA]')}>
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
        <main className="page-container flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
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