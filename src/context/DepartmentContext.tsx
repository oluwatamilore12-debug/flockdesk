import { createContext, useContext, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { departmentThemes, getDepartmentFromPath, type Department, type DepartmentTheme } from '@/lib/departmentTheme'

const DepartmentContext = createContext<DepartmentTheme>(departmentThemes.sales)

export function DepartmentProvider({ children, department }: { children: ReactNode; department?: Department }) {
  const location = useLocation()
  const dept = department || getDepartmentFromPath(location.pathname)
  const theme = departmentThemes[dept]
  return <DepartmentContext.Provider value={theme}>{children}</DepartmentContext.Provider>
}

export function useDepartment() {
  return useContext(DepartmentContext)
}