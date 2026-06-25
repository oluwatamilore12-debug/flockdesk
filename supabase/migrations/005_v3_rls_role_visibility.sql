-- ============================================================================
-- FlockDesk DOC — Migration 005: V3 Role Visibility Rules
-- Accounts sees all sales activity; Sales cannot see accounts financial data
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SUPPLIER INVOICES — Accounts, MD, and Admin only (including SELECT)
-- Sales staff must not read supplier invoice records
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS supplier_invoices_select ON public.supplier_invoices;

CREATE POLICY supplier_invoices_accounts_select ON public.supplier_invoices
  FOR SELECT
  USING (
    public.can_read_tenant(tenant_id)
    AND (
      public.is_accounts_role()
      OR public.is_md()
      OR public.is_admin()
    )
  );

-- ----------------------------------------------------------------------------
-- CUSTOMER PAYMENTS — Sales: read-only; Accounts: full management
-- Remove sales INSERT/UPDATE paths from V1
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS customer_payments_insert_sales ON public.customer_payments;
DROP POLICY IF EXISTS customer_payments_update_sales_pending ON public.customer_payments;

-- Sales roles retain SELECT via existing customer_payments_select policy.
-- Accounts INSERT/UPDATE policies from migration 002 remain unchanged.

-- Restrict payment creation to accounts + admin only
CREATE POLICY customer_payments_insert_accounts ON public.customer_payments
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND (
      public.is_accounts_role()
      OR public.is_admin()
    )
  );

-- ----------------------------------------------------------------------------
-- HELPER: is_sales_role_strict (excludes admin for read-only payment checks)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_sales_role_strict()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('sales_manager', 'sales_staff');
$$;

COMMENT ON FUNCTION public.is_sales_role_strict IS
  'True for sales_manager and sales_staff only — used for V3 read-only payment visibility.';