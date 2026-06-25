-- ============================================================================
-- FlockDesk DOC Business Management System
-- Migration 002: Row Level Security Policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS FOR RLS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE id = auth.uid()
    AND deleted_at IS NULL
    AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND deleted_at IS NULL
    AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_md()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() = 'md';
$$;

CREATE OR REPLACE FUNCTION public.is_sales_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('admin', 'sales_manager', 'sales_staff');
$$;

CREATE OR REPLACE FUNCTION public.is_sales_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('admin', 'sales_manager');
$$;

CREATE OR REPLACE FUNCTION public.is_accounts_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('admin', 'accounts_manager', 'accounts_staff');
$$;

CREATE OR REPLACE FUNCTION public.can_read_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_tenant_id = public.get_user_tenant_id()
    AND public.get_user_tenant_id() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_write_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_tenant_id = public.get_user_tenant_id()
    AND public.get_user_tenant_id() IS NOT NULL
    AND public.get_user_role() <> 'md';
$$;

-- ----------------------------------------------------------------------------
-- ENABLE RLS ON ALL TABLES
-- ----------------------------------------------------------------------------

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bird_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_bird_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_session_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bird_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_thresholds ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- TENANTS
-- ----------------------------------------------------------------------------

CREATE POLICY tenants_select ON public.tenants
  FOR SELECT
  USING (public.can_read_tenant(id));

CREATE POLICY tenants_update_admin ON public.tenants
  FOR UPDATE
  USING (public.is_admin() AND public.can_read_tenant(id))
  WITH CHECK (public.is_admin() AND public.can_read_tenant(id));

-- ----------------------------------------------------------------------------
-- PROFILES (User Management)
-- ----------------------------------------------------------------------------

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  USING (
    public.can_read_tenant(tenant_id)
    AND (
      public.is_admin()
      OR public.is_md()
      OR id = auth.uid()
    )
  );

CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND tenant_id = public.get_user_tenant_id()
  );

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE
  USING (
    public.is_admin()
    AND public.can_read_tenant(tenant_id)
  )
  WITH CHECK (
    public.is_admin()
    AND tenant_id = public.get_user_tenant_id()
  );

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND tenant_id = public.get_user_tenant_id()
    AND role = public.get_user_role()
  );

CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE
  USING (
    public.is_admin()
    AND public.can_read_tenant(tenant_id)
    AND id <> auth.uid()
  );

-- ----------------------------------------------------------------------------
-- BIRD TYPES
-- ----------------------------------------------------------------------------

CREATE POLICY bird_types_select ON public.bird_types
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY bird_types_insert ON public.bird_types
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_manager_or_admin()
  );

CREATE POLICY bird_types_update ON public.bird_types
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_manager_or_admin()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_manager_or_admin()
  );

CREATE POLICY bird_types_delete ON public.bird_types
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- SUPPLIERS
-- ----------------------------------------------------------------------------

CREATE POLICY suppliers_select ON public.suppliers
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY suppliers_insert ON public.suppliers
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND (public.is_accounts_role() OR public.is_sales_manager_or_admin())
  );

CREATE POLICY suppliers_update ON public.suppliers
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND (public.is_accounts_role() OR public.is_sales_manager_or_admin())
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND (public.is_accounts_role() OR public.is_sales_manager_or_admin())
  );

CREATE POLICY suppliers_delete ON public.suppliers
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- SUPPLIER BIRD TYPES
-- ----------------------------------------------------------------------------

CREATE POLICY supplier_bird_types_select ON public.supplier_bird_types
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY supplier_bird_types_insert ON public.supplier_bird_types
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND (public.is_accounts_role() OR public.is_sales_manager_or_admin())
  );

CREATE POLICY supplier_bird_types_update ON public.supplier_bird_types
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND (public.is_accounts_role() OR public.is_sales_manager_or_admin())
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND (public.is_accounts_role() OR public.is_sales_manager_or_admin())
  );

CREATE POLICY supplier_bird_types_delete ON public.supplier_bird_types
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- CUSTOMERS
-- ----------------------------------------------------------------------------

CREATE POLICY customers_select ON public.customers
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY customers_insert ON public.customers
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY customers_update ON public.customers
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY customers_delete ON public.customers
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_manager_or_admin()
  );

-- ----------------------------------------------------------------------------
-- SALES DAYS
-- ----------------------------------------------------------------------------

CREATE POLICY sales_days_select ON public.sales_days
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY sales_days_insert ON public.sales_days
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY sales_days_update ON public.sales_days
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY sales_days_delete ON public.sales_days
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_manager_or_admin()
  );

-- ----------------------------------------------------------------------------
-- SALES SESSION STOCK
-- ----------------------------------------------------------------------------

CREATE POLICY sales_session_stock_select ON public.sales_session_stock
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY sales_session_stock_insert ON public.sales_session_stock
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY sales_session_stock_update ON public.sales_session_stock
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY sales_session_stock_delete ON public.sales_session_stock
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_manager_or_admin()
  );

-- ----------------------------------------------------------------------------
-- SALES ORDERS
-- ----------------------------------------------------------------------------

CREATE POLICY sales_orders_select ON public.sales_orders
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY sales_orders_insert ON public.sales_orders
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY sales_orders_update ON public.sales_orders
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY sales_orders_delete ON public.sales_orders
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_manager_or_admin()
  );

-- ----------------------------------------------------------------------------
-- SALES ORDER LINES
-- ----------------------------------------------------------------------------

CREATE POLICY sales_order_lines_select ON public.sales_order_lines
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY sales_order_lines_insert ON public.sales_order_lines
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY sales_order_lines_update ON public.sales_order_lines
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY sales_order_lines_delete ON public.sales_order_lines
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

-- ----------------------------------------------------------------------------
-- BIRD DISPOSITIONS
-- ----------------------------------------------------------------------------

CREATE POLICY bird_dispositions_select ON public.bird_dispositions
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY bird_dispositions_insert ON public.bird_dispositions
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY bird_dispositions_update ON public.bird_dispositions
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
  );

CREATE POLICY bird_dispositions_delete ON public.bird_dispositions
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_manager_or_admin()
  );

-- ----------------------------------------------------------------------------
-- SUPPLIER INVOICES (Accounts)
-- ----------------------------------------------------------------------------

CREATE POLICY supplier_invoices_select ON public.supplier_invoices
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY supplier_invoices_insert ON public.supplier_invoices
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_accounts_role()
  );

CREATE POLICY supplier_invoices_update ON public.supplier_invoices
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_accounts_role()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_accounts_role()
  );

CREATE POLICY supplier_invoices_delete ON public.supplier_invoices
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_accounts_role()
  );

-- ----------------------------------------------------------------------------
-- CUSTOMER PAYMENTS
-- Sales staff: create pending payments, no confirmation
-- Accounts: confirm payments
-- ----------------------------------------------------------------------------

CREATE POLICY customer_payments_select ON public.customer_payments
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY customer_payments_insert_sales ON public.customer_payments
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND (
      (public.is_sales_role() AND payment_status IN ('pending', 'partial'))
      OR public.is_accounts_role()
    )
  );

CREATE POLICY customer_payments_update_accounts ON public.customer_payments
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_accounts_role()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_accounts_role()
  );

CREATE POLICY customer_payments_update_sales_pending ON public.customer_payments
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
    AND payment_status IN ('pending', 'partial')
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_sales_role()
    AND payment_status IN ('pending', 'partial')
    AND confirmed_by IS NULL
    AND confirmed_at IS NULL
  );

CREATE POLICY customer_payments_delete ON public.customer_payments
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND (
      public.is_accounts_role()
      OR (public.is_sales_manager_or_admin() AND payment_status = 'pending')
    )
  );

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------

CREATE POLICY notifications_select ON public.notifications
  FOR SELECT
  USING (
    public.can_read_tenant(tenant_id)
    AND (
      public.is_admin()
      OR public.is_md()
      OR user_id = auth.uid()
      OR user_id IS NULL
    )
  );

CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND (public.is_admin() OR public.is_sales_manager_or_admin() OR public.is_accounts_role())
  );

CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE
  USING (
    public.can_read_tenant(tenant_id)
    AND (user_id = auth.uid() OR public.is_admin())
  )
  WITH CHECK (
    public.can_read_tenant(tenant_id)
    AND (user_id = auth.uid() OR public.is_admin())
  );

CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND (public.is_admin() OR user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- AUDIT LOGS (Admin & MD read-only; inserts via SECURITY DEFINER trigger)
-- ----------------------------------------------------------------------------

CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT
  USING (
    public.can_read_tenant(tenant_id)
    AND (public.is_admin() OR public.is_md())
  );

-- No INSERT/UPDATE/DELETE policies for audit_logs — only trigger may insert

-- ----------------------------------------------------------------------------
-- COMPANY SETTINGS
-- ----------------------------------------------------------------------------

CREATE POLICY company_settings_select ON public.company_settings
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY company_settings_insert ON public.company_settings
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

CREATE POLICY company_settings_update ON public.company_settings
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

CREATE POLICY company_settings_delete ON public.company_settings
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- WHATSAPP SETTINGS
-- ----------------------------------------------------------------------------

CREATE POLICY whatsapp_settings_select ON public.whatsapp_settings
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY whatsapp_settings_insert ON public.whatsapp_settings
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

CREATE POLICY whatsapp_settings_update ON public.whatsapp_settings
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

CREATE POLICY whatsapp_settings_delete ON public.whatsapp_settings
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- NOTIFICATION THRESHOLDS
-- ----------------------------------------------------------------------------

CREATE POLICY notification_thresholds_select ON public.notification_thresholds
  FOR SELECT
  USING (public.can_read_tenant(tenant_id));

CREATE POLICY notification_thresholds_insert ON public.notification_thresholds
  FOR INSERT
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

CREATE POLICY notification_thresholds_update ON public.notification_thresholds
  FOR UPDATE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  )
  WITH CHECK (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

CREATE POLICY notification_thresholds_delete ON public.notification_thresholds
  FOR DELETE
  USING (
    public.can_write_tenant(tenant_id)
    AND public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- GRANT EXECUTE ON HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_order_number(UUID, DATE) TO authenticated;