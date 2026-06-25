# FlockDesk

**Your Flock. Your Desk. Total Control.**

Production-ready Day-Old Chick (DOC) Business Management System for Jmages Dbestline and the Nigerian DOC industry. Replaces spreadsheet workflows with a multi-tenant SaaS platform covering sales, accounts, and executive oversight.

## Features

- **Sales Dashboard** — Sales day sessions (Mon/Thu), stock declaration, order entry, bird dispositions, live reconciliation
- **Accounts Dashboard** — Payment confirmation, debtors ledger, supplier payables, P&L by bird type
- **MD Dashboard** — Revenue trends, sales mix, customer rankings, disposition analysis, alerts
- **Admin Settings** — Bird types, company profile, WhatsApp config, notification thresholds, user management
- **Multi-tenancy** — Tenant-isolated data with subdomain routing support
- **Integrations** — Paystack payments, WhatsApp Business Cloud API, PDF/CSV exports

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| State | Zustand |
| Routing | React Router v7 |
| Charts | Recharts |
| PDF | @react-pdf/renderer |

## Quick Start (Demo Mode)

No Supabase setup required for local exploration:

```bash
cd flockdesk
npm install
npm run dev
```

Open http://localhost:5173 and sign in with:

| Role | Email | Password |
|------|-------|----------|
| Sales Manager | sales@jmages.ng | demo123 |
| Accounts Manager | accounts@jmages.ng | demo123 |
| Managing Director | md@jmages.ng | demo123 |
| Admin | admin@jmages.ng | demo123 |

## Production Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations in order via SQL Editor or CLI:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_rls_policies.sql
   supabase/migrations/003_seed_data.sql
   ```
3. Create Auth users and link profiles (see comments in `003_seed_data.sql`)
4. Copy project URL and anon key to `.env`:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Paystack (Optional)

```
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
VITE_PAYSTACK_SECRET_KEY=sk_live_xxxxx
```

Used for customer payment flows and future subscription billing.

### 3. WhatsApp Business API (Optional)

1. Create a Meta Business app with WhatsApp product
2. Submit and approve message templates:
   - `sales_day_closed`
   - `payment_confirmed`
   - `weekly_report`
   - `large_order_alert`
3. Configure:

```
VITE_WHATSAPP_API_TOKEN=your-token
VITE_WHATSAPP_PHONE_NUMBER_ID=your-phone-id
```

Template IDs are stored in the `whatsapp_settings` table per tenant.

### 4. Deploy Frontend (Vercel)

```bash
npm run build
```

Deploy `dist/` to Vercel. Set environment variables in the Vercel dashboard.

For multi-tenant subdomain routing, configure:
- `*.flockdesk.com` → Vercel project
- Or path-based: `flockdesk.com/app/:tenant`

## Project Structure

```
flockdesk/
├── supabase/migrations/     # Database schema, RLS, seed data
├── src/
│   ├── components/          # UI, layout, shared widgets
│   ├── lib/                 # Supabase, validation, integrations
│   ├── pages/               # Sales, Accounts, MD, Admin dashboards
│   ├── stores/              # Zustand state (auth, theme, notifications)
│   └── types/               # TypeScript interfaces
└── README.md
```

## Core Business Logic

### Bird Disposition Reconciliation

Every bird must be fully accounted for before a sales day can close:

```
Good Sold + Second Class Sold + Rejects + Mortality + Farm Transfer = Total Declared
```

The reconciliation widget shows live balance per bird type. Close is blocked until all rows show ✅.

### Sales Days

Sales occur on **Monday and Thursday** only. Admin override available with reason field.

### Roles

| Role | Access |
|------|--------|
| `sales_staff` | Order entry, dispositions |
| `sales_manager` | All sales + read-only accounts |
| `accounts_staff` | Payment confirmation |
| `accounts_manager` | Full accounts dashboard |
| `md` | Executive read-only dashboard |
| `admin` | Full access + settings |

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run oxlint
```

## License

Proprietary — Built for Jmages Dbestline DOC Division.