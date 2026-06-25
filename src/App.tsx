import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { SalesLayout } from '@/components/layout/SalesLayout'
import { AccountsLayout } from '@/components/layout/AccountsLayout'
import { ExecutiveLayout } from '@/components/layout/ExecutiveLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoginPage } from '@/pages/Login'
import { AppDownloadPage } from '@/pages/AppDownload'
import { SalesDashboard } from '@/pages/sales/SalesDashboard'
import { AccountsDashboard } from '@/pages/accounts/AccountsDashboard'
import { MDDashboard } from '@/pages/md/MDDashboard'
import { AdminSettings } from '@/pages/admin/AdminSettings'
import { getRoleDashboard } from '@/lib/utils'

function RootRedirect() {
  const { profile } = useAuthStore()
  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={getRoleDashboard(profile.role)} replace />
}

export default function App() {
  const { initialize } = useAuthStore()
  const { darkMode } = useThemeStore()

  useEffect(() => {
    initialize()
    document.documentElement.classList.toggle('dark', darkMode)
  }, [initialize, darkMode])

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        containerClassName="toast-mobile"
        toastOptions={{ duration: 4000 }}
      />
      <Routes>
        <Route path="/app" element={<AppDownloadPage />} />
        <Route path="/download" element={<AppDownloadPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Sales — isolated department */}
        <Route
          element={
            <ProtectedRoute roles={['sales_manager', 'sales_staff']}>
              <SalesLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/sales" element={<SalesDashboard />} />
        </Route>

        {/* Accounts — isolated department */}
        <Route
          element={
            <ProtectedRoute roles={['accounts_manager', 'accounts_staff']}>
              <AccountsLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/accounts" element={<AccountsDashboard />} />
        </Route>

        {/* Executive (MD) — isolated department */}
        <Route
          element={
            <ProtectedRoute roles={['md']}>
              <ExecutiveLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/executive" element={<MDDashboard />} />
        </Route>

        {/* Admin — isolated department */}
        <Route
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminSettings />} />
        </Route>

        <Route path="/md" element={<Navigate to="/executive" replace />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}