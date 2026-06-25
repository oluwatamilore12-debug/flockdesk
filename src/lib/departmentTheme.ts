import { gradients, palette } from './palette'

export type Department = 'sales' | 'accounts' | 'md' | 'admin'

export interface DepartmentTheme {
  id: Department
  name: string
  tagline: string
  primary: string
  primaryLight: string
  accent: string
  sidebarGradient: string
  bannerGradient: string
  iconColor: string
  activeNavBg: string
  activeNavText: string
  focusRing: string
  statCardClass: string
  statNumberClass: string
  statLabelClass: string
  tableHeaderBg: string
  tableRowAlt: string
  progressGradient: string
  progressBalanced: string
  heroImage: string
  heroAnimation: string
}

const sharedTheme = {
  primary: palette.darkBlue,
  primaryLight: palette.softBlue,
  accent: palette.neonRed,
  sidebarGradient: gradients.sidebar,
  bannerGradient: gradients.brandWave,
  iconColor: palette.white,
  activeNavBg: palette.white,
  activeNavText: palette.darkBlue,
  focusRing: palette.neonRed,
  statCardClass: 'bg-gradient-to-br from-[#F0F2FA] to-white border-l-4 border-[#001996]',
  statNumberClass: 'text-[#001996] font-display text-3xl font-bold',
  statLabelClass: 'text-[#000000] text-sm opacity-70',
  tableHeaderBg: palette.darkBlue,
  tableRowAlt: palette.softBlue,
  progressGradient: gradients.progress,
  progressBalanced: gradients.progressBalanced,
  heroAnimation: '',
}

export const departmentThemes: Record<Department, DepartmentTheme> = {
  sales: {
    id: 'sales',
    name: 'Sales Desk',
    tagline: 'The Floor',
    ...sharedTheme,
    heroImage: '/assets/hero-sales.webp',
  },
  accounts: {
    id: 'accounts',
    name: 'Accounts',
    tagline: 'The Vault',
    ...sharedTheme,
    statNumberClass: 'text-[#001996] font-mono text-3xl font-semibold',
    heroImage: '/assets/hero-accounts.webp',
  },
  md: {
    id: 'md',
    name: 'Executive Overview',
    tagline: 'The Bridge',
    ...sharedTheme,
    primary: palette.black,
    accent: palette.neonRed,
    sidebarGradient: gradients.midnightSurge,
    bannerGradient: gradients.midnightSurge,
    activeNavBg: palette.neonRed,
    activeNavText: palette.white,
    statCardClass: 'bg-gradient-to-br from-[#000D4D] to-[#000000] border border-[#10259C] border-t-[3px] border-t-[#FF052E]',
    statNumberClass: 'text-white font-display text-4xl font-bold',
    statLabelClass: 'text-[#F0F2FA] text-sm',
    tableHeaderBg: palette.black,
    tableRowAlt: '#000D4D',
    heroImage: '/assets/hero-md.webp',
  },
  admin: {
    id: 'admin',
    name: 'Administration',
    tagline: 'Control Center',
    ...sharedTheme,
    heroImage: '/assets/hero-login.webp',
  },
}

export function getDepartmentFromPath(path: string): Department {
  if (path.startsWith('/sales')) return 'sales'
  if (path.startsWith('/accounts')) return 'accounts'
  if (path.startsWith('/md') || path.startsWith('/executive')) return 'md'
  if (path.startsWith('/admin')) return 'admin'
  return 'sales'
}

export function getDepartmentFromRole(role: string): Department {
  if (role === 'sales_staff' || role === 'sales_manager') return 'sales'
  if (role === 'accounts_staff' || role === 'accounts_manager') return 'accounts'
  if (role === 'md') return 'md'
  if (role === 'admin') return 'admin'
  return 'sales'
}