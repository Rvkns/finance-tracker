-- Esegui questo SQL nella sezione "SQL Editor" di Supabase
-- Crea la tabella per gli abbonamenti mensili personali

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    category_id  TEXT NOT NULL,
    amount       NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS subscriptions_household_idx ON public.subscriptions(household_id);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions(user_id);

-- Abilita Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: solo i membri dello stesso household possono leggere
CREATE POLICY "household members can read subscriptions"
    ON public.subscriptions FOR SELECT
    TO authenticated
    USING (
        household_id IN (
            SELECT household_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Policy: l'utente può inserire solo per sé stesso nel proprio household
CREATE POLICY "user can insert own subscriptions"
    ON public.subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        household_id IN (
            SELECT household_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Policy: l'utente può aggiornare solo i propri abbonamenti
CREATE POLICY "user can update own subscriptions"
    ON public.subscriptions FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
    );

-- Policy: l'utente può eliminare solo i propri abbonamenti
CREATE POLICY "user can delete own subscriptions"
    ON public.subscriptions FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
    );
