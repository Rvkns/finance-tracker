-- ============================================================
-- FINANCE TRACKER — Supabase SQL Schema (V2: Households)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ---- 1. Households table ----
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 6),
  name TEXT NOT NULL DEFAULT 'Casa',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Policy: users can view households they belong to (checked via profiles)
CREATE POLICY "Users can view their own household"
  ON public.households FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT household_id FROM public.profiles WHERE profiles.id = auth.uid())
  );

-- Policy: anyone can insert a household (during setup)
CREATE POLICY "Users can create households"
  ON public.households FOR INSERT
  TO authenticated WITH CHECK (true);


-- ---- 2. Profiles table ----
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  full_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to recreate safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policy: users can read profiles in the SAME household or their own
CREATE POLICY "Users can view members of their household"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

-- Policy: users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);


-- ---- 3. Transactions table ----
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category_id TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_user_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_household_idx ON public.transactions(household_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions(date DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: users can SELECT transactions that belong to their household
CREATE POLICY "Users can view transactions in their household"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

-- Policy: users can INSERT transactions only for themselves in their household
CREATE POLICY "Users can insert transactions for their household"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

-- Policy: users can UPDATE only their own transactions
CREATE POLICY "Users can update their own transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: users can DELETE only their own transactions
CREATE POLICY "Users can delete their own transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
