import { Outlet } from 'react-router'
import { DepartmentShell } from './DepartmentShell'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

const salesNav = [{ path: '/sales', label: 'Sales Desk' }]

export function SalesLayout() {
  return (
    <DepartmentShell department="sales" navItems={salesNav}>
      <ErrorBoundary label="Sales Dashboard Error">
        <Outlet />
      </ErrorBoundary>
    </DepartmentShell>
  )
}