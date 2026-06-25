# FlockDesk — Production Deployment

## Live URLs

| Service | URL |
|---------|-----|
| **App (Vercel)** | https://flockdesk.vercel.app |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/mdobobyskmpbwnemxzrs |
| **GitHub** | https://github.com/oluwatamilore12-debug/flockdesk |

## Supabase Project

- **Name:** oluwatamilore12@gmail.com's Project
- **Ref:** `mdobobyskmpbwnemxzrs`
- **API URL:** `https://mdobobyskmpbwnemxzrs.supabase.co`

Migrations `001`–`005` are applied. Seed data (tenant, bird types, demo sales day) is loaded.

## Production Logins

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@jmages.ng | `FlockDesk2026!` |
| Sales Manager | sales@jmages.ng | `FlockDesk2026!` |
| Accounts Manager | accounts@jmages.ng | `FlockDesk2026!` |
| Managing Director | md@jmages.ng | `FlockDesk2026!` |

Change passwords after first login via Supabase Dashboard → Authentication → Users.

## Vercel Environment Variables

Set in Vercel → Project → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://mdobobyskmpbwnemxzrs.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard → Settings → API>
```

Optional integrations:

```
VITE_PAYSTACK_PUBLIC_KEY=
VITE_PAYSTACK_SECRET_KEY=
VITE_WHATSAPP_API_TOKEN=
VITE_WHATSAPP_PHONE_NUMBER_ID=
```

## Redeploy

```bash
git push origin main          # Vercel auto-deploys on push
npx supabase db push --yes    # apply new migrations
```

## Supabase Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration, add:

- Site URL: `https://your-vercel-domain.vercel.app`
- Redirect URLs: `https://your-vercel-domain.vercel.app/**`