-- Crea la tabella per tenere traccia dello stato di pagamento mensile delle spese strutturali
CREATE TABLE IF NOT EXISTS structural_expense_payments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id   UUID NOT NULL REFERENCES structural_expenses(id) ON DELETE CASCADE,
    month_key    TEXT NOT NULL, -- Formato: YYYY-MM
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(expense_id, month_key)
);

-- Indice per velocizzare le query sui pagamenti mensili
CREATE INDEX IF NOT EXISTS structural_expense_payments_month_idx
    ON structural_expense_payments(month_key);

-- Abilita Row Level Security
ALTER TABLE structural_expense_payments ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: solo i membri dello stesso household possono leggere
CREATE POLICY "household members can read structural payments"
    ON structural_expense_payments FOR SELECT
    USING (
        expense_id IN (
            SELECT id FROM structural_expenses WHERE household_id IN (
                SELECT household_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Policy INSERT: solo i membri dello stesso household possono inserire
CREATE POLICY "household members can insert structural payments"
    ON structural_expense_payments FOR INSERT
    WITH CHECK (
        expense_id IN (
            SELECT id FROM structural_expenses WHERE household_id IN (
                SELECT household_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Policy DELETE: solo i membri dello stesso household possono eliminare
CREATE POLICY "household members can delete structural payments"
    ON structural_expense_payments FOR DELETE
    USING (
        expense_id IN (
            SELECT id FROM structural_expenses WHERE household_id IN (
                SELECT household_id FROM profiles WHERE id = auth.uid()
            )
        )
    );
