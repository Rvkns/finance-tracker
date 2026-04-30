-- Esegui questo SQL nella sezione "SQL Editor" di Supabase
-- Crea la tabella per le spese strutturali (mutuo, rate, prestiti)

CREATE TABLE IF NOT EXISTS structural_expenses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    amount       NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    paid_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice per query per household
CREATE INDEX IF NOT EXISTS structural_expenses_household_idx
    ON structural_expenses(household_id);

-- Abilita Row Level Security
ALTER TABLE structural_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: solo i membri dello stesso household possono leggere
CREATE POLICY "household members can read structural expenses"
    ON structural_expenses FOR SELECT
    USING (
        household_id IN (
            SELECT household_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: solo i membri dello stesso household possono inserire
CREATE POLICY "household members can insert structural expenses"
    ON structural_expenses FOR INSERT
    WITH CHECK (
        household_id IN (
            SELECT household_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: solo i membri dello stesso household possono aggiornare
CREATE POLICY "household members can update structural expenses"
    ON structural_expenses FOR UPDATE
    USING (
        household_id IN (
            SELECT household_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: solo i membri dello stesso household possono eliminare
CREATE POLICY "household members can delete structural expenses"
    ON structural_expenses FOR DELETE
    USING (
        household_id IN (
            SELECT household_id FROM profiles WHERE id = auth.uid()
        )
    );
