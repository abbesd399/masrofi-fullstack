-- ============================================================================
-- Masrofi (مصروفي) — Supabase Security & Performance Advisors Optimization
-- انسخ هذا الاستعلام وضعه في Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- 1. دمج وإصلاح السياسات المتعددة على جدول أفراد العائلة (family_members)
DROP POLICY IF EXISTS "Admins can manage family members" ON public.family_members;
DROP POLICY IF EXISTS "Members can view family member list" ON public.family_members;

CREATE POLICY "Members can view family member list" 
  ON public.family_members FOR SELECT 
  USING (is_family_member(family_id));

CREATE POLICY "Admins can insert family members" 
  ON public.family_members FOR INSERT 
  WITH CHECK (is_family_admin_or_owner(family_id));

CREATE POLICY "Admins can update family members" 
  ON public.family_members FOR UPDATE 
  USING (is_family_admin_or_owner(family_id)) 
  WITH CHECK (is_family_admin_or_owner(family_id));

CREATE POLICY "Admins can delete family members" 
  ON public.family_members FOR DELETE 
  USING (is_family_admin_or_owner(family_id));

-- 2. إصلاح السياسات على جدول إعدادات العائلة (family_settings)
DROP POLICY IF EXISTS "Admins can update family settings" ON public.family_settings;
DROP POLICY IF EXISTS "Members can view family settings" ON public.family_settings;

CREATE POLICY "Members can view family settings" 
  ON public.family_settings FOR SELECT 
  USING (is_family_member(family_id));

CREATE POLICY "Admins can update family settings" 
  ON public.family_settings FOR UPDATE 
  USING (is_family_admin_or_owner(family_id)) 
  WITH CHECK (is_family_admin_or_owner(family_id));

-- 3. إصلاح السياسات على جدول الحسابات المالية (financial_accounts)
DROP POLICY IF EXISTS "Members can manage family accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Members can view family accounts" ON public.financial_accounts;

CREATE POLICY "Members can view family accounts" 
  ON public.financial_accounts FOR SELECT 
  USING (is_family_member(family_id));

CREATE POLICY "Members can insert family accounts" 
  ON public.financial_accounts FOR INSERT 
  WITH CHECK (is_family_member(family_id));

CREATE POLICY "Members can update family accounts" 
  ON public.financial_accounts FOR UPDATE 
  USING (is_family_member(family_id)) 
  WITH CHECK (is_family_member(family_id));

CREATE POLICY "Admins can delete family accounts" 
  ON public.financial_accounts FOR DELETE 
  USING (is_family_admin_or_owner(family_id));

-- 4. دمج السياسات على جدول الملفات الشخصية (profiles)
DROP POLICY IF EXISTS "Users can view and update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Family members can view other family members profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or family profiles" 
  ON public.profiles FOR SELECT 
  USING (
    (id = (select auth.uid())) OR
    EXISTS (
      SELECT 1 FROM family_members my_fm
      JOIN family_members other_fm ON my_fm.family_id = other_fm.family_id
      WHERE my_fm.user_id = (select auth.uid()) AND other_fm.user_id = profiles.id
    )
  );

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (id = (select auth.uid())) 
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (id = (select auth.uid()));
