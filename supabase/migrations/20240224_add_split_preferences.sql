-- Added columns for Proportional Split Feature
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS salary NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.households
ADD COLUMN IF NOT EXISTS split_mode TEXT NOT NULL DEFAULT 'equal' CHECK (split_mode IN ('equal', 'proportional'));

-- Allow users to update their household settings (like split_mode)
DROP POLICY IF EXISTS "Users can update their own household" ON public.households;
CREATE POLICY "Users can update their own household"
  ON public.households FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT household_id FROM public.profiles WHERE profiles.id = auth.uid())
  );
