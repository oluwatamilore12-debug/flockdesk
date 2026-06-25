-- Allow admin override for non Mon/Thu sales days
ALTER TABLE public.sales_days
  ADD COLUMN IF NOT EXISTS admin_override BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS override_reason TEXT;

ALTER TABLE public.sales_days
  DROP CONSTRAINT IF EXISTS sales_days_valid_weekday;

ALTER TABLE public.sales_days
  ADD CONSTRAINT sales_days_valid_weekday CHECK (
    admin_override = TRUE OR public.validate_sales_day_date(sale_date)
  );