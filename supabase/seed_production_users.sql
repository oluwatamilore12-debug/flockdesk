-- Production demo users for FlockDesk (run once after migrations via Supabase SQL Editor or CLI)
-- Password for all: FlockDesk2026!  (change after first login)
--
-- Usage: npx supabase db query --linked -f supabase/seed_production_users.sql

-- Requires pgcrypto for crypt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_tenant UUID := 'a0000000-0000-4000-8000-000000000001';
  v_pw TEXT := crypt('FlockDesk2026!', gen_salt('bf'));
  u RECORD;
BEGIN
  FOR u IN
    SELECT * FROM (VALUES
      ('admin@jmages.ng',    'admin',            'System Administrator'),
      ('sales@jmages.ng',    'sales_manager',    'Sales Manager'),
      ('accounts@jmages.ng', 'accounts_manager', 'Accounts Manager'),
      ('md@jmages.ng',       'md',               'Managing Director')
    ) AS t(email, role, full_name)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = u.email) THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        u.email,
        v_pw,
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'tenant_id', v_tenant::text,
          'role', u.role,
          'full_name', u.full_name
        ),
        NOW(),
        NOW(),
        '', '', '', ''
      );
    END IF;
  END LOOP;
END $$;

-- Ensure profiles exist (trigger may have created them; this backfills any gaps)
INSERT INTO public.profiles (id, tenant_id, full_name, email, role)
SELECT
  u.id,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.email),
  u.email,
  (u.raw_user_meta_data ->> 'role')::public.user_role
FROM auth.users u
WHERE u.email IN (
  'admin@jmages.ng',
  'sales@jmages.ng',
  'accounts@jmages.ng',
  'md@jmages.ng'
)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;