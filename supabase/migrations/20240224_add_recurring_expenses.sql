-- Create table for recurring expenses
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
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
