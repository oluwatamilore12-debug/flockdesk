-- ============================================================================
-- FlockDesk DOC Business Management System
-- Migration 003: Seed Data for Demo Tenant "Jmages Dbestline"
-- ============================================================================
--
-- IMPORTANT: Demo users must be created via Supabase Auth separately.
-- After creating auth users, insert matching profiles with the tenant_id below.
--
-- Demo User Setup Instructions:
-- --------------------------------
-- 1. Go to Supabase Dashboard > Authentication > Users > Add User
-- 2. Create the following users (use strong passwords in production):
--
--    Email: admin@jmagesdbestline.com
--    Role: admin
--    Full Name: System Administrator
--
--    Email: sales@jmagesdbestline.com
--    Role: sales_manager
--    Full Name: Sales Manager
--
--    Email: staff@jmagesdbestline.com
--    Role: sales_staff
--    Full Name: Sales Staff
--
--    Email: accounts@jmagesdbestline.com
--    Role: accounts_manager
--    Full Name: Accounts Manager
--
--    Email: md@jmagesdbestline.com
--    Role: md
--    Full Name: Managing Director
--
-- 3. Copy each user's UUID from the Auth dashboard, then run:
--
--    INSERT INTO public.profiles (id, tenant_id, full_name, email, role)
--    VALUES
--      ('<ADMIN_UUID>',  'a0000000-0000-4000-8000-000000000001', 'System Administrator', 'admin@jmagesdbestline.com', 'admin'),
--      ('<SALES_UUID>',  'a0000000-0000-4000-8000-000000000001', 'Sales Manager',        'sales@jmagesdbestline.com', 'sales_manager'),
--      ('<STAFF_UUID>',  'a0000000-0000-4000-8000-000000000001', 'Sales Staff',          'staff@jmagesdbestline.com', 'sales_staff'),
--      ('<ACCT_UUID>',   'a0000000-0000-4000-8000-000000000001', 'Accounts Manager',     'accounts@jmagesdbestline.com', 'accounts_manager'),
--      ('<MD_UUID>',     'a0000000-0000-4000-8000-000000000001', 'Managing Director',    'md@jmagesdbestline.com', 'md');
--
-- 4. Alternatively, create users with metadata for auto-provisioning:
--
--    supabase auth admin create-user \
--      --email admin@jmagesdbestline.com \
--      --password 'ChangeMe123!' \
--      --user-metadata '{"tenant_id":"a0000000-0000-4000-8000-000000000001","role":"admin","full_name":"System Administrator"}'
--
-- ============================================================================

-- Fixed UUIDs for reproducible seed data
-- Tenant
INSERT INTO public.tenants (id, name, slug, is_active)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Jmages Dbestline',
  'jmages-dbestline',
  TRUE
);

-- Company Settings
INSERT INTO public.company_settings (
  id,
  tenant_id,
  company_name,
  address,
  phone,
  email,
  currency,
  order_number_prefix,
  sales_days_monday,
  sales_days_thursday,
  tax_rate
)
VALUES (
  'a0000000-0000-4000-8000-000000000010',
  'a0000000-0000-4000-8000-000000000001',
  'Jmages Dbestline Farms Ltd',
  '12 Agric Road, Ibadan, Oyo State, Nigeria',
  '+234 803 123 4567',
  'info@jmagesdbestline.com',
  'NGN',
  'JMG',
  TRUE,
  TRUE,
  7.50
);

-- WhatsApp Settings (disabled by default)
INSERT INTO public.whatsapp_settings (
  id,
  tenant_id,
  api_url,
  sender_phone,
  is_enabled
)
VALUES (
  'a0000000-0000-4000-8000-000000000011',
  'a0000000-0000-4000-8000-000000000001',
  NULL,
  '+2348031234567',
  FALSE
);

-- Notification Thresholds
INSERT INTO public.notification_thresholds (
  id,
  tenant_id,
  threshold_key,
  threshold_value,
  description,
  is_enabled
)
VALUES
  (
    'a0000000-0000-4000-8000-000000000020',
    'a0000000-0000-4000-8000-000000000001',
    'low_stock_warning',
    50,
    'Alert when closing stock falls below this quantity',
    TRUE
  ),
  (
    'a0000000-0000-4000-8000-000000000021',
    'a0000000-0000-4000-8000-000000000001',
    'unpaid_order_days',
    7,
    'Alert when orders remain unpaid after this many days',
    TRUE
  ),
  (
    'a0000000-0000-4000-8000-000000000022',
    'a0000000-0000-4000-8000-000000000001',
    'mortality_rate_percent',
    3,
    'Alert when mortality disposition exceeds this percentage of opening stock',
    TRUE
  ),
  (
    'a0000000-0000-4000-8000-000000000023',
    'a0000000-0000-4000-8000-000000000001',
    'daily_revenue_target',
    500000,
    'Notify MD when daily revenue exceeds this target',
    TRUE
  );

-- Bird Types (6 types with per-tenant own_production_cost)
INSERT INTO public.bird_types (
  id,
  tenant_id,
  name,
  description,
  own_production_cost,
  default_selling_price,
  sort_order
)
VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Broilers',
    'Fast-growing meat birds, 4-week DOC',
    280.00,
    350.00,
    1
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Imported Turkey',
    'Imported turkey poults, premium grade',
    450.00,
    580.00,
    2
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'Pullet',
    'Layer pullets for egg production',
    320.00,
    400.00,
    3
  ),
  (
    'b0000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000001',
    'Local Turkey',
    'Locally bred turkey poults',
    380.00,
    480.00,
    4
  ),
  (
    'b0000000-0000-4000-8000-000000000005',
    'a0000000-0000-4000-8000-000000000001',
    'Noilers',
    'Dual-purpose noiler chicks',
    260.00,
    330.00,
    5
  ),
  (
    'b0000000-0000-4000-8000-000000000006',
    'a0000000-0000-4000-8000-000000000001',
    'Cockerels',
    'Male layer cockerels',
    150.00,
    200.00,
    6
  );

-- Suppliers (2)
INSERT INTO public.suppliers (
  id,
  tenant_id,
  name,
  contact_person,
  phone,
  email,
  address
)
VALUES
  (
    'c0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Amo Farm Hatchery',
    'Mr. Amolegbe',
    '+234 802 345 6789',
    'sales@amofarm.com',
    'Lagos-Ibadan Expressway, Ogun State'
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Zartech Limited',
    'Mrs. Adeyemi',
    '+234 805 678 9012',
    'orders@zartech.com',
    'Ilorin, Kwara State'
  );

-- Supplier Bird Types (junction)
INSERT INTO public.supplier_bird_types (
  id,
  tenant_id,
  supplier_id,
  bird_type_id,
  unit_cost
)
VALUES
  (
    'd0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002',
    420.00
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000001',
    265.00
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000005',
    245.00
  );

-- Customers (3)
INSERT INTO public.customers (
  id,
  tenant_id,
  name,
  customer_type,
  phone,
  email,
  address,
  credit_limit
)
VALUES
  (
    'e0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Alhaji Musa Poultry Farm',
    'wholesale',
    '+234 803 111 2222',
    'musa@poultryfarm.ng',
    'Saki, Oyo State',
    500000.00
  ),
  (
    'e0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Grace Agro Ventures',
    'distributor',
    '+234 805 333 4444',
    'grace@agroventures.ng',
    'Abeokuta, Ogun State',
    1000000.00
  ),
  (
    'e0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'Emeka Chicks Retail',
    'retail',
    '+234 807 555 6666',
    'emeka@chicksretail.ng',
    'Dugbe Market, Ibadan',
    100000.00
  );

-- Completed Sales Day (Monday 2026-06-22)
INSERT INTO public.sales_days (
  id,
  tenant_id,
  sale_date,
  status,
  notes,
  opened_at,
  closed_at
)
VALUES (
  'f0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '2026-06-22',
  'completed',
  'Demo completed sales day - all stock sold or disposed, payments confirmed',
  '2026-06-22 06:00:00+01',
  '2026-06-22 18:30:00+01'
);

-- Sales Session Stock
INSERT INTO public.sales_session_stock (
  id,
  tenant_id,
  sales_day_id,
  bird_type_id,
  source_type,
  supplier_id,
  grade,
  opening_quantity,
  unit_cost,
  unit_price
)
VALUES
  (
    'f0000000-0000-4000-8000-000000000010',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    'own_production',
    NULL,
    'standard',
    500,
    280.00,
    350.00
  ),
  (
    'f0000000-0000-4000-8000-000000000011',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002',
    'supplier',
    'c0000000-0000-4000-8000-000000000001',
    'premium',
    200,
    420.00,
    580.00
  ),
  (
    'f0000000-0000-4000-8000-000000000012',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000003',
    'own_production',
    NULL,
    'standard',
    300,
    320.00,
    400.00
  ),
  (
    'f0000000-0000-4000-8000-000000000013',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000005',
    'supplier',
    'c0000000-0000-4000-8000-000000000002',
    'standard',
    150,
    245.00,
    330.00
  ),
  (
    'f0000000-0000-4000-8000-000000000014',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000006',
    'own_production',
    NULL,
    'economy',
    100,
    150.00,
    200.00
  );

-- Sales Orders
INSERT INTO public.sales_orders (
  id,
  tenant_id,
  sales_day_id,
  customer_id,
  order_number,
  order_date,
  status,
  payment_status,
  discount_amount
)
VALUES
  (
    'f0000000-0000-4000-8000-000000000020',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000001',
    'JMG-260622-001',
    '2026-06-22',
    'completed',
    'confirmed',
    0.00
  ),
  (
    'f0000000-0000-4000-8000-000000000021',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000002',
    'JMG-260622-002',
    '2026-06-22',
    'completed',
    'confirmed',
    5000.00
  ),
  (
    'f0000000-0000-4000-8000-000000000022',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000003',
    'JMG-260622-003',
    '2026-06-22',
    'completed',
    'confirmed',
    0.00
  );

-- Sales Order Lines
INSERT INTO public.sales_order_lines (
  id,
  tenant_id,
  sales_order_id,
  sales_session_stock_id,
  bird_type_id,
  grade,
  quantity,
  unit_price
)
VALUES
  -- Order 1: Alhaji Musa - 300 Broilers + 50 Imported Turkey
  (
    'f0000000-0000-4000-8000-000000000030',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000020',
    'f0000000-0000-4000-8000-000000000010',
    'b0000000-0000-4000-8000-000000000001',
    'standard',
    300,
    350.00
  ),
  (
    'f0000000-0000-4000-8000-000000000031',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000020',
    'f0000000-0000-4000-8000-000000000011',
    'b0000000-0000-4000-8000-000000000002',
    'premium',
    50,
    580.00
  ),
  -- Order 2: Grace Agro - 200 Broilers + 150 Pullet + 100 Imported Turkey
  (
    'f0000000-0000-4000-8000-000000000032',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000021',
    'f0000000-0000-4000-8000-000000000010',
    'b0000000-0000-4000-8000-000000000001',
    'standard',
    195,
    350.00
  ),
  (
    'f0000000-0000-4000-8000-000000000033',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000021',
    'f0000000-0000-4000-8000-000000000012',
    'b0000000-0000-4000-8000-000000000003',
    'standard',
    297,
    400.00
  ),
  (
    'f0000000-0000-4000-8000-000000000034',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000021',
    'f0000000-0000-4000-8000-000000000011',
    'b0000000-0000-4000-8000-000000000002',
    'premium',
    150,
    580.00
  ),
  -- Order 3: Emeka Retail - 140 Noilers + 98 Cockerels
  (
    'f0000000-0000-4000-8000-000000000035',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000022',
    'f0000000-0000-4000-8000-000000000013',
    'b0000000-0000-4000-8000-000000000005',
    'standard',
    140,
    330.00
  ),
  (
    'f0000000-0000-4000-8000-000000000036',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000022',
    'f0000000-0000-4000-8000-000000000014',
    'b0000000-0000-4000-8000-000000000006',
    'economy',
    98,
    200.00
  );

-- Bird Dispositions (accounts for remaining stock to balance)
INSERT INTO public.bird_dispositions (
  id,
  tenant_id,
  sales_day_id,
  sales_session_stock_id,
  bird_type_id,
  disposition_type,
  grade,
  quantity,
  notes
)
VALUES
  (
    'f0000000-0000-4000-8000-000000000040',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000010',
    'b0000000-0000-4000-8000-000000000001',
    'mortality',
    'standard',
    5,
    'Transport mortality - broilers'
  ),
  (
    'f0000000-0000-4000-8000-000000000041',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000012',
    'b0000000-0000-4000-8000-000000000003',
    'mortality',
    'standard',
    3,
    'Minor mortality during sorting'
  ),
  (
    'f0000000-0000-4000-8000-000000000042',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000013',
    'b0000000-0000-4000-8000-000000000005',
    'gift',
    'standard',
    10,
    'Complimentary noilers for loyal customer'
  ),
  (
    'f0000000-0000-4000-8000-000000000043',
    'a0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000014',
    'b0000000-0000-4000-8000-000000000006',
    'mortality',
    'economy',
    2,
    'Cockerel mortality'
  );

-- Supplier Invoices
INSERT INTO public.supplier_invoices (
  id,
  tenant_id,
  supplier_id,
  sales_day_id,
  invoice_number,
  invoice_date,
  bird_type_id,
  quantity,
  unit_cost,
  tax_amount,
  payment_status,
  notes
)
VALUES
  (
    'f0000000-0000-4000-8000-000000000050',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'AMO-INV-2026-0622',
    '2026-06-22',
    'b0000000-0000-4000-8000-000000000002',
    200,
    420.00,
    0.00,
    'confirmed',
    'Imported turkey delivery for Monday sales'
  ),
  (
    'f0000000-0000-4000-8000-000000000051',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002',
    'f0000000-0000-4000-8000-000000000001',
    'ZAR-INV-2026-0622',
    '2026-06-22',
    'b0000000-0000-4000-8000-000000000005',
    150,
    245.00,
    0.00,
    'confirmed',
    'Noiler chicks supply for Monday sales'
  );

-- Customer Payments (all confirmed to balance the sales day)
INSERT INTO public.customer_payments (
  id,
  tenant_id,
  customer_id,
  sales_order_id,
  sales_day_id,
  amount,
  payment_method,
  payment_status,
  reference_number,
  confirmed_at,
  notes
)
VALUES
  (
    'f0000000-0000-4000-8000-000000000060',
    'a0000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000020',
    'f0000000-0000-4000-8000-000000000001',
    134000.00,
    'bank_transfer',
    'confirmed',
    'TXN-MUSA-260622',
    '2026-06-22 14:30:00+01',
    'Full payment - Alhaji Musa order'
  ),
  (
    'f0000000-0000-4000-8000-000000000061',
    'a0000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000002',
    'f0000000-0000-4000-8000-000000000021',
    'f0000000-0000-4000-8000-000000000001',
    269050.00,
    'bank_transfer',
    'confirmed',
    'TXN-GRACE-260622',
    '2026-06-22 16:00:00+01',
    'Full payment after discount - Grace Agro'
  ),
  (
    'f0000000-0000-4000-8000-000000000062',
    'a0000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000003',
    'f0000000-0000-4000-8000-000000000022',
    'f0000000-0000-4000-8000-000000000001',
    65800.00,
    'cash',
    'confirmed',
    'CASH-EMEKA-260622',
    '2026-06-22 17:15:00+01',
    'Cash payment - Emeka Retail'
  );

-- Force recalculation of all computed totals after seed inserts
SELECT public.recalculate_sales_order_totals(id)
FROM public.sales_orders
WHERE tenant_id = 'a0000000-0000-4000-8000-000000000001';

SELECT public.recalculate_sales_day_totals('f0000000-0000-4000-8000-000000000001');

-- Verify balanced sales day (should show is_balanced = true)
-- SELECT sale_date, total_birds_sold, total_revenue, total_collected, is_balanced
-- FROM public.sales_days
-- WHERE id = 'f0000000-0000-4000-8000-000000000001';