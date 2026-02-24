-- ============================================================
-- FINANCE TRACKER — Supabase SQL Schema
-- Run this in the Supabase SQL Editor to set up the database
-- ============================================================

-- ---- 1. Profiles table (synced with auth.users) ----
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policies: users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

-- ---- 2. Transactions table ----
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category_id TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_user_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions(date DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can see ALL transactions (shared household)
CREATE POLICY "All authenticated users can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated USING (true);

-- Policy: users can only insert their own transactions
CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: users can only update their own transactions
CREATE POLICY "Users can update their own transactions"
  ON public.transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- Policy: users can only delete their own transactions
CREATE POLICY "Users can delete their own transactions"
  ON public.transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
