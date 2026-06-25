export const APP_VERSION = '3.0.0'
export const APP_NAME = 'FlockDesk'
export const APP_TAGLINE = 'Your Flock. Your Desk. Total Control.'
export const APP_URL = 'https://flockdesk.vercel.app'

export interface AppRelease {
  version: string
  codename: string
  released: string
  url: string
  current: boolean
  highlights: string[]
}

export const APP_RELEASES: AppRelease[] = [
  {
    version: '3.0.0',
    codename: 'V3 — Client Ready',
    released: '2026-06-25',
    url: APP_URL,
    current: true,
    highlights: [
      'Role-based visibility across Sales, Accounts & MD',
      'Order detail drawer, global search & date filters',
      'Supplier centre, AR aging & customer profiles',
      'Dark Blue / Neon Red brand theme',
      'Installable mobile app (Add to Home Screen)',
    ],
  },
  {
    version: '2.0.0',
    codename: 'V2 — Accounts Depth',
    released: '2026-06-24',
    url: APP_URL,
    current: false,
    highlights: [
      'Accounts dashboard tabs & payment queue',
      'Debtors ledger & supplier payables',
      'Sales-by-item P&L reports',
    ],
  },
  {
    version: '1.0.0',
    codename: 'V1 — Sales Floor',
    released: '2026-06-22',
    url: APP_URL,
    current: false,
    highlights: [
      'Sales day sessions & stock declaration',
      'Order entry & bird disposition reconciliation',
      'Multi-role auth with Supabase',
    ],
  },
]

export function getCurrentRelease(): AppRelease {
  return APP_RELEASES.find((r) => r.current) ?? APP_RELEASES[0]
}