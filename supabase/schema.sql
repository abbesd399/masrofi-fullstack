-- ============================================================================
-- Masrofi (مصروفي) — Supabase PostgreSQL Schema + Realtime Family Sync
-- كيفية الاستخدام:
-- 1. افتح لوحة تحكم Supabase -> SQL Editor -> New Query
-- 2. الصق هذا الملف بالكامل واضغط Run
-- ============================================================================

-- 1. جدول الإعدادات العامة للعائلة (الراتب، السيارة، هدف التوفير، التنبيهات)
CREATE TABLE IF NOT EXISTS public.config (
  key TEXT PRIMARY KEY,
  val JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول سجل مشتريات العائلة
CREATE TABLE IF NOT EXISTS public.purchases (
  id BIGINT PRIMARY KEY,
  member TEXT NOT NULL DEFAULT 'abu',
  merchant_ar TEXT NOT NULL DEFAULT 'متجر',
  merchant_en TEXT NOT NULL DEFAULT 'Store',
  cat TEXT NOT NULL DEFAULT 'groceries',
  amount NUMERIC NOT NULL,
  day INTEGER NOT NULL DEFAULT 10,
  time TEXT NOT NULL DEFAULT '7:00 PM',
  scanned BOOLEAN DEFAULT TRUE,
  items JSONB DEFAULT '[]'::jsonb,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 3. جدول الفواتير الشهرية (ثابتة ومتغيرة) والفواتير المجدولة
CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  cat TEXT NOT NULL DEFAULT 'utilities',
  amount NUMERIC NOT NULL,
  prev_amount NUMERIC,
  due INTEGER,
  paid BOOLEAN DEFAULT FALSE,
  paid_day INTEGER,
  kind TEXT DEFAULT 'fixed',
  scanned BOOLEAN DEFAULT FALSE,
  is_scheduled BOOLEAN DEFAULT FALSE,
  due_str_ar TEXT,
  due_str_en TEXT,
  rem_str_ar TEXT,
  rem_str_en TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول سلة المقاضي المشتركة بين العائلة
CREATE TABLE IF NOT EXISTS public.cart (
  id BIGINT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  q NUMERIC NOT NULL DEFAULT 1,
  p NUMERIC NOT NULL,
  got BOOLEAN DEFAULT FALSE,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 5. جدول التزامات وصيانة السيارة
CREATE TABLE IF NOT EXISTS public.car_items (
  id TEXT PRIMARY KEY,
  ico TEXT DEFAULT 'car',
  c TEXT DEFAULT '#3B82F6',
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  s_ar TEXT,
  s_en TEXT,
  days INTEGER DEFAULT 30,
  ai BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

-- تفعيل سياسات الوصول (RLS) لمشاركة المحفظة بين أفراد العائلة
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'config' AND policyname = 'family_all_config') THEN
    CREATE POLICY family_all_config ON public.config FOR ALL TO anon, authenticated USING (key IS NOT NULL) WITH CHECK (key IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchases' AND policyname = 'family_all_purchases') THEN
    CREATE POLICY family_all_purchases ON public.purchases FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bills' AND policyname = 'family_all_bills') THEN
    CREATE POLICY family_all_bills ON public.bills FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cart' AND policyname = 'family_all_cart') THEN
    CREATE POLICY family_all_cart ON public.cart FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'car_items' AND policyname = 'family_all_car_items') THEN
    CREATE POLICY family_all_car_items ON public.car_items FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);
  END IF;
END $$;

-- تفعيل البث اللحظي (Supabase Realtime) لجميع الجداول ليظهر أي تحديث فوراً لدى كل العائلة
ALTER TABLE public.config REPLICA IDENTITY FULL;
ALTER TABLE public.purchases REPLICA IDENTITY FULL;
ALTER TABLE public.bills REPLICA IDENTITY FULL;
ALTER TABLE public.cart REPLICA IDENTITY FULL;
ALTER TABLE public.car_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.config;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cart;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.car_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
