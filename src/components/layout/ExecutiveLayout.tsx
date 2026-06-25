import { Outlet } from 'react-router'
import { DepartmentShell } from './DepartmentShell'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

const executiveNav = [{ path: '/executive', label: 'Executive Bridge' }]

export function ExecutiveLayout() {
  return (
    <DepartmentShell department="md" navItems={executiveNav}>
      <ErrorBoundary label="Executive Dashboard Error">
        <Outlet />
      </ErrorBoundary>
    </DepartmentShell>
  )
}