import { Outlet } from 'react-router'
import { DepartmentShell } from './DepartmentShell'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

const adminNav = [{ path: '/admin', label: 'Control Center' }]

export function AdminLayout() {
  return (
    <DepartmentShell department="admin" navItems={adminNav}>
      <ErrorBoundary label="Admin Panel Error">
        <Outlet />
      </ErrorBoundary>
    </DepartmentShell>
  )
}