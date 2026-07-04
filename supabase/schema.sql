-- ============================================================
-- FINANCE TRACKER — Supabase SQL Schema (V2: Households)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ---- 1. Households table ----
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 6),
  name TEXT NOT NULL DEFAULT 'Casa',
  split_mode TEXT NOT NULL DEFAULT 'equal' CHECK (split_mode IN ('equal', 'proportional')),
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

-- Policy: Users can update their own household
CREATE POLICY "Users can update their own household"
  ON public.households FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT household_id FROM public.profiles WHERE profiles.id = auth.uid())
  );


-- ---- 2. Profiles table ----
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  full_name TEXT,
  salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
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


-- ---- 4. Budgets table ----
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (household_id, category_id)
);

CREATE INDEX IF NOT EXISTS budgets_household_idx ON public.budgets(household_id);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budgets in their household"
  ON public.budgets FOR SELECT
  TO authenticated
  USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert budgets for their household"
  ON public.budgets FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update budgets in their household"
  ON public.budgets FOR UPDATE
  TO authenticated
  USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );


-- ---- 5. Recurring Expenses table ----
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  day_of_month SMALLINT CHECK (day_of_month BETWEEN 1 AND 31), -- giorno del mese dell'addebito automatico
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage recurring expenses for their household"
  ON public.recurring_expenses FOR ALL
  TO authenticated
  USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE profiles.id = auth.uid())
  )
  WITH CHECK (
    household_id IN (SELECT household_id FROM public.profiles WHERE profiles.id = auth.uid())
  );

-- ---- RPC FUNCTIONS ----
-- RPC to join a household securely by invitation code
CREATE OR REPLACE FUNCTION join_household(p_invite_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as Postgres superuser to bypass RLS for this specific query
AS $$
DECLARE
  v_household_id UUID;
BEGIN
  -- 1. Find the household ID by the exact invite code
  SELECT id INTO v_household_id
  FROM public.households
  WHERE invite_code = p_invite_code;

  -- 2. If not found, raise an exception
  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- 3. Update the user's profile with the household ID
  UPDATE public.profiles
  SET household_id = v_household_id
  WHERE id = auth.uid();
END;
$$;