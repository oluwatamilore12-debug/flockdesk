import { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { getRoleDashboard } from '@/lib/utils'
import type { UserRole } from '@/types'
import { Skeleton } from '@/components/ui'

interface Props {
  children: React.ReactNode
  roles?: UserRole[]
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, profile, initialized } = useAuthStore()
  const location = useLocation()
  const deniedRef = useRef(false)

  useEffect(() => {
    if (!initialized || !user || !profile || !roles) return
    if (!roles.includes(profile.role) && !deniedRef.current) {
      deniedRef.current = true
      toast.error("You don't have access to this section.")
    }
    if (roles.includes(profile.role)) {
      deniedRef.current = false
    }
  }, [initialized, user, profile, roles, location.pathname])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={getRoleDashboard(profile.role)} replace />
  }

  if (roles && !profile) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}