# FlockDesk — Local Development

## Quick start (demo mode, no database)

```powershell
cd flockdesk
npm install
npm run dev
```

Open http://localhost:5173 and sign in:

| Department | Email | Password |
|------------|-------|----------|
| Sales | sales@jmages.ng | demo123 |
| Accounts | accounts@jmages.ng | demo123 |
| Executive | md@jmages.ng | demo123 |
| Admin | admin@jmages.ng | demo123 |

Each role lands on its **own isolated dashboard** — no cross-department navigation.

## Local Supabase (Docker Desktop)

### Prerequisites
- Docker Desktop running
- Node.js 20+

### Setup

```powershell
cd flockdesk
.\scripts\local-setup.ps1
```

Or manually:

```powershell
npx supabase start          # starts Docker containers
npx supabase status         # copy API URL and anon key
npx supabase db reset       # apply migrations + seed
```

FlockDesk uses **alternate ports** (to avoid conflicts with other Supabase projects):

| Service | URL |
|---------|-----|
| API | http://127.0.0.1:54331 |
| Studio | http://127.0.0.1:54333 |
| Database | localhost:54332 |

Create `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54331
VITE_SUPABASE_ANON_KEY=<from supabase status>
```

Restart dev server: `npm run dev`

### Create test users

1. Open Supabase Studio: http://127.0.0.1:54333
2. Authentication → Add user (email + password)
3. SQL Editor → link profile:

```sql
INSERT INTO profiles (id, tenant_id, full_name, role, is_active)
VALUES (
  '<user-uuid-from-auth>',
  'a0000000-0000-4000-8000-000000000001',
  'Sales Manager',
  'sales_manager',
  true
);
```

## Docker production preview

```powershell
docker build -t flockdesk --build-arg VITE_SUPABASE_URL=http://127.0.0.1:54331 --build-arg VITE_SUPABASE_ANON_KEY=your-key .
docker run -p 8080:80 flockdesk
```

Open http://localhost:8080

## Department routes

| Route | Role | Layout |
|-------|------|--------|
| `/sales` | sales_staff, sales_manager | Orange Sales Desk |
| `/accounts` | accounts_staff, accounts_manager | Purple Accounts Vault |
| `/executive` | md | Navy/Gold Executive Bridge |
| `/admin` | admin | Green Control Center |