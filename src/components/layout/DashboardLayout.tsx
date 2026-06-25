import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  ShoppingCart, Calculator, Crown, Settings, LogOut, Bell, Menu, X,
} from 'lucide-react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { DepartmentProvider, useDepartment } from '@/context/DepartmentContext'
import { getDepartmentFromPath } from '@/lib/departmentTheme'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/sales', label: 'Sales', icon: ShoppingCart, roles: ['admin', 'sales_manager', 'sales_staff'] },
  { path: '/accounts', label: 'Accounts', icon: Calculator, roles: ['admin', 'accounts_manager', 'accounts_staff', 'sales_manager'] },
  { path: '/executive', label: 'Executive', icon: Crown, roles: ['admin', 'md'] },
  { path: '/admin', label: 'Settings', icon: Settings, roles: ['admin'] },
]

function LayoutInner() {
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useDepartment()
  const { profile, signOut, touchActivity, checkSessionTimeout } = useAuthStore()
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    const handler = () => touchActivity()
    window.addEventListener('click', handler)
    window.addEventListener('keypress', handler)
    const interval = setInterval(() => {
      if (checkSessionTimeout()) navigate('/login?timeout=1')
    }, 60000)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('keypress', handler)
      clearInterval(interval)
    }
  }, [touchActivity, checkSessionTimeout, navigate])

  useEffect(() => {
    if (profile?.id) fetchNotifications(profile.id)
  }, [profile?.id, fetchNotifications])

  const filteredNav = navItems.filter((item) => profile && item.roles.includes(profile.role))

  const SidebarContent = () => (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-2">
            <BrandLogo size={28} />
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-white">JMAGES DBESTLINE</h1>
            <p className="text-xs text-[#F0F2FA]">DOC Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
        {filteredNav.map((item) => {
          const Icon = item.icon
          const active = location.pathname.startsWith(item.path) || (item.path === '/executive' && location.pathname.startsWith('/md'))
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'text-[#000000]' : 'text-white hover:bg-white/10'
              )}
              style={active ? { color: theme.activeNavText } : undefined}
            >
              {active && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: theme.activeNavBg }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-5 w-5" style={{ color: active ? theme.activeNavText : theme.iconColor }} />
              <span className="relative z-10">{item.label}</span>
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
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#F0F2FA] transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-5 w-5" /> Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-[100dvh] bg-[#F0F2FA]">
      {sidebarOpen && <div className="fixed inset-0 z-[55] bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={cn(
          'app-sidebar fixed inset-y-0 left-0 z-[60] flex w-[min(280px,88vw)] flex-col text-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: theme.sidebarGradient }}
      >
        <button className="absolute right-3 top-3 rounded-lg p-1 text-white lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="no-print flex h-14 items-center justify-between border-b border-[#F0F2FA] bg-white px-4 lg:px-6">
          <button className="rounded-lg p-2 text-[#000000] hover:bg-[#F0F2FA] lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
          <p className="font-display text-sm font-semibold text-[#000000] capitalize">
            {theme.name}
          </p>
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative rounded-xl p-2 text-[#000000] hover:bg-[#F0F2FA]"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF052E] text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-[#F0F2FA] bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[#F0F2FA] p-3">
                  <span className="font-semibold text-[#000000]">Notifications</span>
                  <button onClick={() => profile && markAllAsRead(profile.id)} className="text-xs font-medium" style={{ color: theme.primary }}>
                    Mark all read
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-sm text-[#001996]">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={cn('w-full border-b border-[#F0F2FA] p-3 text-left hover:bg-[#F0F2FA]', !n.is_read && 'bg-[#F0FDF4]')}
                      >
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
        <main className="page-container flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function DashboardLayout() {
  const location = useLocation()
  const dept = getDepartmentFromPath(location.pathname)
  return (
    <DepartmentProvider department={dept}>
      <LayoutInner />
    </DepartmentProvider>
  )
}