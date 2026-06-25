-- ============================================================================
-- FlockDesk DOC Business Management System
-- Migration 001: Initial Schema
-- ============================================================================

-- gen_random_uuid() is built into PostgreSQL 13+ on Supabase (no uuid-ossp needed)

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM (
  'admin',
  'sales_manager',
  'sales_staff',
  'accounts_manager',
  'accounts_staff',
  'md'
);

CREATE TYPE public.sales_day_status AS ENUM (
  'draft',
  'open',
  'closed',
  'completed',
  'cancelled'
);

CREATE TYPE public.order_status AS ENUM (
  'draft',
  'pending',
  'confirmed',
  'completed',
  'cancelled'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'partial',
  'paid',
  'confirmed',
  'rejected',
  'refunded'
);

CREATE TYPE public.disposition_type AS ENUM (
  'mortality',
  'gift',
  'compensation',
  'spoilage',
  'transfer',
  'other'
);

CREATE TYPE public.customer_type AS ENUM (
  'retail',
  'wholesale',
  'distributor',
  'farm'
);

CREATE TYPE public.payment_method AS ENUM (
  'cash',
  'bank_transfer',
  'cheque',
  'pos',
  'mobile_money'
);

CREATE TYPE public.source_type AS ENUM (
  'own_production',
  'supplier'
);

CREATE TYPE public.bird_grade AS ENUM (
  'premium',
  'standard',
  'economy'
);

-- ----------------------------------------------------------------------------
-- UTILITY FUNCTIONS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_sales_day_date(p_sale_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Sales days are Monday (1) and Thursday (4) only
  RETURN EXTRACT(ISODOW FROM p_sale_date) IN (1, 4);
END;
$$;

-- ----------------------------------------------------------------------------
-- CORE TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE public.tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT tenants_slug_unique UNIQUE (slug)
);

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  full_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  role          public.user_role NOT NULL DEFAULT 'sales_staff',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE public.bird_types (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  name                  TEXT NOT NULL,
  description           TEXT,
  own_production_cost   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  default_selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  CONSTRAINT bird_types_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE TABLE public.suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT suppliers_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE TABLE public.supplier_bird_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  supplier_id   UUID NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,
  bird_type_id  UUID NOT NULL REFERENCES public.bird_types (id) ON DELETE RESTRICT,
  unit_cost     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT supplier_bird_types_unique UNIQUE (tenant_id, supplier_id, bird_type_id)
);

CREATE TABLE public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  customer_type   public.customer_type NOT NULL DEFAULT 'retail',
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  credit_limit    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE public.sales_days (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  sale_date         DATE NOT NULL,
  status            public.sales_day_status NOT NULL DEFAULT 'draft',
  total_birds_sold  INTEGER NOT NULL DEFAULT 0,
  total_revenue     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_collected   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_balanced       BOOLEAN NOT NULL DEFAULT FALSE,
  notes             TEXT,
  opened_by         UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  closed_by         UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  opened_at         TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT sales_days_tenant_date_unique UNIQUE (tenant_id, sale_date),
  CONSTRAINT sales_days_valid_weekday CHECK (public.validate_sales_day_date(sale_date))
);

CREATE TABLE public.sales_session_stock (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  sales_day_id        UUID NOT NULL REFERENCES public.sales_days (id) ON DELETE CASCADE,
  bird_type_id        UUID NOT NULL REFERENCES public.bird_types (id) ON DELETE RESTRICT,
  source_type         public.source_type NOT NULL DEFAULT 'own_production',
  supplier_id         UUID REFERENCES public.suppliers (id) ON DELETE SET NULL,
  grade               public.bird_grade NOT NULL DEFAULT 'standard',
  opening_quantity    INTEGER NOT NULL DEFAULT 0 CHECK (opening_quantity >= 0),
  quantity_sold       INTEGER NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  quantity_disposed   INTEGER NOT NULL DEFAULT 0 CHECK (quantity_disposed >= 0),
  closing_quantity    INTEGER GENERATED ALWAYS AS (
    opening_quantity - quantity_sold - quantity_disposed
  ) STORED,
  unit_cost           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit_price          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  CONSTRAINT sales_session_stock_supplier_required CHECK (
    (source_type = 'own_production' AND supplier_id IS NULL)
    OR (source_type = 'supplier' AND supplier_id IS NOT NULL)
  ),
  CONSTRAINT sales_session_stock_quantities_valid CHECK (
    quantity_sold + quantity_disposed <= opening_quantity
  )
);

CREATE TABLE public.sales_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  sales_day_id    UUID NOT NULL REFERENCES public.sales_days (id) ON DELETE RESTRICT,
  customer_id     UUID NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  order_number    TEXT NOT NULL,
  order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  status          public.order_status NOT NULL DEFAULT 'draft',
  payment_status  public.payment_status NOT NULL DEFAULT 'pending',
  subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT sales_orders_tenant_order_number_unique UNIQUE (tenant_id, order_number),
  CONSTRAINT sales_orders_discount_non_negative CHECK (discount_amount >= 0),
  CONSTRAINT sales_orders_total_non_negative CHECK (total_amount >= 0)
);

CREATE TABLE public.sales_order_lines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  sales_order_id          UUID NOT NULL REFERENCES public.sales_orders (id) ON DELETE CASCADE,
  sales_session_stock_id  UUID REFERENCES public.sales_session_stock (id) ON DELETE SET NULL,
  bird_type_id            UUID NOT NULL REFERENCES public.bird_types (id) ON DELETE RESTRICT,
  grade                   public.bird_grade NOT NULL DEFAULT 'standard',
  quantity                INTEGER NOT NULL CHECK (quantity > 0),
  unit_price              NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  line_total              NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE TABLE public.bird_dispositions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  sales_day_id            UUID NOT NULL REFERENCES public.sales_days (id) ON DELETE CASCADE,
  sales_session_stock_id  UUID REFERENCES public.sales_session_stock (id) ON DELETE SET NULL,
  bird_type_id            UUID NOT NULL REFERENCES public.bird_types (id) ON DELETE RESTRICT,
  disposition_type        public.disposition_type NOT NULL,
  grade                   public.bird_grade NOT NULL DEFAULT 'standard',
  quantity                INTEGER NOT NULL CHECK (quantity > 0),
  notes                   TEXT,
  recorded_by             UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE TABLE public.supplier_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  supplier_id     UUID NOT NULL REFERENCES public.suppliers (id) ON DELETE RESTRICT,
  sales_day_id    UUID REFERENCES public.sales_days (id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL,
  invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  bird_type_id    UUID REFERENCES public.bird_types (id) ON DELETE SET NULL,
  quantity        INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_cost       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status  public.payment_status NOT NULL DEFAULT 'pending',
  notes           TEXT,
  created_by      UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT supplier_invoices_tenant_invoice_unique UNIQUE (tenant_id, invoice_number)
);

CREATE TABLE public.customer_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  customer_id       UUID NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  sales_order_id    UUID REFERENCES public.sales_orders (id) ON DELETE SET NULL,
  sales_day_id      UUID REFERENCES public.sales_days (id) ON DELETE SET NULL,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method    public.payment_method NOT NULL DEFAULT 'cash',
  payment_status    public.payment_status NOT NULL DEFAULT 'pending',
  reference_number  TEXT,
  notes             TEXT,
  recorded_by       UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  confirmed_by      UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  confirmed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE TABLE public.notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  user_id             UUID REFERENCES public.profiles (id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  message             TEXT NOT NULL,
  notification_type   TEXT NOT NULL DEFAULT 'info',
  is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  related_entity_type TEXT,
  related_entity_id   UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at             TIMESTAMPTZ
);

CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  user_id     UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.company_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  company_name          TEXT NOT NULL,
  address               TEXT,
  phone                 TEXT,
  email                 TEXT,
  logo_url              TEXT,
  currency              TEXT NOT NULL DEFAULT 'NGN',
  order_number_prefix   TEXT NOT NULL DEFAULT 'JMG',
  sales_days_monday     BOOLEAN NOT NULL DEFAULT TRUE,
  sales_days_thursday   BOOLEAN NOT NULL DEFAULT TRUE,
  tax_rate              NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_settings_tenant_unique UNIQUE (tenant_id)
);

CREATE TABLE public.whatsapp_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  api_url       TEXT,
  api_key       TEXT,
  sender_phone  TEXT,
  is_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_settings_tenant_unique UNIQUE (tenant_id)
);

CREATE TABLE public.notification_thresholds (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  threshold_key    TEXT NOT NULL,
  threshold_value  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  description      TEXT,
  is_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_thresholds_tenant_key_unique UNIQUE (tenant_id, threshold_key)
);

-- ----------------------------------------------------------------------------
-- ORDER NUMBER GENERATION (JMG-YYMMDD-NNN)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_order_number(
  p_tenant_id UUID,
  p_order_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix TEXT;
  v_date_part TEXT;
  v_sequence INTEGER;
  v_order_number TEXT;
BEGIN
  SELECT COALESCE(order_number_prefix, 'JMG')
  INTO v_prefix
  FROM public.company_settings
  WHERE tenant_id = p_tenant_id;

  IF v_prefix IS NULL THEN
    v_prefix := 'JMG';
  END IF;

  v_date_part := TO_CHAR(p_order_date, 'YYMMDD');

  SELECT COALESCE(MAX(
    NULLIF(
      REGEXP_REPLACE(order_number, '^[A-Z]+-\d{6}-', ''),
      ''
    )::INTEGER
  ), 0) + 1
  INTO v_sequence
  FROM public.sales_orders
  WHERE tenant_id = p_tenant_id
    AND order_date = p_order_date
    AND deleted_at IS NULL;

  v_order_number := v_prefix || '-' || v_date_part || '-' || LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_order_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_sales_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR BTRIM(NEW.order_number) = '' THEN
    NEW.order_number := public.generate_order_number(NEW.tenant_id, NEW.order_date);
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- COMPUTED TOTALS: ORDER SUBTOTALS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalculate_sales_order_totals(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_subtotal NUMERIC(12, 2);
  v_discount NUMERIC(12, 2);
  v_total NUMERIC(12, 2);
  v_sales_day_id UUID;
BEGIN
  SELECT COALESCE(SUM(line_total), 0)
  INTO v_subtotal
  FROM public.sales_order_lines
  WHERE sales_order_id = p_order_id
    AND deleted_at IS NULL;

  SELECT discount_amount, sales_day_id
  INTO v_discount, v_sales_day_id
  FROM public.sales_orders
  WHERE id = p_order_id;

  v_total := GREATEST(v_subtotal - COALESCE(v_discount, 0), 0);

  UPDATE public.sales_orders
  SET subtotal = v_subtotal,
      total_amount = v_total,
      updated_at = NOW()
  WHERE id = p_order_id;

  IF v_sales_day_id IS NOT NULL THEN
    PERFORM public.recalculate_sales_day_totals(v_sales_day_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_sales_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  v_order_id := COALESCE(NEW.sales_order_id, OLD.sales_order_id);
  PERFORM public.recalculate_sales_order_totals(v_order_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_sales_order_on_discount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.discount_amount IS DISTINCT FROM OLD.discount_amount THEN
    PERFORM public.recalculate_sales_order_totals(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- COMPUTED TOTALS: SALES SESSION STOCK QUANTITIES
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalculate_stock_quantity_sold(p_stock_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_quantity INTEGER;
BEGIN
  SELECT COALESCE(SUM(sol.quantity), 0)
  INTO v_quantity
  FROM public.sales_order_lines sol
  INNER JOIN public.sales_orders so ON so.id = sol.sales_order_id
  WHERE sol.sales_session_stock_id = p_stock_id
    AND sol.deleted_at IS NULL
    AND so.deleted_at IS NULL
    AND so.status NOT IN ('cancelled');

  UPDATE public.sales_session_stock
  SET quantity_sold = v_quantity,
      updated_at = NOW()
  WHERE id = p_stock_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_stock_quantity_disposed(p_stock_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_quantity INTEGER;
BEGIN
  SELECT COALESCE(SUM(bd.quantity), 0)
  INTO v_quantity
  FROM public.bird_dispositions bd
  WHERE bd.sales_session_stock_id = p_stock_id
    AND bd.deleted_at IS NULL;

  UPDATE public.sales_session_stock
  SET quantity_disposed = v_quantity,
      updated_at = NOW()
  WHERE id = p_stock_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_stock_from_order_line()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock_id UUID;
BEGIN
  v_stock_id := COALESCE(NEW.sales_session_stock_id, OLD.sales_session_stock_id);
  IF v_stock_id IS NOT NULL THEN
    PERFORM public.recalculate_stock_quantity_sold(v_stock_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_stock_from_disposition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock_id UUID;
BEGIN
  v_stock_id := COALESCE(NEW.sales_session_stock_id, OLD.sales_session_stock_id);
  IF v_stock_id IS NOT NULL THEN
    PERFORM public.recalculate_stock_quantity_disposed(v_stock_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ----------------------------------------------------------------------------
-- COMPUTED TOTALS: SALES DAY TOTALS & IS_BALANCED
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalculate_sales_day_totals(p_sales_day_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_birds_sold INTEGER;
  v_revenue NUMERIC(12, 2);
  v_collected NUMERIC(12, 2);
  v_stock_balanced BOOLEAN;
  v_payments_balanced BOOLEAN;
  v_is_balanced BOOLEAN;
BEGIN
  SELECT COALESCE(SUM(sol.quantity), 0)
  INTO v_birds_sold
  FROM public.sales_order_lines sol
  INNER JOIN public.sales_orders so ON so.id = sol.sales_order_id
  WHERE so.sales_day_id = p_sales_day_id
    AND sol.deleted_at IS NULL
    AND so.deleted_at IS NULL
    AND so.status NOT IN ('cancelled');

  SELECT COALESCE(SUM(so.total_amount), 0)
  INTO v_revenue
  FROM public.sales_orders so
  WHERE so.sales_day_id = p_sales_day_id
    AND so.deleted_at IS NULL
    AND so.status NOT IN ('cancelled');

  SELECT COALESCE(SUM(cp.amount), 0)
  INTO v_collected
  FROM public.customer_payments cp
  WHERE cp.sales_day_id = p_sales_day_id
    AND cp.deleted_at IS NULL
    AND cp.payment_status = 'confirmed';

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.sales_session_stock sss
    WHERE sss.sales_day_id = p_sales_day_id
      AND sss.deleted_at IS NULL
      AND sss.closing_quantity <> 0
  )
  INTO v_stock_balanced;

  v_payments_balanced := v_revenue = v_collected;
  v_is_balanced := v_stock_balanced AND v_payments_balanced;

  UPDATE public.sales_days
  SET total_birds_sold = v_birds_sold,
      total_revenue = v_revenue,
      total_collected = v_collected,
      is_balanced = v_is_balanced,
      updated_at = NOW()
  WHERE id = p_sales_day_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_sales_day_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sales_day_id UUID;
BEGIN
  v_sales_day_id := COALESCE(NEW.sales_day_id, OLD.sales_day_id);
  IF v_sales_day_id IS NOT NULL THEN
    PERFORM public.recalculate_sales_day_totals(v_sales_day_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_sales_day_from_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sales_day_id UUID;
BEGIN
  v_sales_day_id := COALESCE(NEW.sales_day_id, OLD.sales_day_id);
  IF v_sales_day_id IS NOT NULL THEN
    PERFORM public.recalculate_sales_day_totals(v_sales_day_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_sales_day_from_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sales_day_id UUID;
BEGIN
  v_sales_day_id := COALESCE(NEW.sales_day_id, OLD.sales_day_id);
  IF v_sales_day_id IS NOT NULL THEN
    PERFORM public.recalculate_sales_day_totals(v_sales_day_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ----------------------------------------------------------------------------
-- COMPUTED TOTALS: SUPPLIER INVOICE TOTALS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalculate_supplier_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.subtotal := ROUND(COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_cost, 0), 2);
  NEW.total_amount := ROUND(COALESCE(NEW.subtotal, 0) + COALESCE(NEW.tax_amount, 0), 2);
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- AUDIT LOG INSERT VIA TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_record_id UUID;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
    v_record_id := OLD.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_tenant_id := NEW.tenant_id;
    v_record_id := NEW.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSE
    v_tenant_id := NEW.tenant_id;
    v_record_id := NEW.id;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (
    tenant_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    v_tenant_id,
    v_user_id,
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_old_data,
    v_new_data
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ----------------------------------------------------------------------------
-- PROFILE AUTO-CREATE ON AUTH SIGNUP (optional hook)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profiles are created manually by admins with tenant assignment.
  -- This hook exists for optional auto-provisioning via user metadata.
  IF NEW.raw_user_meta_data ? 'tenant_id' AND NEW.raw_user_meta_data ? 'role' THEN
    INSERT INTO public.profiles (id, tenant_id, full_name, email, role)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data ->> 'tenant_id')::UUID,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      (NEW.raw_user_meta_data ->> 'role')::public.user_role
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_bird_types_updated_at
  BEFORE UPDATE ON public.bird_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_supplier_bird_types_updated_at
  BEFORE UPDATE ON public.supplier_bird_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_sales_days_updated_at
  BEFORE UPDATE ON public.sales_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_sales_session_stock_updated_at
  BEFORE UPDATE ON public.sales_session_stock
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_sales_order_lines_updated_at
  BEFORE UPDATE ON public.sales_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_bird_dispositions_updated_at
  BEFORE UPDATE ON public.bird_dispositions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_supplier_invoices_updated_at
  BEFORE UPDATE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_customer_payments_updated_at
  BEFORE UPDATE ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_whatsapp_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_notification_thresholds_updated_at
  BEFORE UPDATE ON public.notification_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sales_orders_set_order_number
  BEFORE INSERT ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_sales_order_number();

CREATE TRIGGER sales_order_lines_recalculate_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_sales_order_totals();

CREATE TRIGGER sales_orders_recalculate_on_discount
  AFTER UPDATE OF discount_amount ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_sales_order_on_discount();

CREATE TRIGGER sales_order_lines_recalculate_stock
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_stock_from_order_line();

CREATE TRIGGER bird_dispositions_recalculate_stock
  AFTER INSERT OR UPDATE OR DELETE ON public.bird_dispositions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_stock_from_disposition();

CREATE TRIGGER sales_orders_recalculate_sales_day
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_sales_day_from_order();

CREATE TRIGGER customer_payments_recalculate_sales_day
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_sales_day_from_payment();

CREATE TRIGGER sales_session_stock_recalculate_sales_day
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_session_stock
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_sales_day_from_stock();

CREATE TRIGGER supplier_invoices_calculate_totals
  BEFORE INSERT OR UPDATE OF quantity, unit_cost, tax_amount ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_supplier_invoice_totals();

-- Audit triggers on business-critical tables
CREATE TRIGGER audit_sales_days
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_days
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_sales_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_customer_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_supplier_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX idx_profiles_tenant_id ON public.profiles (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_role ON public.profiles (role) WHERE deleted_at IS NULL;

CREATE INDEX idx_bird_types_tenant_id ON public.bird_types (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_suppliers_tenant_id ON public.suppliers (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_bird_types_tenant_id ON public.supplier_bird_types (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_bird_types_supplier_id ON public.supplier_bird_types (supplier_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_customers_tenant_id ON public.customers (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_customer_id ON public.customers (id) WHERE deleted_at IS NULL;

CREATE INDEX idx_sales_days_tenant_id ON public.sales_days (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_days_sale_date ON public.sales_days (sale_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_days_status ON public.sales_days (status) WHERE deleted_at IS NULL;

CREATE INDEX idx_sales_session_stock_tenant_id ON public.sales_session_stock (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_session_stock_sales_day_id ON public.sales_session_stock (sales_day_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_session_stock_bird_type_id ON public.sales_session_stock (bird_type_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_sales_orders_tenant_id ON public.sales_orders (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_orders_sales_day_id ON public.sales_orders (sales_day_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_orders_customer_id ON public.sales_orders (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_orders_order_date ON public.sales_orders (order_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_orders_status ON public.sales_orders (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_orders_payment_status ON public.sales_orders (payment_status) WHERE deleted_at IS NULL;

CREATE INDEX idx_sales_order_lines_tenant_id ON public.sales_order_lines (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_order_lines_sales_order_id ON public.sales_order_lines (sales_order_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_bird_dispositions_tenant_id ON public.bird_dispositions (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bird_dispositions_sales_day_id ON public.bird_dispositions (sales_day_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_supplier_invoices_tenant_id ON public.supplier_invoices (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_invoices_supplier_id ON public.supplier_invoices (supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_invoices_sales_day_id ON public.supplier_invoices (sales_day_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_invoices_status ON public.supplier_invoices (payment_status) WHERE deleted_at IS NULL;

CREATE INDEX idx_customer_payments_tenant_id ON public.customer_payments (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_payments_customer_id ON public.customer_payments (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_payments_sales_day_id ON public.customer_payments (sales_day_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_payments_sales_order_id ON public.customer_payments (sales_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_payments_status ON public.customer_payments (payment_status) WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_tenant_id ON public.notifications (tenant_id);
CREATE INDEX idx_notifications_user_id ON public.notifications (user_id) WHERE is_read = FALSE;

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs (tenant_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

CREATE INDEX idx_company_settings_tenant_id ON public.company_settings (tenant_id);
CREATE INDEX idx_whatsapp_settings_tenant_id ON public.whatsapp_settings (tenant_id);
CREATE INDEX idx_notification_thresholds_tenant_id ON public.notification_thresholds (tenant_id);

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------

COMMENT ON TABLE public.tenants IS 'Multi-tenant organizations using FlockDesk DOC';
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users with tenant and role';
COMMENT ON TABLE public.bird_types IS 'Bird breeds/types with per-tenant own production cost';
COMMENT ON TABLE public.sales_days IS 'Sales sessions restricted to Monday and Thursday';
COMMENT ON TABLE public.sales_session_stock IS 'Opening stock per bird type for a sales day session';
COMMENT ON TABLE public.sales_orders IS 'Customer orders linked to a sales day';
COMMENT ON TABLE public.bird_dispositions IS 'Non-sale bird dispositions (mortality, gifts, etc.)';
COMMENT ON FUNCTION public.generate_order_number IS 'Generates order numbers in JMG-YYMMDD-NNN format';
COMMENT ON FUNCTION public.validate_sales_day_date IS 'Validates that sale_date falls on Monday or Thursday';
COMMENT ON COLUMN public.sales_days.is_balanced IS 'True when stock is fully accounted for and payments match revenue';