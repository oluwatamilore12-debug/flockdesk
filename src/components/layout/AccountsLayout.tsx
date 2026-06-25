import { Outlet } from 'react-router'
import { DepartmentShell } from './DepartmentShell'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

const accountsNav = [{ path: '/accounts', label: 'Accounts Vault' }]

export function AccountsLayout() {
  return (
    <DepartmentShell department="accounts" navItems={accountsNav}>
      <ErrorBoundary label="Accounts Dashboard Error">
        <Outlet />
      </ErrorBoundary>
    </DepartmentShell>
  )
}